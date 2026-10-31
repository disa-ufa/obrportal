"""Fail-closed applicability checks for future registry approval/export gates.

This service is deliberately NOT called from production approval or export APIs.
Historical obligations must be reconciled first. The caller must supply a
fingerprint of the *current* applicability inputs, computed from a reviewed
canonical snapshot including rule version. An absent/stale fingerprint blocks.

Call inside the same database transaction as approval or export; do not
separate validation and the write into different transactions.
"""

from __future__ import annotations

from dataclasses import dataclass
from hmac import compare_digest

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_contract import (
    APPLICABILITY_REQUIRED,
    REGISTRY_CODES,
)


class RegistryApplicabilityGateError(ValueError):
    """A documented, machine-readable reason to stop approval or export."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


@dataclass(frozen=True)
class ApplicabilityGrant:
    registry: str
    enrollment_id: str
    decision_version: int
    input_fingerprint: str


def _is_sha256(value: str | None) -> bool:
    return bool(
        value is not None
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def validate_registry_applicability_gate(
    *,
    obligation: RegistryObligation,
    applicability: RegistryApplicabilityRecord | None,
    expected_input_fingerprint: str | None,
) -> ApplicabilityGrant:
    """Verify current, explicit applicability; never infer it from old status.

    This only authorizes proceeding to separate readiness/snapshot/RBAC checks.
    It does not approve anything, prepare files or constitute legal eligibility.
    """
    if obligation.registry not in REGISTRY_CODES:
        raise RegistryApplicabilityGateError("registry.unsupported")

    if applicability is None:
        raise RegistryApplicabilityGateError("registry.applicability_missing")

    if (
        applicability.registry != obligation.registry
        or applicability.enrollment_id != obligation.enrollment_id
    ):
        raise RegistryApplicabilityGateError("registry.applicability_mismatch")

    if applicability.decision != APPLICABILITY_REQUIRED:
        if applicability.decision == "needs_review":
            raise RegistryApplicabilityGateError("registry.applicability_needs_review")
        if applicability.decision == "not_required":
            raise RegistryApplicabilityGateError("registry.applicability_not_required")
        raise RegistryApplicabilityGateError("registry.applicability_invalid")

    if applicability.source == "manual":
        if not applicability.decided_by_user_id or not applicability.reason.strip():
            raise RegistryApplicabilityGateError("registry.manual_decision_incomplete")
    elif applicability.source == "auto":
        if not (
            applicability.rule_code
            and applicability.rule_version
            and applicability.reason.strip()
        ):
            raise RegistryApplicabilityGateError("registry.rule_provenance_missing")
    else:
        # Imported historical decisions require explicit reconciliation before
        # they may grant permission for a *new* export/approval.
        raise RegistryApplicabilityGateError("registry.legacy_decision_unverified")

    if not applicability.decision_version or applicability.decision_version < 1:
        raise RegistryApplicabilityGateError("registry.applicability_version_invalid")

    if not _is_sha256(expected_input_fingerprint):
        raise RegistryApplicabilityGateError("registry.current_snapshot_missing")

    if not _is_sha256(applicability.input_fingerprint):
        raise RegistryApplicabilityGateError("registry.stored_snapshot_missing")

    if not compare_digest(
        applicability.input_fingerprint,
        expected_input_fingerprint,
    ):
        raise RegistryApplicabilityGateError("registry.applicability_stale")

    return ApplicabilityGrant(
        registry=obligation.registry,
        enrollment_id=obligation.enrollment_id,
        decision_version=applicability.decision_version,
        input_fingerprint=applicability.input_fingerprint,
    )


async def require_registry_applicability_for_submission(
    *,
    session: AsyncSession,
    obligation: RegistryObligation,
    expected_input_fingerprint: str | None,
) -> ApplicabilityGrant:
    """Lock and validate a persisted decision inside the caller's transaction.

    The calling approval/export service must separately lock the obligation,
    enforce RBAC, validate data readiness and approval snapshot, and re-check
    applicability when inputs or rule versions change. No commit is made here.
    """
    decision = await session.scalar(
        select(RegistryApplicabilityRecord)
        .where(
            RegistryApplicabilityRecord.enrollment_id == obligation.enrollment_id,
            RegistryApplicabilityRecord.registry == obligation.registry,
        )
        .with_for_update()
        # A lock serializes SQL, not SQLAlchemy's identity map. A cached
        # required decision/fingerprint must not authorize a later revision.
        .execution_options(populate_existing=True)
    )
    return validate_registry_applicability_gate(
        obligation=obligation,
        applicability=decision,
        expected_input_fingerprint=expected_input_fingerprint,
    )
