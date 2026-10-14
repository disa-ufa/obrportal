"""Read-only inventory of historical registry obligations.

Operator must explicitly identify the database. Produces aggregated counts
only; does not infer legal applicability, backfill, or modify any row.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine


HISTORICAL_LIFECYCLE_STATUSES = frozenset({
    "approved", "exported", "submitted", "accepted",
    "rejected", "correction_required",
})
REVIEW_STATUSES = frozenset({
    "needs_approval", "pending_data", "ready", "not_required",
})


def classify_legacy_status(status: str) -> str:
    """Conservative grouping; neither category authorizes data mutation."""
    if status in HISTORICAL_LIFECYCLE_STATUSES:
        return "preserve_lifecycle"
    if status in REVIEW_STATUSES:
        return "review_before_reclassification"
    return "unknown_manual_investigation"


def summarize_counts(rows: list[tuple[str, str, str, int]]) -> dict:
    """Summarize grouped database results without learner personal data."""
    totals = {}
    breakdown = []
    for registry, status, rule_code, count in rows:
        group = classify_legacy_status(status)
        count = int(count)
        if count < 0:
            raise ValueError("Invalid count")
        totals[group] = totals.get(group, 0) + count
        breakdown.append({
            "registry": registry,
            "status": status,
            "rule_code": rule_code,
            "count": count,
            "handling": group,
        })
    return {
        "total": sum(totals.values()),
        "groups": totals,
        "breakdown": sorted(
            breakdown,
            key=lambda item: (
                item["registry"], item["status"], item["rule_code"]
            ),
        ),
        "classification_applied": False,
        "database_writes": 0,
    }


async def inventory(url) -> dict:
    engine = create_async_engine(
        url,
        hide_parameters=True,
        connect_args={
            "server_settings": {
                "default_transaction_read_only": "on",
                "statement_timeout": "15000",
                "lock_timeout": "2000",
            },
        },
    )
    try:
        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="REPEATABLE READ")
            tx = await conn.begin()
            try:
                await conn.execute(text("SET TRANSACTION READ ONLY"))
                if (await conn.execute(text("SHOW transaction_read_only"))).scalar_one() != "on":
                    raise RuntimeError("Read-only transaction is required")
                rows = (
                    await conn.execute(text(
                        "SELECT registry, status, COALESCE(rule_code, '') AS rule_code, "
                        "COUNT(*) AS n FROM registry_obligations "
                        "GROUP BY registry, status, COALESCE(rule_code, '') "
                        "ORDER BY registry, status, rule_code"
                    ))
                ).all()
                return summarize_counts([tuple(row) for row in rows])
            finally:
                await tx.rollback()
    finally:
        await engine.dispose()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Aggregate registry obligations; strictly read-only."
    )
    parser.add_argument("--expected-host", required=True)
    parser.add_argument("--expected-database", required=True)
    args = parser.parse_args(argv)
    try:
        raw = os.environ.get("REGISTRY_INVENTORY_DATABASE_URL", "")
        if not raw:
            raise ValueError("Explicit REGISTRY_INVENTORY_DATABASE_URL required")
        url = make_url(raw)
        if (
            url.drivername != "postgresql+asyncpg"
            or url.host != args.expected_host
            or url.database != args.expected_database
            or url.query
        ):
            raise ValueError("Database target does not match expectations")
        report = asyncio.run(inventory(url))
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 0
    except Exception:
        # Never print DB driver errors, credentials, personal information or SQL values.
        print(json.dumps({"error": "Read-only inventory failed; no successful report"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
