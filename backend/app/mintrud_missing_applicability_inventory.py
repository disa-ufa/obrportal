"""Local-only, read-only aggregate triage for approved Mintrud obligations.

No PII, obligation IDs, mutations, export or reconciliation.
Counts are *candidates*, not permission to save or create XML.
"""
from __future__ import annotations

import asyncio
import json

from sqlalchemy import text

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.services.mintrud_local_workflow import require_local_workspace


INVENTORY_SQL = text("""
WITH candidates AS (
    SELECT o.id, o.enrollment_id,
        EXISTS (
            SELECT 1 FROM registry_submission_batch_items bi
            WHERE bi.obligation_id = o.id
        ) AS has_batch,
        EXISTS (
            SELECT 1 FROM registry_submission_attempts at
            WHERE at.obligation_id = o.id
        ) AS has_attempt,
        EXISTS (
            SELECT 1 FROM registry_applicability_events ae
            WHERE ae.registry = 'mintrud'
              AND ae.enrollment_id = o.enrollment_id
        ) AS has_events
    FROM registry_obligations o
    WHERE o.registry = 'mintrud'
      AND o.status = 'approved'
      AND NOT EXISTS (
          SELECT 1 FROM registry_applicability d
          WHERE d.registry = 'mintrud'
            AND d.enrollment_id = o.enrollment_id
      )
)
SELECT
    COUNT(*) AS approved_without_decision,
    COUNT(*) FILTER (WHERE has_batch) AS with_batch_items,
    COUNT(*) FILTER (WHERE has_attempt) AS with_attempts,
    COUNT(*) FILTER (WHERE has_events) AS with_applicability_events,
    COUNT(*) FILTER (
        WHERE NOT has_batch AND NOT has_attempt AND NOT has_events
    ) AS preliminary_no_history
FROM candidates
""")


def summarize(row) -> dict:
    values = {
        name: int(getattr(row, name))
        for name in (
            "approved_without_decision",
            "with_batch_items",
            "with_attempts",
            "with_applicability_events",
            "preliminary_no_history",
        )
    }
    total = values["approved_without_decision"]
    if any(value < 0 or value > total for value in values.values()):
        raise ValueError("Inconsistent Mintrud inventory")
    if values["preliminary_no_history"] > total:
        raise ValueError("Invalid preliminary count")
    return {
        **values,
        "individual_readiness_verified": False,
        "approval_fingerprints_verified": False,
        "eligible_for_automatic_reconciliation": False,
        "database_writes": 0,
    }


async def inventory() -> dict:
    url = engine.url
    if not (
        settings.environment == "local"
        and settings.production_exports_enabled is False
        and url.drivername == "postgresql+asyncpg"
        and url.host == "obr-m4p9-20261111-pg"
        and url.port == 5432
        and url.username == "obrportal_m4p9_login"
        and url.database == "obrportal_m4p9_workspace_20261111"
        and not url.query
    ):
        raise RuntimeError("Only the existing M4P9 local workspace may be inspected")

    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text("SET TRANSACTION READ ONLY"))
            await require_local_workspace(session)
            if (await session.scalar(text("SHOW transaction_read_only"))) != "on":
                raise RuntimeError("Transaction is not read only")
            row = (await session.execute(INVENTORY_SQL)).one()
            return summarize(row)
        finally:
            await session.rollback()


def main() -> int:
    try:
        result = asyncio.run(inventory())
    except Exception:
        print(json.dumps({
            "error": "M4P9 read-only inventory could not be verified",
            "database_writes": 0,
        }, ensure_ascii=False))
        return 1
    print(json.dumps(result, sort_keys=True, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
