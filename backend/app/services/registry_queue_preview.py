"""Read-only aggregate preview of legacy registry queue triage.

No writes, no decisions persisted, no approval or export grants.
"""

from collections import Counter

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.registry_applicability_reconciliation_cli import (
    LEGACY_RECONCILIATION_SQL,
)
from app.services.registry_queue_triage import (
    classify_legacy_registry_queue,
)


def summarize_legacy_queue_rows(rows, *, registry: str) -> dict:
    if registry not in {"frdo", "mintrud"}:
        raise ValueError("Unsupported registry")

    scopes = Counter({"work": 0, "review": 0, "history": 0})
    reasons = Counter()
    decisions = Counter()
    protected_count = 0
    total = 0

    for row in rows:
        (
            row_registry,
            status,
            legacy_rule_code,
            legacy_rule_version,
            program_type,
            frdo_mode,
            mintrud_mode,
            existing_decision,
            existing_source,
            protected_evidence,
            count,
        ) = row

        if row_registry != registry:
            continue

        count = int(count)
        if count < 0:
            raise ValueError("Invalid grouped count")

        triage = classify_legacy_registry_queue(
            registry=row_registry,
            status=status,
            legacy_rule_code=legacy_rule_code,
            legacy_rule_version=legacy_rule_version,
            program_type=program_type,
            frdo_mode=frdo_mode,
            mintrud_mode=mintrud_mode,
            existing_decision=existing_decision,
            existing_source=existing_source,
            protected_evidence=bool(protected_evidence),
        )

        scopes[triage.scope] += count
        reasons[triage.reason] += count
        decisions[triage.current_decision or "unknown"] += count
        protected_count += count if protected_evidence else 0
        total += count

    return {
        "registry": registry,
        "total": total,
        "scope_counts": dict(scopes),
        "reason_counts": dict(sorted(reasons.items())),
        "current_decision_counts": dict(sorted(decisions.items())),
        "protected_evidence_count": protected_count,
        "preview_only": True,
        "legacy_reconciliation": True,
        "approval_allowed": False,
        "export_allowed": False,
        "database_writes": 0,
    }


async def read_legacy_registry_queue_preview(
    *,
    session: AsyncSession,
    registry: str,
) -> dict:
    if registry not in {"frdo", "mintrud"}:
        raise ValueError("Unsupported registry")

    rows = (
        await session.execute(text(LEGACY_RECONCILIATION_SQL))
    ).all()

    return summarize_legacy_queue_rows(rows, registry=registry)