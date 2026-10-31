import asyncio, os
from contextlib import asynccontextmanager
from datetime import date
from uuid import uuid4
import pytest, pytest_asyncio
from sqlalchemy import select,text
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
import app.services.registry_document_transaction as owner
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.document_record import DocumentRecord
from app.models.registry_obligation import RegistryObligation
from app.models.organization import Organization
from app.services.registry_action_scope import acquire_discovered_registry_action_scope
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence as begin

@pytest_asyncio.fixture
async def env(monkeypatch):
    e=create_async_engine(os.environ['R24M7D1_TEST_URL'],hide_parameters=True,
        connect_args={'server_settings':{'statement_timeout':'5000','lock_timeout':'3000'}})
    assert e.url.database.startswith('r24m7d1_')
    maker=async_sessionmaker(e,expire_on_commit=False);monkeypatch.setattr(owner,'AsyncSessionLocal',maker)
    data=[]
    async with maker.begin() as s:
        assert await s.scalar(text("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"))=='OBRPORTAL_R24M7D1_SYNTHETIC_ONLY'
        for i in range(2):
            u=User(email=uuid4().hex+'@test.invalid',hashed_password='synthetic');s.add(u)
            c=Course(slug=uuid4().hex,title='synthetic',regulatory_program_type='unspecified',frdo_requirement_mode='required',mintrud_requirement_mode='required');s.add(c);await s.flush()
            en=Enrollment(user_id=u.id,course_id=c.id,status='completed');s.add(en);await s.flush()
            doc=DocumentRecord(user_id=u.id,course_id=c.id,enrollment_id=en.id,document_number=uuid4().hex,document_type='certificate',title='synthetic',issued_at=date(2026,1,1));s.add(doc);await s.flush()
            obligations=[]
            for registry in ('frdo','mintrud'):
                o=RegistryObligation(enrollment_id=en.id,document_id=doc.id,registry=registry,status='pending_data',rule_code='test',rule_version='test')
                s.add(o);await s.flush();obligations.append(o.id)
            extra=DocumentRecord(user_id=u.id,document_number=uuid4().hex,document_type='other',title='unlinked');s.add(extra);await s.flush()
            data.append((u.id,c.id,en.id,doc.id,extra.id,obligations))
    try:yield e,maker,data
    finally:await e.dispose()

tx=asynccontextmanager(owner.get_registry_document_db)
async def waiting(e):
    async def poll():
        async with e.connect() as c:
            while not await c.scalar(text("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())")):await asyncio.sleep(.01)
    await asyncio.wait_for(poll(),1.5)

from app.models.import_batch import ImportBatch,ImportRow
from app.models.learner_profile import LearnerProfile
from app.models.role import Permission,Role,RolePermission,UserRole
from app.services.registry_import_transaction import prepare_import_scope,KEY
from app.services.registry_action_lockset import RegistryActionLockError
from app.services.learner_import_batches import apply_learner_import_batch

async def batch_setup(maker,data,*,second=False,extra=None):
    async with maker.begin() as s:
        learner_role=await s.scalar(select(Role).where(Role.code=='learner_fl'))
        if learner_role is None:
            s.add(Role(code='learner_fl',name='Synthetic learner'));await s.flush()
        actor=await s.get(User,data[1][0]);actor.is_active=True
        p=await s.scalar(select(Permission).where(Permission.code=='admin.users.write'))
        if p is None:
            p=Permission(code='admin.users.write',name='synthetic');s.add(p);await s.flush()
        role=Role(code='d1_'+uuid4().hex,name='synthetic');s.add(role);await s.flush()
        s.add(RolePermission(role_id=role.id,permission_id=p.id));s.add(UserRole(user_id=actor.id,role_id=role.id))
        org=Organization(name='synthetic',inn=str(uuid4().int)[:12]);s.add(org);await s.flush()
        user=await s.get(User,data[0][0])
        b=ImportBatch(status='parsed',course_id=data[0][1],organization_id=org.id)
        s.add(b);await s.flush()
        s.add(ImportRow(batch_id=b.id,row_number=1,status='valid',normalized_data_json={'email':user.email,'first_name':'Imported'}))
        if extra is not None:s.add(ImportRow(batch_id=b.id,row_number=2,status='valid',normalized_data_json=extra))
        return b.id,actor.id,org.id

async def prepare(s,bid,uid):
    actor=await s.get(User,uid)
    return await prepare_import_scope(session=s,batch_id=bid,actor=actor)

@pytest.mark.asyncio
async def test_real_apply_trace_partial_validation_and_commit(env):
    from sqlalchemy import event
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data,extra={})
    trace=[]
    def record(c,cur,stmt,params,ctx,many):trace.append(stmt.upper())
    event.listen(e.sync_engine,'before_cursor_execute',record)
    try:
        async with tx() as s:
            batch=await prepare(s,bid,actor)
            ready=len(trace)
            result=await apply_learner_import_batch(s,batch=batch)
            assert result.error_rows_count==1 and result.created_profiles_count==1
            await s.commit()
        assert not any(x.lstrip().startswith(('INSERT','UPDATE','DELETE','SAVEPOINT')) for x in trace[:ready])
        assert any('PG_ADVISORY_XACT_LOCK_SHARED' in x for x in trace[:ready])
        assert any('HASHTEXTEXTENDED' in x for x in trace[:ready])
        assert any('FOR UPDATE' in x and 'REGISTRY_OBLIGATIONS' in x for x in trace[:ready])
        assert any(x.startswith('SAVEPOINT') for x in trace[ready:])
    finally:event.remove(e.sync_engine,'before_cursor_execute',record)
    async with maker() as s:
        assert (await s.get(Enrollment,data[0][2])).organization_id==oid
        assert (await s.get(ImportBatch,bid)).status=='applied'
        assert (await s.scalar(select(LearnerProfile).where(LearnerProfile.user_id==data[0][0]))).first_name=='Imported'

@pytest.mark.asyncio
async def test_two_imports_same_learner_no_lost_affiliation(env):
    e,maker,data=env;b1,actor,o1=await batch_setup(maker,data);b2,_,o2=await batch_setup(maker,data)
    async with tx() as a:
        b=await prepare(a,b1,actor);await apply_learner_import_batch(a,batch=b)
        async def contender():
            async with tx() as s:
                b=await prepare(s,b2,actor);await apply_learner_import_batch(s,batch=b);await s.commit()
        task=asyncio.create_task(contender())
        try:
            await waiting(e);await a.commit()
            with pytest.raises(Exception,match='scope_changed'):await asyncio.wait_for(task,2)
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)
    async with maker() as s:
        assert (await s.get(Enrollment,data[0][2])).organization_id==o1
        assert (await s.get(ImportBatch,b2)).status=='parsed'

@pytest.mark.asyncio
@pytest.mark.parametrize('registry,index',[('frdo',0),('mintrud',1)])
@pytest.mark.parametrize('writer_first',[False,True])
async def test_import_action_interleavings(env,registry,index,writer_first):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async def action(s):
        await begin(session=s,mode='shared')
        locked,_=await acquire_discovered_registry_action_scope(session=s,actor_id=actor,registry=registry,obligation_ids=(data[0][5][index],))
        return await load_current_registry_applicability_inputs(session=s,obligation=locked[0])
    async def writer():
        async with tx() as s:
            b=await prepare(s,bid,actor);await apply_learner_import_batch(s,batch=b);await s.commit()
    async with maker() as baseline:old=await action(baseline)
    if writer_first:
        async with tx() as a:
            b=await prepare(a,bid,actor);await apply_learner_import_batch(a,batch=b)
            async def reader():
                async with maker() as s:return await action(s)
            task=asyncio.create_task(reader())
            try:
                await waiting(e);await a.commit()
                with pytest.raises(RegistryActionLockError,match='registry.scope_changed_during_lock'):
                    await asyncio.wait_for(task,2)
            finally:
                if not task.done():task.cancel()
                await asyncio.gather(task,return_exceptions=True)
        # An explicit new operation rediscovers the changed organization parent.
        async with maker() as s:new=await action(s)
    else:
        async with maker() as a:
            await action(a);task=asyncio.create_task(writer())
            try:
                await waiting(e);await a.rollback();await asyncio.wait_for(task,2)
            finally:
                if not task.done():task.cancel()
                await asyncio.gather(task,return_exceptions=True)
        async with maker() as s:new=await action(s)
    assert old.fingerprint!=new.fingerprint

@pytest.mark.asyncio
@pytest.mark.parametrize('change',['affiliation','expansion'])
async def test_discovery_change_refused(env,change):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async with tx() as a:
        await owner.lock_document_sources(session=a,document_id=data[0][3])
        async def pending():
            async with tx() as s:await prepare(s,bid,actor)
        task=asyncio.create_task(pending())
        try:
            await waiting(e)
            if change=='affiliation':
                en=await a.get(Enrollment,data[0][2]);en.organization_id=oid
            else:
                a.add(Enrollment(user_id=data[0][0],course_id=data[1][1],status='assigned'))
            await a.commit()
            with pytest.raises(Exception,match='scope_changed'):await asyncio.wait_for(task,2)
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)
    async with maker() as s:assert (await s.get(ImportBatch,bid)).status=='parsed'

@pytest.mark.asyncio
async def test_savepoint_rollback_keeps_outer_locks(env):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async with tx() as a:
        b=await prepare(a,bid,actor)
        try:
            async with a.begin_nested():
                await a.execute(text('UPDATE enrollments SET organization_id=:o WHERE id=:i'),{'o':oid,'i':data[0][2]})
                await a.execute(text('SELECT 1/0'))
        except Exception:pass
        async def pending():
            async with tx() as s:await owner.lock_document_sources(session=s,document_id=data[0][3])
        task=asyncio.create_task(pending())
        try:
            await waiting(e)
            assert (await a.get(Enrollment,data[0][2])).organization_id is None
            await a.rollback();await asyncio.wait_for(task,2)
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)

@pytest.mark.asyncio
@pytest.mark.parametrize('kind',['cancel','sql'])
async def test_failure_inside_real_import_savepoint_rolls_back(env,monkeypatch,kind):
    import app.services.learner_import_batches as service
    from sqlalchemy.exc import DBAPIError
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    original=service.assign_learner_role_from_apply_lookups
    reached=[]
    async def failure(s,**kwargs):
        await s.flush()
        assert s.in_nested_transaction()
        reached.append(True)
        if kind=='cancel':raise asyncio.CancelledError()
        await s.execute(text('SELECT 1/0'))
    monkeypatch.setattr(service,'assign_learner_role_from_apply_lookups',failure)
    with pytest.raises(asyncio.CancelledError if kind=='cancel' else DBAPIError):
        async with tx() as s:
            b=await prepare(s,bid,actor);await service.apply_learner_import_batch(s,batch=b)
    assert reached==[True]
    monkeypatch.setattr(service,'assign_learner_role_from_apply_lookups',original)
    async with tx() as s:
        b=await asyncio.wait_for(prepare(s,bid,actor),1)
        assert (await s.get(Enrollment,data[0][2])).organization_id is None
        assert await s.scalar(select(LearnerProfile.id).where(LearnerProfile.user_id==data[0][0])) is None
        assert b.status=='parsed'

@pytest.mark.asyncio
async def test_cancel_while_waiting_before_savepoint(env):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async with tx() as a:
        await owner.lock_document_sources(session=a,document_id=data[0][3])
        async def pending():
            async with tx() as s:await prepare(s,bid,actor)
        task=asyncio.create_task(pending());await waiting(e);task.cancel()
        with pytest.raises(asyncio.CancelledError):await task
    async with tx() as s:
        b=await asyncio.wait_for(prepare(s,bid,actor),1);assert b.status=='parsed'

@pytest.mark.asyncio
@pytest.mark.parametrize('new_kind',['identity','enrollment'])
async def test_unplanned_creation_fails_before_write(env,new_kind):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async with maker.begin() as s:
        if new_kind=='identity':
            row=await s.scalar(select(ImportRow).where(ImportRow.batch_id==bid));row.normalized_data_json={'email':uuid4().hex+'@test.invalid'}
        else:(await s.get(ImportBatch,bid)).course_id=data[1][1]
    async with tx() as s:
        with pytest.raises(Exception,match='not_supported'):await prepare(s,bid,actor)
        assert not s.new and not s.dirty
    async with maker() as s:assert (await s.get(ImportBatch,bid)).status=='parsed'

@pytest.mark.asyncio
async def test_permission_checked_again_after_wait(env):
    from fastapi import HTTPException
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async with tx() as a:
        await owner.lock_document_sources(session=a,document_id=data[0][3])
        async def pending():
            async with tx() as s:await prepare(s,bid,actor)
        task=asyncio.create_task(pending())
        try:
            await waiting(e)
            async with maker.begin() as other:(await other.get(User,actor)).is_active=False
            await a.rollback()
            with pytest.raises(HTTPException) as caught:await task
            assert caught.value.status_code==401
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)

@pytest.mark.asyncio
async def test_real_http_import_permission_and_commit_without_mail(env,monkeypatch):
    import httpx
    from fastapi import FastAPI
    from app.api.v1 import admin
    from app.core.security import create_access_token
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    app=FastAPI();app.add_api_route('/imports/{batch_id}/apply',admin.apply_learner_import,methods=['POST'])
    def no_mail(**kwargs):raise AssertionError('No notification expected for an existing enrollment')
    monkeypatch.setattr(admin,'send_password_setup_email',no_mail)
    monkeypatch.setattr(admin,'send_course_assignment_email',no_mail)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://synthetic') as client:
        denied=await client.post('/imports/'+bid+'/apply',headers={'Authorization':'Bearer '+create_access_token(data[0][0])})
        assert denied.status_code==403
        applied=await client.post('/imports/'+bid+'/apply',headers={'Authorization':'Bearer '+create_access_token(actor)})
        assert applied.status_code==200
    async with maker() as s:
        assert (await s.get(ImportBatch,bid)).status=='applied'
        assert (await s.get(Enrollment,data[0][2])).organization_id==oid

@pytest.mark.asyncio
async def test_real_row_integrity_error_preserves_partial_semantics(env,monkeypatch):
    import app.services.learner_import_batches as service
    e,maker,data=env
    async with maker() as s:email=(await s.get(User,data[0][0])).email
    bid,actor,oid=await batch_setup(maker,data,extra={'email':email,'first_name':'Second row'})
    original=service.assign_learner_role_from_apply_lookups;calls=[]
    async def conflict_once(s,**kwargs):
        calls.append(True)
        if len(calls)==1:
            assert s.in_nested_transaction()
            s.add(Role(code='learner_fl',name='deliberate duplicate'))
            await s.flush()
        return await original(s,**kwargs)
    monkeypatch.setattr(service,'assign_learner_role_from_apply_lookups',conflict_once)
    async with tx() as s:
        b=await prepare(s,bid,actor)
        result=await service.apply_learner_import_batch(s,batch=b)
        assert result.error_rows_count==1 and result.created_profiles_count==1
        assert len(calls)==2
        await s.commit()
    async with maker() as s:
        rows=(await s.scalars(select(ImportRow).where(ImportRow.batch_id==bid).order_by(ImportRow.row_number))).all()
        assert [r.status for r in rows]==['error','applied']
        profile=await s.scalar(select(LearnerProfile).where(LearnerProfile.user_id==data[0][0]))
        assert profile.first_name=='Second row'
        assert (await s.get(Enrollment,data[0][2])).organization_id==oid

@pytest.mark.asyncio
async def test_existing_profile_update_and_readiness_under_outer_scope(env):
    e,maker,data=env;bid,actor,oid=await batch_setup(maker,data)
    async with maker.begin() as s:
        s.add(LearnerProfile(user_id=data[0][0],last_name='Preserved',source='synthetic'))
    async with tx() as s:
        b=await prepare(s,bid,actor)
        result=await apply_learner_import_batch(s,batch=b)
        assert result.updated_profiles_count==1 and result.created_profiles_count==0
        await s.commit()
    async with maker() as s:
        profile=await s.scalar(select(LearnerProfile).where(LearnerProfile.user_id==data[0][0]))
        assert profile.first_name=='Imported' and profile.last_name=='Preserved'
        obligations=(await s.scalars(select(RegistryObligation).where(RegistryObligation.enrollment_id==data[0][2]))).all()
        assert len(obligations)==2
        assert all(o.readiness_errors is not None for o in obligations)

