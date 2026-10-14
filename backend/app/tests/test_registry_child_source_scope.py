"""Pure fail-closed tests for dormant trusted child scope validation."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_child_source_scope import (
    RegistryChildDependencyScope,
    _roots, _uuid, _make_scope, _acquire_and_rediscover,
)


def ident():
    return str(uuid4())


@pytest.mark.parametrize("invalid", ["bad", None, "", "NOT-UUID"])
def test_child_rejects_invalid_uuid(invalid):
    with pytest.raises(RegistryActionLockError):
        _uuid(invalid)


def test_child_rejects_noncanonical_uuid():
    with pytest.raises(RegistryActionLockError, match="noncanonical"):
        _uuid(ident().upper())


def test_child_roots_are_deduplicated_and_sorted_for_reassignment():
    old, new = ident(), ident()
    roots = _roots(new, old, new)
    assert [root.resource_id for root in roots] == sorted([old, new])
    assert all(root.kind == "enrollment" for root in roots)


def test_child_unlinked_document_must_not_guess_enrollment():
    with pytest.raises(RegistryActionLockError, match="child_unlinked"):
        _make_scope(
            kind="document", source_id=ident(), current=None,
            proposed=None, evidence=(),
        )


@pytest.mark.asyncio
async def test_child_lock_preflight_rediscovery_detects_changed_owner():
    enrollment = ident()
    before = _make_scope(
        kind="document", source_id=ident(), current=enrollment,
        proposed=enrollment, evidence=((enrollment, "before"),),
    )
    after = _make_scope(
        kind="document", source_id=before.source_id, current=enrollment,
        proposed=enrollment, evidence=((enrollment, "after"),),
    )
    with patch(
        "app.services.registry_child_source_scope.acquire_discovered_registry_source_write_scope",
        new_callable=AsyncMock,
    ) as lock, pytest.raises(RegistryActionLockError, match="scope_changed_during_lock"):
        await _acquire_and_rediscover(
            session=SimpleNamespace(), before=before,
            resolver=AsyncMock(return_value=after),
        )
    lock.assert_awaited_once()


@pytest.mark.asyncio
async def test_child_lock_preflight_stable_scope_is_not_authorization():
    before = _make_scope(
        kind="context_frdo", source_id=ident(), current=ident(),
        proposed=None, evidence=(("a", "b"),),
    )
    with patch(
        "app.services.registry_child_source_scope.acquire_discovered_registry_source_write_scope",
        new_callable=AsyncMock,
    ):
        scope = await _acquire_and_rediscover(
            session=SimpleNamespace(), before=before,
            resolver=AsyncMock(return_value=before),
        )
    assert isinstance(scope, RegistryChildDependencyScope)
    assert scope == before
