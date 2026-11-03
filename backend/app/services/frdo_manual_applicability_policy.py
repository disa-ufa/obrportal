"""Fail-closed preconditions for manual FRDO review decisions.

This is a pure preparation policy, NOT an authorization grant or DB writer.
The eventual API must recheck every precondition inside the locking
transaction and use the existing registry_applicability_writer.
"""

from dataclasses import dataclass
from hmac import compare_digest
from uuid import UUID


class ManualFrdoDecisionConflict(ValueError):
    """The request needs review, refresh, or a separate reconciliation."""


PROTECTED_STATUSES = frozenset({
    "approved",
    "exported",
    "submitted",
    "accepted",
    "rejected",
    "correction_required",
})

PROTECTED_FIELDS = (
    "approved_at",
    "approved_by_user_id",
    "approval_snapshot_json",
    "approval_fingerprint",
    "approval_invalidated_at",
    "submitted_at",
    "accepted_at",
    "external_id",
)


@dataclass(frozen=True)
class ManualFrdoDecisionPlan:
    enrollment_id: str
    decision: str
    reason: str
    actor_user_id: str
    input_fingerprint: str
    expected_version: int


def _uuid(value, field):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ManualFrdoDecisionConflict(
            "Invalid " + field
        ) from exc


def _sha256(value):
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(char in "0123456789abcdef" for char in value)
    )


def plan_manual_frdo_review_decision(
    *,
    obligation,
    current,
    decision,
    reason,
    actor_user_id,
    expected_version,
    current_input_fingerprint,
    expected_input_fingerprint,
    current_rule_status,
):
    """Validate a proposed review transition without modifying anything.

    expected_version=0 means no persisted decision exists yet.
    An existing decision is editable through this path only when it
    is still needs_review. Historical decisions never enter this path.
    """
    if getattr(obligation, "registry", None) != "frdo":
        raise ManualFrdoDecisionConflict("FRDO obligation required")

    enrollment_id = _uuid(
        getattr(obligation, "enrollment_id", None),
        "enrollment_id",
    )

    actor_id = _uuid(actor_user_id, "actor_user_id")

    if decision not in {"required", "not_required"}:
        raise ManualFrdoDecisionConflict(
            "Only required/not_required decisions are supported"
        )

    if not isinstance(reason, str):
        raise ManualFrdoDecisionConflict("Reason must be text")

    normalized_reason = reason.strip()

    if not 10 <= len(normalized_reason) <= 2000:
        raise ManualFrdoDecisionConflict(
            "Manual reason must contain 10 to 2000 characters"
        )

    if type(expected_version) is not int or expected_version < 0:
        raise ManualFrdoDecisionConflict(
            "Nonnegative expected_version required"
        )

    if current_rule_status != "needs_review":
        raise ManualFrdoDecisionConflict(
            "Current rule is not in manual-review state"
        )

    if getattr(obligation, "status", None) in PROTECTED_STATUSES:
        raise ManualFrdoDecisionConflict(
            "Protected obligation lifecycle"
        )

    if any(
        getattr(obligation, field, None)
        for field in PROTECTED_FIELDS
    ):
        raise ManualFrdoDecisionConflict(
            "Protected obligation evidence"
        )

    if not _sha256(current_input_fingerprint):
        raise ManualFrdoDecisionConflict(
            "Valid current input fingerprint required"
        )

    if not _sha256(expected_input_fingerprint):
        raise ManualFrdoDecisionConflict(
            "Valid expected input fingerprint required"
        )

    if not compare_digest(
        current_input_fingerprint,
        expected_input_fingerprint,
    ):
        raise ManualFrdoDecisionConflict(
            "Input snapshot changed; refresh required"
        )

    if current is None:
        if expected_version != 0:
            raise ManualFrdoDecisionConflict(
                "Decision version changed"
            )
    else:
        if (
            getattr(current, "registry", None) != "frdo"
            or getattr(current, "enrollment_id", None)
            != enrollment_id
        ):
            raise ManualFrdoDecisionConflict(
                "Persisted decision scope mismatch"
            )

        if getattr(current, "decision", None) != "needs_review":
            raise ManualFrdoDecisionConflict(
                "Existing decision requires separate reconciliation"
            )

        if getattr(current, "source", None) == "legacy":
            raise ManualFrdoDecisionConflict(
                "Legacy decision requires separate reconciliation"
            )

        version = getattr(current, "decision_version", None)

        if (
            type(version) is not int
            or version < 1
            or version != expected_version
        ):
            raise ManualFrdoDecisionConflict(
                "Decision version changed"
            )

        stored_fingerprint = getattr(
            current, "input_fingerprint", None
        )

        if stored_fingerprint is not None and (
            not _sha256(stored_fingerprint)
            or not compare_digest(
                stored_fingerprint,
                current_input_fingerprint,
            )
        ):
            raise ManualFrdoDecisionConflict(
                "Persisted decision snapshot is stale"
            )

    return ManualFrdoDecisionPlan(
        enrollment_id=enrollment_id,
        decision=decision,
        reason=normalized_reason,
        actor_user_id=actor_id,
        input_fingerprint=current_input_fingerprint,
        expected_version=expected_version,
    )