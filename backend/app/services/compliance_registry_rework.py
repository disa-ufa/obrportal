from __future__ import annotations

from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_CORRECTION_REQUIRED,
    OBLIGATION_STATUS_PENDING_DATA,
    OBLIGATION_STATUS_REJECTED,
)


class RegistryObligationReworkError(
    ValueError
):
    pass


_REWORK_ALLOWED_STATUSES = frozenset(
    {
        OBLIGATION_STATUS_REJECTED,
        OBLIGATION_STATUS_CORRECTION_REQUIRED,
    }
)


def reopen_registry_obligation_for_correction(
    obligation: object,
) -> object:
    """Start a new correction cycle without deleting prior attempts."""

    if obligation is None:
        raise RegistryObligationReworkError(
            "Registry obligation is required"
        )

    current_status = getattr(
        obligation,
        "status",
        None,
    )

    if (
        current_status
        not in _REWORK_ALLOWED_STATUSES
    ):
        raise RegistryObligationReworkError(
            "Registry obligation must be "
            "rejected or correction_required "
            "before reopening"
        )

    obligation.status = (
        OBLIGATION_STATUS_PENDING_DATA
    )

    obligation.readiness_errors = []

    obligation.approved_by_user_id = None
    obligation.approved_at = None
    obligation.approval_snapshot_json = None
    obligation.approval_fingerprint = None
    obligation.approval_invalidated_at = None
    obligation.approval_invalidation_reason = None

    obligation.submitted_at = None
    obligation.accepted_at = None
    obligation.external_id = None
    obligation.last_error = None

    return obligation
