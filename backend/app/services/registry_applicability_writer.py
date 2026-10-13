"""Transactional persistence of registry applicability decisions.

This module is intentionally NOT wired to the API or completion pipeline.
It never commits and never rewrites registry obligations, approvals or batches.
The caller owns the transaction and must enforce RBAC for manual decisions.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import utcnow
from app.models.registry_applicability import (
    RegistryApplicabilityEvent,
    RegistryApplicabilityRecord,
)
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.services.registry_applicability import RegistryApplicability


PROTECTED_LIFECYCLE_STATUSES = frozenset({
    "approved",
    "exported",
    "submitted",
    "accepted",
    "rejected",
    "correction_required",
})


class ApplicabilityWriteConflict(ValueError):
    """The decision requires a separate reviewed reconciliation workflow."""


def _validate_request(
    *,
    enrollment_id: str,
    evaluation: RegistryApplicability,
    source: str,
    actor_user_id: str | None,
    manual_reason: str | None,
    input_fingerprint: str | None,
) -> str:
    try:
        UUID(enrollment_id)
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValueError("Valid enrollment UUID required") from exc

    if input_fingerprint is not None and (
        len(input_fingerprint) != 64
        or any(char not in "0123456789abcdef" for char in input_fingerprint)
    ):
        raise ValueError("Input fingerprint must be lowercase SHA-256")

    if source == "manual":
        try:
            if not actor_user_id:
                raise ValueError("Authorized actor required for manual decision")
            UUID(actor_user_id)
        except (ValueError, TypeError, AttributeError) as exc:
            raise ValueError("Valid actor UUID required for manual decision") from exc
        if not manual_reason or not manual_reason.strip():
            raise ValueError("Manual decision requires a recorded reason")
        return manual_reason.strip()

    if source != "auto":
        # Historical reconciliation is a separate audited, operator-approved flow.
        raise ValueError("Only auto and manual decision sources are supported")
    if actor_user_id is not None or manual_reason is not None:
        raise ValueError("Automatic decisions cannot carry a manual override")
    if not evaluation.rule_code or not evaluation.rule_version:
        raise ValueError("Automatic decision requires rule provenance")
    if not evaluation.reason.strip():
        raise ValueError("Automatic decision requires a reason")
    return evaluation.reason


async def persist_registry_applicability(
    *,
    session: AsyncSession,
    enrollment_id: str,
    evaluation: RegistryApplicability,
    source: str = "auto",
    actor_user_id: str | None = None,
    manual_reason: str | None = None,
    input_fingerprint: str | None = None,
) -> tuple[RegistryApplicabilityRecord, bool]:
    """Write current decision and one immutable event, or return an unchanged row.

    Requires a PostgreSQL transaction owned by the caller. Advisory transaction
    lock serializes concurrent first inserts by enrollment/registry; row lock
    protects subsequent revisions. Does not commit or use savepoints.

    A legacy obligation with a protected lifecycle cannot be classified by
    this generic writer. It needs a separate supervised history reconciliation.
    """
    reason = _validate_request(
        enrollment_id=enrollment_id,
        evaluation=evaluation,
        source=source,
        actor_user_id=actor_user_id,
        manual_reason=manual_reason,
        input_fingerprint=input_fingerprint,
    )
    # Stable transaction-scoped key. Parameter binding avoids SQL injection.
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": "registry-applicability:" + enrollment_id + ":" + evaluation.registry},
    )
    # Lock the parent enrollment first so existing classification checks
    # serialize with other transactions using this writer. Producers of
    # external artifacts must still enforce their own compatible guards.
    obligation = await session.scalar(
        select(RegistryObligation)
        .where(
            RegistryObligation.enrollment_id == enrollment_id,
            RegistryObligation.registry == evaluation.registry,
        )
        .with_for_update()
    )
    if obligation is not None:
        has_protected_fields = any((
            obligation.status in PROTECTED_LIFECYCLE_STATUSES,
            obligation.approved_at is not None,
            obligation.approved_by_user_id is not None,
            obligation.approval_snapshot_json is not None,
            obligation.approval_fingerprint is not None,
            obligation.approval_invalidated_at is not None,
            obligation.submitted_at is not None,
            obligation.accepted_at is not None,
            bool(obligation.external_id),
        ))
        attempt_exists = await session.scalar(
            select(RegistrySubmissionAttempt.id)
            .where(RegistrySubmissionAttempt.obligation_id == obligation.id)
            .limit(1)
        )
        batch_item_exists = await session.scalar(
            select(RegistrySubmissionBatchItem.id)
            .where(RegistrySubmissionBatchItem.obligation_id == obligation.id)
            .limit(1)
        )
        if has_protected_fields or attempt_exists is not None or batch_item_exists is not None:
            raise ApplicabilityWriteConflict(
                "Protected historical obligation requires supervised reconciliation"
            )

    result = await session.execute(
        select(RegistryApplicabilityRecord)
        .where(
            RegistryApplicabilityRecord.enrollment_id == enrollment_id,
            RegistryApplicabilityRecord.registry == evaluation.registry,
        )
        .with_for_update()
    )
    current = result.scalar_one_or_none()
    if current is not None and current.source in {"manual", "legacy"} and source == "auto":
        raise ApplicabilityWriteConflict(
            "Automatic evaluation cannot replace an authorized or historical decision"
        )

    desired = (
        evaluation.status,
        source,
        evaluation.rule_code,
        evaluation.rule_version,
        reason,
        input_fingerprint,
        actor_user_id if source == "manual" else None,
    )
    if current is not None:
        actual = (
            current.decision,
            current.source,
            current.rule_code,
            current.rule_version,
            current.reason,
            current.input_fingerprint,
            current.decided_by_user_id,
        )
        if actual == desired:
            return current, False

    now: datetime = utcnow()
    if current is None:
        current = RegistryApplicabilityRecord(
            enrollment_id=enrollment_id,
            registry=evaluation.registry,
            decision_version=1,
        )
        session.add(current)
    else:
        current.decision_version += 1

    current.decision = evaluation.status
    current.source = source
    current.rule_code = evaluation.rule_code
    current.rule_version = evaluation.rule_version
    current.reason = reason
    current.input_fingerprint = input_fingerprint
    current.decided_by_user_id = actor_user_id if source == "manual" else None
    current.decided_at = now
    current.evaluated_at = now
    await session.flush()  # Generate current.id before referring to it.

    session.add(
        RegistryApplicabilityEvent(
            applicability_id=current.id,
            enrollment_id=enrollment_id,
            registry=evaluation.registry,
            decision=evaluation.status,
            source=source,
            rule_code=evaluation.rule_code,
            rule_version=evaluation.rule_version,
            reason=reason,
            input_fingerprint=input_fingerprint,
            decided_by_user_id=current.decided_by_user_id,
            decided_at=now,
            decision_version=current.decision_version,
            created_at=now,
        )
    )
    await session.flush()
    return current, True
