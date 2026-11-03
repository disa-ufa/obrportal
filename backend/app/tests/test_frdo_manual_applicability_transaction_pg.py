"""Real PostgreSQL tests for the UNWIRED manual FRDO service.

These tests use only the disposable database from pg_applicability_db.
Run on a dedicated isolated PostgreSQL container, never on a
preserved local database or production.
"""

import asyncio

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_applicability import (
    RegistryApplicabilityEvent,
    RegistryApplicabilityRecord,
)
from app.models.registry_obligation import RegistryObligation
from app.services.frdo_manual_applicability_policy import (
    ManualFrdoDecisionConflict,
)
from app.services.frdo_manual_applicability_transaction import (
    persist_manual_frdo_review_decision,
)
from app.services.registry_action_lockset import (
    RegistrySourceFence,
)
from app.services.registry_applicability_db_inputs import (
    load_current_registry_applicability_inputs,
)
from app.services.registry_applicability_writer import (
    persist_registry_applicability,
)
from app.services.registry_source_write_scope import (
    acquire_discovered_registry_source_write_scope,
)

# Reuse the existing, previously qualified disposable-DB fixture
# and enrollment factory. Do not create a separate database fixture.
from test_registry_applicability_writer_pg import (
    _create_enrollment,
    pg_applicability_db,
)


REASON = "Reviewed legal grounds for FRDO applicability"


async def seed_case(maker, *, status="pending_data"):
    enrollment_id, actor_id = await _create_enrollment(maker)

    async with maker.begin() as session:
        obligation = RegistryObligation(
            registry="frdo",
            enrollment_id=enrollment_id,
            status=status,
            readiness_errors=[],
        )
        session.add(obligation)
        await session.flush()
        obligation_id = obligation.id

    return enrollment_id, actor_id, obligation_id


async def read_snapshot(maker, obligation_id):
    async with maker() as session:
        obligation = await session.get(
            RegistryObligation, obligation_id
        )
        assert obligation is not None

        snapshot = await load_current_registry_applicability_inputs(
            session=session,
            obligation=obligation,
        )

        assert snapshot.evaluation.status == "needs_review"
        assert len(snapshot.fingerprint) == 64

        return snapshot


async def call_service(
    session,
    obligation_id,
    actor_id,
    fingerprint,
    *,
    decision="required",
    version=0,
):
    return await persist_manual_frdo_review_decision(
        session=session,
        obligation_id=str(obligation_id),
        decision=decision,
        reason=REASON,
        actor_user_id=str(actor_id),
        expected_version=version,
        expected_input_fingerprint=fingerprint,
    )


async def read_history(maker, enrollment_id):
    async with maker() as session:
        current = await session.scalar(
            select(RegistryApplicabilityRecord).where(
                RegistryApplicabilityRecord.enrollment_id
                == enrollment_id,
                RegistryApplicabilityRecord.registry == "frdo",
            )
        )

        events = (
            await session.scalars(
                select(RegistryApplicabilityEvent)
                .where(
                    RegistryApplicabilityEvent.enrollment_id
                    == enrollment_id,
                    RegistryApplicabilityEvent.registry == "frdo",
                )
                .order_by(
                    RegistryApplicabilityEvent.decision_version
                )
            )
        ).all()

        return current, events


@pytest.mark.parametrize(
    "decision",
    ["required", "not_required"],
)
def test_first_manual_decision_creates_one_audit_event(
    pg_applicability_db,
    decision,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )

            snapshot = await read_snapshot(
                maker, obligation_id
            )

            async with maker.begin() as session:
                result = await call_service(
                    session,
                    obligation_id,
                    actor_id,
                    snapshot.fingerprint,
                    decision=decision,
                )
                assert result.decision == decision
                assert result.source == "manual"
                assert result.decision_version == 1

            record, events = await read_history(
                maker, enrollment_id
            )

            assert record is not None
            assert record.decision == decision
            assert record.decision_version == 1
            assert record.input_fingerprint == snapshot.fingerprint
            assert str(record.decided_by_user_id) == str(actor_id)

            assert len(events) == 1
            assert events[0].decision == decision
            assert events[0].source == "manual"
            assert events[0].decision_version == 1
            assert events[0].reason == REASON

            # FRDO review cannot create a Mintrud decision.
            async with maker() as session:
                mintrud = await session.scalar(
                    select(RegistryApplicabilityRecord.id)
                    .where(
                        RegistryApplicabilityRecord.enrollment_id
                        == enrollment_id,
                        RegistryApplicabilityRecord.registry
                        == "mintrud",
                    )
                )
                assert mintrud is None
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_existing_review_requires_current_version(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            # Establish a persisted, unresolved auto-decision.
            async with maker.begin() as session:
                record, changed = (
                    await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=snapshot.evaluation,
                        input_fingerprint=snapshot.fingerprint,
                    )
                )
                assert changed
                assert record.decision == "needs_review"

            # A request based on the previous version must fail.
            with pytest.raises(
                ManualFrdoDecisionConflict,
                match="version changed",
            ):
                async with maker.begin() as session:
                    await call_service(
                        session,
                        obligation_id,
                        actor_id,
                        snapshot.fingerprint,
                        version=0,
                    )

            current, events = await read_history(
                maker, enrollment_id
            )
            assert current.decision == "needs_review"
            assert current.decision_version == 1
            assert len(events) == 1

            # The correct version resolves the review exactly once.
            async with maker.begin() as session:
                record = await call_service(
                    session,
                    obligation_id,
                    actor_id,
                    snapshot.fingerprint,
                    version=1,
                )
                assert record.decision_version == 2

            current, events = await read_history(
                maker, enrollment_id
            )
            assert current.decision == "required"
            assert current.decision_version == 2
            assert [e.decision for e in events] == [
                "needs_review", "required"
            ]
            assert [e.decision_version for e in events] == [
                1, 2
            ]
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_final_not_required_cannot_be_reclassified(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            async with maker.begin() as session:
                await call_service(
                    session,
                    obligation_id,
                    actor_id,
                    snapshot.fingerprint,
                    decision="not_required",
                )

            with pytest.raises(
                ManualFrdoDecisionConflict,
                match="separate reconciliation",
            ):
                async with maker.begin() as session:
                    await call_service(
                        session,
                        obligation_id,
                        actor_id,
                        snapshot.fingerprint,
                        decision="required",
                        version=1,
                    )

            record, events = await read_history(
                maker, enrollment_id
            )
            assert record.decision == "not_required"
            assert record.decision_version == 1
            assert len(events) == 1
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_rollback_removes_decision_and_audit(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            with pytest.raises(
                RuntimeError, match="simulated rollback"
            ):
                async with maker.begin() as session:
                    await call_service(
                        session,
                        obligation_id,
                        actor_id,
                        snapshot.fingerprint,
                    )
                    raise RuntimeError("simulated rollback")

            record, events = await read_history(
                maker, enrollment_id
            )

            assert record is None
            assert events == []
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_stale_source_fingerprint_rejected(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            # Alter a fingerprint-relevant source before the request.
            async with maker.begin() as session:
                course_id = await session.scalar(
                    select(Enrollment.course_id).where(
                        Enrollment.id == enrollment_id
                    )
                )
                await session.execute(
                    update(Course)
                    .where(Course.id == course_id)
                    .values(document_type="reclassified-document")
                )

            with pytest.raises(
                ManualFrdoDecisionConflict,
                match="snapshot changed",
            ):
                async with maker.begin() as session:
                    await call_service(
                        session,
                        obligation_id,
                        actor_id,
                        snapshot.fingerprint,
                    )

            record, events = await read_history(
                maker, enrollment_id
            )
            assert record is None
            assert events == []
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_protected_obligation_cannot_be_decided(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker, status="approved")
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            with pytest.raises(
                ManualFrdoDecisionConflict,
                match="Protected",
            ):
                async with maker.begin() as session:
                    await call_service(
                        session,
                        obligation_id,
                        actor_id,
                        snapshot.fingerprint,
                    )

            record, events = await read_history(
                maker, enrollment_id
            )
            assert record is None
            assert events == []
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_concurrent_decisions_allow_one_winner(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={
                "server_settings": {
                    "statement_timeout": "12000",
                }
            },
        )
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            async def worker(decision):
                try:
                    async with maker.begin() as session:
                        await call_service(
                            session,
                            obligation_id,
                            actor_id,
                            snapshot.fingerprint,
                            decision=decision,
                        )
                    return ("committed", decision)
                except ManualFrdoDecisionConflict:
                    return ("conflict", decision)

            results = await asyncio.wait_for(
                asyncio.gather(
                    worker("required"),
                    worker("not_required"),
                ),
                timeout=20,
            )

            assert sorted(result[0] for result in results) == [
                "committed", "conflict"
            ]

            record, events = await read_history(
                maker, enrollment_id
            )
            assert record is not None
            assert record.decision_version == 1
            assert len(events) == 1
            assert record.decision == events[0].decision
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_cooperating_source_writer_invalidates_waiting_request(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={
                "server_settings": {
                    "statement_timeout": "12000",
                }
            },
        )
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )
        pending = None

        try:
            enrollment_id, actor_id, obligation_id = (
                await seed_case(maker)
            )
            snapshot = await read_snapshot(
                maker, obligation_id
            )

            async with maker() as session:
                course_id = await session.scalar(
                    select(Enrollment.course_id).where(
                        Enrollment.id == enrollment_id
                    )
                )

            async def waiting_decision():
                async with maker.begin() as session:
                    await call_service(
                        session,
                        obligation_id,
                        actor_id,
                        snapshot.fingerprint,
                    )

            # A cooperating source writer acquires canonical fences
            # BEFORE modifying the course. The manual service must
            # wait until this transaction commits.
            async with maker.begin() as source_session:
                await acquire_discovered_registry_source_write_scope(
                    session=source_session,
                    roots=(
                        RegistrySourceFence(
                            "course", str(course_id)
                        ),
                    ),
                )

                await source_session.execute(
                    update(Course)
                    .where(Course.id == course_id)
                    .values(document_type="changed-during-lock")
                )

                pending = asyncio.create_task(
                    waiting_decision()
                )

                await asyncio.sleep(0.3)
                assert not pending.done(), (
                    "Manual decision did not wait for source fence"
                )

            # After the source COMMIT, the old fingerprint is invalid.
            with pytest.raises(
                ManualFrdoDecisionConflict,
                match="snapshot changed",
            ):
                await asyncio.wait_for(pending, timeout=12)

            record, events = await read_history(
                maker, enrollment_id
            )
            assert record is None
            assert events == []
        finally:
            if pending is not None and not pending.done():
                pending.cancel()
                await asyncio.gather(
                    pending, return_exceptions=True
                )
            await engine.dispose()

    asyncio.run(scenario())