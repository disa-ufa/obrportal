from __future__ import annotations

import asyncio
from dataclasses import asdict
import os
from pathlib import Path
import subprocess
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import event, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.ext.asyncio import create_async_engine

import app.mintrud_catalog_cli as cli
from app.mintrud_learn_program_catalog import MINTRUD_LEARN_PROGRAM_CATALOG_V109


def row(**overrides):
    values = {
        **asdict(MINTRUD_LEARN_PROGRAM_CATALOG_V109[0]),
        "id": str(uuid4()),
        "is_active": True,
    }
    return SimpleNamespace(**(values | overrides))


@pytest.mark.parametrize(
    "overrides",
    [
        {"id": "bad"},
        {"id": "00000000-0000-0000-0000-000000000000"},
        {"schema_version": "1.0.8"},
        {"learn_program_id": 5},
        {"code": "unknown"},
        {"code": "ИД39"},
    ],
)
def test_invalid_catalog_is_rejected(overrides):
    with pytest.raises(cli.CatalogOperationError):
        cli.validate_rows([row(**overrides)])


def test_duplicates_are_rejected():
    with pytest.raises(cli.CatalogOperationError, match="Duplicate"):
        cli.validate_rows([row(), row()])


def test_cli_requires_explicit_target_and_confirmation(monkeypatch, capsys):
    monkeypatch.delenv("MINTRUD_CATALOG_DATABASE_URL", raising=False)
    args = ["--expected-host", "postgres", "--expected-database", "test_catalog"]
    assert cli.main(args) == 1
    monkeypatch.setenv(
        "MINTRUD_CATALOG_DATABASE_URL",
        "postgresql+asyncpg://u:private-canary@postgres/test_catalog",
    )
    assert cli.main(args + ["--apply"]) == 1
    assert (
        cli.main(["--expected-host", "wrong", "--expected-database", "test_catalog"])
        == 1
    )
    assert "private-canary" not in capsys.readouterr().out


@pytest.fixture(scope="module")
def catalog_database():
    # A new database on the explicitly isolated test server; never clear application data.
    raw = os.environ.get("MINTRUD_CATALOG_TEST_DATABASE_URL")
    if not raw:
        pytest.skip(
            "Set MINTRUD_CATALOG_TEST_DATABASE_URL for isolated PostgreSQL tests"
        )
    base = make_url(raw)
    assert base.host in {"postgres", "localhost", "127.0.0.1"}
    name = "test_catalog_" + uuid4().hex
    url = base.set(database=name)

    async def database_command(sql):
        engine = create_async_engine(base, isolation_level="AUTOCOMMIT")
        try:
            async with engine.connect() as conn:
                await conn.execute(text(sql))
        finally:
            await engine.dispose()

    asyncio.run(database_command(f"CREATE DATABASE {name}"))
    try:
        subprocess.run(
            ["alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            cwd=Path(__file__).resolve().parents[2],
            env=os.environ
            | {"DATABASE_URL": url.render_as_string(hide_password=False)},
        )
        yield url
    finally:
        asyncio.run(database_command(f"DROP DATABASE {name}"))


def test_real_database_dryrun_apply_idempotence_and_atomic_failure(
    catalog_database, monkeypatch
):
    url = catalog_database

    async def scenario():
        engine = create_async_engine(url)

        async def count():
            async with engine.connect() as conn:
                return (
                    await conn.execute(
                        text("SELECT count(*) FROM mintrud_learn_programs")
                    )
                ).scalar_one()

        try:
            commands = []

            def observe(conn, cursor, statement, parameters, context, executemany):
                commands.append(statement.strip().split()[0].upper())

            event.listen(Engine, "before_cursor_execute", observe)
            try:
                plan = await cli.operate(url)
            finally:
                event.remove(Engine, "before_cursor_execute", observe)
            assert plan["created"] == 28 and plan["committed"] is False
            assert not {"INSERT", "UPDATE", "DELETE"} & set(commands)
            assert await count() == 0
            with pytest.raises(cli.CatalogOperationError, match="Plan changed"):
                await cli.operate(url, apply=True, confirmed_plan="0" * 64)
            assert await count() == 0
            original = cli.sync_mintrud_learn_program_catalog_v109

            async def fail_after_flush(session, *, dry_run=False):
                result = await original(session, dry_run=dry_run)
                if not dry_run:
                    raise RuntimeError("Simulated failure after database writes")
                return result

            monkeypatch.setattr(
                cli, "sync_mintrud_learn_program_catalog_v109", fail_after_flush
            )
            with pytest.raises(RuntimeError):
                await cli.operate(url, apply=True, confirmed_plan=plan["plan_sha256"])
            assert await count() == 0
            monkeypatch.setattr(
                cli, "sync_mintrud_learn_program_catalog_v109", original
            )
            applied = await cli.operate(
                url, apply=True, confirmed_plan=plan["plan_sha256"]
            )
            assert applied["created"] == 28 and applied["committed"] is True
            again = await cli.operate(url)
            assert (
                again["created"],
                again["updated"],
                again["unchanged"],
                again["deactivated"],
            ) == (0, 0, 28, 0)
            await cli.operate(url, apply=True, confirmed_plan=again["plan_sha256"])
            assert await count() == 28
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        "UPDATE mintrud_learn_programs SET is_active=false WHERE learn_program_id=1"
                    )
                )
            with pytest.raises(cli.CatalogOperationError, match="Plan changed"):
                await cli.operate(url, apply=True, confirmed_plan=again["plan_sha256"])
            repair = await cli.operate(url)
            assert repair["updated"] == 1
            await cli.operate(url, apply=True, confirmed_plan=repair["plan_sha256"])
            async with engine.begin() as conn:
                await conn.execute(
                    text("UPDATE alembic_version SET version_num='old_schema'")
                )
            with pytest.raises(cli.CatalogOperationError, match="schema"):
                await cli.operate(url)
        finally:
            await engine.dispose()

    asyncio.run(scenario())
