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


@pytest.mark.parametrize("entrypoint", [
    "resolve_registry_document_scope", "acquire_registry_document_scope",
    "resolve_registry_document_creation_scope", "acquire_registry_document_creation_scope",
    "resolve_registry_context_scope", "acquire_registry_context_scope",
    "resolve_registry_context_upsert_scope", "acquire_registry_context_upsert_scope",
])
@pytest.mark.parametrize("state,error", [
    ("inactive", "child_fresh_transaction_required"),
    ("nested", "child_fresh_transaction_required"),
    ("new", "child_pending_changes"),
    ("dirty", "child_pending_changes"),
    ("deleted", "child_pending_changes"),
])
@pytest.mark.asyncio
async def test_child_entrypoints_reject_unsafe_transaction_before_sql(entrypoint, state, error):
    from unittest.mock import Mock

    from app.services import registry_child_source_scope as child

    session = SimpleNamespace(
        in_transaction=Mock(return_value=state != "inactive"),
        in_nested_transaction=Mock(return_value=state == "nested"),
        new=[object()] if state == "new" else [],
        dirty=[object()] if state == "dirty" else [],
        deleted=[object()] if state == "deleted" else [],
        execute=AsyncMock(), scalars=AsyncMock(), flush=AsyncMock(), commit=AsyncMock(),
    )
    if "document_creation" in entrypoint:
        kwargs = {"enrollment_id": ident(), "expected_user_id": ident()}
    elif "document_scope" in entrypoint:
        kwargs = {"document_id": ident()}
    elif "context_upsert" in entrypoint:
        kwargs = {"registry": "frdo", "obligation_id": ident()}
    else:
        kwargs = {"registry": "mintrud", "context_id": ident()}
    with pytest.raises(RegistryActionLockError) as caught:
        await getattr(child, entrypoint)(session=session, **kwargs)
    assert str(caught.value) == "registry." + error
    for method in (session.execute, session.scalars, session.flush, session.commit):
        method.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("error", [
    "child_document_missing", "child_context_missing", "child_document_owner_mismatch",
    "child_document_reference_mismatch", "child_document_reassignment_with_history",
    "child_unlinked",
])
async def test_child_rediscovery_failure_never_falls_back_to_old_scope(error):
    before = _make_scope(
        kind="document", source_id=ident(), current=ident(),
        proposed=None, evidence=(("old",),),
    )
    resolver = AsyncMock(side_effect=RegistryActionLockError("registry." + error))
    with patch(
        "app.services.registry_child_source_scope.acquire_discovered_registry_source_write_scope",
        new_callable=AsyncMock,
    ) as lock, pytest.raises(RegistryActionLockError) as caught:
        await _acquire_and_rediscover(
            session=SimpleNamespace(), before=before, resolver=resolver,
            document_id=before.source_id,
        )
    assert str(caught.value) == "registry." + error
    lock.assert_awaited_once()
    resolver.assert_awaited_once()
