"""Read-only, opt-in registry applicability preview.

This is intentionally separate from legacy obligation lists. A missing
applicability decision is NOT inferred from the obligation status, and this
preview NEVER grants approval or export permission.
"""

from __future__ import annotations

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation

SCOPE_TO_DECISION = {
    "work": "required",
    "review": "needs_review",
    "history": "not_required",
}


async def read_registry_applicability_preview(
    *,
    session: AsyncSession,
    registry: str,
    scope: str,
    limit: int,
    offset: int,
) -> dict:
    """Project persisted decisions only. Never backfill/auto-classify legacy."""
    if registry not in {"frdo", "mintrud"}:
        raise ValueError("Unsupported registry")
    if scope not in SCOPE_TO_DECISION:
        raise ValueError("Unsupported applicability preview scope")
    if not 1 <= limit <= 300 or offset < 0:
        raise ValueError("Invalid preview pagination")

    decision = SCOPE_TO_DECISION[scope]
    where = (
        RegistryApplicabilityRecord.registry == registry,
        RegistryApplicabilityRecord.decision == decision,
    )
    total = await session.scalar(
        select(func.count()).select_from(RegistryApplicabilityRecord).where(*where)
    )
    # Keep unclassified obligations visible as a summary, not silently
    # force them into either work or history. Preserves legacy review gate.
    classified = (
        select(RegistryApplicabilityRecord.id)
        .where(
            RegistryApplicabilityRecord.enrollment_id
            == RegistryObligation.enrollment_id,
            RegistryApplicabilityRecord.registry == RegistryObligation.registry,
        )
        .exists()
    )
    unclassified = await session.scalar(
        select(func.count())
        .select_from(RegistryObligation)
        .where(RegistryObligation.registry == registry, ~classified)
    )

    rows = (
        await session.execute(
            select(
                RegistryApplicabilityRecord,
                RegistryObligation.id.label("obligation_id"),
                RegistryObligation.status.label("obligation_status"),
            )
            .outerjoin(
                RegistryObligation,
                and_(
                    RegistryObligation.enrollment_id
                    == RegistryApplicabilityRecord.enrollment_id,
                    RegistryObligation.registry
                    == RegistryApplicabilityRecord.registry,
                ),
            )
            .where(*where)
            .order_by(
                RegistryApplicabilityRecord.updated_at.desc(),
                RegistryApplicabilityRecord.id.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
    ).all()

    return {
        "registry": registry,
        "scope": scope,
        "total": int(total or 0),
        "offset": offset,
        "limit": limit,
        "unclassified_legacy_count": int(unclassified or 0),
        "has_unclassified_legacy": bool(unclassified),
        "preview_only": True,
        "items": [
            {
                "id": record.id,
                "enrollment_id": record.enrollment_id,
                "registry": record.registry,
                "decision": record.decision,
                "source": record.source,
                "rule_code": record.rule_code,
                "rule_version": record.rule_version,
                "reason": record.reason,
                "decision_version": record.decision_version,
                "obligation_id": obligation_id,
                "obligation_status": obligation_status,
            }
            for record, obligation_id, obligation_status in rows
        ],
    }
