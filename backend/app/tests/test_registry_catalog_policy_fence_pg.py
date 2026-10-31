"""Real PostgreSQL tests, only a new explicitly marked synthetic database."""
import asyncio
import os

import pytest
import pytest_asyncio
from sqlalchemy import Integer, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.services.registry_catalog_policy_fence import (
    begin_registry_catalog_policy_fence as begin, RegistryCatalogFenceError,
    CATALOG_POLICY_NAMESPACE as NS, CATALOG_POLICY_RESOURCE as KEY,
)
from app.services.registry_action_lockset import RegistrySourceFence


class Base(DeclarativeBase): pass
class Probe(Base):
    __tablename__ = 'm7a_probe'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[int] = mapped_column(Integer)


@pytest_asyncio.fixture
async def engine():
    assert os.environ.get('R24M7A_SYNTHETIC_ONLY') == 'YES'
    engine = create_async_engine(os.environ['R24M7A_TEST_URL'], hide_parameters=True,
        connect_args={'server_settings': {'statement_timeout':'5000', 'lock_timeout':'4000'}})
    assert engine.url.database.startswith('r24m7a_')
    async with engine.connect() as c:
        marker = await c.scalar(text("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"))
        assert marker == 'OBRPORTAL_R24M7A_SYNTHETIC_ONLY'
    try: yield engine
    finally: await engine.dispose()


async def wait_for_pg_waiter(engine, *, catalog=True):
    async def poll():
        async with engine.connect() as c:
            while True:
                count = await c.scalar(text(
                    "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted "
                    + ("AND classid=:ns AND objid=:key AND objsubid=2" if catalog else "AND objsubid=1")
                ), {'ns':NS, 'key':KEY})
                if count: return
                await asyncio.sleep(.01)
    await asyncio.wait_for(poll(), 2)


@pytest.mark.asyncio
async def test_shared_shared(engine):
    async with AsyncSession(engine) as a, AsyncSession(engine) as b:
        await begin(session=a, mode='shared')
        await asyncio.wait_for(begin(session=b, mode='shared'), 2)
        await a.rollback(); await b.rollback()


@pytest.mark.asyncio
@pytest.mark.parametrize('holder,waiter', [('shared','exclusive'), ('exclusive','shared'), ('exclusive','exclusive')])
@pytest.mark.parametrize('finish', ['commit','rollback'])
async def test_conflicts_and_release(engine, holder, waiter, finish):
    async with AsyncSession(engine) as a, AsyncSession(engine) as b:
        await begin(session=a, mode=holder)
        task = asyncio.create_task(begin(session=b, mode=waiter))
        try:
            await wait_for_pg_waiter(engine)
            assert not task.done()
            await getattr(a, finish)()
            lease = await asyncio.wait_for(task, 2)
            lease.require_mode(waiter)
        finally:
            if not task.done(): task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            await b.rollback()


@pytest.mark.asyncio
async def test_cancel_waiter_releases_own_transaction(engine):
    async with AsyncSession(engine) as a, AsyncSession(engine) as b, AsyncSession(engine) as c:
        await begin(session=a, mode='exclusive')
        task = asyncio.create_task(begin(session=b, mode='shared'))
        try:
            await wait_for_pg_waiter(engine)
            task.cancel()
            with pytest.raises(asyncio.CancelledError): await task
            assert not b.in_transaction()
            await a.rollback()
            await asyncio.wait_for(begin(session=c, mode='exclusive'), 2)
        finally:
            if not task.done(): task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            await c.rollback()


@pytest.mark.asyncio
@pytest.mark.parametrize('level', ['REPEATABLE READ','SERIALIZABLE'])
async def test_isolation_rejection(engine, level):
    other = engine.execution_options(isolation_level=level)
    async with AsyncSession(other) as s:
        with pytest.raises(ValueError, match='requires_read_committed'):
            await begin(session=s, mode='shared')
        assert not s.in_transaction()


@pytest.mark.asyncio
@pytest.mark.parametrize('state', ['new','dirty','deleted','nested','row_locked','flushed'])
async def test_real_orm_state_rejected_without_autoflush(engine, state):
    async with AsyncSession(engine) as s:
        if state == 'new': s.add(Probe(id=99, value=99))
        elif state in ('dirty','deleted','flushed'):
            obj = await s.get(Probe, 1)
            if state == 'deleted': await s.delete(obj)
            else:
                obj.value = 99
                if state == 'flushed': await s.flush()
        elif state == 'nested': await s.begin_nested()
        else: await s.execute(text('SELECT * FROM m7a_probe WHERE id=1 FOR UPDATE'))
        with pytest.raises(RegistryCatalogFenceError): await begin(session=s, mode='shared')
        await s.rollback()
    async with engine.connect() as c:
        assert (await c.execute(text('SELECT id,value FROM m7a_probe ORDER BY id'))).all() == [(1,0)]


@pytest.mark.asyncio
async def test_existing_source_fences_order_and_wait(engine):
    sources = (RegistrySourceFence('enrollment','00000000-0000-0000-0000-000000000001'),)
    async with AsyncSession(engine) as a, AsyncSession(engine) as b:
        la = await begin(session=a, mode='shared')
        await la.source_fences(source_fences=sources)
        lb = await begin(session=b, mode='shared')
        task = asyncio.create_task(lb.source_fences(source_fences=sources))
        try:
            await wait_for_pg_waiter(engine, catalog=False)
            with pytest.raises(RegistryCatalogFenceError, match='fresh_session'):
                await begin(session=a, mode='exclusive')
            with pytest.raises(RegistryCatalogFenceError, match='upgrade'):
                la.require_mode('exclusive')
            await a.commit()
            await asyncio.wait_for(task, 2)
            # Exact repeat never issues another acquisition after the row phase.
            await b.execute(text('SELECT * FROM m7a_probe WHERE id=1 FOR UPDATE'))
            await lb.source_fences(source_fences=sources)
            with pytest.raises(RegistryCatalogFenceError, match='fresh_session'):
                await begin(session=b, mode='shared')
        finally:
            if not task.done(): task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            await b.rollback()


@pytest.mark.asyncio
async def test_bigint_namespace_does_not_overlap(engine):
    # Same bit pattern in bigint space must remain independent of two-int C.
    async with AsyncSession(engine) as a, AsyncSession(engine) as b:
        await begin(session=a, mode='exclusive')
        ok = await b.scalar(text('SELECT pg_try_advisory_xact_lock(CAST(:key AS bigint))'),
                            {'key': (NS << 32) | KEY})
        assert ok is True
        await b.rollback(); await a.rollback()


@pytest.mark.asyncio
async def test_old_lease_invalid_after_commit(engine):
    async with AsyncSession(engine) as s:
        lease = await begin(session=s, mode='shared')
        await s.commit()
        with pytest.raises(RegistryCatalogFenceError, match='inactive'): lease.require_mode('shared')
