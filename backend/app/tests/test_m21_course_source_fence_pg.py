"""Course writer serialization against registry preflight, on disposable PG only."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request

import app.api.v1.admin as admin
from app.models.audit_event import AuditEvent
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_applicability import RegistryApplicabilityRecord, RegistryApplicabilityEvent
from app.models.registry_obligation import RegistryObligation
from app.models.user import User
from app.schemas.admin import AdminCourseUpdate
from app.services.registry_action_lockset import RegistrySourceFence, acquire_registry_source_write_fences
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_applicability_export_guard import RegistryApplicabilityGateError
from app.services.registry_applicability_writer import persist_registry_applicability
from app.services.registry_current_fingerprint_preflight import preflight_current_registry_fingerprint
from test_registry_applicability_writer_pg import pg_applicability_db, _wait_for_pg_blocker


CHANGES = [
    ('document_type', 'diploma'),
    ('regulatory_program_type', 'dpo_advanced_training'),
    ('frdo_requirement_mode', 'not_required'),
    ('mintrud_requirement_mode', 'not_required'),
]


async def seed(maker, *, enrollments=2):
    async with maker.begin() as session:
        actor = User(email=f'm21-{uuid4().hex}@example.invalid', hashed_password='test')
        course = Course(slug=f'm21-{uuid4().hex}', title='Before', document_type='certificate',
                        regulatory_program_type='occupational_safety_training',
                        frdo_requirement_mode='required', mintrud_requirement_mode='required')
        session.add_all([actor, course])
        await session.flush()
        ids = []
        for _ in range(enrollments):
            student = User(email=f'm21-student-{uuid4().hex}@example.invalid', hashed_password='test')
            session.add(student)
            await session.flush()
            enrollment = Enrollment(user_id=student.id, course_id=course.id, status='completed')
            session.add(enrollment)
            await session.flush()
            for registry in ('frdo', 'mintrud'):
                obligation = RegistryObligation(enrollment_id=enrollment.id, registry=registry, status='pending_data', readiness_errors=[])
                session.add(obligation)
                await session.flush()
                current = await load_current_registry_applicability_inputs(session=session, obligation=obligation)
                assert current.evaluation.status == 'required'
                await persist_registry_applicability(session=session, enrollment_id=enrollment.id,
                    evaluation=current.evaluation, input_fingerprint=current.fingerprint)
                obligation.status = 'approved'
                obligation.approval_snapshot_json = {'isolated': str(obligation.id)}
                obligation.approval_fingerprint = 'a' * 64
                ids.append((obligation.id, registry, enrollment.id))
        return course.id, actor.id, ids


async def update(session, course_id, actor_id, changes):
    request = Request({'type': 'http', 'method': 'PATCH', 'path': '/isolated', 'headers': [], 'client': ('127.0.0.1', 1)})
    return await admin.update_admin_course(course_id, AdminCourseUpdate(**changes), request,
                                           SimpleNamespace(id=actor_id), session)


async def state(maker, course_id):
    async with maker() as session:
        course = await session.get(Course, course_id)
        enrollments = select(Enrollment.id).where(Enrollment.course_id == course_id)
        records = (await session.scalars(select(RegistryApplicabilityRecord).where(
            RegistryApplicabilityRecord.enrollment_id.in_(enrollments)).order_by(RegistryApplicabilityRecord.id))).all()
        obligations = (await session.scalars(select(RegistryObligation).where(
            RegistryObligation.enrollment_id.in_(enrollments)).order_by(RegistryObligation.id))).all()
        events = (await session.scalars(select(RegistryApplicabilityEvent).where(
            RegistryApplicabilityEvent.enrollment_id.in_(enrollments)).order_by(RegistryApplicabilityEvent.id))).all()
        audit = (await session.scalars(select(AuditEvent).where(AuditEvent.entity_type == 'course',
            AuditEvent.entity_id == course_id).order_by(AuditEvent.id))).all()
        return dict(course=admin.course_snapshot(course),
                    decisions=[(r.id, r.decision, r.input_fingerprint, r.decision_version, r.source) for r in records],
                    events=[(e.id, e.decision_version, e.input_fingerprint) for e in events],
                    obligations=[(o.id, o.status, o.approval_snapshot_json, o.approval_fingerprint,
                                  o.approval_invalidated_at, o.approval_invalidation_reason) for o in obligations],
                    audit=[a.payload for a in audit])


@pytest.mark.parametrize('field,value', CHANGES)
@pytest.mark.parametrize('registry', ['mintrud', 'frdo'])
@pytest.mark.parametrize('writer_first', [False, True])
def test_course_update_serializes_with_preflight(pg_applicability_db, monkeypatch, field, value, registry, writer_first):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        release = asyncio.Event()
        writing, reading = asyncio.Event(), asyncio.Event()
        pids = {}
        tasks = []
        real_audit = admin.create_admin_audit_event
        try:
            cid, actor, obligations = await seed(maker)
            oid = next(oid for oid, reg, _ in obligations if reg == registry)
            before = await state(maker, cid)
            affects_registry = field in ('document_type', 'regulatory_program_type', registry + '_requirement_mode')
            async def audit(session, **kwargs):
                await real_audit(session, **kwargs)
                if writer_first and kwargs['entity_id'] == cid:
                    writing.set()
                    await asyncio.wait_for(release.wait(), 8)
            monkeypatch.setattr(admin, 'create_admin_audit_event', audit)
            async def writer():
                async with maker() as session:
                    pids['writer'] = await session.scalar(text('SELECT pg_backend_pid()'))
                    if not writer_first: writing.set()
                    return await update(session, cid, actor, {field: value})
            async def reader():
                async with maker.begin() as session:
                    pids['reader'] = await session.scalar(text('SELECT pg_backend_pid()'))
                    if writer_first: reading.set()
                    if writer_first and affects_registry:
                        with pytest.raises(RegistryApplicabilityGateError, match='registry.applicability_stale'):
                            await preflight_current_registry_fingerprint(session=session, actor_id=actor, registry=registry, obligation_id=oid)
                        return
                    await preflight_current_registry_fingerprint(session=session, actor_id=actor, registry=registry, obligation_id=oid)
                    if not writer_first:
                        reading.set()
                        await asyncio.wait_for(release.wait(), 8)
            first = asyncio.create_task(writer() if writer_first else reader())
            tasks.append(first)
            await asyncio.wait_for((writing if writer_first else reading).wait(), 8)
            second = asyncio.create_task(reader() if writer_first else writer())
            tasks.append(second)
            await asyncio.wait_for((reading if writer_first else writing).wait(), 8)
            waiter, blocker = ('reader', 'writer') if writer_first else ('writer', 'reader')
            await _wait_for_pg_blocker(engine, pids[waiter], pids[blocker])
            assert not second.done()
            # Separate session proves the writer has not committed through the lock.
            assert (await state(maker, cid))['course'][field] == before['course'][field]
            release.set()
            await asyncio.wait_for(asyncio.gather(*tasks), 8)
            after = await state(maker, cid)
            assert after['course'][field] == value
            assert after['decisions'] == before['decisions']
            assert after['events'] == before['events']
            assert after['obligations'] == before['obligations']
            assert len(after['audit']) == 1
            assert after['audit'][0]['before'] == before['course']
            assert after['audit'][0]['after'] == after['course']
            if affects_registry:
                async with maker.begin() as session:
                    with pytest.raises(RegistryApplicabilityGateError, match='registry.applicability_stale'):
                        await preflight_current_registry_fingerprint(session=session, actor_id=actor, registry=registry, obligation_id=oid)
        finally:
            release.set()
            for task in tasks:
                if not task.done(): task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())


def test_course_without_dependents_does_not_create_registry_rows(pg_applicability_db):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            cid, actor, ids = await seed(maker, enrollments=0)
            assert ids == []
            async with maker() as session:
                await update(session, cid, actor, {'document_type': 'diploma'})
            saved = await state(maker, cid)
            assert saved['course']['document_type'] == 'diploma'
            assert saved['decisions'] == saved['events'] == saved['obligations'] == []
            assert len(saved['audit']) == 1
        finally: await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize('isolation', ['REPEATABLE READ', 'SERIALIZABLE'])
def test_incompatible_isolation_rolls_back_without_changes(pg_applicability_db, isolation):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        isolated = async_sessionmaker(engine.execution_options(isolation_level=isolation), expire_on_commit=False)
        try:
            cid, actor, _ = await seed(maker)
            before = await state(maker, cid)
            async with isolated() as session:
                with pytest.raises(HTTPException) as error:
                    await update(session, cid, actor, {'document_type': 'diploma', 'title': 'Must not persist'})
                assert error.value.status_code == 409
                assert error.value.detail == 'registry.lockset_requires_read_committed'
                assert not session.in_transaction()
            assert await state(maker, cid) == before
        finally: await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize('unsafe', ['dirty', 'new', 'nested'])
def test_unsafe_session_does_not_autoflush(pg_applicability_db, unsafe):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            cid, actor, _ = await seed(maker)
            before = await state(maker, cid)
            async with maker() as session:
                cached = await session.get(Course, cid)
                if unsafe == 'dirty': cached.title = 'Must not persist'
                elif unsafe == 'new': session.add(User(email=f'unsaved-{uuid4().hex}@example.invalid', hashed_password='test'))
                else: await session.begin_nested()
                with pytest.raises(HTTPException) as error:
                    await update(session, cid, actor, {'document_type': 'diploma'})
                assert error.value.status_code == 409
                assert error.value.detail in ('registry.writer_pending_changes', 'registry.writer_fresh_transaction_required')
                assert not session.in_transaction()
            assert await state(maker, cid) == before
        finally: await engine.dispose()
    asyncio.run(scenario())


@pytest.mark.parametrize('phase', ['audit', 'commit', 'committed_ack_lost'])
def test_course_and_audit_share_rollback_boundary(pg_applicability_db, monkeypatch, phase):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        try:
            cid, actor, _ = await seed(maker)
            before = await state(maker, cid)
            real_audit = admin.create_admin_audit_event
            async def audit(session, **kwargs):
                await real_audit(session, **kwargs)
                raise OSError('injected audit failure')
            if phase == 'audit': monkeypatch.setattr(admin, 'create_admin_audit_event', audit)
            async with maker() as session:
                real_commit = session.commit
                async def commit():
                    if phase == 'committed_ack_lost': await real_commit()
                    raise OSError('injected commit failure')
                if phase != 'audit': monkeypatch.setattr(session, 'commit', commit)
                with pytest.raises(OSError, match='injected'):
                    await update(session, cid, actor, {'document_type': 'diploma', 'title': 'After'})
                assert not session.in_transaction()
            after = await state(maker, cid)
            if phase != 'committed_ack_lost': assert after == before
            else:
                assert after['course']['document_type'] == 'diploma'
                assert len(after['audit']) == 1
                assert all(row[1] == 'needs_approval' and row[4] is not None for row in after['obligations'])
                assert after['decisions'] == before['decisions'] and after['events'] == before['events']
                assert [(r[0], r[2:4]) for r in after['obligations']] == [(r[0], r[2:4]) for r in before['obligations']]
        finally: await engine.dispose()
    asyncio.run(scenario())


def test_scope_growth_while_waiting_fails_closed(pg_applicability_db):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        task = None
        started = asyncio.Event()
        pids = {}
        try:
            cid, actor, _ = await seed(maker)
            before = await state(maker, cid)
            async with maker.begin() as blocker:
                pids['blocker'] = await blocker.scalar(text('SELECT pg_backend_pid()'))
                await acquire_registry_source_write_fences(session=blocker, source_fences=(RegistrySourceFence('course', cid),))
                async def writer():
                    async with maker() as session:
                        pids['writer'] = await session.scalar(text('SELECT pg_backend_pid()'))
                        started.set()
                        with pytest.raises(HTTPException) as error:
                            await update(session, cid, actor, {'document_type': 'diploma'})
                        assert error.value.status_code == 409
                        assert error.value.detail == 'registry.writer_scope_changed_during_lock'
                        assert not session.in_transaction()
                task = asyncio.create_task(writer())
                await asyncio.wait_for(started.wait(), 8)
                await _wait_for_pg_blocker(engine, pids['writer'], pids['blocker'])
                # The earlier transaction changes membership while the writer
                # waits, reproducing the unprotected enrollment-path boundary.
                blocker.add(Enrollment(user_id=actor, course_id=cid, status='completed'))
            await asyncio.wait_for(task, 8)
            after = await state(maker, cid)
            assert after == before  # New enrollment creates no registry/audit rows.
        finally:
            if task and not task.done(): task.cancel()
            if task: await asyncio.gather(task, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())


def test_waiting_writer_refreshes_cached_course_for_audit(pg_applicability_db, monkeypatch):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        held, started, release = asyncio.Event(), asyncio.Event(), asyncio.Event()
        pids, tasks = {}, []
        real_audit = admin.create_admin_audit_event
        try:
            cid, actor, _ = await seed(maker)
            async def audit(session, **kwargs):
                await real_audit(session, **kwargs)
                if kwargs['payload']['after']['document_type'] == 'first':
                    held.set()
                    await asyncio.wait_for(release.wait(), 8)
            monkeypatch.setattr(admin, 'create_admin_audit_event', audit)
            async def writer(name):
                async with maker() as session:
                    pids[name] = await session.scalar(text('SELECT pg_backend_pid()'))
                    if name == 'second':
                        cached = await session.get(Course, cid)
                        assert cached.document_type == 'certificate'
                        started.set()
                    await update(session, cid, actor, {'document_type': name})
            tasks.append(asyncio.create_task(writer('first')))
            await asyncio.wait_for(held.wait(), 8)
            tasks.append(asyncio.create_task(writer('second')))
            await asyncio.wait_for(started.wait(), 8)
            await _wait_for_pg_blocker(engine, pids['second'], pids['first'])
            release.set()
            await asyncio.wait_for(asyncio.gather(*tasks), 8)
            result = await state(maker, cid)
            assert result['course']['document_type'] == 'second'
            second = next(a for a in result['audit'] if a['after']['document_type'] == 'second')
            assert second['before']['document_type'] == 'first'
        finally:
            release.set()
            for task in tasks:
                if not task.done(): task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            await engine.dispose()
    asyncio.run(scenario())
