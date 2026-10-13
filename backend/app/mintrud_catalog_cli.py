"""Explicit operator command; never imported by application startup or seed."""

from __future__ import annotations

import argparse
import asyncio
from dataclasses import asdict
from hashlib import sha256
import json
import os
from pathlib import Path
from uuid import UUID

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.mintrud_learn_program_catalog import (
    MINTRUD_LEARN_PROGRAM_CATALOG_V109,
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
)
from app.models.mintrud_learn_program import MintrudLearnProgram
from app.services.mintrud_learn_programs import sync_mintrud_learn_program_catalog_v109


class CatalogOperationError(ValueError):
    """Contains an operator-safe message, never database exception text."""


def expected_heads() -> list[str]:
    config = Config()
    config.set_main_option(
        "script_location", str(Path(__file__).resolve().parents[1] / "alembic")
    )
    return sorted(ScriptDirectory.from_config(config).get_heads())


def validate_rows(rows: list[MintrudLearnProgram]) -> None:
    canonical = {p.learn_program_id: p for p in MINTRUD_LEARN_PROGRAM_CATALOG_V109}
    if len(canonical) != 28 or len({p.code for p in canonical.values()}) != 28:
        raise CatalogOperationError("Invalid canonical catalog")
    ids, codes, uuids = set(), set(), set()
    for row in rows:
        try:
            parsed = UUID(row.id)
        except (ValueError, TypeError, AttributeError):
            raise CatalogOperationError("Invalid catalog UUID") from None
        if str(parsed) != row.id or not parsed.int or row.id in uuids:
            raise CatalogOperationError("Noncanonical or duplicate catalog UUID")
        uuids.add(row.id)
        if row.schema_version != MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109:
            raise CatalogOperationError(
                "Unexpected catalog schema version; review separately"
            )
        if row.learn_program_id in ids or row.code in codes:
            raise CatalogOperationError("Duplicate catalog program ID or code")
        ids.add(row.learn_program_id)
        codes.add(row.code)
        item = canonical.get(row.learn_program_id)
        if item is None or row.code != item.code:
            raise CatalogOperationError("Unexpected program ID or noncanonical code")


def schema_constraints(connection) -> bool:
    inspector = inspect(connection)
    unique = {
        tuple(c["column_names"])
        for c in inspector.get_unique_constraints("mintrud_learn_programs")
    }
    link_unique = {
        tuple(c["column_names"])
        for c in inspector.get_unique_constraints("course_mintrud_learn_programs")
    }
    checks = {
        c["name"] for c in inspector.get_check_constraints("mintrud_learn_programs")
    }
    return (
        {("schema_version", "learn_program_id"), ("schema_version", "code")} <= unique
        and ("course_id", "mintrud_learn_program_id") in link_unique
        and "ck_mintrud_learn_program_positive_program_id" in checks
        and "ck_mintrud_learn_program_v109_program_id" in checks
    )


async def operate(
    url, *, apply: bool = False, confirmed_plan: str | None = None
) -> dict:
    engine = create_async_engine(
        url,
        hide_parameters=True,
        connect_args={
            "server_settings": {
                "default_transaction_read_only": "off" if apply else "on",
                "statement_timeout": "15000",
                "lock_timeout": "2000",
            },
        },
    )
    try:
        async with engine.connect() as connection:
            await connection.execution_options(
                isolation_level="READ COMMITTED" if apply else "REPEATABLE READ"
            )
            transaction = await connection.begin()
            try:
                if apply:
                    # Serializes syncs and course mapping writes; fails promptly under contention.
                    await connection.execute(
                        text(
                            "LOCK TABLE mintrud_learn_programs, course_mintrud_learn_programs IN SHARE ROW EXCLUSIVE MODE NOWAIT"
                        )
                    )
                else:
                    await connection.execute(text("SET TRANSACTION READ ONLY"))
                    if (
                        await connection.execute(text("SHOW transaction_read_only"))
                    ).scalar_one() != "on":
                        raise CatalogOperationError("Read-only transaction required")
                revisions = sorted(
                    (
                        await connection.execute(
                            text("SELECT version_num FROM alembic_version")
                        )
                    ).scalars()
                )
                if revisions != expected_heads() or not await connection.run_sync(
                    schema_constraints
                ):
                    raise CatalogOperationError(
                        "Database schema does not match this release"
                    )
                async with AsyncSession(
                    bind=connection, autoflush=False, expire_on_commit=False
                ) as session:
                    rows = list(
                        (
                            await session.scalars(
                                select(MintrudLearnProgram).order_by(
                                    MintrudLearnProgram.id
                                )
                            )
                        ).all()
                    )
                    validate_rows(rows)
                    links = [
                        tuple(row)
                        for row in (
                            await connection.execute(
                                text(
                                    "SELECT course_id, mintrud_learn_program_id FROM course_mintrud_learn_programs ORDER BY course_id, mintrud_learn_program_id"
                                )
                            )
                        ).all()
                    ]
                    canonical = {
                        p.learn_program_id: p
                        for p in MINTRUD_LEARN_PROGRAM_CATALOG_V109
                    }
                    changed = {
                        p.id
                        for p in rows
                        if p.title != canonical[p.learn_program_id].title
                        or p.is_active is not True
                    }
                    if changed & {p[1] for p in links}:
                        raise CatalogOperationError(
                            "Referenced programs require a separate approval invalidation plan"
                        )
                    plan = await sync_mintrud_learn_program_catalog_v109(
                        session, dry_run=True
                    )
                    state = {
                        "host": url.host,
                        "port": url.port or 5432,
                        "database": url.database,
                        "revisions": revisions,
                        "canonical": [asdict(p) for p in canonical.values()],
                        "existing": [
                            {
                                k: getattr(p, k)
                                for k in (
                                    "id",
                                    "learn_program_id",
                                    "code",
                                    "title",
                                    "schema_version",
                                    "is_active",
                                )
                            }
                            for p in rows
                        ],
                        "links": links,
                        "counts": asdict(plan),
                    }
                    digest = sha256(
                        json.dumps(
                            state,
                            ensure_ascii=False,
                            sort_keys=True,
                            separators=(",", ":"),
                        ).encode()
                    ).hexdigest()
                    if apply:
                        if not confirmed_plan or confirmed_plan != digest:
                            raise CatalogOperationError(
                                "Plan changed or confirmation missing; run dry-run again"
                            )
                        actual = await sync_mintrud_learn_program_catalog_v109(session)
                        if actual != plan:
                            raise CatalogOperationError(
                                "Applied counts differ from confirmed plan"
                            )
                if apply:
                    await transaction.commit()
                else:
                    await transaction.rollback()
                return {
                    "mode": "apply" if apply else "dry-run",
                    "schema_version": "1.0.9",
                    "database": url.database,
                    "plan_sha256": digest,
                    **asdict(plan),
                    "committed": apply,
                    "external_requests": 0,
                }
            except Exception:
                if transaction.is_active:
                    await transaction.rollback()
                raise
    finally:
        await engine.dispose()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Synchronize the pinned Mintrud catalog. Default: read-only dry-run."
    )
    parser.add_argument("--expected-host", required=True)
    parser.add_argument("--expected-database", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-plan-sha256")
    args = parser.parse_args(argv)
    try:
        raw = os.environ.get("MINTRUD_CATALOG_DATABASE_URL", "")
        if not raw:
            raise CatalogOperationError("Set MINTRUD_CATALOG_DATABASE_URL explicitly")
        url = make_url(raw)
        if (
            url.drivername != "postgresql+asyncpg"
            or url.host != args.expected_host
            or url.database != args.expected_database
            or url.query
        ):
            raise CatalogOperationError(
                "Database target or driver does not match explicit expectations"
            )
        if args.apply and not args.confirm_plan_sha256:
            raise CatalogOperationError(
                "Apply requires --confirm-plan-sha256 from a reviewed dry-run"
            )
        if not args.apply and args.confirm_plan_sha256:
            raise CatalogOperationError("Confirmation is only allowed with --apply")
        result = asyncio.run(
            operate(url, apply=args.apply, confirmed_plan=args.confirm_plan_sha256)
        )
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except CatalogOperationError as error:
        print(json.dumps({"error": str(error)}))
    except Exception:
        # Driver errors can contain credentials, SQL values and connection strings.
        print(
            json.dumps(
                {"error": "Catalog operation failed; no successful commit confirmed"}
            )
        )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
