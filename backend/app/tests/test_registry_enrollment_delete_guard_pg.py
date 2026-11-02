"""Disposable PostgreSQL tests for guarded enrollment deletion."""

import asyncio
import ast
from pathlib import Path

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.registry_obligation import RegistryObligation
from app.models.registry_applicability import (
    RegistryApplicabilityRecord,
    RegistryApplicabilityEvent,
)
from app.services.registry_applicability_writer import (
    persist_registry_applicability,
)
from app.services.registry_enrollment_delete_guard import (
    RegistryEnrollmentDeleteConflict,
    acquire_registry_enrollment_deletion_guard,
)
from test_registry_applicability_writer_pg import (
    _create_enrollment,
    _evaluation,
    pg_applicability_db,
)


def test_route_calls_guard_before_delete():
    path = Path(__file__).parents[1] / "api/v1/org.py"
    tree = ast.parse(path.read_text(encoding="utf-8-sig"))

    functions = [
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "delete_org_group_enrollment"
    ]
    assert len(functions) == 1
    fn = functions[0]

    calls = [
        (node.lineno, node.func.attr if isinstance(node.func, ast.Attribute)
         else node.func.id if isinstance(node.func, ast.Name) else "")
        for node in ast.walk(fn)
        if isinstance(node, ast.Call)
    ]

    fences = [line for line, name in calls
              if name == "acquire_registry_enrollment_deletion_guard"]
    # Count database deletion, not the @router.delete decorator.
    deletes = [
        node.lineno
        for node in ast.walk(fn)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "session"
        and node.func.attr == "delete"
    ]
    commits = [line for line, name in calls if name == "commit"]

    assert len(fences) == 1
    assert len(deletes) == 1
    assert len(commits) == 1
    assert fences[0] < deletes[0] < commits[0]


def test_unprotected_enrollment_can_acquire_deletion_guard(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                enrollment = await acquire_registry_enrollment_deletion_guard(
                    session=session, enrollment_id=enrollment_id,
                )
                assert str(enrollment.id) == str(enrollment_id)
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_existing_obligation_blocks_deletion(pg_applicability_db, registry):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                session.add(RegistryObligation(
                    registry=registry,
                    enrollment_id=enrollment_id,
                    status="pending_data",
                    readiness_errors=[],
                ))

            with pytest.raises(
                RegistryEnrollmentDeleteConflict,
                match="has_obligations",
            ):
                async with maker.begin() as session:
                    await acquire_registry_enrollment_deletion_guard(
                        session=session, enrollment_id=enrollment_id,
                    )

            async with maker() as session:
                count = await session.scalar(
                    select(func.count(RegistryObligation.id)).where(
                        RegistryObligation.enrollment_id == enrollment_id
                    )
                )
                assert count == 1
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_history_without_obligation_blocks_deletion(pg_applicability_db):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                record, changed = await persist_registry_applicability(
                    session=session,
                    enrollment_id=enrollment_id,
                    evaluation=_evaluation("needs_review"),
                    input_fingerprint="a" * 64,
                )
                assert changed
                assert record.decision_version == 1

            with pytest.raises(
                RegistryEnrollmentDeleteConflict,
                match="has_decisions",
            ):
                async with maker.begin() as session:
                    await acquire_registry_enrollment_deletion_guard(
                        session=session, enrollment_id=enrollment_id,
                    )

            async with maker() as session:
                decisions = await session.scalar(
                    select(func.count(RegistryApplicabilityRecord.id))
                    .where(
                        RegistryApplicabilityRecord.enrollment_id
                        == enrollment_id
                    )
                )
                history = await session.scalar(
                    select(func.count(RegistryApplicabilityEvent.id))
                    .where(
                        RegistryApplicabilityEvent.enrollment_id
                        == enrollment_id
                    )
                )
                assert decisions == 1
                assert history == 1
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_guard_waits_for_concurrent_decision(pg_applicability_db):
    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={
                "server_settings": {"statement_timeout": "12000"}
            },
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None

        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                session.add(RegistryObligation(
                    registry="frdo",
                    enrollment_id=enrollment_id,
                    status="pending_data",
                    readiness_errors=[],
                ))

            async def guarded_delete_preflight():
                async with maker.begin() as session:
                    await acquire_registry_enrollment_deletion_guard(
                        session=session, enrollment_id=enrollment_id,
                    )

            async with maker.begin() as writer_session:
                await persist_registry_applicability(
                    session=writer_session,
                    enrollment_id=enrollment_id,
                    evaluation=_evaluation("not_required"),
                )

                task = asyncio.create_task(guarded_delete_preflight())
                await asyncio.sleep(0.3)
                assert not task.done(), (
                    "Delete guard failed to wait for registry decision"
                )

            with pytest.raises(
                RegistryEnrollmentDeleteConflict,
                match="has_obligations",
            ):
                await asyncio.wait_for(task, timeout=12)

            async with maker() as session:
                decision = await session.scalar(
                    select(RegistryApplicabilityRecord.decision)
                    .where(
                        RegistryApplicabilityRecord.enrollment_id
                        == enrollment_id,
                        RegistryApplicabilityRecord.registry == "frdo",
                    )
                )
                assert decision == "not_required"
        finally:
            if task is not None and not task.done():
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())