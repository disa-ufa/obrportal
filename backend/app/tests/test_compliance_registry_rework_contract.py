from types import SimpleNamespace

import pytest

from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_ACCEPTED,
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_CORRECTION_REQUIRED,
    OBLIGATION_STATUS_EXPORTED,
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    OBLIGATION_STATUS_NOT_REQUIRED,
    OBLIGATION_STATUS_PENDING_DATA,
    OBLIGATION_STATUS_READY,
    OBLIGATION_STATUS_REJECTED,
    OBLIGATION_STATUS_SUBMITTED,
)
from app.services.compliance_registry_rework import (
    RegistryObligationReworkError,
    reopen_registry_obligation_for_correction,
)


def make_obligation(status: str):
    return SimpleNamespace(
        id="obligation-1",
        registry="frdo",
        enrollment_id="enrollment-1",
        document_id="document-1",
        status=status,
        readiness_errors=[
            {
                "code": "portal.rejected",
                "field": None,
                "message": "Rejected by external registry.",
            }
        ],
        approved_by_user_id="approver-1",
        approved_at="2026-09-10T00:00:00+00:00",
        approval_snapshot_json={
            "schema_version": "registry-approval-v1",
        },
        approval_fingerprint="a" * 64,
        approval_invalidated_at="2026-09-10T01:00:00+00:00",
        approval_invalidation_reason="portal_correction",
        submitted_at="2026-09-10T02:00:00+00:00",
        accepted_at=None,
        external_id=None,
        last_error="Rejected by external registry.",
    )


@pytest.mark.parametrize(
    "initial_status",
    [
        OBLIGATION_STATUS_REJECTED,
        OBLIGATION_STATUS_CORRECTION_REQUIRED,
    ],
)
def test_reopen_registry_obligation_for_correction_resets_current_cycle(
    initial_status,
):
    obligation = make_obligation(initial_status)

    reopen_registry_obligation_for_correction(
        obligation
    )

    assert obligation.status == OBLIGATION_STATUS_PENDING_DATA
    assert obligation.readiness_errors == []

    assert obligation.approved_by_user_id is None
    assert obligation.approved_at is None
    assert obligation.approval_snapshot_json is None
    assert obligation.approval_fingerprint is None
    assert obligation.approval_invalidated_at is None
    assert obligation.approval_invalidation_reason is None

    assert obligation.submitted_at is None
    assert obligation.accepted_at is None
    assert obligation.external_id is None
    assert obligation.last_error is None

    assert obligation.id == "obligation-1"
    assert obligation.enrollment_id == "enrollment-1"
    assert obligation.document_id == "document-1"


@pytest.mark.parametrize(
    "initial_status",
    [
        OBLIGATION_STATUS_NOT_REQUIRED,
        OBLIGATION_STATUS_PENDING_DATA,
        OBLIGATION_STATUS_READY,
        OBLIGATION_STATUS_NEEDS_APPROVAL,
        OBLIGATION_STATUS_APPROVED,
        OBLIGATION_STATUS_EXPORTED,
        OBLIGATION_STATUS_SUBMITTED,
        OBLIGATION_STATUS_ACCEPTED,
    ],
)
def test_reopen_registry_obligation_for_correction_rejects_other_states(
    initial_status,
):
    obligation = make_obligation(initial_status)

    with pytest.raises(
        RegistryObligationReworkError,
        match="rejected or correction_required",
    ):
        reopen_registry_obligation_for_correction(
            obligation
        )

    assert obligation.status == initial_status


def test_reopen_registry_obligation_for_correction_does_not_change_identity():
    obligation = make_obligation(
        OBLIGATION_STATUS_REJECTED
    )

    original_identity = (
        obligation.id,
        obligation.registry,
        obligation.enrollment_id,
        obligation.document_id,
    )

    reopen_registry_obligation_for_correction(
        obligation
    )

    assert (
        obligation.id,
        obligation.registry,
        obligation.enrollment_id,
        obligation.document_id,
    ) == original_identity