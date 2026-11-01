"""Focused fail-closed contracts for batch scope, replay and release gates.

These checks complement the integration tests without a live DB or external APIs.
"""
from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_batch_p0_scope import _validate_request
from app.services.registry_batch_replay import (
    _current_event_id,
    require_unexported_approval_events,
)
import app.services.registry_release_gate as release_gate


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_batch_scope_accepts_canonical_distinct_ids_in_stable_order(registry):
    actor_id = str(uuid4())
    obligation_ids = sorted([str(uuid4()), str(uuid4())], reverse=True)
    actor, ids = _validate_request(registry, actor_id, obligation_ids)

    assert actor == actor_id
    assert ids == tuple(sorted(obligation_ids))


def test_batch_scope_rejects_invalid_and_duplicate_selection():
    actor_id = str(uuid4())
    obligation_id = str(uuid4())

    with pytest.raises(RegistryActionLockError, match="batch_invalid_registry"):
        _validate_request("unknown", actor_id, [obligation_id])
    with pytest.raises(RegistryActionLockError, match="batch_empty_selection"):
        _validate_request("frdo", actor_id, [])
    with pytest.raises(RegistryActionLockError, match="batch_invalid_selection"):
        _validate_request("frdo", actor_id, obligation_id)
    with pytest.raises(RegistryActionLockError, match="batch_duplicate_target"):
        _validate_request("frdo", actor_id, [obligation_id, obligation_id])
    with pytest.raises(RegistryActionLockError, match="batch_noncanonical_uuid"):
        _validate_request("frdo", actor_id, [obligation_id.upper()])


def test_replay_requires_canonical_approval_event_identity():
    obligation_id = str(uuid4())
    with pytest.raises(ValueError, match="legacy approval"):
        _current_event_id(
            SimpleNamespace(id=obligation_id, approval_event_id=None),
            error_type=ValueError,
        )
    with pytest.raises(ValueError, match="Noncanonical"):
        _current_event_id(
            SimpleNamespace(id=obligation_id, approval_event_id=str(uuid4()).upper()),
            error_type=ValueError,
        )


class _FakeResult:
    def __init__(self, items):
        self.items = items

    def scalars(self):
        return self

    def all(self):
        return self.items


class _FakeSession:
    def __init__(self, prior_items):
        self.prior_items = prior_items
        self.queries = 0

    async def execute(self, statement):
        self.queries += 1
        return _FakeResult(self.prior_items)


@pytest.mark.asyncio
async def test_replay_fails_closed_for_legacy_or_already_exported_event():
    obligation = SimpleNamespace(id=str(uuid4()), approval_event_id=str(uuid4()))
    batch_id = str(uuid4())

    for prior_event, message in (
        (None, "unverifiable legacy"),
        (obligation.approval_event_id, "already has an export batch"),
    ):
        prior_item = SimpleNamespace(
            obligation_id=obligation.id,
            approval_event_id=prior_event,
            batch_id=batch_id,
        )
        session = _FakeSession([prior_item])
        with pytest.raises(ValueError, match=message):
            await require_unexported_approval_events(
                session, obligations=[obligation], error_type=ValueError,
            )
        assert session.queries == 1


@pytest.mark.asyncio
async def test_replay_allows_distinct_lawful_reapproval_but_not_duplicates():
    obligation = SimpleNamespace(id=str(uuid4()), approval_event_id=str(uuid4()))
    session = _FakeSession([
        SimpleNamespace(
            obligation_id=obligation.id,
            approval_event_id=str(uuid4()),
            batch_id=str(uuid4()),
        )
    ])
    events = await require_unexported_approval_events(
        session, obligations=[obligation], error_type=ValueError,
    )
    assert events == [obligation.approval_event_id]
    assert session.queries == 1

    with pytest.raises(ValueError, match="Duplicate registry obligation"):
        await require_unexported_approval_events(
            _FakeSession([]),
            obligations=[obligation, obligation],
            error_type=ValueError,
        )


def test_export_release_gate_stays_closed_without_explicit_authorization(monkeypatch):
    monkeypatch.setattr(
        release_gate,
        "settings",
        SimpleNamespace(production_exports_enabled=False),
    )
    with pytest.raises(HTTPException) as exc:
        release_gate.require_registry_batch_exports_enabled()
    assert exc.value.status_code == 409
    assert exc.value.detail["code"] == "registry.batch_export.disabled"

    monkeypatch.setattr(
        release_gate,
        "settings",
        SimpleNamespace(production_exports_enabled=True),
    )
    assert release_gate.require_registry_batch_exports_enabled() is None
