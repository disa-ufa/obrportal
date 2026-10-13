"""PostgreSQL integration tests for isolated registry applicability writes.

Uses a disposable, uniquely named database created from an explicit CI test
DSN. No application database, production database or legacy row is modified.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
import subprocess
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_applicability import (
    RegistryApplicabilityEvent,
    RegistryApplicabilityRecord,
)
from app.models.registry_obligation import RegistryObligation
from app.models.user import User
from app.services.registry_applicability import RegistryApplicability
from app.services.registry_applicability_writer import (
    ApplicabilityWriteConflict,
    persist_registry_applicability,
)


@pytest.fixture(scope="module")
def pg_applicability_db():
    raw = os.environ.get("REGISTRY_APPLICABILITY_TEST_DATABASE_URL")
    if not raw:
        pytest.skip("Set REGISTRY_APPLICABILITY_TEST_DATABASE_URL for PostgreSQL integration")

    base = make_url(raw)
    if (
        base.drivername != "postgresql+asyncpg"
        or base.host not in {"postgres", "localhost", "127.0.0.1"}
        or base.database != "obrportal"
        or base.query
    ):
        pytest.fail("Only an explicitly configured local ObrPortal test DB is allowed")

    name = "test_registry_app_" + uuid4().hex
    test_url = base.set(database=name)

    async def database_command(sql: str) -> None:
        # Runs only CREATE/DROP DATABASE on the expressly allowed local server.
        engine = create_async_engine(base, isolation_level="AUTOCOMMIT")
        try:
            async with engine.connect() as conn:
                await conn.execute(text(sql))
        finally:
            await engine.dispose()

    asyncio.run(database_command("CREATE DATABASE " + name))
    try:
        subprocess.run(
            ["alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            cwd=Path(__file__).resolve().parents[2],
            env=os.environ
            | {"DATABASE_URL": test_url.render_as_string(hide_password=False)},
        )
        yield test_url
    finally:
        asyncio.run(database_command("DROP DATABASE " + name))


def _evaluation(decision: str, rule: str = "frdo.auto.manual_review"):
    return RegistryApplicability(
        registry="frdo",
        status=decision,
        rule_code=rule,
        rule_version="test-v1",
        reason="Requires classification review",
    )


async def _create_enrollment(maker):
    async with maker.begin() as session:
        user = User(
            email="registry-test-" + uuid4().hex + "@example.invalid",
            hashed_password="not-used-for-login",
        )
        course = Course(slug="registry-test-" + uuid4().hex, title="Isolated registry test")
        session.add_all([user, course])
        await session.flush()
        enrollment = Enrollment(
            user_id=user.id,
            course_id=course.id,
            status="completed",
        )
        session.add(enrollment)
        await session.flush()
        return enrollment.id, user.id


def test_concurrent_insert_is_idempotent_and_manual_override_is_audited(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, actor_id = await _create_enrollment(maker)
            undetermined = _evaluation("needs_review")

            async def insert_once():
                async with maker.begin() as session:
                    _, changed = await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=undetermined,
                        input_fingerprint="a" * 64,
                    )
                    return changed

            first, second = await asyncio.gather(insert_once(), insert_once())
            assert sorted([first, second]) == [False, True]

            async with maker.begin() as session:
                current = (
                    await session.scalars(
                        select(RegistryApplicabilityRecord).where(
                            RegistryApplicabilityRecord.enrollment_id == enrollment_id
                        )
                    )
                ).one()
                events = (
                    await session.scalars(
                        select(RegistryApplicabilityEvent).where(
                            RegistryApplicabilityEvent.applicability_id == current.id
                        )
                    )
                ).all()
                assert current.decision_version == 1
                assert len(events) == 1
                assert events[0].decision == "needs_review"

            approved = _evaluation("required")
            async with maker.begin() as session:
                current, changed = await persist_registry_applicability(
                    session=session,
                    enrollment_id=enrollment_id,
                    evaluation=approved,
                    source="manual",
                    actor_user_id=actor_id,
                    manual_reason="Checked the program and document type",
                    input_fingerprint="a" * 64,
                )
                assert changed and current.decision_version == 2
                record_id = current.id

            async with maker.begin() as session:
                again, changed = await persist_registry_applicability(
                    session=session,
                    enrollment_id=enrollment_id,
                    evaluation=approved,
                    source="manual",
                    actor_user_id=actor_id,
                    manual_reason="Checked the program and document type",
                    input_fingerprint="a" * 64,
                )
                assert not changed
                assert again.decision_version == 2

            with pytest.raises(ApplicabilityWriteConflict, match="Automatic"):
                async with maker.begin() as session:
                    await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=undetermined,
                    )

            async with maker() as session:
                events = (
                    await session.scalars(
                        select(RegistryApplicabilityEvent)
                        .where(RegistryApplicabilityEvent.applicability_id == record_id)
                        .order_by(RegistryApplicabilityEvent.decision_version)
                    )
                ).all()
                assert [e.decision_version for e in events] == [1, 2]
                assert [e.decision for e in events] == ["needs_review", "required"]
                assert events[1].source == "manual"
                assert events[1].decided_by_user_id == actor_id

            # The database itself enforces append-only history, including raw SQL.
            for statement in (
                "UPDATE registry_applicability_events SET reason = 'tampered' WHERE applicability_id = :id",
                "DELETE FROM registry_applicability_events WHERE applicability_id = :id",
            ):
                with pytest.raises(DBAPIError):
                    async with engine.begin() as conn:
                        await conn.execute(text(statement), {"id": record_id})
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_rollback_discards_current_decision_and_history(pg_applicability_db):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            with pytest.raises(RuntimeError, match="simulated failure"):
                async with maker.begin() as session:
                    await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=_evaluation("needs_review"),
                    )
                    raise RuntimeError("simulated failure")

            async with maker() as session:
                assert (
                    await session.scalar(
                        select(RegistryApplicabilityRecord.id).where(
                            RegistryApplicabilityRecord.enrollment_id == enrollment_id
                        )
                    )
                    is None
                )
                assert (
                    await session.scalar(
                        select(RegistryApplicabilityEvent.id).where(
                            RegistryApplicabilityEvent.enrollment_id == enrollment_id
                        )
                    )
                    is None
                )
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_approved_legacy_obligation_requires_separate_reconciliation(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                session.add(
                    RegistryObligation(
                        registry="frdo",
                        enrollment_id=enrollment_id,
                        status="approved",
                        readiness_errors=[],
                    )
                )

            with pytest.raises(ApplicabilityWriteConflict, match="historical"):
                async with maker.begin() as session:
                    await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=_evaluation("required"),
                    )

            async with maker() as session:
                assert (
                    await session.scalar(
                        select(RegistryApplicabilityRecord.id).where(
                            RegistryApplicabilityRecord.enrollment_id == enrollment_id
                        )
                    )
                    is None
                )
                assert (
                    await session.scalar(
                        select(RegistryObligation.status).where(
                            RegistryObligation.enrollment_id == enrollment_id
                        )
                    )
                    == "approved"
                )
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_repeatable_read_keeps_course_classification_stable_during_update(
    pg_applicability_db,
):
    """Concurrent course edit cannot create a mixed old/new snapshot."""
    from app.services.registry_applicability_snapshot import (
        load_consistent_registry_applicability_inputs,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        stable_engine = engine.execution_options(isolation_level="REPEATABLE READ")
        stable_maker = async_sessionmaker(stable_engine, expire_on_commit=False)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                enrollment = await session.get(Enrollment, enrollment_id)
                course = await session.get(Course, enrollment.course_id)
                course.regulatory_program_type = "occupational_safety_training"
                course.frdo_requirement_mode = "auto"
                await session.flush()
                obligation = RegistryObligation(
                    registry="frdo",
                    enrollment_id=enrollment_id,
                    status="needs_approval",
                    readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()
                obligation_id = obligation.id
                course_id = course.id

            async with stable_maker.begin() as snapshot:
                # The first SELECT establishes the PostgreSQL snapshot.
                obligation = await snapshot.get(RegistryObligation, obligation_id)
                before = await load_consistent_registry_applicability_inputs(
                    session=snapshot, obligation=obligation
                )
                assert before.evaluation.status == "needs_review"

                async with maker.begin() as writer:
                    updated = await writer.get(Course, course_id)
                    updated.regulatory_program_type = "dpo_advanced_training"

                after = await load_consistent_registry_applicability_inputs(
                    session=snapshot, obligation=obligation
                )
                assert before.fingerprint == after.fingerprint
                assert after.evaluation.status == "needs_review"

            async with stable_maker.begin() as fresh:
                obligation = await fresh.get(RegistryObligation, obligation_id)
                changed = await load_consistent_registry_applicability_inputs(
                    session=fresh, obligation=obligation
                )
                assert changed.evaluation.status == "required"
                assert changed.fingerprint != before.fingerprint
        finally:
            await stable_engine.dispose()
            await engine.dispose()

    asyncio.run(scenario())


def test_legacy_reconciliation_sql_on_disposable_postgres(pg_applicability_db):
    """Real SQL checks prior attempts, batch membership and no DB mutation."""
    from app.registry_applicability_reconciliation_cli import (
        get_reconciliation_preview,
    )
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.models.registry_submission_batch import (
        RegistrySubmissionBatch,
        RegistrySubmissionBatchItem,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            cases = [
                ("frdo", "needs_approval", "occupational_safety_training", "review"),
                ("mintrud", "pending_data", "occupational_safety_training", "required"),
                ("frdo", "approved", "occupational_safety_training", "protected"),
                ("mintrud", "pending_data", "occupational_safety_training", "attempt"),
                ("frdo", "pending_data", "occupational_safety_training", "batch"),
            ]
            created = []
            for registry, status, program_type, proof in cases:
                enrollment_id, _ = await _create_enrollment(maker)
                async with maker.begin() as session:
                    enrollment = await session.get(Enrollment, enrollment_id)
                    course = await session.get(Course, enrollment.course_id)
                    course.regulatory_program_type = program_type
                    course.frdo_requirement_mode = "auto"
                    course.mintrud_requirement_mode = "auto"
                    await session.flush()
                    o = RegistryObligation(
                        registry=registry, enrollment_id=enrollment_id,
                        status=status, readiness_errors=[],
                    )
                    session.add(o)
                    await session.flush()
                    if proof == "attempt":
                        session.add(RegistrySubmissionAttempt(
                            obligation_id=o.id, attempt_no=1,
                            snapshot_json={}, errors_json=[],
                        ))
                    if proof == "batch":
                        batch = RegistrySubmissionBatch(
                            registry="frdo", schema_version="frdo-po-working-reference-v1",
                            obligation_count=1, record_count=1, artifact_path="test-only.xlsx",
                            artifact_sha256="0" * 64,
                        )
                        session.add(batch)
                        await session.flush()
                        session.add(RegistrySubmissionBatchItem(
                            batch_id=batch.id, obligation_id=o.id,
                            position=0, record_count=1,
                            approval_snapshot_json={}, approval_fingerprint="0" * 64,
                        ))
                    created.append((registry, proof, o.id))

            async with maker() as session:
                before = (
                    (await session.scalar(select(text("count(*)")).select_from(RegistryObligation))),
                    (await session.scalar(select(text("count(*)")).select_from(RegistrySubmissionAttempt))),
                    (await session.scalar(select(text("count(*)")).select_from(RegistryApplicabilityRecord))),
                )

            report = await get_reconciliation_preview(pg_applicability_db)
            assert report["record_count"] == len(cases)
            assert report["handling_counts"]["unresolved_manual_review"] == 1
            assert report["handling_counts"]["candidate_required_for_review"] == 1
            assert report["handling_counts"]["preserve_lifecycle_and_evidence"] == 3
            assert report["database_writes"] == 0
            assert report["classification_applied"] is False

            async with maker() as session:
                after = (
                    (await session.scalar(select(text("count(*)")).select_from(RegistryObligation))),
                    (await session.scalar(select(text("count(*)")).select_from(RegistrySubmissionAttempt))),
                    (await session.scalar(select(text("count(*)")).select_from(RegistryApplicabilityRecord))),
                )
            assert before == after
        finally:
            await engine.dispose()

    asyncio.run(scenario())
