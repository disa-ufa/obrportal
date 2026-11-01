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
    e=create_async_engine(os.environ['R24M7C_TEST_URL'],hide_parameters=True,
        connect_args={'server_settings':{'statement_timeout':'5000','lock_timeout':'3000'}})
    assert e.url.database.startswith('r24m7c_')
    maker=async_sessionmaker(e,expire_on_commit=False);monkeypatch.setattr(owner,'AsyncSessionLocal',maker)
    data=[]
    async with maker.begin() as s:
        assert await s.scalar(text("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"))=='OBRPORTAL_R24M7C_SYNTHETIC_ONLY'
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

@pytest.mark.asyncio
async def test_same_learner_serializes_two_documents(env):
    e,maker,data=env;u,c,en,doc,extra,obs=data[0]
    async with tx() as a:
        first=await owner.lock_document_sources(session=a,document_id=doc);first.title='first';await a.flush()
        async def second():
            async with tx() as b:
                row=await owner.lock_document_sources(session=b,document_id=extra);row.title='second';await b.commit()
        task=asyncio.create_task(second())
        try:
            await waiting(e);assert not task.done();await a.commit();await asyncio.wait_for(task,2)
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)

@pytest.mark.asyncio
async def test_disjoint_learners_progress_independently(env):
    e,maker,data=env
    async with tx() as a,tx() as b:
        await owner.lock_document_sources(session=a,document_id=data[0][3])
        await asyncio.wait_for(owner.lock_document_sources(session=b,document_id=data[1][3]),1)

@pytest.mark.asyncio
@pytest.mark.parametrize('registry,index',[('frdo',0),('mintrud',1)])
@pytest.mark.parametrize('writer_first',[True,False])
async def test_fingerprint_interleavings(env,registry,index,writer_first):
    e,maker,data=env;u,c,en,doc,extra,obs=data[0]
    async def action(s):
        await begin(session=s,mode='shared')
        locked,_=await acquire_discovered_registry_action_scope(session=s,actor_id=data[1][0],registry=registry,obligation_ids=(obs[index],))
        return await load_current_registry_applicability_inputs(session=s,obligation=locked[0])
    if writer_first:
        async with tx() as a:
            row=await owner.lock_document_sources(session=a,document_id=doc);row.issued_at=date(2026,2,2);await a.flush()
            async def read():
                async with maker() as b:return await action(b)
            task=asyncio.create_task(read())
            try:
                await waiting(e);await a.commit();current=await asyncio.wait_for(task,2)
                assert current.inputs.effective_date==date(2026,2,2)
            finally:
                if not task.done():task.cancel()
                await asyncio.gather(task,return_exceptions=True)
    else:
        async with maker() as a:
            old=await action(a)
            async def write():
                async with tx() as b:
                    row=await owner.lock_document_sources(session=b,document_id=doc);row.issued_at=date(2026,2,2);await b.commit()
            task=asyncio.create_task(write())
            try:
                await waiting(e);await a.rollback();await asyncio.wait_for(task,2)
            finally:
                if not task.done():task.cancel()
                await asyncio.gather(task,return_exceptions=True)
        async with maker() as a:
            new=await action(a);assert old.fingerprint!=new.fingerprint

@pytest.mark.asyncio
async def test_scope_change_during_wait_refuses_without_partial_write(env):
    e,maker,data=env;doc=data[0][3]
    async with tx() as a:
        await owner.lock_document_sources(session=a,document_id=doc)
        async def pending():
            async with tx() as b:await owner.lock_document_sources(session=b,document_id=doc)
        task=asyncio.create_task(pending())
        try:
            await waiting(e)
            # Deliberate synthetic non-cooperating writer, no production path.
            async with maker.begin() as other:
                await other.execute(text('UPDATE document_records SET enrollment_id=NULL WHERE id=:id'),{'id':data[0][4]})
            # Change the locked document in its owning TX, detected on rediscovery.
            row=await a.get(DocumentRecord,doc);row.enrollment_id=None;await a.commit()
            with pytest.raises(Exception,match='scope_changed'):await asyncio.wait_for(task,2)
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)

@pytest.mark.asyncio
@pytest.mark.parametrize('cancel',[False,True])
async def test_owner_rolls_back_sql_error_or_cancel(env,cancel):
    e,maker,data=env;doc=data[0][3]
    with pytest.raises(BaseException):
        async with tx() as s:
            row=await owner.lock_document_sources(session=s,document_id=doc);row.title='must rollback';await s.flush()
            if cancel:raise asyncio.CancelledError()
            await s.execute(text('SELECT 1/0'))
    async with tx() as s:
        row=await asyncio.wait_for(owner.lock_document_sources(session=s,document_id=doc),1)
        assert row.title=='synthetic'

@pytest.mark.asyncio
async def test_org_delete_refuses_and_keeps_affiliation(env):
    from app.api.v1.admin import delete_organization
    from fastapi import HTTPException
    e,maker,data=env
    async with maker.begin() as s:
        org=Organization(name='synthetic',inn=str(uuid4().int)[:12]);s.add(org);await s.flush();oid=org.id
        en=await s.get(Enrollment,data[0][2]);en.organization_id=oid
    async with maker() as s:
        with pytest.raises(HTTPException) as caught:
            await delete_organization(organization_id=oid,request=None,current_user=None,session=s)
        assert caught.value.status_code==409
    async with maker() as s:assert (await s.get(Enrollment,data[0][2])).organization_id==oid

@pytest.mark.asyncio
async def test_http_document_crud_and_permissions_in_fresh_owner(env):
    import httpx
    from fastapi import FastAPI
    from app.api.v1 import admin
    from app.core.security import create_access_token
    from app.models.role import Permission,Role,RolePermission,UserRole
    e,maker,data=env;uid=data[0][0]
    app=FastAPI()
    app.add_api_route('/documents',admin.create_admin_document,methods=['POST'])
    app.add_api_route('/documents/{document_id}',admin.update_admin_document,methods=['PATCH'])
    app.add_api_route('/documents/{document_id}',admin.delete_admin_document,methods=['DELETE'])
    headers={'Authorization':'Bearer '+create_access_token(uid)}
    payload={'user_id':uid,'title':'HTTP draft','document_type':'certificate','status':'draft','document_number':uuid4().hex}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://synthetic') as client:
        assert (await client.post('/documents',data=payload,headers=headers)).status_code==403
        async with maker.begin() as s:
            permission=Permission(code='admin.users.write',name='test');role=Role(code=uuid4().hex,name='test');s.add_all([permission,role]);await s.flush()
            s.add_all([RolePermission(role_id=role.id,permission_id=permission.id),UserRole(user_id=uid,role_id=role.id)])
        created=await client.post('/documents',data=payload,headers=headers)
        assert created.status_code==200
        did=created.json()['id']
        updated=await client.patch('/documents/'+did,data={'issued_at':'2026-03-03'},headers=headers)
        assert updated.status_code==200
        async with maker() as s:assert (await s.get(DocumentRecord,did)).issued_at==date(2026,3,3)
        deleted=await client.delete('/documents/'+did,headers=headers)
        assert deleted.status_code==200
        async with maker() as s:assert await s.get(DocumentRecord,did) is None

@pytest.mark.asyncio
async def test_profile_http_waits_for_mintrud_action_scope(env):
    import httpx
    from fastapi import FastAPI
    from app.api.v1.account import update_account_learner_profile
    from app.core.security import create_access_token
    from app.models.learner_profile import LearnerProfile
    e,maker,data=env;uid=data[0][0]
    app=FastAPI();app.add_api_route('/profile',update_account_learner_profile,methods=['PATCH'])
    headers={'Authorization':'Bearer '+create_access_token(uid)}
    async with maker() as reader:
        await begin(session=reader,mode='shared')
        await acquire_discovered_registry_action_scope(session=reader,actor_id=data[1][0],registry='mintrud',obligation_ids=(data[0][5][1],))
        async def edit():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://synthetic') as client:
                return await client.patch('/profile',headers=headers,json={'first_name':'Synthetic'})
        task=asyncio.create_task(edit())
        try:
            await waiting(e)
            async with maker() as check:assert await check.scalar(select(LearnerProfile).where(LearnerProfile.user_id==uid)) is None
            await reader.rollback();response=await asyncio.wait_for(task,2);assert response.status_code==200
        finally:
            if not task.done():task.cancel()
            await asyncio.gather(task,return_exceptions=True)
    async with maker() as check:
        profile=await check.scalar(select(LearnerProfile).where(LearnerProfile.user_id==uid));assert profile.first_name=='Synthetic'
