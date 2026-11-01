"""Real PG/API Step 3.6E qualification. Only a fresh marked disposable database."""
import asyncio,json,os,secrets
from hashlib import sha256
from app.services.document_storage import get_private_storage_root, resolve_private_storage_path
from pathlib import Path
import pytest,httpx
from sqlalchemy import select,text,func
from app.db.session import AsyncSessionLocal,engine
from app.models.user import User
from app.models.role import Role,UserRole
from app.models.registry_obligation import RegistryObligation
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.learner_profile import LearnerProfile
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_applicability_writer import persist_registry_applicability
from app.core.security import get_password_hash

pytestmark=pytest.mark.skipif(not os.getenv('STEP36E_DATABASE'),reason='explicit isolated Step 3.6E database required')

@pytest.mark.asyncio
async def test_real_batch_lifecycle_and_concurrency(monkeypatch):
 from app.db.seed import seed
 from app.main import app
 from app.tests.test_admin_mintrud_registry_api import create_mintrud_fixture
 from app.tests.test_admin_frdo_registry_api import create_frdo_fixture
 from test_account_learner_profile_api import unique_snils
 async with AsyncSessionLocal() as s:
  assert await s.scalar(text('select current_database()'))==os.environ['STEP36E_DATABASE']
  assert await s.scalar(text("select shobj_description(oid,'pg_database') from pg_database where datname=current_database()"))=='OBRPORTAL_R24M7D1_SYNTHETIC_ONLY'
  assert await s.scalar(text('SHOW transaction_isolation'))=='read committed'
  head=await s.scalar(text('select version_num from alembic_version'))
  index=await s.scalar(text("select indexdef from pg_indexes where indexname='uq_registry_batch_item_obligation_approval_event'"))
  assert head=='20261021_registry_approval_event' and 'UNIQUE' in index
  Path('/out/schema-proof.json').write_text(json.dumps({'head':head,'unique_index':index,'isolation':'read committed'}))
 await seed()
 password=secrets.token_urlsafe(24);email='step36e-'+secrets.token_hex(8)+'@example.test'
 async with AsyncSessionLocal() as s:
  role=await s.scalar(select(Role).where(Role.code=='admin'))
  user=User(email=email,full_name='Synthetic qualification administrator',hashed_password=get_password_hash(password),is_active=True,is_email_verified=True,mfa_enabled=False)
  s.add(user);await s.flush();s.add(UserRole(user_id=user.id,role_id=role.id));await s.commit()
 events=[]
 async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://synthetic.local') as client:
  response=await client.post('/api/v1/auth/login',json={'email':email,'password':password});assert response.status_code==200
  client.headers['Authorization']='Bearer '+response.json()['access_token']
  async with AsyncSessionLocal() as s:
   role=await s.scalar(select(Role).where(Role.code=='admin'))
   other=User(email='step36e-other-'+secrets.token_hex(8)+'@example.test',hashed_password=get_password_hash(password),is_active=True,is_email_verified=True,mfa_enabled=False)
   s.add(other);await s.flush();s.add(UserRole(user_id=other.id,role_id=role.id));other_email=other.email;await s.commit()
  login2=await client.post('/api/v1/auth/login',json={'email':other_email,'password':password});assert login2.status_code==200
  other_headers={'Authorization':'Bearer '+login2.json()['access_token']}

  async def call(reg,oid,action):
   response=await client.post(f'/api/v1/admin/{reg}/obligations/{oid}/{action}')
   events.append({'registry':reg,'action':action,'status':response.status_code,'response':response.json()})
   Path('/out/pg-http.json').write_text(json.dumps(events,ensure_ascii=False,indent=2))
   assert response.status_code==200,response.text
   return response
  async def fixture(reg,decision=True,approved=True):
   f=await asyncio.to_thread(create_mintrud_fixture,with_context=True) if reg=='mintrud' else await asyncio.to_thread(create_frdo_fixture,with_profile=True,with_context=True)
   async with AsyncSessionLocal() as s:
    profile=await s.scalar(select(LearnerProfile).where(LearnerProfile.user_id==f['user_id']))
    profile.snils=unique_snils();profile.last_name='Тестов';profile.first_name='Тест';profile.middle_name='Тестович'
    course=await s.get(Course,f['course_id']);course.title='Синтетическая программа '+reg
    document=await s.get(DocumentRecord,f['document_id'])
    if reg=='frdo':course.document_type=document.document_type='Свидетельство о профессии рабочего, должности служащего'
    await s.commit()
   if decision:
    async with AsyncSessionLocal() as s:
     o=await s.get(RegistryObligation,f['obligation_id']);current=await load_current_registry_applicability_inputs(session=s,obligation=o)
     await persist_registry_applicability(session=s,enrollment_id=o.enrollment_id,evaluation=current.evaluation,input_fingerprint=current.fingerprint)
     await s.commit()
   await call(reg,f['obligation_id'],'validate')
   if approved:await call(reg,f['obligation_id'],'approve')
   return f
  for reg in ['mintrud','frdo']:
   f=await fixture(reg);oid=f['obligation_id'];url=f'/api/v1/admin/{reg}/batches';payload={'obligation_ids':[oid]}
   # A real factory transaction (including a legacy writer) holds shared C.
   async with AsyncSessionLocal() as blocker:
    await blocker.execute(text('select 1'))
    task=asyncio.create_task(client.post(url,json=payload))
    await asyncio.sleep(.2);assert not task.done(),'export did not wait for source transaction'
    async with engine.connect() as observer:
     waiting=await observer.scalar(text("select count(*) from pg_locks where locktype='advisory' and not granted and pid in (select pid from pg_stat_activity where datname=current_database())"))
     assert waiting>=1
    await blocker.rollback()
    first=await asyncio.wait_for(task,20)
   assert first.status_code==201,first.text
   batch_id=first.json()['id']
   repeat=await client.post(url,json=payload);assert repeat.status_code==409,repeat.text
   async with AsyncSessionLocal() as s:
    assert await s.scalar(select(func.count()).select_from(RegistrySubmissionBatchItem).where(RegistrySubmissionBatchItem.obligation_id==oid))==1
   download=await client.get(url+'/'+batch_id+'/download');assert download.status_code==200,download.text
   Path('/out/'+reg+'-step36e.'+('xml' if reg=='mintrud' else 'xlsx')).write_bytes(download.content)
   # Complete a legitimate rejection/rework/reapproval cycle via real API.
   if reg=='mintrud':
    rr=await client.post(url+'/'+batch_id+'/imported');assert rr.status_code==200,rr.text
   rr=await client.post(url+'/'+batch_id+'/submitted',json={'external_reference':'synthetic-manual-only'});assert rr.status_code==200,rr.text
   result={'items':[{'obligation_id':oid,'result_status':'rejected','errors':['Synthetic correction requested']}], 'source_description':'Synthetic local test; no external submission'}
   rr=await client.post(url+'/'+batch_id+('/result' if reg=='mintrud' else '/results'),json=result);assert rr.status_code==200,rr.text
   await call(reg,oid,'reopen');await call(reg,oid,'validate');await call(reg,oid,'approve')
   reapproved=await client.post(url,json=payload);assert reapproved.status_code==201,reapproved.text
   async with AsyncSessionLocal() as s:
    items=(await s.scalars(select(RegistrySubmissionBatchItem).where(RegistrySubmissionBatchItem.obligation_id==oid))).all()
    assert len(items)==2 and len({i.approval_event_id for i in items})==2
   # A source writer commits a fingerprint change while export waits on C.
   race=await fixture(reg)
   async with AsyncSessionLocal() as writer:
    course=await writer.get(Course,race['course_id']);course.document_type='synthetic-changed-type'
    await writer.flush()
    race_task=asyncio.create_task(client.post(url,json={'obligation_ids':[race['obligation_id']]}))
    await asyncio.sleep(.15);assert not race_task.done()
    await writer.commit()
   stale=await asyncio.wait_for(race_task,20)
   assert stale.status_code==409 and 'applicability_stale' in stale.text,stale.text
   # Two concurrent, differently scheduled requests for a fresh event.
   g=await fixture(reg)
   responses=await asyncio.gather(client.post(url,json={'obligation_ids':[g['obligation_id']]}),client.post(url,json={'obligation_ids':[g['obligation_id']]},headers=other_headers))
   assert sorted(x.status_code for x in responses)==[201,409],[x.text for x in responses]
   # Export-first race: shared C writer waits until exclusive export COMMIT.
   from contextlib import asynccontextmanager
   from app.services.registry_batch_transaction import get_registry_batch_db
   from app.services.compliance_registry_batches import create_mintrud_registry_submission_batch
   from app.services.frdo_po_batches import create_frdo_registry_submission_batch
   reverse=await fixture(reg)
   async def source_change():
    async with AsyncSessionLocal() as ws:
     row=await ws.get(Course,reverse['course_id']);row.document_type='synthetic-after-export';await ws.commit()
   async with asynccontextmanager(get_registry_batch_db)() as export_session:
    writer_task=asyncio.create_task(source_change());await asyncio.sleep(.15);assert not writer_task.done()
    create=create_mintrud_registry_submission_batch if reg=='mintrud' else create_frdo_registry_submission_batch
    await create(export_session,obligation_ids=[reverse['obligation_id']],generated_by_user_id=str(user.id))
    await export_session.commit()
   await asyncio.wait_for(writer_task,20)
   explicit=await fixture(reg)
   async with AsyncSessionLocal() as s:
    record=await s.scalar(select(RegistryApplicabilityRecord).where(RegistryApplicabilityRecord.enrollment_id==explicit['enrollment_id'],RegistryApplicabilityRecord.registry==reg))
    record.decision='not_required';record.decision_version+=1;await s.commit()
   refused=await client.post(url,json={'obligation_ids':[explicit['obligation_id']]})
   assert refused.status_code==409 and 'not_required' in refused.text,refused.text
   # Inject only lost acknowledgement; COMMIT and recovery SQL stay real.
   from app.api.v1 import admin as admin_api
   from app.schemas.admin import AdminMintrudSubmissionBatchCreate,AdminFrdoSubmissionBatchCreate
   from starlette.requests import Request
   lost=await fixture(reg)
   async with asynccontextmanager(get_registry_batch_db)() as cs:
    actor=await cs.get(User,user.id)
    original_commit=cs.commit
    async def commit_ack_lost():
     await original_commit()
     raise ConnectionError('synthetic ACK loss after real COMMIT')
    cs.commit=commit_ack_lost
    endpoint=admin_api.prepare_admin_mintrud_submission_batch if reg=='mintrud' else admin_api.prepare_admin_frdo_submission_batch
    schema=AdminMintrudSubmissionBatchCreate if reg=='mintrud' else AdminFrdoSubmissionBatchCreate
    with pytest.raises(ConnectionError,match='ACK loss'):
     await endpoint(payload=schema(obligation_ids=[lost['obligation_id']]),request=Request({'type':'http','method':'POST','path':url,'headers':[],'client':('127.0.0.1',1)}),current_user=actor,session=cs)
   again=await client.post(url,json={'obligation_ids':[lost['obligation_id']]});assert again.status_code==409,again.text
   from app.models.registry_submission_batch import RegistrySubmissionBatch
   from app.services.registry_batch_commit_outcome import check_registry_batch_commit_outcome,BatchCommitOutcome
   async with AsyncSessionLocal() as s:
    row=await s.scalar(select(RegistrySubmissionBatch).join(RegistrySubmissionBatchItem,RegistrySubmissionBatchItem.batch_id==RegistrySubmissionBatch.id).where(RegistrySubmissionBatchItem.obligation_id==lost['obligation_id']))
    assert row is not None
    result=await check_registry_batch_commit_outcome(batch_id=str(row.id),registry=reg,artifact_path=row.artifact_path,artifact_sha256=row.artifact_sha256)
    assert result==BatchCommitOutcome.COMMITTED
    physical = resolve_private_storage_path(row.artifact_path)
    assert physical is not None and physical.is_relative_to(get_private_storage_root())
    assert physical.is_file(), 'Committed artifact missing from configured storage'
    persisted_bytes = physical.read_bytes()
    assert sha256(persisted_bytes).hexdigest() == row.artifact_sha256
    ack_download = await client.get(url+'/'+str(row.id)+'/download')
    assert ack_download.status_code == 200
    assert ack_download.content == persisted_bytes
    Path('/out/'+reg+'-ack-storage.json').write_text(json.dumps({'storage_root':str(get_private_storage_root()),'artifact_path':row.artifact_path,'exists':True,'sql_probe':result.value,'sha256':sha256(persisted_bytes).hexdigest(),'http_download':ack_download.status_code,'http_matches_file':True}))
   # The same application session must re-acquire C after COMMIT.
   async with AsyncSessionLocal() as reused:
    await reused.execute(text('select 1'));await reused.commit()
    async with asynccontextmanager(get_registry_batch_db)() as exclusive:
     next_tx=asyncio.create_task(reused.execute(text('select 2')))
     await asyncio.sleep(.15);assert not next_tx.done()
     await exclusive.rollback()
    assert (await asyncio.wait_for(next_tx,20)).scalar_one()==2
   # Cancellation while waiting must not leave C or a usable export grant.
   async with AsyncSessionLocal() as source:
    await source.execute(text('select 1'))
    cancelled=asyncio.create_task(client.post(url,json={'obligation_ids':[lost['obligation_id']]}))
    await asyncio.sleep(.15);assert not cancelled.done()
    cancelled.cancel()
    with pytest.raises(asyncio.CancelledError):await cancelled
    await source.rollback()
   replay=await client.post(url,json={'obligation_ids':[lost['obligation_id']]});assert replay.status_code==409
   # Failure after artifact generation but before COMMIT must compensate.
   failed=await fixture(reg)
   before_files={str(p) for p in get_private_storage_root().rglob('*') if p.is_file()}
   async def fail_audit(*args,**kwargs):
    raise RuntimeError('synthetic audit failure after artifact')
   with monkeypatch.context() as m:
    m.setattr(admin_api,'create_admin_audit_event',fail_audit)
    with pytest.raises(RuntimeError,match='synthetic audit failure'):
     await client.post(url,json={'obligation_ids':[failed['obligation_id']]})
   after_files={str(p) for p in get_private_storage_root().rglob('*') if p.is_file()}
   assert after_files==before_files
   async with AsyncSessionLocal() as s:
    assert await s.scalar(select(func.count()).select_from(RegistrySubmissionBatchItem).where(RegistrySubmissionBatchItem.obligation_id==failed['obligation_id']))==0
   unapproved=await fixture(reg,approved=False)
   forbidden=await client.post(url,json={'obligation_ids':[unapproved['obligation_id']]})
   assert forbidden.status_code==409,forbidden.text
   # No historical fixture is repaired. A new missing-decision fixture must fail.
   missing=await fixture(reg,False)
   denied=await client.post(url,json={'obligation_ids':[missing['obligation_id']]})
   assert denied.status_code==409 and 'applicability_missing' in denied.text,denied.text
   events.append({'registry':reg,'waiting_locks':waiting,'repeat':repeat.status_code,'reapproval':reapproved.status_code,'source_race':stale.status_code,'export_first_race':'PASS','explicit_denial':refused.status_code,'different_actors':True,'after_artifact_failure':'ROLLED_BACK_CLEANED','unapproved':forbidden.status_code,'reused_session':'PASS','cancellation_while_waiting':'PASS','commit_ack_loss':'COMMITTED_ARTIFACT_PRESERVED','concurrent':[x.status_code for x in responses],'missing':denied.status_code,'artifact_bytes':len(download.content)})
   Path('/out/pg-http.json').write_text(json.dumps(events,ensure_ascii=False,indent=2))
 await engine.dispose()
