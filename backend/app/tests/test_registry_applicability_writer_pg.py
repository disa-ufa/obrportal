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
from app.services.registry_action_lockset import RegistrySourceFence
from app.services.registry_source_write_scope import acquire_discovered_registry_source_write_scope


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
            # The disposable database is shared by earlier module tests.
            # Capture its existing historical rows before inserting our cases.
            baseline_report = await get_reconciliation_preview(pg_applicability_db)
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
            # Only the five newly inserted cases should contribute to this
            # report delta; never assume a module-scoped test DB was empty.
            assert report["record_count"] - baseline_report["record_count"] == len(cases)
            expected_deltas = {
                "frdo": {
                    "unresolved_manual_review": 1,
                    "preserve_lifecycle_and_evidence": 2,
                },
                "mintrud": {
                    "candidate_required_for_review": 1,
                    "preserve_lifecycle_and_evidence": 1,
                },
            }
            expected_counts = dict(baseline_report["handling_counts"])
            expected_by_registry = {
                registry: dict(counts)
                for registry, counts in baseline_report["registry_counts"].items()
            }
            for registry, additions in expected_deltas.items():
                registry_counts = expected_by_registry.setdefault(registry, {})
                for handling, count in additions.items():
                    expected_counts[handling] = expected_counts.get(handling, 0) + count
                    registry_counts[handling] = registry_counts.get(handling, 0) + count
            assert report["handling_counts"] == expected_counts
            assert report["registry_counts"] == expected_by_registry
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


@pytest.mark.parametrize("historical_evidence", ["approval", "attempt", "batch"])
def test_pending_legacy_evidence_blocks_generic_writer(
    pg_applicability_db, historical_evidence
):
    """A pending status must not erase approval or submission evidence."""
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.models.registry_submission_batch import (
        RegistrySubmissionBatch,
        RegistrySubmissionBatchItem,
    )
    from app.models.base import utcnow

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                obligation = RegistryObligation(
                    registry="frdo", enrollment_id=enrollment_id,
                    status="pending_data", readiness_errors=[],
                )
                if historical_evidence == "approval":
                    obligation.approved_at = utcnow()
                    obligation.approval_snapshot_json = {}
                session.add(obligation)
                await session.flush()
                if historical_evidence == "attempt":
                    session.add(RegistrySubmissionAttempt(
                        obligation_id=obligation.id, attempt_no=1,
                        snapshot_json={}, errors_json=[],
                    ))
                elif historical_evidence == "batch":
                    batch = RegistrySubmissionBatch(
                        registry="frdo",
                        schema_version="frdo-po-working-reference-v1",
                        obligation_count=1, record_count=1,
                        artifact_path="test-only.xlsx", artifact_sha256="0" * 64,
                    )
                    session.add(batch)
                    await session.flush()
                    session.add(RegistrySubmissionBatchItem(
                        batch_id=batch.id, obligation_id=obligation.id,
                        position=0, record_count=1,
                        approval_snapshot_json={}, approval_fingerprint="0" * 64,
                    ))
                obligation_id = obligation.id

            with pytest.raises(ApplicabilityWriteConflict, match="historical"):
                async with maker.begin() as session:
                    await persist_registry_applicability(
                        session=session, enrollment_id=enrollment_id,
                        evaluation=_evaluation("required"),
                    )

            async with maker() as session:
                assert await session.scalar(
                    select(RegistryApplicabilityRecord.id).where(
                        RegistryApplicabilityRecord.enrollment_id == enrollment_id
                    )
                ) is None
                row = await session.get(RegistryObligation, obligation_id)
                assert row.status == "pending_data"
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("legacy_action", ["attempt", "approval"])
def test_concurrent_legacy_evidence_commits_before_writer_reclassifies(
    pg_applicability_db, legacy_action
):
    """Writer must wait on obligation row, then see committed legacy evidence.

    IMPORTANT: This proves only the legacy-first ordering. The opposite
    ordering remains unsafe until all approval/export paths check persisted
    applicability under the same lock, and therefore must not be enabled.
    """
    from app.models.base import utcnow
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.services.compliance_registry_attempts import (
        create_registry_submission_attempt,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        action_committed = asyncio.Event()
        action_pending = asyncio.Event()
        allow_legacy_commit = asyncio.Event()
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                obligation = RegistryObligation(
                    registry="frdo",
                    enrollment_id=enrollment_id,
                    status="pending_data",
                    readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()
                obligation_id = obligation.id

            async def legacy_write():
                async with maker.begin() as session:
                    if legacy_action == "attempt":
                        await create_registry_submission_attempt(
                            session,
                            obligation_id=obligation_id,
                            snapshot={"isolated_test": True},
                            generated_by_user_id=None,
                        )
                    else:
                        row = (
                            await session.execute(
                                select(RegistryObligation)
                                .where(RegistryObligation.id == obligation_id)
                                .with_for_update()
                            )
                        ).scalar_one()
                        row.approved_at = utcnow()
                        row.approval_snapshot_json = {"isolated_test": True}
                        await session.flush()
                    action_pending.set()
                    await asyncio.wait_for(allow_legacy_commit.wait(), timeout=8)
                action_committed.set()

            async def decision_write():
                async with maker.begin() as session:
                    return await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=_evaluation("required"),
                    )

            legacy_task = asyncio.create_task(legacy_write())
            decision_task = None
            try:
                await asyncio.wait_for(action_pending.wait(), timeout=8)
                decision_task = asyncio.create_task(decision_write())
                # This assertion confirms that the decision cannot complete
                # while the competing legacy transaction owns the row lock.
                with pytest.raises(asyncio.TimeoutError):
                    await asyncio.wait_for(
                        asyncio.shield(decision_task), timeout=0.25
                    )
            finally:
                allow_legacy_commit.set()

            await asyncio.wait_for(legacy_task, timeout=8)
            assert action_committed.is_set()
            assert decision_task is not None
            with pytest.raises(ApplicabilityWriteConflict, match="historical"):
                await asyncio.wait_for(decision_task, timeout=8)

            async with maker() as session:
                assert (
                    await session.scalar(
                        select(RegistryApplicabilityRecord.id).where(
                            RegistryApplicabilityRecord.enrollment_id == enrollment_id
                        )
                    )
                ) is None
                assert (
                    await session.scalar(
                        select(RegistryApplicabilityEvent.id).where(
                            RegistryApplicabilityEvent.enrollment_id == enrollment_id
                        )
                    )
                ) is None
                row = await session.get(RegistryObligation, obligation_id)
                assert row.status == "pending_data"
                if legacy_action == "attempt":
                    assert await session.scalar(
                        select(RegistrySubmissionAttempt.id).where(
                            RegistrySubmissionAttempt.obligation_id == obligation_id
                        )
                    ) is not None
                else:
                    assert row.approved_at is not None
                    assert row.approval_snapshot_json == {"isolated_test": True}
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("decision", "expected_code"),
    [
        ("not_required", "registry.applicability_not_required"),
        ("needs_review", "registry.applicability_needs_review"),
    ],
)
def test_opt_in_gate_rejects_decision_first_regardless_of_legacy_status(
    pg_applicability_db, decision, expected_code
):
    """The opt-in guard correctly refuses a committed excluded/review decision."""
    from app.services.registry_applicability_export_guard import (
        RegistryApplicabilityGateError,
        require_registry_applicability_for_submission,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                obligation = RegistryObligation(
                    registry="frdo", enrollment_id=enrollment_id,
                    status="pending_data", readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()
                obligation_id = obligation.id

            async with maker.begin() as session:
                await persist_registry_applicability(
                    session=session, enrollment_id=enrollment_id,
                    evaluation=_evaluation(decision),
                )

            async with maker.begin() as session:
                obligation = (
                    await session.execute(
                        select(RegistryObligation)
                        .where(RegistryObligation.id == obligation_id)
                        .with_for_update()
                    )
                ).scalar_one()
                with pytest.raises(RegistryApplicabilityGateError) as exc:
                    await require_registry_applicability_for_submission(
                        session=session, obligation=obligation,
                        expected_input_fingerprint=None,
                    )
                assert exc.value.code == expected_code
                assert obligation.status == "pending_data"
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("decision", ["not_required", "needs_review"])
def test_known_gap_decision_first_does_not_yet_block_legacy_attempt(
    pg_applicability_db, decision
):
    """Regression marker: legacy attempt path bypasses the new decision.

    The outcome is an expected failure until EVERY approval/export/attempt
    entry point runs an applicability gate under the same obligation lock.
    The test deliberately marks only that confirmed unsafe outcome as XFAIL;
    unexpected database errors remain ordinary CI failures.
    """
    from sqlalchemy import func
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.services.compliance_registry_attempts import (
        RegistrySubmissionAttemptError,
        create_registry_submission_attempt,
    )
    from app.services.registry_applicability_export_guard import (
        RegistryApplicabilityGateError,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        decision_pending = asyncio.Event()
        allow_commit = asyncio.Event()
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                obligation = RegistryObligation(
                    registry="frdo", enrollment_id=enrollment_id,
                    status="pending_data", readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()
                obligation_id = obligation.id

            async def write_decision():
                async with maker.begin() as session:
                    await persist_registry_applicability(
                        session=session, enrollment_id=enrollment_id,
                        evaluation=_evaluation(decision),
                    )
                    decision_pending.set()
                    await asyncio.wait_for(allow_commit.wait(), timeout=8)

            async def create_legacy_attempt():
                try:
                    async with maker.begin() as session:
                        await create_registry_submission_attempt(
                            session,
                            obligation_id=obligation_id,
                            snapshot={"isolated_test": True},
                            generated_by_user_id=None,
                        )
                except (RegistrySubmissionAttemptError, RegistryApplicabilityGateError):
                    # Once the legacy route has been guarded it should reject
                    # this attempt, leaving no evidence row behind.
                    pass

            writer = asyncio.create_task(write_decision())
            attempt = None
            try:
                await asyncio.wait_for(decision_pending.wait(), timeout=8)
                attempt = asyncio.create_task(create_legacy_attempt())
                with pytest.raises(asyncio.TimeoutError):
                    await asyncio.wait_for(asyncio.shield(attempt), timeout=0.25)
            finally:
                allow_commit.set()

            await asyncio.wait_for(writer, timeout=8)
            assert attempt is not None
            await asyncio.wait_for(attempt, timeout=8)

            async with maker() as session:
                count = await session.scalar(
                    select(func.count(RegistrySubmissionAttempt.id)).where(
                        RegistrySubmissionAttempt.obligation_id == obligation_id
                    )
                )
                row = await session.scalar(
                    select(RegistryApplicabilityRecord).where(
                        RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                        RegistryApplicabilityRecord.registry == "frdo",
                    )
                )
                assert row is not None
                assert row.decision == decision
                assert row.decision_version == 1
                assert await session.scalar(
                    select(func.count(RegistryApplicabilityEvent.id)).where(
                        RegistryApplicabilityEvent.enrollment_id == enrollment_id
                    )
                ) == 1
                return count
        finally:
            await engine.dispose()

    created_attempts = asyncio.run(scenario())
    if created_attempts:
        pytest.xfail(
            "KNOWN GAP: legacy attempt creation ignores the committed "
            + decision + " applicability decision"
        )
    assert created_attempts == 0


async def _wait_for_pg_blocker(engine, waiter_pid, blocker_pid):
    """Prove actual lock contention, not merely that a task was scheduled."""
    async def observe():
        async with engine.connect() as conn:
            while True:
                blocked = await conn.scalar(
                    text("SELECT :blocker = ANY(pg_blocking_pids(:waiter))"),
                    {"blocker": blocker_pid, "waiter": waiter_pid},
                )
                if blocked:
                    return
                await asyncio.sleep(0.01)
    await asyncio.wait_for(observe(), timeout=5)


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("evidence", ["approved", "exported", "submitted", "approval", "attempt", "batch"])
@pytest.mark.parametrize("commit_evidence", [True, False])
def test_cached_obligation_cannot_hide_concurrent_history(
    pg_applicability_db, registry, evidence, commit_evidence,
):
    """A row lock must refresh a previously loaded ORM object before policy checks."""
    from app.models.base import utcnow
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.models.registry_submission_batch import RegistrySubmissionBatch, RegistrySubmissionBatchItem

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, registry)
            async with maker.begin() as stale:
                cached = await stale.get(RegistryObligation, obligation_id)
                assert cached.status == "pending_data" and cached.approved_at is None
                stale_pid = await stale.scalar(text("SELECT pg_backend_pid()"))
                async with maker() as legacy:
                    async with legacy.begin():
                        legacy_pid = await legacy.scalar(text("SELECT pg_backend_pid()"))
                        row = await legacy.scalar(select(RegistryObligation).where(
                            RegistryObligation.id == obligation_id,
                        ).with_for_update())
                        if evidence in {"approved", "exported", "submitted"}:
                            row.status = evidence
                        elif evidence == "approval":
                            row.approved_at = utcnow()
                            row.approval_snapshot_json = {"history": "keep"}
                            row.approval_fingerprint = "a" * 64
                        elif evidence == "attempt":
                            legacy.add(RegistrySubmissionAttempt(
                                obligation_id=obligation_id, attempt_no=1,
                                snapshot_json={"history": "keep"}, errors_json=[],
                            ))
                        else:
                            batch = RegistrySubmissionBatch(
                                registry=registry,
                                schema_version=("frdo-po-working-reference-v1" if registry == "frdo" else "1.0.9"),
                                obligation_count=1, record_count=1,
                                artifact_path="test-only.bin", artifact_sha256="a" * 64,
                            )
                            legacy.add(batch)
                            await legacy.flush()
                            legacy.add(RegistrySubmissionBatchItem(
                                batch_id=batch.id, obligation_id=obligation_id,
                                position=0, record_count=1,
                                approval_snapshot_json={"history": "keep"},
                                approval_fingerprint="a" * 64,
                            ))
                        await legacy.flush()
                        task = asyncio.create_task(persist_registry_applicability(
                            session=stale, enrollment_id=enrollment_id,
                            evaluation=_veto_evaluation(registry, "needs_review"),
                        ))
                        await _wait_for_pg_blocker(engine, stale_pid, legacy_pid)
                        assert not task.done()
                        if not commit_evidence:
                            await legacy.rollback()
                if commit_evidence:
                    with pytest.raises(ApplicabilityWriteConflict, match="historical"):
                        await asyncio.wait_for(task, timeout=8)
                    await stale.rollback()
                else:
                    _, changed = await asyncio.wait_for(task, timeout=8)
                    assert changed and cached.status == "pending_data"

            async with maker() as check:
                row = await check.get(RegistryObligation, obligation_id)
                assert row.status == (evidence if commit_evidence and evidence in {
                    "approved", "exported", "submitted",
                } else "pending_data")
                assert row.approval_snapshot_json == (
                    {"history": "keep"} if commit_evidence and evidence == "approval" else None
                )
                attempts = (await check.scalars(select(RegistrySubmissionAttempt).where(
                    RegistrySubmissionAttempt.obligation_id == obligation_id,
                ))).all()
                items = (await check.scalars(select(RegistrySubmissionBatchItem).where(
                    RegistrySubmissionBatchItem.obligation_id == obligation_id,
                ))).all()
                assert len(attempts) == int(commit_evidence and evidence == "attempt")
                assert len(items) == int(commit_evidence and evidence == "batch")
                if attempts:
                    assert attempts[0].snapshot_json == {"history": "keep"}
                if items:
                    assert items[0].approval_snapshot_json == {"history": "keep"}
                for model in (RegistryApplicabilityRecord, RegistryApplicabilityEvent):
                    rows = (await check.scalars(select(model).where(
                        model.enrollment_id == enrollment_id, model.registry == registry,
                    ))).all()
                    assert [row.decision for row in rows] == ([] if commit_evidence else ["needs_review"])
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("revision", ["manual", "auto", "idempotent"])
def test_cached_decision_writer_preserves_provenance_and_versions(
    pg_applicability_db, registry, revision,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, actor_id = await _create_enrollment(maker)
            async with maker.begin() as first:
                await persist_registry_applicability(
                    session=first, enrollment_id=enrollment_id,
                    evaluation=_veto_evaluation(registry, "required"),
                )
            async with maker.begin() as stale:
                cached = await stale.scalar(select(RegistryApplicabilityRecord).where(
                    RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                    RegistryApplicabilityRecord.registry == registry,
                ))
                assert cached.source == "auto" and cached.decision_version == 1
                async with maker.begin() as latest:
                    await persist_registry_applicability(
                        session=latest, enrollment_id=enrollment_id,
                        evaluation=_veto_evaluation(registry, "needs_review"),
                        **({"source": "manual", "actor_user_id": actor_id,
                            "manual_reason": "Reviewed synthetic evidence"} if revision == "manual" else {}),
                    )
                if revision == "manual":
                    with pytest.raises(ApplicabilityWriteConflict, match="Automatic"):
                        await persist_registry_applicability(
                            session=stale, enrollment_id=enrollment_id,
                            evaluation=_veto_evaluation(registry, "not_required"),
                        )
                else:
                    current, changed = await persist_registry_applicability(
                        session=stale, enrollment_id=enrollment_id,
                        evaluation=_veto_evaluation(registry, "needs_review" if revision == "idempotent" else "not_required"),
                    )
                    assert current is cached
                    assert changed == (revision == "auto")
                    assert current.decision_version == (3 if changed else 2)
            async with maker() as check:
                events = (await check.scalars(select(RegistryApplicabilityEvent).where(
                    RegistryApplicabilityEvent.enrollment_id == enrollment_id,
                ).order_by(RegistryApplicabilityEvent.decision_version))).all()
                assert [row.decision_version for row in events] == ([1, 2, 3] if revision == "auto" else [1, 2])
                assert events[1].source == ("manual" if revision == "manual" else "auto")
                if revision == "manual":
                    assert events[1].decided_by_user_id == actor_id
                current = await check.get(RegistryApplicabilityRecord, events[0].applicability_id)
                assert current.decision_version == events[-1].decision_version
                assert current.source == events[-1].source
                assert current.decision == events[-1].decision
        finally:
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", ["needs_review", "not_required", "required"])
@pytest.mark.parametrize("commit_revision", [True, False])
def test_cached_gate_cannot_grant_using_old_decision_or_fingerprint(
    pg_applicability_db, registry, decision, commit_revision,
):
    from app.services.registry_applicability_export_guard import (
        RegistryApplicabilityGateError, require_registry_applicability_for_submission,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, registry)
            async with maker.begin() as first:
                await persist_registry_applicability(
                    session=first, enrollment_id=enrollment_id,
                    evaluation=_veto_evaluation(registry, "required"), input_fingerprint="a" * 64,
                )
            async with maker.begin() as stale:
                cached = await stale.scalar(select(RegistryApplicabilityRecord).where(
                    RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                    RegistryApplicabilityRecord.registry == registry,
                ))
                assert cached.decision == "required" and cached.input_fingerprint == "a" * 64
                stale_pid = await stale.scalar(text("SELECT pg_backend_pid()"))

                async def check_gate():
                    # The existing dormant gate contract requires this shared
                    # obligation lock BEFORE its applicability row lock.
                    obligation = await stale.scalar(select(RegistryObligation).where(
                        RegistryObligation.id == obligation_id,
                    ).with_for_update())
                    return await require_registry_applicability_for_submission(
                        session=stale, obligation=obligation, expected_input_fingerprint="a" * 64,
                    )

                async with maker() as latest:
                    async with latest.begin():
                        latest_pid = await latest.scalar(text("SELECT pg_backend_pid()"))
                        await persist_registry_applicability(
                            session=latest, enrollment_id=enrollment_id,
                            evaluation=_veto_evaluation(registry, decision), input_fingerprint="b" * 64,
                        )
                        task = asyncio.create_task(check_gate())
                        await _wait_for_pg_blocker(engine, stale_pid, latest_pid)
                        if not commit_revision:
                            await latest.rollback()
                if commit_revision:
                    with pytest.raises(RegistryApplicabilityGateError) as exc:
                        await asyncio.wait_for(task, timeout=8)
                    assert exc.value.code == "registry.applicability_" + (
                        "stale" if decision == "required" else decision
                    )
                    assert cached.decision_version == 2
                else:
                    grant = await asyncio.wait_for(task, timeout=8)
                    assert grant.decision_version == 1 and grant.input_fingerprint == "a" * 64
            async with maker() as check:
                row = await check.get(RegistryObligation, obligation_id)
                assert row.status == "pending_data" and row.approved_at is None
                events = (await check.scalars(select(RegistryApplicabilityEvent).where(
                    RegistryApplicabilityEvent.enrollment_id == enrollment_id,
                ).order_by(RegistryApplicabilityEvent.decision_version))).all()
                assert [event.input_fingerprint for event in events] == (
                    ["a" * 64, "b" * 64] if commit_revision else ["a" * 64]
                )
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())


async def _veto_fixture(maker, registry, initial_required=False):
    enrollment_id, _ = await _create_enrollment(maker)
    async with maker.begin() as session:
        obligation = RegistryObligation(
            registry=registry, enrollment_id=enrollment_id,
            status="pending_data", readiness_errors=[],
        )
        session.add(obligation)
        await session.flush()
        if initial_required:
            await persist_registry_applicability(
                session=session, enrollment_id=enrollment_id,
                evaluation=_veto_evaluation(registry, "required"),
            )
        return enrollment_id, obligation.id


def _veto_evaluation(registry, decision):
    return RegistryApplicability(
        registry=registry, status=decision, rule_code="test.veto",
        rule_version="test-v1", reason="Synthetic test decision",
    )


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", ["not_required", "needs_review"])
@pytest.mark.parametrize("initial_required", [False, True])
@pytest.mark.parametrize("commit_decision", [False, True])
def test_enabled_attempt_veto_serializes_after_decision(
    pg_applicability_db, monkeypatch, registry, decision, initial_required, commit_decision,
):
    """Decision-first commit vetoes; rollback allows legacy behavior.

    Includes first insertion and a cached required decision revised in another
    connection. All contention is observed through PostgreSQL's lock graph.
    """
    from app.core.config import settings
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.services.compliance_registry_attempts import (
        RegistrySubmissionAttemptError, create_registry_submission_attempt,
    )
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        start_attempt = asyncio.Event()
        snapshot_ready = asyncio.Event()
        attempt_pid = asyncio.get_running_loop().create_future()
        task = None
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, registry, initial_required)

            async def attempt():
                async with maker.begin() as session:
                    cached = await session.scalar(select(RegistryApplicabilityRecord).where(
                        RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                        RegistryApplicabilityRecord.registry == registry,
                    ))
                    assert (cached is not None) == initial_required
                    snapshot_ready.set()
                    await asyncio.wait_for(start_attempt.wait(), timeout=8)
                    attempt_pid.set_result(await session.scalar(text("SELECT pg_backend_pid()")))
                    result = await create_registry_submission_attempt(
                        session, obligation_id=obligation_id,
                        snapshot={"test": True}, generated_by_user_id=None,
                    )
                    # Keep a strong reference until after the guarded call.
                    if cached is not None:
                        assert cached.decision == "required"
                    return result.id

            task = asyncio.create_task(attempt())
            await asyncio.wait_for(snapshot_ready.wait(), timeout=8)
            async with maker() as writer:
                async with writer.begin():
                    writer_pid = await writer.scalar(text("SELECT pg_backend_pid()"))
                    await persist_registry_applicability(
                        session=writer, enrollment_id=enrollment_id,
                        evaluation=_veto_evaluation(registry, decision),
                    )
                    start_attempt.set()
                    pid = await asyncio.wait_for(attempt_pid, timeout=8)
                    await _wait_for_pg_blocker(engine, pid, writer_pid)
                    assert not task.done()
                    if not commit_decision:
                        await writer.rollback()

            if commit_decision:
                with pytest.raises(RegistrySubmissionAttemptError) as exc:
                    await asyncio.wait_for(task, timeout=8)
                assert str(exc.value) == "registry.applicability_" + decision
            else:
                assert await asyncio.wait_for(task, timeout=8)

            async with maker() as session:
                attempts = (await session.scalars(select(RegistrySubmissionAttempt).where(
                    RegistrySubmissionAttempt.obligation_id == obligation_id,
                ))).all()
                assert len(attempts) == (0 if commit_decision else 1)
                events = (await session.scalars(select(RegistryApplicabilityEvent).where(
                    RegistryApplicabilityEvent.enrollment_id == enrollment_id,
                ).order_by(RegistryApplicabilityEvent.decision_version))).all()
                assert [e.decision for e in events] == (
                    (["required"] if initial_required else [])
                    + ([decision] if commit_decision else [])
                )
                assert (await session.get(RegistryObligation, obligation_id)).status == "pending_data"
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", ["not_required", "needs_review"])
@pytest.mark.parametrize("commit_attempt", [False, True])
def test_enabled_attempt_veto_reverse_order_preserves_evidence(
    pg_applicability_db, monkeypatch, registry, decision, commit_attempt,
):
    """Attempt-first commit prevents reclassification; rollback leaves no evidence."""
    from app.core.config import settings
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.services.compliance_registry_attempts import create_registry_submission_attempt
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        writer_pid = asyncio.get_running_loop().create_future()
        task = None
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, registry)

            async def write_decision():
                async with maker.begin() as session:
                    writer_pid.set_result(await session.scalar(text("SELECT pg_backend_pid()")))
                    await persist_registry_applicability(
                        session=session, enrollment_id=enrollment_id,
                        evaluation=_veto_evaluation(registry, decision),
                    )

            async with maker() as exporter:
                async with exporter.begin():
                    exporter_pid = await exporter.scalar(text("SELECT pg_backend_pid()"))
                    await create_registry_submission_attempt(
                        exporter, obligation_id=obligation_id,
                        snapshot={"test": True}, generated_by_user_id=None,
                    )
                    task = asyncio.create_task(write_decision())
                    pid = await asyncio.wait_for(writer_pid, timeout=8)
                    await _wait_for_pg_blocker(engine, pid, exporter_pid)
                    assert not task.done()
                    if not commit_attempt:
                        await exporter.rollback()
            if commit_attempt:
                with pytest.raises(ApplicabilityWriteConflict, match="historical"):
                    await asyncio.wait_for(task, timeout=8)
            else:
                await asyncio.wait_for(task, timeout=8)
            async with maker() as session:
                attempts = (await session.scalars(select(RegistrySubmissionAttempt).where(
                    RegistrySubmissionAttempt.obligation_id == obligation_id,
                ))).all()
                assert len(attempts) == int(commit_attempt)
                if attempts:
                    assert attempts[0].snapshot_json == {"test": True}
                events = (await session.scalars(select(RegistryApplicabilityEvent).where(
                    RegistryApplicabilityEvent.enrollment_id == enrollment_id,
                ))).all()
                assert [e.decision for e in events] == ([] if commit_attempt else [decision])
                assert (await session.get(RegistryObligation, obligation_id)).status == "pending_data"
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("isolation", ["REPEATABLE READ", "SERIALIZABLE"])
def test_enabled_attempt_veto_rejects_old_snapshot_even_after_decision_commit(
    pg_applicability_db, monkeypatch, isolation,
):
    from app.core.config import settings
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.services.compliance_registry_attempts import (
        RegistrySubmissionAttemptError, create_registry_submission_attempt,
    )
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        stable = async_sessionmaker(engine.execution_options(isolation_level=isolation))
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, "frdo")
            with pytest.raises(RegistrySubmissionAttemptError, match="requires_read_committed"):
                async with stable.begin() as snapshot:
                    # Establish a snapshot BEFORE the first decision is committed.
                    assert await snapshot.scalar(select(RegistryApplicabilityRecord.id).where(
                        RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                    )) is None
                    async with maker.begin() as writer:
                        await persist_registry_applicability(
                            session=writer, enrollment_id=enrollment_id,
                            evaluation=_veto_evaluation("frdo", "not_required"),
                        )
                    await create_registry_submission_attempt(
                        snapshot, obligation_id=obligation_id,
                        snapshot={"test": True}, generated_by_user_id=None,
                    )
            async with maker() as session:
                assert await session.scalar(select(RegistrySubmissionAttempt.id).where(
                    RegistrySubmissionAttempt.obligation_id == obligation_id,
                )) is None
        finally:
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", [None, "required", "not_required", "needs_review"])
def test_attempt_veto_preserves_historical_approval_and_attempts(
    pg_applicability_db, monkeypatch, registry, decision,
):
    from app.core.config import settings
    from app.models.base import utcnow
    from app.models.registry_obligation import RegistrySubmissionAttempt
    from app.services.compliance_registry_attempts import (
        RegistrySubmissionAttemptError, create_registry_submission_attempt,
    )
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, registry)
            approved_at = utcnow()
            async with maker.begin() as session:
                # Synthetic conflicting history, not a backfill procedure.
                if decision is not None:
                    await persist_registry_applicability(
                        session=session, enrollment_id=enrollment_id,
                        evaluation=_veto_evaluation(registry, decision),
                    )
                row = await session.get(RegistryObligation, obligation_id)
                row.status = "approved"
                row.approved_at = approved_at
                row.approval_snapshot_json = {"historical": True}
                row.approval_fingerprint = "a" * 64
                session.add(RegistrySubmissionAttempt(
                    obligation_id=obligation_id, attempt_no=1,
                    snapshot_json={"old_attempt": True}, errors_json=[],
                ))
            blocked = decision in {"not_required", "needs_review"}
            try:
                async with maker.begin() as session:
                    await create_registry_submission_attempt(
                        session, obligation_id=obligation_id,
                        snapshot={"new_attempt": True}, generated_by_user_id=None,
                    )
            except RegistrySubmissionAttemptError as exc:
                assert blocked
                assert str(exc) == "registry.applicability_" + decision
            else:
                assert not blocked
            async with maker() as session:
                row = await session.get(RegistryObligation, obligation_id)
                assert row.status == "approved"
                assert row.approved_at == approved_at
                assert row.approval_snapshot_json == {"historical": True}
                assert row.approval_fingerprint == "a" * 64
                attempts = (await session.scalars(select(RegistrySubmissionAttempt).where(
                    RegistrySubmissionAttempt.obligation_id == obligation_id,
                ).order_by(RegistrySubmissionAttempt.attempt_no))).all()
                assert len(attempts) == (1 if blocked else 2)
                assert attempts[0].snapshot_json == {"old_attempt": True}
                events = (await session.scalars(select(RegistryApplicabilityEvent).where(
                    RegistryApplicabilityEvent.enrollment_id == enrollment_id,
                ))).all()
                assert [e.decision for e in events] == ([] if decision is None else [decision])
        finally:
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_attempt_veto_does_not_apply_the_other_registry_decision(
    pg_applicability_db, monkeypatch, registry,
):
    from app.core.config import settings
    from app.services.compliance_registry_attempts import create_registry_submission_attempt
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, obligation_id = await _veto_fixture(maker, registry)
            other = "mintrud" if registry == "frdo" else "frdo"
            async with maker.begin() as session:
                await persist_registry_applicability(
                    session=session, enrollment_id=enrollment_id,
                    evaluation=_veto_evaluation(other, "not_required"),
                )
            async with maker.begin() as session:
                attempt = await create_registry_submission_attempt(
                    session, obligation_id=obligation_id,
                    snapshot={"test": True}, generated_by_user_id=None,
                )
                assert attempt.attempt_no == 1
        finally:
            await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_action_lockset_reverse_batch_order_serializes_without_deadlock(
    pg_applicability_db, registry
):
    """Both opposite input orders must take an identical global lock order."""
    from app.services.registry_action_lockset import (
        RegistrySourceFence,
        RegistryObligationTarget,
        acquire_registry_new_action_lockset,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        first_locked = asyncio.Event()
        second_started = asyncio.Event()
        second_pid = None
        release_first = asyncio.Event()
        first_task = None
        second_task = None
        try:
            targets = []
            for _ in range(2):
                enrollment_id, _ = await _create_enrollment(maker)
                async with maker.begin() as session:
                    row = RegistryObligation(
                        enrollment_id=enrollment_id,
                        registry=registry,
                        status="pending_data",
                        readiness_errors=[],
                    )
                    session.add(row)
                    await session.flush()
                    targets.append(RegistryObligationTarget(
                        obligation_id=row.id,
                        enrollment_id=enrollment_id,
                        registry=registry,
                    ))
            fences = tuple(RegistrySourceFence(
                kind="enrollment", resource_id=target.enrollment_id,
            ) for target in targets)

            async def first():
                async with maker.begin() as session:
                    pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    rows = await acquire_registry_new_action_lockset(
                        session=session,
                        source_fences=fences,
                        obligation_targets=tuple(targets),
                    )
                    assert len(rows) == 2
                    first_locked.set()
                    await asyncio.wait_for(release_first.wait(), timeout=8)
                    return pid

            async def second():
                nonlocal second_pid
                async with maker.begin() as session:
                    pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    second_pid = pid
                    second_started.set()
                    rows = await acquire_registry_new_action_lockset(
                        session=session,
                        source_fences=tuple(reversed(fences)),
                        obligation_targets=tuple(reversed(targets)),
                    )
                    assert len(rows) == 2
                    return pid

            first_task = asyncio.create_task(first())
            await asyncio.wait_for(first_locked.wait(), timeout=8)
            second_task = asyncio.create_task(second())
            # Prove the second backend is blocked by the first transaction.
            await asyncio.wait_for(second_started.wait(), timeout=6)
            async def observe_blocker():
                async with engine.connect() as conn:
                    while True:
                        blocked = await conn.scalar(
                            text("SELECT cardinality(pg_blocking_pids(:pid)) > 0"),
                            {"pid": second_pid},
                        )
                        if blocked:
                            return
                        await asyncio.sleep(0.01)
            await asyncio.wait_for(observe_blocker(), timeout=6)
            release_first.set()
            await asyncio.wait_for(first_task, timeout=8)
            await asyncio.wait_for(second_task, timeout=8)
            async with maker() as session:
                for target in targets:
                    assert (
                        await session.get(RegistryObligation, target.obligation_id)
                    ).status == "pending_data"
        finally:
            release_first.set()
            for task in (first_task, second_task):
                if task is not None and not task.done():
                    task.cancel()
            await asyncio.gather(
                *(task for task in (first_task, second_task) if task is not None),
                return_exceptions=True,
            )
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_opt_in_source_writer_fence_waits_for_action_lockset(pg_applicability_db, registry):
    """Real PostgreSQL: a cooperating writer cannot cross the action's fence."""
    from app.services.registry_action_lockset import (
        RegistrySourceFence,
        RegistryObligationTarget,
        acquire_registry_new_action_lockset,
        acquire_registry_source_write_fences,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        enrollment_id, _ = await _create_enrollment(maker)
        async with maker.begin() as session:
            enrollment = await session.get(Enrollment, enrollment_id)
            course_id = enrollment.course_id
            row = RegistryObligation(
                enrollment_id=enrollment_id, registry=registry,
                status="pending_data", readiness_errors=[],
            )
            session.add(row)
            await session.flush()
            obligation_id = row.id
        fences = (
            RegistrySourceFence("course", course_id),
            RegistrySourceFence("enrollment", enrollment_id),
        )
        action_started = asyncio.Event()
        writer_started = asyncio.Event()
        release_action = asyncio.Event()
        writer_pid = None
        action_task = None
        writer_task = None
        try:
            async def action():
                async with maker.begin() as session:
                    await acquire_registry_new_action_lockset(
                        session=session,
                        source_fences=fences,
                        obligation_targets=(RegistryObligationTarget(
                            obligation_id, enrollment_id, registry,
                        ),),
                    )
                    action_started.set()
                    await asyncio.wait_for(release_action.wait(), timeout=8)

            async def writer():
                nonlocal writer_pid
                async with maker.begin() as session:
                    writer_pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    writer_started.set()
                    await acquire_registry_source_write_fences(
                        session=session, source_fences=tuple(reversed(fences)),
                    )

            action_task = asyncio.create_task(action())
            await asyncio.wait_for(action_started.wait(), timeout=8)
            writer_task = asyncio.create_task(writer())
            await asyncio.wait_for(writer_started.wait(), timeout=8)
            async def check_blocked():
                async with engine.connect() as connection:
                    for _ in range(500):
                        blocked = await connection.scalar(text(
                            "SELECT cardinality(pg_blocking_pids(:pid)) > 0"
                        ), {"pid": writer_pid})
                        if blocked:
                            return
                        await asyncio.sleep(0.01)
                    pytest.fail("Writer did not wait for the action fence")
            await asyncio.wait_for(check_blocked(), timeout=7)
            release_action.set()
            await asyncio.wait_for(action_task, timeout=8)
            await asyncio.wait_for(writer_task, timeout=8)
            async with maker() as session:
                assert (await session.get(RegistryObligation, obligation_id)).status == "pending_data"
        finally:
            release_action.set()
            for task in (action_task, writer_task):
                if task is not None and not task.done():
                    task.cancel()
            await asyncio.gather(
                *(task for task in (action_task, writer_task) if task is not None),
                return_exceptions=True,
            )
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("child_kind", ["context", "document"])
@pytest.mark.parametrize("reader_first", [True, False], ids=["stale-read-first", "action-lock-first"])
def test_scope_preflight_deterministic_first_child_insert_races(
    pg_applicability_db, monkeypatch, registry, child_kind, reader_first,
):
    """Force both transaction orders and observe actual PostgreSQL blockers.

    stale-read-first: the reader finishes its FIRST unlocked discovery; the
    cooperating writer then inserts and holds a parent fence. The reader must
    block, see the newly committed child, and raise a scope-change conflict.

    action-lock-first: the reader finishes both scope reads and holds the
    source fence. The cooperating writer must block until it is released.
    """
    from app.models.document_record import DocumentRecord
    from app.models.frdo_registry_context import FrdoRegistryContext
    from app.models.mintrud_registry_context import MintrudRegistryContext
    from app.services import registry_action_scope as scope_module
    from app.services.registry_action_lockset import (
        RegistryActionLockError,
        RegistrySourceFence,
        acquire_registry_source_write_fences,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        enrollment_id, actor_id = await _create_enrollment(maker)
        async with maker.begin() as session:
            enrollment = await session.get(Enrollment, enrollment_id)
            learner_id = enrollment.user_id
            course_id = enrollment.course_id
            obligation = RegistryObligation(
                enrollment_id=enrollment_id,
                registry=registry,
                status="pending_data",
                readiness_errors=[],
            )
            session.add(obligation)
            await session.flush()
            obligation_id = obligation.id

        first_discovery_finished = asyncio.Event()
        resume_reader = asyncio.Event()
        reader_has_lockset = asyncio.Event()
        resume_reader_transaction = asyncio.Event()
        writer_inserted = asyncio.Event()
        resume_writer_transaction = asyncio.Event()
        writer_started = asyncio.Event()
        reader_pid = None
        writer_pid = None
        first_call_done = False
        reader_task = None
        writer_task = None

        original_discover = scope_module.discover_registry_action_scope

        async def synchronized_discover(**kwargs):
            nonlocal first_call_done
            snapshot = await original_discover(**kwargs)
            if reader_first and not first_call_done:
                first_call_done = True
                row = snapshot.rows[0]
                assert (
                    row.enrollment_document_id is None
                    if child_kind == "document"
                    else row.registry_context_id is None
                )
                first_discovery_finished.set()
                await asyncio.wait_for(resume_reader.wait(), timeout=8)
            return snapshot

        monkeypatch.setattr(
            scope_module, "discover_registry_action_scope",
            synchronized_discover,
        )

        async def reader():
            nonlocal reader_pid
            async with maker.begin() as session:
                reader_pid = await session.scalar(text("SELECT pg_backend_pid()"))
                rows, snapshot = await scope_module.acquire_discovered_registry_action_scope(
                    session=session,
                    actor_id=actor_id,
                    registry=registry,
                    obligation_ids=(obligation_id,),
                )
                assert len(rows) == 1
                assert snapshot.targets[0].obligation_id == obligation_id
                reader_has_lockset.set()
                await asyncio.wait_for(resume_reader_transaction.wait(), timeout=8)

        async def writer():
            nonlocal writer_pid
            async with maker.begin() as session:
                writer_pid = await session.scalar(text("SELECT pg_backend_pid()"))
                writer_started.set()
                # This must be acquired BEFORE the first child insertion.
                await acquire_registry_source_write_fences(
                    session=session,
                    source_fences=(RegistrySourceFence("enrollment", enrollment_id),),
                )
                if child_kind == "context":
                    context_type = (
                        FrdoRegistryContext if registry == "frdo"
                        else MintrudRegistryContext
                    )
                    session.add(context_type(obligation_id=obligation_id))
                else:
                    session.add(DocumentRecord(
                        user_id=learner_id,
                        course_id=course_id,
                        enrollment_id=enrollment_id,
                        document_number="scope-race-" + uuid4().hex,
                        document_type="test-document",
                        title="Isolated test document",
                        status="available",
                    ))
                await session.flush()
                writer_inserted.set()
                await asyncio.wait_for(resume_writer_transaction.wait(), timeout=8)

        async def assert_postgres_wait(waiter, blocker):
            # pg_blocking_pids is PostgreSQL's observed lock graph, not a
            # test-local event or a timing guess.
            async with engine.connect() as observer:
                for _ in range(250):
                    blockers = await observer.scalar(
                        text("SELECT pg_blocking_pids(:pid)"),
                        {"pid": waiter},
                    )
                    if blocker in blockers:
                        return
                    await asyncio.sleep(0.02)
            pytest.fail("Expected PostgreSQL blocker was not observed")

        try:
            reader_task = asyncio.create_task(reader())

            if reader_first:
                await asyncio.wait_for(first_discovery_finished.wait(), timeout=8)
                writer_task = asyncio.create_task(writer())
                await asyncio.wait_for(writer_inserted.wait(), timeout=8)

                # First read was visibly completed BEFORE the writer's insert.
                # Reader can now only proceed into the locked step.
                resume_reader.set()
                await asyncio.wait_for(
                    assert_postgres_wait(reader_pid, writer_pid), timeout=7,
                )
                resume_writer_transaction.set()
                await asyncio.wait_for(writer_task, timeout=8)
                with pytest.raises(
                    RegistryActionLockError,
                    match="registry.scope_changed_during_lock",
                ):
                    await asyncio.wait_for(reader_task, timeout=8)
                assert not reader_has_lockset.is_set()
            else:
                await asyncio.wait_for(reader_has_lockset.wait(), timeout=8)
                writer_task = asyncio.create_task(writer())
                await asyncio.wait_for(writer_started.wait(), timeout=8)
                await asyncio.wait_for(
                    assert_postgres_wait(writer_pid, reader_pid), timeout=7,
                )
                resume_reader_transaction.set()
                await asyncio.wait_for(reader_task, timeout=8)
                await asyncio.wait_for(writer_inserted.wait(), timeout=8)
                resume_writer_transaction.set()
                await asyncio.wait_for(writer_task, timeout=8)

            async with maker() as session:
                stored = await session.get(RegistryObligation, obligation_id)
                assert stored.status == "pending_data"
                assert stored.document_id is None
                assert await session.scalar(
                    select(RegistryApplicabilityRecord.id).where(
                        RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                        RegistryApplicabilityRecord.registry == registry,
                    )
                ) is None
                if child_kind == "context":
                    context_type = (
                        FrdoRegistryContext if registry == "frdo"
                        else MintrudRegistryContext
                    )
                    assert await session.scalar(
                        select(context_type.id).where(
                            context_type.obligation_id == obligation_id,
                        )
                    ) is not None
                else:
                    assert await session.scalar(
                        select(DocumentRecord.id).where(
                            DocumentRecord.enrollment_id == enrollment_id,
                        )
                    ) is not None
        finally:
            resume_reader.set()
            resume_reader_transaction.set()
            resume_writer_transaction.set()
            for task in (reader_task, writer_task):
                if task is not None and not task.done():
                    task.cancel()
            await asyncio.gather(
                *(task for task in (reader_task, writer_task) if task is not None),
                return_exceptions=True,
            )
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_locked_fingerprint_preflight_rejects_changed_course_input(pg_applicability_db, registry):
    """Real PostgreSQL: after a source edit, a stored required hash is stale."""
    from app.services.registry_applicability_db_inputs import (
        load_current_registry_applicability_inputs,
    )
    from app.services.registry_current_fingerprint_preflight import (
        preflight_current_registry_fingerprint,
    )
    from app.services.registry_applicability_export_guard import RegistryApplicabilityGateError

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, actor_id = await _create_enrollment(maker)
            async with maker.begin() as session:
                enrollment = await session.get(Enrollment, enrollment_id)
                course = await session.get(Course, enrollment.course_id)
                course.regulatory_program_type = (
                    "dpo_advanced_training"
                    if registry == "frdo" else "occupational_safety_training"
                )
                obligation = RegistryObligation(
                    enrollment_id=enrollment_id, registry=registry,
                    status="pending_data", readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()
                obligation_id = obligation.id
                current = await load_current_registry_applicability_inputs(
                    session=session, obligation=obligation,
                )
                assert current.evaluation.status == "required"
                await persist_registry_applicability(
                    session=session, enrollment_id=enrollment_id,
                    evaluation=current.evaluation,
                    input_fingerprint=current.fingerprint,
                )

            async with maker.begin() as session:
                evidence = await preflight_current_registry_fingerprint(
                    session=session, actor_id=actor_id,
                    registry=registry, obligation_id=obligation_id,
                )
                assert evidence.current_fingerprint == current.fingerprint

            async with maker.begin() as session:
                course = await session.get(Course, enrollment.course_id)
                course.document_type = "updated-test-document-type"

            with pytest.raises(
                RegistryApplicabilityGateError,
                match="registry.applicability_stale",
            ):
                async with maker.begin() as session:
                    await preflight_current_registry_fingerprint(
                        session=session, actor_id=actor_id,
                        registry=registry, obligation_id=obligation_id,
                    )
            async with maker() as session:
                decision = await session.scalar(
                    select(RegistryApplicabilityRecord).where(
                        RegistryApplicabilityRecord.enrollment_id == enrollment_id,
                        RegistryApplicabilityRecord.registry == registry,
                    )
                )
                assert decision.decision == "required"
                assert decision.input_fingerprint == current.fingerprint
                assert decision.decision_version == 1
        finally:
            await engine.dispose()

    asyncio.run(scenario())


async def _source_scope_fixture(maker):
    from app.models.document_record import DocumentRecord
    from app.models.learner_profile import LearnerProfile
    from app.models.mintrud_registry_context import MintrudRegistryContext

    enrollment_id, learner_id = await _create_enrollment(maker)
    async with maker.begin() as session:
        enrollment = await session.get(Enrollment, enrollment_id)
        document = DocumentRecord(
            enrollment_id=enrollment_id, course_id=enrollment.course_id,
            user_id=learner_id, document_number="writer-order-" + uuid4().hex,
            document_type="test", title="before",
        )
        profile = LearnerProfile(user_id=learner_id, first_name="before")
        session.add_all([document, profile])
        await session.flush()
        obligations = {}
        for registry in ("frdo", "mintrud"):
            obligation = RegistryObligation(
                enrollment_id=enrollment_id, registry=registry,
                status="pending_data", readiness_errors=[], document_id=document.id,
            )
            session.add(obligation)
            await session.flush()
            obligations[registry] = obligation.id
        context = MintrudRegistryContext(
            obligation_id=obligations["mintrud"], protocol_number="before",
        )
        course = await session.get(Course, enrollment.course_id)
        course.title = "before"
        session.add(context)
        await session.flush()
        return enrollment_id, learner_id, enrollment.course_id, obligations, {
            "course": (Course, enrollment.course_id, "title"),
            "learner": (LearnerProfile, profile.id, "first_name"),
            "document": (DocumentRecord, document.id, "title"),
            "mintrud_context": (MintrudRegistryContext, context.id, "protocol_number"),
        }


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("source", ["course", "learner", "document", "mintrud_context"])
@pytest.mark.parametrize("writer_first", [True, False])
@pytest.mark.parametrize("commit_writer", [True, False])
def test_discovered_source_writer_orders_real_edits_against_action(
    pg_applicability_db, registry, source, writer_first, commit_writer,
):
    """Both orders, actual PG blockers, real source writes and rollback release.

    The action only reads under the dormant lockset; this is NOT an API-level
    authorization/readiness test and intentionally makes no approval or export.
    """
    from app.services.registry_action_scope import acquire_discovered_registry_action_scope

    async def scenario():
        engine = create_async_engine(pg_applicability_db, connect_args={
            "server_settings": {"statement_timeout": "12000"},
        })
        maker = async_sessionmaker(engine, expire_on_commit=False)
        tasks = []
        started = {name: asyncio.Event() for name in ("writer", "action")}
        locked = {name: asyncio.Event() for name in started}
        release = {name: asyncio.Event() for name in started}
        pids = {}
        try:
            enrollment, actor, course, obligations, sources = await _source_scope_fixture(maker)
            model, row_id, field = sources[source]
            root = RegistrySourceFence(
                source if source in {"course", "learner"} else "enrollment",
                course if source == "course" else actor if source == "learner" else enrollment,
            )

            async def writer():
                async with maker() as session:
                    await session.begin()
                    pids["writer"] = await session.scalar(text("SELECT pg_backend_pid()"))
                    started["writer"].set()
                    rows, scope = await acquire_discovered_registry_source_write_scope(
                        session=session, roots=(root,),
                    )
                    assert {row.id for row in rows} == set(obligations.values())
                    assert [row.id for row in rows] == sorted(obligations.values())
                    assert {target.registry for target in scope.targets} == {"frdo", "mintrud"}
                    row = await session.get(model, row_id, populate_existing=True)
                    setattr(row, field, "after")
                    await session.flush()
                    locked["writer"].set()
                    await asyncio.wait_for(release["writer"].wait(), 8)
                    if commit_writer:
                        await session.commit()
                    else:
                        await session.rollback()

            async def action():
                async with maker.begin() as session:
                    # Keep a deliberately stale identity in this transaction.
                    cached = await session.get(model, row_id)
                    pids["action"] = await session.scalar(text("SELECT pg_backend_pid()"))
                    started["action"].set()
                    await acquire_discovered_registry_action_scope(
                        session=session, actor_id=actor, registry=registry,
                        obligation_ids=(obligations[registry],),
                    )
                    fresh = await session.get(model, row_id, populate_existing=True)
                    assert fresh is cached
                    assert getattr(fresh, field) == (
                        "after" if writer_first and commit_writer else "before"
                    )
                    locked["action"].set()
                    await asyncio.wait_for(release["action"].wait(), 8)

            first, second = ("writer", "action") if writer_first else ("action", "writer")
            runners = {"writer": writer, "action": action}
            tasks.append(asyncio.create_task(runners[first]()))
            await asyncio.wait_for(locked[first].wait(), 8)
            tasks.append(asyncio.create_task(runners[second]()))
            await asyncio.wait_for(started[second].wait(), 8)
            await _wait_for_pg_blocker(engine, pids[second], pids[first])
            assert not locked[second].is_set()
            release[first].set()
            await asyncio.wait_for(tasks[0], 8)
            await asyncio.wait_for(locked[second].wait(), 8)
            release[second].set()
            await asyncio.wait_for(tasks[1], 8)
            async with maker() as session:
                row = await session.get(model, row_id)
                assert getattr(row, field) == ("after" if commit_writer else "before")
                rows = (await session.scalars(select(RegistryObligation).where(
                    RegistryObligation.id.in_(obligations.values()),
                ))).all()
                assert all(row.status == "pending_data" and row.approved_at is None for row in rows)
                assert await session.scalar(select(RegistryApplicabilityRecord.id).where(
                    RegistryApplicabilityRecord.enrollment_id == enrollment,
                )) is None
        finally:
            for event in release.values():
                event.set()
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("change", ["enrollment_insert", "obligation_insert", "reassignment"])
def test_source_writer_rejects_scope_growth_or_reassignment_after_wait(
    pg_applicability_db, monkeypatch, change,
):
    from app.services import registry_source_write_scope as writer_scope
    from app.services.registry_action_lockset import (
        RegistryActionLockError, acquire_registry_source_write_fences,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db, connect_args={
            "server_settings": {"statement_timeout": "12000"},
        })
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        discovered, resume, started = asyncio.Event(), asyncio.Event(), asyncio.Event()
        pid = None
        real_discover = writer_scope.discover_registry_source_write_scope
        calls = 0

        async def pause_first_discovery(**kwargs):
            nonlocal calls
            snapshot = await real_discover(**kwargs)
            calls += 1
            if calls == 1:
                discovered.set()
                await asyncio.wait_for(resume.wait(), 8)
            return snapshot

        monkeypatch.setattr(writer_scope, "discover_registry_source_write_scope", pause_first_discovery)
        try:
            enrollment, learner = await _create_enrollment(maker)
            other_enrollment, other_learner = await _create_enrollment(maker)
            async with maker() as session:
                course = (await session.get(Enrollment, enrollment)).course_id
                other_course = (await session.get(Enrollment, other_enrollment)).course_id
            root = RegistrySourceFence(
                "course" if change == "enrollment_insert" else "enrollment",
                course if change == "enrollment_insert" else enrollment,
            )

            async def waiter():
                nonlocal pid
                async with maker.begin() as session:
                    # Stale identity must not hide scalar dependency changes.
                    cached = await session.get(Enrollment, enrollment)
                    assert cached.course_id == course
                    pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    started.set()
                    await writer_scope.acquire_discovered_registry_source_write_scope(
                        session=session, roots=(root,),
                    )
                    pytest.fail("Changed scope must never reach source mutation")

            task = asyncio.create_task(waiter())
            await asyncio.wait_for(discovered.wait(), 8)
            async with maker.begin() as session:
                blocker = await session.scalar(text("SELECT pg_backend_pid()"))
                await acquire_registry_source_write_fences(
                    session=session, source_fences=(root,),
                )
                if change == "enrollment_insert":
                    session.add(Enrollment(user_id=other_learner, course_id=course))
                elif change == "obligation_insert":
                    session.add(RegistryObligation(
                        enrollment_id=enrollment, registry="mintrud", status="pending_data",
                    ))
                else:
                    row = await session.get(Enrollment, enrollment)
                    row.course_id = other_course
                await session.flush()
                resume.set()
                await _wait_for_pg_blocker(engine, pid, blocker)
            with pytest.raises(RegistryActionLockError, match="writer_scope_changed_during_lock"):
                await asyncio.wait_for(task, 8)
            # A NEW transaction succeeds with the complete new scope.
            async with maker.begin() as session:
                _, scope = await writer_scope.acquire_discovered_registry_source_write_scope(
                    session=session, roots=(root,),
                )
                if change == "enrollment_insert":
                    assert len(scope.enrollments) == 2
                elif change == "obligation_insert":
                    assert len(scope.targets) == 1
                else:
                    assert scope.enrollments[0][1] == other_course
        finally:
            resume.set()
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_source_writer_fences_first_decision_without_obligation(pg_applicability_db, registry):
    async def scenario():
        engine = create_async_engine(pg_applicability_db, connect_args={
            "server_settings": {"statement_timeout": "12000"},
        })
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        started = asyncio.Event()
        pid = None
        try:
            enrollment, _ = await _create_enrollment(maker)

            async def decision_writer():
                nonlocal pid
                async with maker.begin() as session:
                    pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    started.set()
                    await persist_registry_applicability(
                        session=session, enrollment_id=enrollment,
                        evaluation=_veto_evaluation(registry, "required"),
                        input_fingerprint="a" * 64,
                    )

            async with maker.begin() as session:
                blocker = await session.scalar(text("SELECT pg_backend_pid()"))
                rows, scope = await acquire_discovered_registry_source_write_scope(
                    session=session, roots=(RegistrySourceFence("enrollment", enrollment),),
                )
                assert rows == () and scope.targets == ()
                task = asyncio.create_task(decision_writer())
                await asyncio.wait_for(started.wait(), 8)
                await _wait_for_pg_blocker(engine, pid, blocker)
            await asyncio.wait_for(task, 8)
            async with maker() as session:
                assert await session.scalar(select(RegistryApplicabilityRecord.id).where(
                    RegistryApplicabilityRecord.enrollment_id == enrollment,
                    RegistryApplicabilityRecord.registry == registry,
                )) is not None
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("reverse_roots", [True, False])
def test_source_writer_uses_sorted_sql_locks_and_preserves_all_statuses(
    pg_applicability_db, reverse_roots,
):
    from sqlalchemy import event
    from app.services.registry_action_lockset import normalize_registry_source_fences

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        captured = []
        try:
            enrollment, learner = await _create_enrollment(maker)
            second, _ = await _create_enrollment(maker)
            async with maker.begin() as session:
                course = (await session.get(Enrollment, enrollment)).course_id
                for enrollment_id, registry, status in (
                    (enrollment, "frdo", "pending_data"),
                    (enrollment, "mintrud", "approved"),
                    (second, "frdo", "exported"),
                    (second, "mintrud", "submitted"),
                ):
                    session.add(RegistryObligation(
                        enrollment_id=enrollment_id, registry=registry, status=status,
                        approval_snapshot_json={"synthetic": status},
                        approval_fingerprint="history-" + status,
                    ))
            roots = (RegistrySourceFence("course", course),
                     RegistrySourceFence("learner", learner),
                     RegistrySourceFence("enrollment", second))
            if reverse_roots:
                roots = tuple(reversed(roots))

            def capture(conn, cursor, statement, parameters, context, executemany):
                if "pg_advisory_xact_lock" in statement or "FOR UPDATE" in statement:
                    captured.append((statement, parameters[0]))

            event.listen(engine.sync_engine, "before_cursor_execute", capture)
            async with maker.begin() as session:
                rows, scope = await acquire_discovered_registry_source_write_scope(
                    session=session, roots=roots + (roots[0],),
                )
                expected_sources = normalize_registry_source_fences(source_fences=scope.source_fences)
                expected_decisions = tuple(sorted(
                    "registry-applicability:" + row[0] + ":" + registry
                    for row in scope.enrollments for registry in ("frdo", "mintrud")
                ))
                assert [key for sql, key in captured if "pg_advisory" in sql] == list(
                    expected_sources + expected_decisions
                )
                row_locks = [(sql, key) for sql, key in captured if "FOR UPDATE" in sql]
                assert [key for _, key in row_locks] == sorted(row.id for row in rows)
                assert len(rows) == 4
                assert all("registry_obligations" in sql for sql, _ in row_locks)
                assert {row.status for row in rows} == {"pending_data", "approved", "exported", "submitted"}
                assert all(row.approval_fingerprint == "history-" + row.status for row in rows)
                assert all(row.approval_snapshot_json == {"synthetic": row.status} for row in rows)
                assert not session.new and not session.dirty and not session.deleted
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("precondition", [
    "no_transaction", "nested", "new", "dirty", "deleted", "repeatable_read",
    "missing", "unsupported", "empty", "noncanonical",
])
def test_source_writer_rejects_unsafe_entry_without_writing(pg_applicability_db, precondition):
    from app.services.registry_action_lockset import RegistryActionLockError

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment, learner = await _create_enrollment(maker)
            async with maker() as session:
                if precondition != "no_transaction":
                    await session.begin()
                root = RegistrySourceFence("enrollment", enrollment)
                if precondition == "nested":
                    await session.begin_nested()
                elif precondition == "new":
                    session.add(Course(slug="must-not-flush", title="must-not-flush"))
                elif precondition in {"dirty", "deleted"}:
                    row = await session.get(User, learner)
                    if precondition == "dirty":
                        row.full_name = "must-not-flush"
                    else:
                        await session.delete(row)
                elif precondition == "repeatable_read":
                    await session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ"))
                elif precondition == "missing":
                    root = RegistrySourceFence("enrollment", str(uuid4()))
                elif precondition == "unsupported":
                    root = RegistrySourceFence("actor", learner)
                elif precondition == "noncanonical":
                    root = RegistrySourceFence("enrollment", enrollment.upper())
                with pytest.raises(RegistryActionLockError):
                    await acquire_discovered_registry_source_write_scope(
                        session=session, roots=() if precondition == "empty" else (root,),
                    )
                await session.rollback()
            async with maker() as session:
                assert (await session.get(User, learner)).full_name is None
                assert await session.get(Enrollment, enrollment) is not None
                assert await session.scalar(select(Course.id).where(Course.slug == "must-not-flush")) is None
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_source_writer_rechecks_membership_after_waiting_on_decision(pg_applicability_db, registry):
    from app.services.registry_action_lockset import RegistryActionLockError

    async def scenario():
        engine = create_async_engine(pg_applicability_db, connect_args={
            "server_settings": {"statement_timeout": "12000"},
        })
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task, pid = None, None
        started = asyncio.Event()
        try:
            enrollment, _ = await _create_enrollment(maker)

            async def waiter():
                nonlocal pid
                async with maker.begin() as session:
                    pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    started.set()
                    await acquire_discovered_registry_source_write_scope(
                        session=session, roots=(RegistrySourceFence("enrollment", enrollment),),
                    )

            async with maker.begin() as session:
                blocker = await session.scalar(text("SELECT pg_backend_pid()"))
                # Simulate a legacy participant that holds only a decision key.
                await session.execute(
                    text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
                    {"key": "registry-applicability:" + enrollment + ":" + registry},
                )
                session.add(RegistryObligation(
                    enrollment_id=enrollment, registry=registry, status="pending_data",
                ))
                await session.flush()
                task = asyncio.create_task(waiter())
                await asyncio.wait_for(started.wait(), 8)
                await _wait_for_pg_blocker(engine, pid, blocker)
            with pytest.raises(RegistryActionLockError, match="writer_scope_changed_during_lock"):
                await asyncio.wait_for(task, 8)
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("kind", ["course", "learner"])
def test_source_writer_handles_existing_parent_without_enrollments(pg_applicability_db, kind):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with maker.begin() as session:
                parent = (
                    Course(slug="empty-" + uuid4().hex, title="empty") if kind == "course"
                    else User(email=uuid4().hex + "@example.invalid", hashed_password="unused")
                )
                session.add(parent)
                await session.flush()
                parent_id = parent.id
            root = RegistrySourceFence(kind, parent_id)
            async with maker.begin() as session:
                rows, scope = await acquire_discovered_registry_source_write_scope(
                    session=session, roots=(root,),
                )
                assert rows == () and scope.enrollments == ()
                assert scope.source_fences == (root,)
        finally:
            await engine.dispose()

    asyncio.run(scenario())


# ---- M2.1.2: real-PostgreSQL coverage of dormant trusted child ownership ----

async def _child_create_document(maker, enrollment_id):
    from app.models.document_record import DocumentRecord

    async with maker.begin() as session:
        enrollment = await session.get(Enrollment, enrollment_id)
        document = DocumentRecord(
            enrollment_id=enrollment_id,
            course_id=enrollment.course_id,
            user_id=enrollment.user_id,
            document_type="Certificate",
            document_number="CHILD-" + uuid4().hex,
            title="Synthetic completion",
            status="draft",
        )
        session.add(document)
        await session.flush()
        return document.id


async def _child_create_obligation(maker, enrollment_id, registry):
    async with maker.begin() as session:
        obligation = RegistryObligation(
            enrollment_id=enrollment_id,
            registry=registry,
            status="pending_data",
        )
        session.add(obligation)
        await session.flush()
        return obligation.id


async def _child_create_context(maker, obligation_id, registry):
    from app.models.frdo_registry_context import FrdoRegistryContext
    from app.models.mintrud_registry_context import MintrudRegistryContext

    model = FrdoRegistryContext if registry == "frdo" else MintrudRegistryContext
    async with maker.begin() as session:
        context = model(obligation_id=obligation_id)
        session.add(context)
        await session.flush()
        return context.id


def test_child_document_real_db_ownership_and_old_new_parents(pg_applicability_db):
    from app.models.document_record import DocumentRecord
    from app.services.registry_action_lockset import RegistryActionLockError
    from app.services.registry_child_source_scope import (
        acquire_registry_document_scope,
        resolve_registry_document_scope,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            first, learner_id = await _create_enrollment(maker)
            linked_doc = await _child_create_document(maker, first)
            async with maker.begin() as session:
                enrollment = await session.get(Enrollment, first)
                second_course = Course(slug="child-second-" + uuid4().hex, title="Another")
                session.add(second_course)
                await session.flush()
                second = Enrollment(
                    user_id=learner_id, course_id=second_course.id, status="completed",
                )
                session.add(second)
                await session.flush()
                second_id = second.id

            async with maker.begin() as session:
                linked = await acquire_registry_document_scope(
                    session=session, document_id=linked_doc,
                )
                assert linked.current_enrollment_id == first
                assert linked.proposed_enrollment_id == first
                assert tuple(root.resource_id for root in linked.roots) == (first,)
                assert not session.new and not session.dirty
            # Current course conflicts with second enrollment: reject the proposed move.
            with pytest.raises(RegistryActionLockError, match="child_document_owner_mismatch"):
                async with maker.begin() as session:
                    await resolve_registry_document_scope(
                        session=session, document_id=linked_doc,
                        proposed_enrollment_id=second_id,
                    )

            # Nullable document course allows a genuine old/new enrollment union.
            async with maker.begin() as session:
                document = await session.get(DocumentRecord, linked_doc)
                document.course_id = None
            async with maker.begin() as session:
                old_new = await acquire_registry_document_scope(
                    session=session, document_id=linked_doc,
                    proposed_enrollment_id=second_id,
                )
                assert {root.resource_id for root in old_new.roots} == {first, second_id}
                assert old_new.current_enrollment_id == first
                assert old_new.proposed_enrollment_id == second_id
                assert not session.new and not session.dirty

            # Independent obligation.document_id cannot establish ownership.
            async with maker.begin() as session:
                session.add(RegistryObligation(
                    enrollment_id=second_id, registry="frdo", document_id=linked_doc,
                    status="pending_data",
                ))
            with pytest.raises(
                RegistryActionLockError, match="child_document_reference_mismatch",
            ):
                async with maker.begin() as session:
                    await resolve_registry_document_scope(
                        session=session, document_id=linked_doc,
                    )
            async with maker() as session:
                assert await session.get(DocumentRecord, linked_doc) is not None
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_child_standalone_document_does_not_infer_enrollment(pg_applicability_db):
    from app.models.document_record import DocumentRecord
    from app.services.registry_action_lockset import RegistryActionLockError
    from app.services.registry_child_source_scope import resolve_registry_document_scope

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, user_id = await _create_enrollment(maker)
            async with maker.begin() as session:
                enrollment = await session.get(Enrollment, enrollment_id)
                document = DocumentRecord(
                    user_id=user_id, course_id=enrollment.course_id,
                    enrollment_id=None,
                    document_number="STANDALONE-" + uuid4().hex,
                    document_type="Certificate", title="Standalone",
                )
                session.add(document)
                await session.flush()
                document_id = document.id
            with pytest.raises(RegistryActionLockError, match="child_unlinked"):
                async with maker.begin() as session:
                    await resolve_registry_document_scope(
                        session=session, document_id=document_id,
                    )
            async with maker.begin() as session:
                discovered = await resolve_registry_document_scope(
                    session=session, document_id=document_id,
                    proposed_enrollment_id=enrollment_id,
                )
                assert discovered.current_enrollment_id is None
                assert discovered.proposed_enrollment_id == enrollment_id
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_child_context_real_db_existing_absent_and_mismatched_registry(
    pg_applicability_db, registry,
):
    from app.services.registry_action_lockset import RegistryActionLockError
    from app.services.registry_child_source_scope import (
        acquire_registry_context_scope,
        acquire_registry_context_upsert_scope,
        resolve_registry_context_upsert_scope,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            enrollment_id, _ = await _create_enrollment(maker)
            obligation_id = await _child_create_obligation(
                maker, enrollment_id, registry,
            )
            async with maker.begin() as session:
                before = await acquire_registry_context_upsert_scope(
                    session=session, registry=registry, obligation_id=obligation_id,
                )
                assert before.current_enrollment_id == enrollment_id
                assert before.evidence[0][-1] is None
                assert not session.new and not session.dirty

            other = "mintrud" if registry == "frdo" else "frdo"
            with pytest.raises(RegistryActionLockError, match="child_registry_mismatch"):
                async with maker.begin() as session:
                    await resolve_registry_context_upsert_scope(
                        session=session, registry=other, obligation_id=obligation_id,
                    )

            context_id = await _child_create_context(maker, obligation_id, registry)
            async with maker.begin() as session:
                present = await acquire_registry_context_scope(
                    session=session, registry=registry, context_id=context_id,
                )
                assert present.source_id == obligation_id
                assert present.evidence[0][-1] == context_id
                assert present.roots[0].resource_id == enrollment_id
        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("kind", ["document", "context"])
@pytest.mark.parametrize("writer_first", [True, False])
def test_child_first_insert_serializes_with_cooperating_source_writer(
    pg_applicability_db, registry, kind, writer_first,
):
    """Prove actual PG blocker PIDs in BOTH orders, not timing-based contention."""
    from app.models.document_record import DocumentRecord
    from app.models.frdo_registry_context import FrdoRegistryContext
    from app.models.mintrud_registry_context import MintrudRegistryContext
    from app.services.registry_action_lockset import (
        RegistryActionLockError, RegistrySourceFence,
        acquire_registry_source_write_fences,
    )
    from app.services.registry_child_source_scope import (
        acquire_registry_document_creation_scope,
        acquire_registry_context_upsert_scope,
    )

    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={"server_settings": {"statement_timeout": "12000"}},
        )
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        started = asyncio.Event()
        waiter_pid = None
        try:
            enrollment_id, learner_id = await _create_enrollment(maker)
            obligation_id = (
                await _child_create_obligation(maker, enrollment_id, registry)
                if kind == "context" else None
            )

            async def action(session):
                if kind == "document":
                    return await acquire_registry_document_creation_scope(
                        session=session, enrollment_id=enrollment_id,
                        expected_user_id=learner_id,
                    )
                return await acquire_registry_context_upsert_scope(
                    session=session, registry=registry, obligation_id=obligation_id,
                )

            async def insert_child(session):
                if kind == "document":
                    course_id = await session.scalar(
                        select(Enrollment.course_id).where(Enrollment.id == enrollment_id)
                    )
                    session.add(DocumentRecord(
                        user_id=learner_id, course_id=course_id,
                        enrollment_id=enrollment_id,
                        document_type="Certificate",
                        document_number="FIRST-CHILD-" + uuid4().hex,
                        title="First linked child",
                    ))
                else:
                    model = FrdoRegistryContext if registry == "frdo" else MintrudRegistryContext
                    session.add(model(obligation_id=obligation_id))
                await session.flush()

            async def wait_then_insert():
                nonlocal waiter_pid
                async with maker.begin() as session:
                    waiter_pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    started.set()
                    await acquire_registry_source_write_fences(
                        session=session,
                        source_fences=(RegistrySourceFence("enrollment", enrollment_id),),
                    )
                    await insert_child(session)

            async def wait_then_resolve():
                nonlocal waiter_pid
                async with maker.begin() as session:
                    waiter_pid = await session.scalar(text("SELECT pg_backend_pid()"))
                    started.set()
                    return await action(session)

            if writer_first:
                async with maker.begin() as writer:
                    blocker_pid = await writer.scalar(text("SELECT pg_backend_pid()"))
                    await acquire_registry_source_write_fences(
                        session=writer,
                        source_fences=(RegistrySourceFence("enrollment", enrollment_id),),
                    )
                    task = asyncio.create_task(wait_then_resolve())
                    await asyncio.wait_for(started.wait(), 8)
                    await _wait_for_pg_blocker(engine, waiter_pid, blocker_pid)
                    await insert_child(writer)
                # The reader discovered no child, waited, then MUST reject the newly committed child.
                with pytest.raises(
                    RegistryActionLockError,
                    match="child_document_already_exists|child_scope_changed_during_lock",
                ):
                    await asyncio.wait_for(task, 8)
            else:
                async with maker.begin() as action_session:
                    blocker_pid = await action_session.scalar(text("SELECT pg_backend_pid()"))
                    scope = await action(action_session)
                    assert scope.current_enrollment_id in {None, enrollment_id}
                    task = asyncio.create_task(wait_then_insert())
                    await asyncio.wait_for(started.wait(), 8)
                    await _wait_for_pg_blocker(engine, waiter_pid, blocker_pid)
                await asyncio.wait_for(task, 8)

            async with maker() as session:
                if kind == "document":
                    assert await session.scalar(select(DocumentRecord.id).where(
                        DocumentRecord.enrollment_id == enrollment_id,
                    )) is not None
                else:
                    model = FrdoRegistryContext if registry == "frdo" else MintrudRegistryContext
                    assert await session.scalar(select(model.id).where(
                        model.obligation_id == obligation_id,
                    )) is not None
        finally:
            if task is not None:
                if not task.done():
                    task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())
