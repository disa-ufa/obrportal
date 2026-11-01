"""M2.3.1D.2E PostgreSQL race contracts, intentionally opt-in and fail-closed.

No database/container/schema is created or dropped by these tests.
Precondition: a separately provisioned, migrated LOCAL disposable database,
populated only with synthetic data. Never use a restored production database.
Set M231D2E_PG_URL to postgresql+asyncpg://...@127.0.0.1:<port>/m231d2e_test_<12hex>,
with username m231d2e_test; M231D2E_PG_SYNTHETIC_ONLY=YES.
The preprovisioned database comment must equal
'm231d2e disposable synthetic only'. No URL/password is printed.
Use a local Python environment, or an isolated runner sharing that local
PostgreSQL network namespace, so loopback really refers to the test server.

Six cases: both registries x identical, overlapping and reversed ID sets.
Uses actual SELECT FOR UPDATE, real independent PostgreSQL sessions and an
observer which proves that the second backend is waiting on a lock.
No mock session/commit/flush or replacement batch-creation service.
Formatter and source snapshot fixtures have the same documented scope as the
HTTP contract file. Seeded rows are unique per case and retained in the disposable
database. Storage is pytest tmp_path. No historical rows are edited/deleted.
"""
from __future__ import annotations

import asyncio
import os
import re
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import RegistrySubmissionBatch, RegistrySubmissionBatchItem
from app.tests.test_m231d2e_replay_contract_20261019_a import (
    approve, file_snapshot, isolate_dependencies, make_app, synthetic_snapshot,
)


def guarded_url():
    raw = os.getenv("M231D2E_PG_URL")
    if not raw:
        pytest.skip("BLOCKED: no explicitly designated disposable local PostgreSQL for M231D2E")
    assert os.getenv("M231D2E_PG_SYNTHETIC_ONLY") == "YES", "Synthetic-only opt-in required"
    url = make_url(raw)
    assert url.drivername == "postgresql+asyncpg", "PostgreSQL asyncpg required"
    assert url.host in ("127.0.0.1", "::1"), "Loopback PostgreSQL only"
    assert url.port and url.port > 1024, "Explicit local test port required"
    assert url.username == "m231d2e_test", "Dedicated test role required"
    assert re.fullmatch(r"m231d2e_test_[0-9a-f]{12}", url.database or ""), "Dedicated test database required"
    assert not url.query, "Connection overrides are forbidden"
    return url


@pytest.mark.asyncio
@pytest.mark.parametrize("registry", ["mintrud", "frdo"])
@pytest.mark.parametrize("shape", ["identical", "overlap", "reversed"])
async def test_d_e_i_real_postgres_independent_requests_cannot_duplicate(
    registry, shape, tmp_path, monkeypatch,
):
    url = guarded_url()  # Before opening ANY database connection.
    engine = create_async_engine(
        url, pool_size=4, max_overflow=0,
        connect_args={"server_settings": {"statement_timeout": "8000", "lock_timeout": "6000"}},
    )
    maker = async_sessionmaker(engine, expire_on_commit=False)
    tasks = []
    release_first = asyncio.Event()
    try:
        async with maker() as check:
            database, role, marker = (await check.execute(text(
                "SELECT current_database(), current_user, "
                "shobj_description(oid, 'pg_database') FROM pg_database "
                "WHERE datname = current_database()"
            ))).one()
            assert database == url.database and role == "m231d2e_test"
            assert marker == "m231d2e disposable synthetic only", "Database isolation marker missing"
            assert (await check.execute(text("SELECT to_regclass('registry_submission_batch_items')"))).scalar_one()
        snapshots, ids = {}, []
        actor = str(uuid4())
        async with maker.begin() as seed:
            seed.add(User(id=actor, email=f"m231d2e-{uuid4().hex}@example.invalid", hashed_password="not-a-login"))
            await seed.flush()
            for label in "ABC":
                course_id, enrollment_id, oid = (str(uuid4()) for _ in range(3))
                seed.add(Course(id=course_id, slug=f"m231d2e-{uuid4().hex}", title="Synthetic replay test"))
                await seed.flush()
                seed.add(Enrollment(id=enrollment_id, user_id=actor, course_id=course_id, status="completed"))
                await seed.flush()
                obligation = RegistryObligation(
                    id=oid, registry=registry, enrollment_id=enrollment_id,
                    status="needs_approval", readiness_errors=[],
                )
                snapshots[oid] = synthetic_snapshot(registry, label)
                approve(obligation, actor, snapshots[oid])
                seed.add(obligation)
                ids.append(oid)
                await seed.flush()

        isolate_dependencies(monkeypatch, tmp_path, snapshots)
        barrier = asyncio.Barrier(2)
        first_locked = asyncio.Event()
        pids = set()
        lock_observed = False

        class RequestSession:
            def __init__(self, session):
                self.session = session
                self.gated = False

            def __getattr__(self, name):
                return getattr(self.session, name)

            async def execute(self, statement, *args, **kwargs):
                # Gate only the first obligation row lock, never seed/observer SQL.
                is_lock = getattr(statement, "_for_update_arg", None) is not None
                if is_lock and not self.gated:
                    self.gated = True
                    await asyncio.wait_for(barrier.wait(), 4)
                    result = await self.session.execute(statement, *args, **kwargs)
                    if not first_locked.is_set():
                        first_locked.set()
                        await asyncio.wait_for(release_first.wait(), 5)
                    return result
                return await self.session.execute(statement, *args, **kwargs)

        async def dependency():
            async with maker() as session:
                pid = (await session.execute(text("SELECT pg_backend_pid()"))).scalar_one()
                pids.add(pid)
                yield RequestSession(session)

        app, path = make_app(registry, actor, dependency)
        first = ids[:2]
        second = ids[1:] if shape == "overlap" else list(reversed(first)) if shape == "reversed" else first

        async def request(values):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test.invalid") as client:
                return await client.post(path, json={"obligation_ids": values})

        tasks = [asyncio.create_task(request(first)), asyncio.create_task(request(second))]
        try:
            await asyncio.wait_for(first_locked.wait(), 5)
            assert len(pids) == 2, "Requests must use different PostgreSQL backends"
            async with maker() as observer:
                deadline = asyncio.get_running_loop().time() + 3
                while asyncio.get_running_loop().time() < deadline:
                    rows = (await observer.execute(text(
                        "SELECT pid, wait_event_type FROM pg_stat_activity WHERE pid IN (:p1, :p2)"
                    ), dict(zip(("p1", "p2"), sorted(pids))))).all()
                    if any(row.wait_event_type == "Lock" for row in rows):
                        lock_observed = True
                        break
                    await observer.rollback()  # Fresh statistics snapshot on next iteration.
                    await asyncio.sleep(0.02)
        finally:
            release_first.set()
        responses = await asyncio.wait_for(asyncio.gather(*tasks), 12)
        assert lock_observed, "The test must observe a real overlapping row-lock wait"
        assert sum(r.status_code == 201 for r in responses) >= 1
        assert all(r.status_code in (200, 201, 409) for r in responses), [r.status_code for r in responses]

        async with maker() as verify:
            items = list((await verify.scalars(select(RegistrySubmissionBatchItem).where(
                RegistrySubmissionBatchItem.obligation_id.in_(ids)
            ))).all())
            batches = list((await verify.scalars(select(RegistrySubmissionBatch).where(
                RegistrySubmissionBatch.generated_by_user_id == actor
            ))).all())
            counts = {oid: sum(item.obligation_id == oid for item in items) for oid in ids}
            files = file_snapshot(tmp_path)
            assert all(count <= 1 for count in counts.values()), (
                "Concurrent requests exported the same approval event more than once", counts,
                "batches", len(batches), "files", len(files),
            )
            assert len(batches) == 1, "Exact replay/overlap must reuse or reject, not create a second batch"
            assert files == {batch.artifact_path: batch.artifact_sha256 for batch in batches}
    finally:
        release_first.set()
        for task in tasks:
            if not task.done():
                task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        await engine.dispose()


@pytest.mark.asyncio
async def test_real_pg_reapproval_and_registry_independence(tmp_path, monkeypatch):
    """Both registries on one enrollment, then lawful same-snapshot reapproval."""
    from datetime import timedelta
    from app.services.compliance_registry_approval import invalidate_registry_approval
    from app.tests.test_m231d2e_replay_contract_20261019_a import NOW
    url = guarded_url()
    engine = create_async_engine(url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    actor, course_id, enrollment_id = (str(uuid4()) for _ in range(3))
    snapshots, ids = {}, {}
    try:
        async with maker() as check:
            row = (await check.execute(text(
                "SELECT current_database(), current_user, shobj_description(oid,'pg_database') "
                "FROM pg_database WHERE datname=current_database()"
            ))).one()
            assert tuple(row) == (url.database, 'm231d2e_test', 'm231d2e disposable synthetic only')
        async with maker.begin() as seed:
            seed.add(User(id=actor, email=f'reapproval-{uuid4().hex}@example.invalid', hashed_password='not-a-login'))
            seed.add(Course(id=course_id, slug=f'reapproval-{uuid4().hex}', title='Synthetic reapproval'))
            await seed.flush()
            seed.add(Enrollment(id=enrollment_id, user_id=actor, course_id=course_id, status='completed'))
            await seed.flush()
            for registry in ('mintrud', 'frdo'):
                oid = str(uuid4()); ids[registry] = oid
                snapshots[oid] = synthetic_snapshot(registry, 'shared enrollment')
                obligation = RegistryObligation(id=oid, registry=registry, enrollment_id=enrollment_id, status='needs_approval', readiness_errors=[])
                approve(obligation, actor, snapshots[oid]); seed.add(obligation)
            await seed.flush()
        isolate_dependencies(monkeypatch, tmp_path, snapshots)
        async def dependency():
            async with maker() as session:
                yield session
        async def post(registry):
            app, path = make_app(registry, actor, dependency)
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test.invalid') as client:
                return await client.post(path, json={'obligation_ids':[ids[registry]]})
        for registry in ids:
            assert (await post(registry)).status_code == 201
            assert (await post(registry)).status_code == 409
        async with maker() as check:
            old_batches = list((await check.scalars(select(RegistrySubmissionBatch).where(RegistrySubmissionBatch.generated_by_user_id == actor))).all())
            old_items = list((await check.scalars(select(RegistrySubmissionBatchItem).where(RegistrySubmissionBatchItem.obligation_id.in_(list(ids.values()))))).all())
            assert {b.registry for b in old_batches} == {'frdo', 'mintrud'}
            assert len(old_batches) == len(old_items) == 2
            old_identity = {(i.id, i.approval_event_id, i.approval_fingerprint) for i in old_items}
        old_files = file_snapshot(tmp_path)
        for registry, oid in ids.items():
            async with maker.begin() as approval_session:
                obligation = await approval_session.get(RegistryObligation, oid)
                old_event, old_fingerprint = obligation.approval_event_id, obligation.approval_fingerprint
                assert invalidate_registry_approval(obligation, reason='course_title_changed', invalidated_at=NOW+timedelta(seconds=1))
                approve(obligation, actor, snapshots[oid], NOW+timedelta(seconds=2))
                assert obligation.approval_event_id != old_event
                assert obligation.approval_fingerprint == old_fingerprint
            assert (await post(registry)).status_code == 201
            assert (await post(registry)).status_code == 409
        async with maker() as check:
            batches = list((await check.scalars(select(RegistrySubmissionBatch).where(RegistrySubmissionBatch.generated_by_user_id == actor))).all())
            items = list((await check.scalars(select(RegistrySubmissionBatchItem).where(RegistrySubmissionBatchItem.obligation_id.in_(list(ids.values()))))).all())
            assert len(batches) == len(items) == 4
            assert old_identity.issubset({(i.id, i.approval_event_id, i.approval_fingerprint) for i in items})
            assert all(sum(b.registry == r for b in batches) == 2 for r in ids)
            assert file_snapshot(tmp_path) == {b.artifact_path:b.artifact_sha256 for b in batches}
            assert all(file_snapshot(tmp_path)[path] == digest for path,digest in old_files.items())
    finally:
        await engine.dispose()
