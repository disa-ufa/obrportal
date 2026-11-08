"""P8.2Q real PostgreSQL/HTTP qualification. Opt-in disposable project only.

No dependency override or SQL-result mocks: app auth, RBAC, get_db and all route
queries run against the migrated disposable PostgreSQL. Mutation helpers below
are test-fixture writers using a separate owner connection, never GET handlers.
"""
from __future__ import annotations
import asyncio
from copy import deepcopy
from datetime import date, datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
from time import perf_counter
from uuid import uuid4
import pytest
import pytest_asyncio

OWNER_URL = os.environ.get('P82Q_OWNER_DATABASE_URL')
if not OWNER_URL:
    pytest.skip('P8.2Q requires an explicitly provisioned disposable PostgreSQL', allow_module_level=True)
assert os.environ.get('P82Q_PROJECT', '').startswith('obrportal-p82q-')
assert OWNER_URL.endswith('@postgres:5432/p82q_synthetic')
READ_URL = os.environ['P82Q_READONLY_DATABASE_URL']
assert READ_URL.startswith('postgresql+asyncpg://p82q_readonly:') and READ_URL.endswith('@postgres:5432/p82q_synthetic')
os.environ['DATABASE_URL'] = READ_URL  # before settings/app import; real get_db is unchanged

from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, inspect, select, text, update, null
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.main import app
from app.db.session import engine as read_engine
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.role import Role, Permission, RolePermission, UserRole
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol as Protocol, MintrudKnowledgeProtocolMember as Member
from app.models.mintrud_registry_context import MintrudRegistryContext as Context
from app.models.mintrud_learn_program import MintrudLearnProgram as Program, CourseMintrudLearnProgram as Mapping
from app.models.registry_obligation import RegistryObligation as Obligation
from app.models.registry_applicability import RegistryApplicabilityRecord as Decision
from app.models.registry_submission_batch import RegistrySubmissionBatch as Batch, RegistrySubmissionBatchItem as Item
from app.services import mintrud_protocol_export_preview as service
from app.core.security import create_access_token
from app.tests.test_mintrud_protocol_preview_p8 import fixture, refresh_decisions, approve

pytestmark = pytest.mark.asyncio(loop_scope='module')
EVIDENCE = Path(os.environ.get('P82Q_EVIDENCE_DIR', '/pg-evidence/real-pg'))
BASE = '/api/v1/admin/mintrud/protocol-drafts'


def identity(): return str(uuid4())
def only_columns(model, row): return {k:v for k,v in row.items() if k in model.__table__.columns.keys()}


class Lab:
    def __init__(self):
        self.writer = create_async_engine(OWNER_URL, poolclass=NullPool)
        self.sessions = async_sessionmaker(self.writer, expire_on_commit=False)
        self.trace = []
        self.proof = {'project':os.environ['P82Q_PROJECT'], 'real_auth':True, 'dependency_overrides':False, 'cases':[], 'measurements':[], 'concurrency':[]}
        self.principal = identity(); self.denied = identity(); self.run_id = uuid4().hex[:10]

    async def checksum(self):
        result = {}
        async with self.writer.connect() as connection:
            await connection.execute(text('SET TRANSACTION READ ONLY'))
            tables = (await connection.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))).scalars().all()
            for table in tables:
                assert re.fullmatch('[a-zA-Z0-9_]+',table)
                rows = (await connection.execute(text(f'SELECT to_jsonb(t)::text FROM public."{table}" t ORDER BY 1'))).scalars().all()
                result[table] = {'count':len(rows), 'sha256':hashlib.sha256('\n'.join(rows).encode()).hexdigest()}
        return result

    def capture(self, connection, cursor, statement, parameters, context, executemany):
        self.trace.append(statement)

    async def checked_get(self, client, path, *, token=None, status=200, unchanged=True):
        before = await self.checksum() if unchanged else None
        check_id = len(self.proof['cases'])
        checksums = EVIDENCE/'checksums'; checksums.mkdir(parents=True,exist_ok=True)
        if before is not None: (checksums/f'{check_id:03}-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8')
        self.trace.clear(); started=perf_counter()
        response = await client.get(path, headers={'Authorization':'Bearer '+(token or self.token)})
        elapsed=(perf_counter()-started)*1000
        trace=list(self.trace)
        assert response.status_code==status, (response.status_code,response.text[:500])
        assert all(re.match(r'^\s*(SELECT|SHOW)\b', sql, re.I) for sql in trace),trace
        if unchanged:
            after=await self.checksum()
            (checksums/f'{check_id:03}-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
            assert after==before,'GET changed migrated database rows'
        self.proof['cases'].append({'path':path,'http_status':status,'sql_count':len(trace),'elapsed_ms':round(elapsed,3),'select_only':True,'all_public_tables_unchanged':unchanged,'sql_kinds':{kind:sum(sql.lstrip().upper().startswith(kind) for sql in trace) for kind in ('SELECT','SHOW')},'sql_sha256':hashlib.sha256('\n'.join(trace).encode()).hexdigest()})
        sql_dir=EVIDENCE/'sql';sql_dir.mkdir(exist_ok=True)
        (sql_dir/f'{check_id:03}.sql').write_text('\n;\n'.join(trace),encoding='utf-8')
        self.save()
        return response

    def save(self):
        EVIDENCE.mkdir(parents=True,exist_ok=True)
        temporary=EVIDENCE/'execution-proof.tmp'
        temporary.write_text(json.dumps(self.proof,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
        temporary.replace(EVIDENCE/'execution-proof.json')

    async def protocol(self,n=1,kind='ready'):
        s=fixture(n,recorded=kind!='draft')
        replacements={}
        def replace(value):
            if isinstance(value,str) and re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',value):
                return replacements.setdefault(value,identity())
            if isinstance(value,dict):return {k:replace(v) for k,v in value.items()}
            if isinstance(value,list):return [replace(v) for v in value]
            return value
        s=replace(s); p=s['protocol']; p['created_by_user_id']=self.principal
        p['recorded_by_user_id']=self.principal
        s['provider']={'name':'P82Q Synthetic Provider','inn':'0000000000'}
        s['programs']=[deepcopy(self.program)]
        for profile in s['profiles']:profile['snils']='SYN-P82Q-'+uuid4().hex[:16]
        for user in s['users']:user.update(email='synthetic-'+uuid4().hex+'@example.invalid',hashed_password='synthetic-no-login')
        course=s['courses'][0];course['slug']='p82q-'+course['id']
        frozen=p['recorded_snapshot'];frozen['training_provider_name']=s['provider']['name']
        p['recorded_snapshot_sha256']=service.input_revision(frozen)
        refresh_decisions(s)
        if kind in ('approved','stale','already_exported'):
            approve(s);s['obligations'][0]['approved_by_user_id']=self.principal
        if kind=='stale':s['profiles'][0]['first_name']='Synthetic Changed'
        if kind=='missing':s['profiles'][0]['snils']=None
        if kind=='review':s['decisions'][0]['decision']='needs_review'
        if kind=='not_required':s['decisions'][0]['decision']='not_required'
        if kind=='protected':s['obligations'][0].update(status='approved',approved_at=datetime.now(timezone.utc),approved_by_user_id=self.principal,approval_event_id=None)
        if kind=='bad_sha':p['recorded_snapshot_sha256']='0'*64
        if kind=='draft':
            for k in ('recorded_at','recorded_by_user_id','recording_request_id','recorded_snapshot','recorded_snapshot_sha256'):p[k]=None
            p['recorded_snapshot']=null()  # SQL NULL; JSON null violates the existing draft invariant
        async with self.sessions() as db:
            db.add(Course(**only_columns(Course,course)))
            db.add_all(User(**only_columns(User,row)) for row in s['users']);await db.flush()
            db.add(Mapping(course_id=course['id'],mintrud_learn_program_id=self.program['id']))
            db.add_all(Enrollment(**only_columns(Enrollment,row)) for row in s['enrollments'])
            db.add_all(LearnerProfile(**only_columns(LearnerProfile,row)) for row in s['profiles']);await db.flush()
            db.add_all(Obligation(**only_columns(Obligation,row)) for row in s['obligations']);await db.flush()
            db.add(Protocol(**only_columns(Protocol,p)))
            db.add_all(Context(**only_columns(Context,row)) for row in s['contexts'])
            db.add_all(Decision(**only_columns(Decision,row)) for row in s['decisions']);await db.flush()
            db.add_all(Member(**only_columns(Member,row)) for row in s['members']);await db.commit()
        if kind=='already_exported':await self.history(s)
        if kind=='wrong_course':
            async with self.sessions() as db:
                other=Course(slug='p82q-other-'+identity(),title='P82Q Synthetic Other Course');db.add(other);await db.flush()
                await db.execute(update(Enrollment).where(Enrollment.id==s['enrollments'][0]['id']).values(course_id=other.id));await db.commit()
        if kind=='orphan':
            # Ordinary FK enforcement is tested separately. Only this disposable
            # fixture transaction bypasses FK triggers to simulate legacy damage.
            async with self.sessions() as db:
                await db.execute(text('SET LOCAL session_replication_role = replica'))
                await db.execute(update(Enrollment).where(Enrollment.id==s['members'][0]['enrollment_id']).values(id=identity()));await db.commit()
        return s

    async def history(self,s):
        o=s['obligations'][0]
        async with self.sessions() as db:
            batch=Batch(registry='mintrud',status='exported',schema_version='1.0.9',obligation_count=1,record_count=1,artifact_path='synthetic-not-created.xml',artifact_sha256='a'*64,generated_by_user_id=self.principal)
            db.add(batch);await db.flush()
            db.add(Item(batch_id=batch.id,obligation_id=o['id'],position=0,record_count=1,approval_snapshot_json=o['approval_snapshot_json'],approval_fingerprint=o['approval_fingerprint'],approval_event_id=o['approval_event_id']))
            await db.commit()


@pytest_asyncio.fixture(scope='module',loop_scope='module')
async def lab():
    lab=Lab()
    async with lab.writer.begin() as connection:
        assert (await connection.scalar(text('SELECT current_database()')))=='p82q_synthetic'
        version=await connection.scalar(text('SHOW server_version'));assert str(version).startswith('16.')
        password=os.environ['P82Q_READER_PASSWORD'];assert re.fullmatch('synthetic-p82q-ro-[0-9a-f]+',password)
        if not await connection.scalar(text("SELECT 1 FROM pg_roles WHERE rolname='p82q_readonly'")):
            await connection.execute(text(f"CREATE ROLE p82q_readonly LOGIN PASSWORD '{password}'"))
        await connection.execute(text('GRANT CONNECT ON DATABASE p82q_synthetic TO p82q_readonly'))
        await connection.execute(text('GRANT USAGE ON SCHEMA public TO p82q_readonly'))
        await connection.execute(text('GRANT SELECT ON ALL TABLES IN SCHEMA public TO p82q_readonly'))
        await connection.execute(text('ALTER ROLE p82q_readonly SET default_transaction_read_only = on'))
        head=await connection.scalar(text('SELECT version_num FROM alembic_version'))
        schema=await connection.run_sync(lambda conn:{table:{'foreign_keys':inspect(conn).get_foreign_keys(table),'indexes':inspect(conn).get_indexes(table)} for table in ('mintrud_knowledge_protocols','mintrud_knowledge_protocol_members','registry_obligations','registry_submission_batch_items')})
        assert len(schema['mintrud_knowledge_protocol_members']['foreign_keys'])==3
        lab.proof.update(postgres_version=version,alembic_head=head,schema=schema)
    async with lab.sessions() as db:
        db.add_all([User(id=lab.principal,email='p82q-reader-'+lab.run_id+'@example.invalid',hashed_password='synthetic-no-login',full_name='P82Q Synthetic Reader'),User(id=lab.denied,email='p82q-no-permission-'+lab.run_id+'@example.invalid',hashed_password='synthetic-no-login',full_name='P82Q Synthetic Denied')]);await db.flush()
        permission=await db.scalar(select(Permission).where(Permission.code=='mintrud.read'))
        if permission is None:permission=Permission(code='mintrud.read',name='P82Q synthetic read');db.add(permission);await db.flush()
        role=Role(code='p82q_synthetic_reader_'+lab.run_id,name='P82Q synthetic reader');db.add(role);await db.flush()
        db.add(RolePermission(role_id=role.id,permission_id=permission.id));db.add(UserRole(user_id=lab.principal,role_id=role.id,organization_id=None))
        program=await db.scalar(select(Program).where(Program.schema_version=='1.0.9',Program.learn_program_id==1))
        if program is None:program=Program(learn_program_id=1,code='P82Q-A',title='P82Q Synthetic Program A',schema_version='1.0.9',is_active=True);db.add(program);await db.flush()
        lab.program={column.key:deepcopy(getattr(program,column.key)) for column in program.__table__.columns}
        await db.commit()
    lab.token=create_access_token(lab.principal);lab.denied_token=create_access_token(lab.denied)
    event.listen(read_engine.sync_engine,'before_cursor_execute',lab.capture)
    async with read_engine.connect() as connection:
        assert await connection.scalar(text('SHOW transaction_read_only'))=='on'
        assert await connection.scalar(text('SELECT current_user'))=='p82q_readonly'
        lab.proof['read_only_role']='p82q_readonly';lab.proof['transaction_read_only']='on'
    try:yield lab
    finally:
        lab.save();event.remove(read_engine.sync_engine,'before_cursor_execute',lab.capture)
        await read_engine.dispose();await lab.writer.dispose()


@pytest_asyncio.fixture(loop_scope='module')
async def client():
    async with AsyncClient(transport=ASGITransport(app=app,raise_app_exceptions=False),base_url='http://p82q-asgi.invalid') as client:yield client


async def test_real_auth_readonly_enforcement(lab,client):
    assert not app.dependency_overrides
    for headers in ({},{'Authorization':'Bearer synthetic-invalid'}):
        assert (await client.get(BASE+'/catalog',headers=headers)).status_code==401
    await lab.checked_get(client,BASE+'/catalog',token=lab.denied_token,status=403)
    async with read_engine.connect() as connection:
        with pytest.raises(DBAPIError):await connection.execute(text("INSERT INTO users(id,email,hashed_password,is_active,is_email_verified,mfa_enabled,created_at,updated_at) VALUES ('p82q-forbidden','p82q-forbidden@example.invalid','synthetic',true,false,false,now(),now())"))
    lab.proof['db_rejected_reader_insert']=True;lab.save()


@pytest.mark.parametrize('size',[1,3,100])
async def test_real_full_composition_queries_and_performance(lab,client,size):
    s=await lab.protocol(size);pid=s['protocol']['id']
    response=await lab.checked_get(client,f'{BASE}/{pid}/participants')
    assert response.json()['participant_count']==size
    response=await lab.checked_get(client,f'{BASE}/{pid}/export-preview')
    payload=response.json();assert payload['counts']['ready_for_approval']==size
    measured=lab.proof['cases'][-1];assert measured['sql_count']==32,measured
    lab.proof['measurements'].append({'participants':size,**measured})
    again=await lab.checked_get(client,f'{BASE}/{pid}/export-preview')
    assert again.json()['input_revision']==payload['input_revision']
    assert len({r['enrollment_id'] for r in payload['members']})==size
    lab.save()


@pytest.mark.parametrize('kind,category,status',[
 ('ready','ready_for_approval',200),('approved','approved_current',200),('missing','needs_data',200),('review','applicability_review',200),('stale','conflict',200),('already_exported','already_exported',200),('protected','protected_history',200),('draft','not_eligible',200),('not_required','not_eligible',200),('wrong_course','conflict',200),('orphan','conflict',200),('bad_sha',None,409),
])
async def test_real_categories_and_damaged_links(lab,client,kind,category,status):
    s=await lab.protocol(3,kind);pid=s['protocol']['id']
    details=await lab.checked_get(client,f'{BASE}/{pid}/participants');assert details.json()['participant_count']==3
    response=await lab.checked_get(client,f'{BASE}/{pid}/export-preview',status=status)
    if category:
        target=next(row for row in response.json()['members'] if row['member_id']==s['members'][0]['id'])
        assert target['category']==category,target
        assert sum(response.json()['counts'].values())==3
    lab.proof['cases'][-1].update(fixture=kind,expected_category=category);lab.save()


async def test_unknown_empty_schema_and_fk(lab,client):
    await lab.checked_get(client,f'{BASE}/{identity()}/export-preview',status=404)
    s=await lab.protocol(0,'draft');await lab.checked_get(client,f"{BASE}/{s['protocol']['id']}/export-preview",status=409)
    async with lab.sessions() as db:
        db.add(Member(protocol_id=s['protocol']['id'],enrollment_id=identity(),obligation_id=identity()))
        with pytest.raises(IntegrityError):await db.flush()
        await db.rollback()
    lab.proof['normal_fk_enforcement']=True
    def missing_schema(connection,cursor,statement,parameters,context,many):
        return statement.replace('mintrud_knowledge_protocols','p82q_missing_protocol_table'),parameters
    event.listen(read_engine.sync_engine,'before_cursor_execute',missing_schema,retval=True)
    try:await lab.checked_get(client,BASE+'/catalog',status=500)
    finally:event.remove(read_engine.sync_engine,'before_cursor_execute',missing_schema)
    assert (await client.post(f"{BASE}/{s['protocol']['id']}/export-preview",headers={'Authorization':'Bearer '+lab.token})).status_code==405
    lab.save()


async def test_catalog_total_beyond_100_and_literal_search(lab,client):
    s=await lab.protocol(1);p=s['protocol'];prefix='P82Q-CATALOG-'+lab.run_id+'-'
    async with lab.sessions() as db:
        db.add_all(Protocol(course_id=p['course_id'],protocol_number=f'{prefix}{i:03}',protocol_date=date(2026,11,1),created_by_user_id=lab.principal,status='draft') for i in range(151));await db.commit()
    identities=[]
    for offset in range(0,151,25):
        response=await lab.checked_get(client,f"{BASE}/catalog?q={prefix}&course_id={p['course_id']}&status=draft&offset={offset}&limit=25")
        payload=response.json();assert payload['total']==151 and payload['offset']==offset
        assert payload['has_more']==(offset+len(payload['items'])<151)
        identities.extend(row['id'] for row in payload['items'])
    assert len(identities)==len(set(identities))==151
    assert (await lab.checked_get(client,BASE+'/catalog?q='+prefix+'%25')).json()['total']==0


@pytest.mark.parametrize('change',['member','recorded_snapshot','applicability','approval','batch_item','composition'])
async def test_real_concurrent_writer_between_reads(lab,client,monkeypatch,change):
    s=await lab.protocol(3,'approved' if change in ('approval','batch_item') else 'ready');pid=s['protocol']['id']
    destination=await lab.protocol(0,'draft') if change=='composition' else None
    original=service.load_protocol_inputs;fired=False;expected_after_writer=None
    async def interleave(session,protocol_id):
        nonlocal fired,expected_after_writer
        snapshot=await original(session,protocol_id)
        if protocol_id==pid and not fired:
            fired=True
            if change=='batch_item':await lab.history(s)
            else:
                async with lab.sessions() as writer:
                    if change=='member':statement=update(Member).where(Member.id==s['members'][0]['id']).values(knowledge_check_result='unsatisfactory')
                    elif change=='recorded_snapshot':statement=update(Protocol).where(Protocol.id==pid).values(recorded_snapshot={**s['protocol']['recorded_snapshot'],'synthetic_change':True})
                    elif change=='applicability':statement=update(Decision).where(Decision.id==s['decisions'][0]['id']).values(decision='needs_review')
                    elif change=='approval':statement=update(Obligation).where(Obligation.id==s['obligations'][0]['id']).values(approval_fingerprint='0'*64)
                    else:statement=update(Member).where(Member.id==s['members'][0]['id']).values(protocol_id=destination['protocol']['id'])
                    await writer.execute(statement);await writer.commit()
            expected_after_writer=await lab.checksum()
            (EVIDENCE/f'concurrency-{change}-after-writer.json').write_text(json.dumps(expected_after_writer,indent=2),encoding='utf-8')
        return snapshot
    monkeypatch.setattr(service,'load_protocol_inputs',interleave)
    await lab.checked_get(client,f'{BASE}/{pid}/export-preview',status=409,unchanged=False)
    after_get=await lab.checksum()
    (EVIDENCE/f'concurrency-{change}-after-get.json').write_text(json.dumps(after_get,indent=2),encoding='utf-8')
    assert fired and after_get==expected_after_writer
    lab.proof['concurrency'].append({'change':change,'http_status':409,'only_fixture_writer_changed_rows':True,'get_sql_select_only':True});lab.save()


async def test_late_response_has_own_protocol(lab,client,monkeypatch):
    a=await lab.protocol(1);b=await lab.protocol(3);gate=asyncio.Event();entered=asyncio.Event();original=service.load_protocol_inputs
    async def delayed(session,pid):
        if pid==a['protocol']['id'] and not gate.is_set():entered.set();await gate.wait()
        return await original(session,pid)
    monkeypatch.setattr(service,'load_protocol_inputs',delayed)
    before=await lab.checksum()
    pending=asyncio.create_task(client.get(f"{BASE}/{a['protocol']['id']}/export-preview",headers={'Authorization':'Bearer '+lab.token}))
    await asyncio.wait_for(entered.wait(),10)
    response_b=await client.get(f"{BASE}/{b['protocol']['id']}/export-preview",headers={'Authorization':'Bearer '+lab.token});gate.set();response_a=await pending
    assert response_a.status_code==response_b.status_code==200
    assert response_a.json()['protocol']['id']==a['protocol']['id'] and response_b.json()['protocol']['id']==b['protocol']['id']
    assert await lab.checksum()==before
    lab.proof['late_response_isolation']=True;lab.save()
