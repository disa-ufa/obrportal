"""Enrollment source-writer locking: isolated PostgreSQL only."""

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request

import app.api.v1.admin as admin
from app.models.audit_event import AuditEvent
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.admin import AdminEnrollmentUpdate
from app.services.registry_action_lockset import (
    RegistrySourceFence,
    acquire_registry_source_write_fences,
)
from app.services.registry_source_write_scope import (
    acquire_discovered_registry_source_write_scope,
)
from test_m21_course_source_fence_pg import seed
from test_registry_applicability_writer_pg import (
    pg_applicability_db,
    _wait_for_pg_blocker,
)


FIRST = datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc)
SECOND = datetime(2026, 1, 11, 12, 0, tzinfo=timezone.utc)


async def make_enrollment(maker):
    course_id, actor_id, _ = await seed(maker, enrollments=0)
    async with maker.begin() as session:
        learner = User(
            email=f"m21-enrollment-{uuid4().hex}@example.invalid",
            hashed_password="test",
        )
        session.add(learner)
        await session.flush()

        enrollment = Enrollment(
            user_id=learner.id,
            course_id=course_id,
            status="active",
        )
        session.add(enrollment)
        await session.flush()
        enrollment_id = str(enrollment.id)

    return str(course_id), str(actor_id), enrollment_id


async def patch(session, enrollment_id, actor_id, **changes):
    request = Request({
        "type": "http",
        "method": "PATCH",
        "path": "/isolated/enrollments/" + enrollment_id,
        "headers": [],
        "client": ("127.0.0.1", 1),
    })
    return await admin.update_admin_enrollment(
        enrollment_id,
        AdminEnrollmentUpdate(**changes),
        request,
        SimpleNamespace(id=actor_id),
        session,
    )


async def read_state(maker, enrollment_id):
    async with maker() as session:
        enrollment = await session.get(Enrollment, enrollment_id)
        audits = (
            await session.scalars(
                select(AuditEvent)
                .where(
                    AuditEvent.entity_type == "enrollment",
                    AuditEvent.entity_id == enrollment_id,
                )
                .order_by(AuditEvent.id)
            )
        ).all()
        return {
            "started_at": enrollment.started_at,
            "organization_id": enrollment.organization_id,
            "status": enrollment.status,
            "audit": [row.payload for row in audits],
        }


def test_enrollment_patch_waits_for_course_fence(pg_applicability_db):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        pids = {}
        started = asyncio.Event()

        try:
            course_id, actor_id, enrollment_id = await make_enrollment(maker)
            before = await read_state(maker, enrollment_id)

            async with maker.begin() as blocker:
                pids["blocker"] = await blocker.scalar(
                    text("SELECT pg_backend_pid()")
                )
                await acquire_registry_source_write_fences(
                    session=blocker,
                    source_fences=(
                        RegistrySourceFence("course", course_id),
                    ),
                )

                async def writer():
                    async with maker() as session:
                        pids["writer"] = await session.scalar(
                            text("SELECT pg_backend_pid()")
                        )
                        started.set()
                        await patch(
                            session, enrollment_id, actor_id,
                            started_at=FIRST,
                        )

                task = asyncio.create_task(writer())
                await asyncio.wait_for(started.wait(), 8)
                await _wait_for_pg_blocker(
                    engine, pids["writer"], pids["blocker"]
                )
                assert not task.done()
                assert await read_state(maker, enrollment_id) == before

            await asyncio.wait_for(task, 8)
            after = await read_state(maker, enrollment_id)
            assert after["started_at"] is not None
            assert after["started_at"].date() == FIRST.date()
            assert len(after["audit"]) == 1
            assert after["audit"][0]["before"]["started_at"] is None
            assert after["audit"][0]["after"]["started_at"] is not None
        finally:
            if task is not None and not task.done():
                task.cancel()
            if task is not None:
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


def test_additional_organization_fence_waits_without_broad_discovery(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        started = asyncio.Event()
        pids = {}

        try:
            _, _, enrollment_id = await make_enrollment(maker)
            extra = RegistrySourceFence("organization", str(uuid4()))

            async with maker.begin() as blocker:
                pids["blocker"] = await blocker.scalar(
                    text("SELECT pg_backend_pid()")
                )
                await acquire_registry_source_write_fences(
                    session=blocker,
                    source_fences=(extra,),
                )

                async def writer():
                    async with maker.begin() as session:
                        pids["writer"] = await session.scalar(
                            text("SELECT pg_backend_pid()")
                        )
                        started.set()
                        _, scope = (
                            await acquire_discovered_registry_source_write_scope(
                                session=session,
                                roots=(
                                    RegistrySourceFence(
                                        "enrollment", enrollment_id
                                    ),
                                ),
                                additional_source_fences=(extra,),
                            )
                        )
                        assert len(scope.enrollments) == 1
                        assert str(scope.enrollments[0][0]) == enrollment_id

                task = asyncio.create_task(writer())
                await asyncio.wait_for(started.wait(), 8)
                await _wait_for_pg_blocker(
                    engine, pids["writer"], pids["blocker"]
                )
                assert not task.done()

            await asyncio.wait_for(task, 8)
        finally:
            if task is not None and not task.done():
                task.cancel()
            if task is not None:
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


def test_waiting_enrollment_patch_refreshes_audit(pg_applicability_db, monkeypatch):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        held = asyncio.Event()
        started = asyncio.Event()
        release = asyncio.Event()
        pids = {}
        tasks = []

        real_audit = admin.create_admin_audit_event

        try:
            _, actor_id, enrollment_id = await make_enrollment(maker)

            async def audit(session, **kwargs):
                await real_audit(session, **kwargs)
                if not held.is_set():
                    held.set()
                    await asyncio.wait_for(release.wait(), 8)

            monkeypatch.setattr(admin, "create_admin_audit_event", audit)

            async def writer(label, value):
                async with maker() as session:
                    pids[label] = await session.scalar(
                        text("SELECT pg_backend_pid()")
                    )
                    if label == "second":
                        cached = await session.get(Enrollment, enrollment_id)
                        assert cached.started_at is None
                        started.set()
                    await patch(
                        session, enrollment_id, actor_id,
                        started_at=value,
                    )

            tasks.append(asyncio.create_task(writer("first", FIRST)))
            await asyncio.wait_for(held.wait(), 8)

            tasks.append(asyncio.create_task(writer("second", SECOND)))
            await asyncio.wait_for(started.wait(), 8)

            await _wait_for_pg_blocker(
                engine, pids["second"], pids["first"]
            )
            assert not tasks[1].done()

            release.set()
            await asyncio.wait_for(asyncio.gather(*tasks), 8)

            state = await read_state(maker, enrollment_id)
            assert state["started_at"].date() == SECOND.date()
            assert len(state["audit"]) == 2

            # Audit IDs are not a chronological ordering key.
            # Identify both transitions by their persisted after-values.
            first_matches = [
                entry for entry in state["audit"]
                if entry["after"]["started_at"] == FIRST.isoformat()
            ]
            second_matches = [
                entry for entry in state["audit"]
                if entry["after"]["started_at"] == SECOND.isoformat()
            ]
            assert len(first_matches) == 1
            assert len(second_matches) == 1
            first_audit = first_matches[0]
            second_audit = second_matches[0]
            assert first_audit is not second_audit
            assert first_audit["before"]["started_at"] is None
            assert (
                second_audit["before"]["started_at"]
                == first_audit["after"]["started_at"]
            )
        finally:
            release.set()
            for task in tasks:
                if not task.done():
                    task.cancel()
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


def test_enrollment_patch_audit_failure_rolls_back(
    pg_applicability_db, monkeypatch
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            _, actor_id, enrollment_id = await make_enrollment(maker)
            before = await read_state(maker, enrollment_id)

            async def failed_audit(*args, **kwargs):
                raise RuntimeError("isolated-audit-failure")

            monkeypatch.setattr(
                admin, "create_admin_audit_event", failed_audit
            )

            async with maker() as session:
                with pytest.raises(
                    RuntimeError, match="isolated-audit-failure"
                ):
                    await patch(
                        session, enrollment_id, actor_id,
                        started_at=FIRST,
                    )
                assert not session.in_transaction()

            assert await read_state(maker, enrollment_id) == before
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_enrollment_patch_cancellation_rolls_back(
    pg_applicability_db, monkeypatch
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            _, actor_id, enrollment_id = await make_enrollment(maker)
            before = await read_state(maker, enrollment_id)

            async def cancel_audit(*args, **kwargs):
                raise asyncio.CancelledError()

            monkeypatch.setattr(
                admin, "create_admin_audit_event", cancel_audit
            )

            async with maker() as session:
                with pytest.raises(asyncio.CancelledError):
                    await patch(
                        session, enrollment_id, actor_id,
                        started_at=FIRST,
                    )
                assert not session.in_transaction()

            assert await read_state(maker, enrollment_id) == before
        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_pending_orm_changes_fail_closed_without_autoflush(
    pg_applicability_db,
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            _, actor_id, enrollment_id = await make_enrollment(maker)
            before = await read_state(maker, enrollment_id)

            async with maker() as session:
                session.add(
                    User(
                        email=f"unflushed-{uuid4().hex}@example.invalid",
                        hashed_password="test",
                    )
                )

                with pytest.raises(HTTPException) as error:
                    await patch(
                        session, enrollment_id, actor_id,
                        started_at=FIRST,
                    )

                assert error.value.status_code == 409
                assert error.value.detail == "registry.writer_pending_changes"
                assert not session.in_transaction()

            assert await read_state(maker, enrollment_id) == before
        finally:
            await engine.dispose()

    asyncio.run(scenario())


# ================================================================
# M2.1-P2.1-B: REAL ORGANIZATION TRANSFER REGRESSION
# ================================================================

async def seed_organization_transfer(maker):
    from app.models.organization import Organization

    course_id, actor_id, enrollment_id = await make_enrollment(maker)

    async with maker.begin() as session:
        old_org = Organization(
            inn=str(uuid4().int % 10**12).zfill(12),
            name="M21 Source Organization",
        )
        new_org = Organization(
            inn=str(uuid4().int % 10**12).zfill(12),
            name="M21 Target Organization",
        )
        session.add_all([old_org, new_org])
        await session.flush()

        enrollment = await session.get(Enrollment, enrollment_id)
        enrollment.organization_id = old_org.id

        old_id = str(old_org.id)
        new_id = str(new_org.id)

    return course_id, actor_id, enrollment_id, old_id, new_id


@pytest.mark.parametrize("blocked_side", ["old", "new"])
def test_real_organization_transfer_respects_both_fences(
    pg_applicability_db, blocked_side
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)

        task = None
        pids = {}
        started = asyncio.Event()

        try:
            course_id, actor_id, eid, old_id, new_id = (
                await seed_organization_transfer(maker)
            )

            before = await read_state(maker, eid)
            assert str(before["organization_id"]) == old_id
            assert before["audit"] == []

            held_org = old_id if blocked_side == "old" else new_id

            async with maker.begin() as blocker:
                pids["blocker"] = await blocker.scalar(
                    text("SELECT pg_backend_pid()")
                )

                await acquire_registry_source_write_fences(
                    session=blocker,
                    source_fences=(
                        RegistrySourceFence("organization", held_org),
                    ),
                )

                async def writer():
                    async with maker() as session:
                        pids["writer"] = await session.scalar(
                            text("SELECT pg_backend_pid()")
                        )
                        started.set()
                        return await patch(
                            session,
                            eid,
                            actor_id,
                            organization_id=new_id,
                        )

                task = asyncio.create_task(writer())
                await asyncio.wait_for(started.wait(), 8)

                await _wait_for_pg_blocker(
                    engine,
                    pids["writer"],
                    pids["blocker"],
                )

                assert not task.done()

                during = await read_state(maker, eid)
                assert during == before

            await asyncio.wait_for(task, 8)

            after = await read_state(maker, eid)

            assert str(after["organization_id"]) == new_id
            assert len(after["audit"]) == 1

            audit = after["audit"][0]
            assert audit["before"]["organization_id"] == old_id
            assert audit["after"]["organization_id"] == new_id
            assert audit["changed_fields"] == ["organization_id"]

        finally:
            if task is not None and not task.done():
                task.cancel()
            if task is not None:
                await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()

    asyncio.run(scenario())


def test_real_organization_transfer_stales_both_registry_fingerprints(
    pg_applicability_db,
):
    from app.models.registry_obligation import RegistryObligation
    from app.services.registry_applicability_db_inputs import (
        load_current_registry_applicability_inputs,
    )
    from app.services.registry_applicability_writer import (
        persist_registry_applicability,
    )
    from app.services.registry_current_fingerprint_preflight import (
        preflight_current_registry_fingerprint,
    )
    from app.services.registry_applicability_export_guard import (
        RegistryApplicabilityGateError,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)

        try:
            _, actor_id, eid, old_id, new_id = (
                await seed_organization_transfer(maker)
            )

            fingerprints = {}
            obligation_ids = {}

            async with maker.begin() as session:
                enrollment = await session.get(Enrollment, eid)

                for registry in ("frdo", "mintrud"):
                    obligation = RegistryObligation(
                        enrollment_id=enrollment.id,
                        registry=registry,
                        status="pending_data",
                        readiness_errors=[],
                    )
                    session.add(obligation)
                    await session.flush()

                    current = (
                        await load_current_registry_applicability_inputs(
                            session=session,
                            obligation=obligation,
                        )
                    )

                    assert current.evaluation.status == "required"

                    await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment.id,
                        evaluation=current.evaluation,
                        input_fingerprint=current.fingerprint,
                    )

                    fingerprints[registry] = current.fingerprint
                    obligation_ids[registry] = str(obligation.id)

                    obligation.status = "approved"
                    obligation.approval_snapshot_json = {
                        "isolated": str(obligation.id),
                    }
                    obligation.approval_fingerprint = "a" * 64

            async with maker() as session:
                await patch(
                    session,
                    eid,
                    actor_id,
                    organization_id=new_id,
                )

            for registry in ("frdo", "mintrud"):
                async with maker() as session:
                    obligation = await session.get(
                        RegistryObligation,
                        obligation_ids[registry],
                    )

                    current = (
                        await load_current_registry_applicability_inputs(
                            session=session,
                            obligation=obligation,
                        )
                    )

                    assert current.inputs.organization_id is not None
                    assert str(current.inputs.organization_id) == new_id
                    assert current.fingerprint != fingerprints[registry]

                # Preflight must reject the previously persisted decision.
                async with maker.begin() as session:
                    with pytest.raises(
                        RegistryApplicabilityGateError,
                        match="registry.applicability_stale",
                    ):
                        await preflight_current_registry_fingerprint(
                            session=session,
                            actor_id=actor_id,
                            registry=registry,
                            obligation_id=obligation_ids[registry],
                        )

        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_real_organization_transfer_rolls_back_on_audit_failure(
    pg_applicability_db, monkeypatch
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)

        try:
            _, actor_id, eid, old_id, new_id = (
                await seed_organization_transfer(maker)
            )

            before = await read_state(maker, eid)

            async def fail_audit(*args, **kwargs):
                raise RuntimeError("transfer-audit-failure")

            monkeypatch.setattr(
                admin,
                "create_admin_audit_event",
                fail_audit,
            )

            async with maker() as session:
                with pytest.raises(
                    RuntimeError,
                    match="transfer-audit-failure",
                ):
                    await patch(
                        session,
                        eid,
                        actor_id,
                        organization_id=new_id,
                    )

                assert not session.in_transaction()

            after = await read_state(maker, eid)

            assert after == before
            assert str(after["organization_id"]) == old_id
            assert after["audit"] == []

        finally:
            await engine.dispose()

    asyncio.run(scenario())
