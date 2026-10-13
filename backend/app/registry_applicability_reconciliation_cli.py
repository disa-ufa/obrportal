"""Read-only, grouped dry-run reconciliation plan for legacy registry rows.

This module intentionally makes NO database writes and does not infer that
a legacy record may be deleted, approved, exported or reclassified. A
candidate bucket is a review recommendation, not an executable plan.

Run only against an explicitly selected DB with the additive applicability
schema already installed. Preserves protected lifecycle and evidence even
when legacy current status appears to be pending_data/needs_approval.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.registry_applicability_inventory_cli import (
    HISTORICAL_LIFECYCLE_STATUSES,
    REVIEW_STATUSES,
)
from app.services.registry_applicability import (
    evaluate_course_registry_applicability,
)


# SQL selects and groups only non-PII classification fields; no IDs/names,
# document bodies, training content, learner details or employer identity.
# An attempt with any result (including failed) protects the legacy history.
# A partially approved record is protected even if status was subsequently
# reset to pending_data by an old workflow.
LEGACY_RECONCILIATION_SQL = """
WITH evidence AS (
    SELECT
        o.registry AS registry,
        o.status AS status,
        COALESCE(o.rule_code, '') AS legacy_rule_code,
        COALESCE(o.rule_version, '') AS legacy_rule_version,
        c.regulatory_program_type AS program_type,
        c.frdo_requirement_mode AS frdo_mode,
        c.mintrud_requirement_mode AS mintrud_mode,
        COALESCE(a.decision, '') AS existing_decision,
        COALESCE(a.source, '') AS existing_source,
        (
            o.status IN (
                'approved', 'exported', 'submitted', 'accepted',
                'rejected', 'correction_required'
            )
            OR o.approved_at IS NOT NULL
            OR o.approved_by_user_id IS NOT NULL
            OR o.approval_snapshot_json IS NOT NULL
            OR o.approval_fingerprint IS NOT NULL
            OR o.approval_invalidated_at IS NOT NULL
            OR o.submitted_at IS NOT NULL
            OR o.accepted_at IS NOT NULL
            OR NULLIF(o.external_id, '') IS NOT NULL
            OR EXISTS (
                SELECT 1
                FROM registry_submission_attempts att
                WHERE att.obligation_id = o.id
            )
        ) AS protected_evidence
    FROM registry_obligations o
    JOIN enrollments e ON e.id = o.enrollment_id
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN registry_applicability a
        ON a.enrollment_id = o.enrollment_id
        AND a.registry = o.registry
)
SELECT
    registry, status, legacy_rule_code, legacy_rule_version,
    program_type, frdo_mode, mintrud_mode,
    existing_decision, existing_source, protected_evidence,
    COUNT(*)::bigint AS row_count
FROM evidence
GROUP BY
    registry, status, legacy_rule_code, legacy_rule_version,
    program_type, frdo_mode, mintrud_mode,
    existing_decision, existing_source, protected_evidence
ORDER BY registry, status, program_type
"""


def recommend_handling(
    *,
    registry: str,
    status: str,
    legacy_rule_code: str,
    legacy_rule_version: str,
    program_type: str,
    frdo_mode: str,
    mintrud_mode: str,
    existing_decision: str,
    existing_source: str,
    protected_evidence: bool,
) -> str:
    """Provide only conservative review buckets, never mutation instructions."""
    if protected_evidence or status in HISTORICAL_LIFECYCLE_STATUSES:
        return "preserve_lifecycle_and_evidence"

    # Already classified decisions must not be overwritten by dry-run rules.
    if existing_decision or existing_source:
        return "existing_decision_review"

    if status not in REVIEW_STATUSES or registry not in {"frdo", "mintrud"}:
        return "manual_investigation"

    try:
        current = evaluate_course_registry_applicability(
            regulatory_program_type=program_type,
            frdo_requirement_mode=frdo_mode,
            mintrud_requirement_mode=mintrud_mode,
        )[registry]
    except (ValueError, KeyError, TypeError):
        return "manual_investigation"

    if (
        (legacy_rule_code and legacy_rule_code != current.rule_code)
        or (legacy_rule_version and legacy_rule_version != current.rule_version)
    ):
        return "rule_change_review"

    if current.status == "required":
        return "candidate_required_for_review"
    if current.status == "not_required":
        return "candidate_exclusion_for_review"
    return "unresolved_manual_review"


def summarize_reconciliation_rows(rows) -> dict:
    """Aggregated counts only: no IDs, identities or row-level data."""
    totals: dict[str, int] = {}
    by_registry: dict[str, dict[str, int]] = {}
    for row in rows:
        (
            registry, status, legacy_rule_code, legacy_rule_version,
            program_type, frdo_mode, mintrud_mode,
            existing_decision, existing_source, protected_evidence, count,
        ) = row
        count = int(count)
        if count < 0:
            raise ValueError("Negative reconciliation count")
        handling = recommend_handling(
            registry=registry,
            status=status,
            legacy_rule_code=legacy_rule_code,
            legacy_rule_version=legacy_rule_version,
            program_type=program_type,
            frdo_mode=frdo_mode,
            mintrud_mode=mintrud_mode,
            existing_decision=existing_decision,
            existing_source=existing_source,
            protected_evidence=protected_evidence,
        )
        totals[handling] = totals.get(handling, 0) + count
        group = by_registry.setdefault(registry, {})
        group[handling] = group.get(handling, 0) + count

    return {
        "record_count": sum(totals.values()),
        "handling_counts": totals,
        "registry_counts": by_registry,
        "classification_applied": False,
        "approval_changed": False,
        "external_submission_performed": False,
        "database_writes": 0,
        "review_only": True,
    }


async def get_reconciliation_preview(database_url) -> dict:
    """Repeatable-read + read-only transaction; caller receives counts only."""
    engine = create_async_engine(
        database_url,
        hide_parameters=True,
        connect_args={
            "server_settings": {
                "default_transaction_read_only": "on",
                "statement_timeout": "20000",
                "lock_timeout": "2000",
            }
        },
    )
    try:
        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="REPEATABLE READ")
            transaction = await conn.begin()
            try:
                await conn.execute(text("SET TRANSACTION READ ONLY"))
                if (await conn.execute(text("SHOW transaction_read_only"))).scalar_one() != "on":
                    raise RuntimeError("Read-only DB transaction was not established")
                rows = (await conn.execute(text(LEGACY_RECONCILIATION_SQL))).all()
                return summarize_reconciliation_rows(rows)
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Registry historical dry-run, read-only")
    parser.add_argument("--expected-host", required=True)
    parser.add_argument("--expected-database", required=True)
    args = parser.parse_args(argv)

    try:
        raw = os.environ.get("REGISTRY_RECONCILIATION_DATABASE_URL", "")
        if not raw:
            raise ValueError("Explicit REGISTRY_RECONCILIATION_DATABASE_URL required")
        url = make_url(raw)
        if (
            url.drivername != "postgresql+asyncpg"
            or url.host != args.expected_host
            or url.database != args.expected_database
            or url.query
        ):
            raise ValueError("Unexpected database connection target")
        result = asyncio.run(get_reconciliation_preview(url))
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except Exception:
        # Do not print database URL, SQLAlchemy connection parameters or PII.
        print(json.dumps({"error": "Read-only reconciliation preview failed"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
