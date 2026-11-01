"""P1 tests: approval event identities, separate from replay/concurrency fixes."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.services.compliance_registry_approval import (
    apply_registry_approval,
    invalidate_registry_approval,
)

NOW = datetime(2026, 10, 21, 7, 0, tzinfo=timezone.utc)
ACTOR = "synthetic-p1-review-actor"
SNAPSHOT = {"synthetic": True, "name": "Same content across approvals"}


def legacy_obligation():
    return SimpleNamespace(
        status="ready",
        approved_at=None,
        approved_by_user_id=None,
        approval_event_id=None,
        approval_fingerprint=None,
        approval_snapshot_json=None,
        approval_invalidated_at=None,
        approval_invalidation_reason=None,
    )


def test_new_approval_has_uuid_separate_from_fingerprint():
    obligation = legacy_obligation()
    capture = apply_registry_approval(
        obligation,
        current_snapshot=SNAPSHOT,
        approved_by_user_id=ACTOR,
        approved_at=NOW,
    )
    assert obligation.status == "approved"
    assert UUID(obligation.approval_event_id).version == 4
    assert obligation.approval_event_id != obligation.approval_fingerprint
    assert capture.fingerprint == obligation.approval_fingerprint


def test_current_approval_cannot_create_new_event():
    obligation = legacy_obligation()
    apply_registry_approval(
        obligation, current_snapshot=SNAPSHOT,
        approved_by_user_id=ACTOR, approved_at=NOW,
    )
    event_id = obligation.approval_event_id
    with pytest.raises(ValueError, match="cannot be reapproved"):
        apply_registry_approval(
            obligation, current_snapshot=SNAPSHOT,
            approved_by_user_id=ACTOR,
            approved_at=NOW + timedelta(seconds=1),
        )
    assert obligation.approval_event_id == event_id


def test_invalidation_then_same_fingerprint_reapproval_has_new_event():
    obligation = legacy_obligation()
    apply_registry_approval(
        obligation, current_snapshot=SNAPSHOT,
        approved_by_user_id=ACTOR, approved_at=NOW,
    )
    old_id = obligation.approval_event_id
    old_fp = obligation.approval_fingerprint
    assert invalidate_registry_approval(
        obligation, reason="course_title_changed",
        invalidated_at=NOW + timedelta(seconds=1),
    )
    assert obligation.approval_event_id == old_id  # never erase the old identity
    capture = apply_registry_approval(
        obligation, current_snapshot=SNAPSHOT,
        approved_by_user_id=ACTOR, approved_at=NOW + timedelta(seconds=2),
    )
    assert capture.was_reapproval is True
    assert obligation.approval_fingerprint == old_fp
    assert obligation.approval_event_id != old_id
    assert UUID(obligation.approval_event_id).version == 4


def test_rejected_approval_does_not_assign_uuid():
    obligation = legacy_obligation()
    obligation.status = "pending_data"
    with pytest.raises(ValueError, match="does not allow approval"):
        apply_registry_approval(
            obligation, current_snapshot=SNAPSHOT,
            approved_by_user_id=ACTOR, approved_at=NOW,
        )
    assert obligation.approval_event_id is None
