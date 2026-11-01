import asyncio
import os
from contextvars import ContextVar
import pytest
import pytest_asyncio
from sqlalchemy import event, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
import app.mintrud_catalog_cli as cli
import app.db.seed as full_seed
import app.db.seed_mintrud_learn_programs as small_seed
from app.services.mintrud_learn_programs import sync_mintrud_learn_program_catalog_v109 as sync
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence as begin
from app.services.registry_catalog_policy_fence import CATALOG_POLICY_NAMESPACE as NS, CATALOG_POLICY_RESOURCE as KEY

TRACK=ContextVar('catalog_writer_under_test',default=False)
LOCK_SQL=f"SELECT count(*) FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND granted AND mode='ExclusiveLock' AND classid={NS} AND objid={KEY} AND objsubid=2"

@pytest_asyncio.fixture
async def env(monkeypatch):
    assert os.environ['R24M7B_SYNTHETIC_ONLY']=='YES'
    url=make_url(os.environ['R24M7B_TEST_URL']);assert url.database.startswith('r24m7b_')
    e=create_async_engine(url,hide_parameters=True,connect_args={'server_settings':{'statement_timeout':'5000','lock_timeout':'3000'}})
    async with e.begin() as c:
        marker=await c.scalar(text("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"))
        assert marker=='OBRPORTAL_R24M7B_SYNTHETIC_ONLY'
        # Only fixtures owned by this new test database. No DROP or old DB access.
        for table in ['course_mintrud_learn_programs','mintrud_learn_programs','role_permissions','roles','permissions']:
            await c.execute(text('DELETE FROM '+table))
    maker=async_sessionmaker(e,expire_on_commit=False)
    monkeypatch.setattr(full_seed,'AsyncSessionLocal',maker)
    monkeypatch.setattr(small_seed,'AsyncSessionLocal',maker)
    try:yield e,url,maker
    finally:await e.dispose()

async def writer(kind,url,maker,plan):
    if kind=='cli':return await cli.operate(url,apply=True,confirmed_plan=plan['plan_sha256'])
    if kind=='seed':return await small_seed.seed_mintrud_learn_programs()
    if kind=='full_seed':return await full_seed.seed()
    async with maker() as s:
        fence=await begin(session=s,mode='exclusive')
        await sync(s,catalog_fence=fence)
        await s.commit()

async def wait_exclusive(e):
    async def poll():
        async with e.connect() as c:
            while not await c.scalar(text(f"SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted AND mode='ExclusiveLock' AND classid={NS} AND objid={KEY} AND objsubid=2")):
                await asyncio.sleep(.01)
    await asyncio.wait_for(poll(),1.5)

@pytest.mark.asyncio
@pytest.mark.parametrize('kind',['cli','seed','full_seed','direct'])
async def test_real_writer_waits_before_sql_and_holds_c_through_commit(env,kind):
    e,url,maker=env; plan=await cli.operate(url)
    trace=[];commits=[]
    def observe(conn,cursor,statement,parameters,context,executemany):
        if not TRACK.get() or statement==LOCK_SQL:return
        trace.append(statement)
        if statement.lstrip().upper().startswith(('INSERT','UPDATE','DELETE','LOCK TABLE')):
            assert conn.exec_driver_sql(LOCK_SQL).scalar_one()==1
    def before_commit(session):
        if TRACK.get():
            assert session.connection().exec_driver_sql(LOCK_SQL).scalar_one()==1
            commits.append(True)
    event.listen(Engine,'before_cursor_execute',observe)
    event.listen(Session,'before_commit',before_commit)
    async with maker() as holder:
        await begin(session=holder,mode='shared')
        async def run():
            token=TRACK.set(True)
            try:return await writer(kind,url,maker,plan)
            finally:TRACK.reset(token)
        task=asyncio.create_task(run())
        try:
            await wait_exclusive(e)
            assert not task.done()
            assert not any(x.lstrip().upper().startswith(('INSERT','UPDATE','DELETE','LOCK TABLE')) for x in trace)
            assert trace[0]=='SHOW transaction_isolation'
            assert 'pg_advisory_xact_lock(' in trace[1]
            await holder.rollback()
            await asyncio.wait_for(task,5)
            assert commits==[True]
            assert any(x.lstrip().upper().startswith('INSERT') for x in trace)
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)
            event.remove(Engine,'before_cursor_execute',observe)
            event.remove(Session,'before_commit',before_commit)
    async with e.connect() as c:
        assert await c.scalar(text('SELECT count(*) FROM mintrud_learn_programs'))==28

@pytest.mark.asyncio
@pytest.mark.parametrize('kind',['cli','seed','full_seed'])
@pytest.mark.parametrize('cancel',[False,True])
async def test_writer_failure_after_flush_rolls_back_and_releases(env,kind,cancel,monkeypatch):
    e,url,maker=env;plan=await cli.operate(url)
    module={'cli':cli,'seed':small_seed,'full_seed':full_seed}[kind]
    original=module.sync_mintrud_learn_program_catalog_v109
    async def fail(s,**kwargs):
        result=await original(s,**kwargs)
        if not kwargs.get('dry_run',False):
            assert await s.scalar(text(LOCK_SQL))==1
            raise asyncio.CancelledError() if cancel else RuntimeError('synthetic post-flush failure')
        return result
    monkeypatch.setattr(module,'sync_mintrud_learn_program_catalog_v109',fail)
    with pytest.raises(asyncio.CancelledError if cancel else RuntimeError):
        await writer(kind,url,maker,plan)
    async with e.connect() as c:
        assert await c.scalar(text('SELECT count(*) FROM mintrud_learn_programs'))==0
        assert await c.scalar(text('SELECT count(*) FROM roles'))==0
    async with maker() as s:
        await asyncio.wait_for(begin(session=s,mode='exclusive'),2)
        await s.rollback()

@pytest.mark.asyncio
async def test_cli_plan_recheck_dryrun_and_idempotence(env):
    e,url,maker=env
    plan=await cli.operate(url)
    assert plan['created']==28 and plan['committed'] is False
    with pytest.raises(cli.CatalogOperationError,match='Plan changed'):
        await cli.operate(url,apply=True,confirmed_plan='0'*64)
    async with e.connect() as c:assert await c.scalar(text('SELECT count(*) FROM mintrud_learn_programs'))==0
    await cli.operate(url,apply=True,confirmed_plan=plan['plan_sha256'])
    again=await cli.operate(url);assert again['unchanged']==28
    await cli.operate(url,apply=True,confirmed_plan=again['plan_sha256'])
    async with e.connect() as c:assert await c.scalar(text('SELECT count(*) FROM mintrud_learn_programs'))==28
