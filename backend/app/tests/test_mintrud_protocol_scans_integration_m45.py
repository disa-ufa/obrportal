from app.tests.m4_disposable import require_disposable
require_disposable()
import asyncio,hashlib,json,os,subprocess,sys,time,uuid,io
from concurrent.futures import ThreadPoolExecutor
from datetime import date,datetime,timezone
from pathlib import Path

import httpx,pytest
from PIL import Image
from reportlab.pdfgen import canvas
from sqlalchemy import select,text
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from sqlalchemy.pool import NullPool
import app.db.base
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.models.role import Role,Permission,RolePermission,UserRole
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol as Protocol,MintrudKnowledgeProtocolMember as Member
from app.services.mintrud_protocol_signing import snapshot_digest

BASE='http://127.0.0.1:8011/api/v1/admin/mintrud/protocol-drafts'
ACTOR=str(uuid.uuid4());DENIED=str(uuid.uuid4())
TOKEN=create_access_token(ACTOR);BADTOKEN=create_access_token(DENIED)
pdf=io.BytesIO();c=canvas.Canvas(pdf);c.drawString(50,750,'Synthetic signed protocol scan');c.showPage();c.save();PDF=pdf.getvalue()
png=io.BytesIO();Image.new('RGB',(16,16),'white').save(png,format='PNG');PNG=png.getvalue()
jpg=io.BytesIO();Image.new('RGB',(16,16),'white').save(jpg,format='JPEG');JPG=jpg.getvalue()

async def db(fn):
 engine=create_async_engine(settings.database_url,poolclass=NullPool)
 try:
  async with async_sessionmaker(engine,expire_on_commit=False)() as s:
   result=await fn(s);await s.commit();return result
 finally:await engine.dispose()
def run(fn):return asyncio.run(db(fn))
def query(sql,**params):
 async def f(s):
  result=await s.execute(text(sql),params)
  return [dict(r) for r in result.mappings()] if result.returns_rows else []
 return run(f)
def upload(pid,data=PDF,name='scan.pdf',media='application/pdf',token=TOKEN):
 return httpx.post(BASE+'/'+pid+'/signed-scan',headers={'Authorization':'Bearer '+token},files={'file':(name,data,media)},timeout=30,trust_env=False)
def download(pid,token=TOKEN):
 return httpx.get(BASE+'/'+pid+'/signed-scan',headers={'Authorization':'Bearer '+token} if token else {},timeout=20,trust_env=False)

@pytest.fixture(scope='session',autouse=True)
def server():
 async def seed(s):
  s.add_all([User(id=ACTOR,email=ACTOR+'@synthetic.test',hashed_password='unused'),User(id=DENIED,email=DENIED+'@synthetic.test',hashed_password='unused')]);await s.flush()
  r=Role(code='m45-'+uuid.uuid4().hex,name='Synthetic');s.add(r);await s.flush();s.add(UserRole(user_id=ACTOR,role_id=r.id))
  for code in ['mintrud.read','mintrud.write']:
   p=await s.scalar(select(Permission).where(Permission.code==code))
   if p is None:p=Permission(code=code,name=code);s.add(p);await s.flush()
   s.add(RolePermission(role_id=r.id,permission_id=p.id))
 run(seed)
 log=open('/harness/api.log','w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.tests.m45r2f_fault_server:app','--host','127.0.0.1','--port','8011'],stdout=log,stderr=log,env={**os.environ,'PYTHONPATH':'/harness:/app'})
 for _ in range(100):
  try:
   if httpx.get('http://127.0.0.1:8011/health',trust_env=False).status_code==200:break
  except httpx.HTTPError:pass
  time.sleep(.2)
 else:raise RuntimeError('isolated API failed startup')
 yield
 proc.terminate();proc.wait(timeout=10);log.close()

def protocol(signed=True):
 async def f(s):
  c=Course(slug='synthetic-'+uuid.uuid4().hex,title='Synthetic course');s.add(c);await s.flush()
  e=Enrollment(user_id=ACTOR,course_id=c.id,status='completed',completed_at=datetime.now(timezone.utc));s.add(e);await s.flush()
  o=RegistryObligation(registry='mintrud',enrollment_id=e.id);s.add(o);await s.flush()
  pid=str(uuid.uuid4());snap={'protocol_id':pid,'course_id':c.id,'protocol_number':'M45-'+pid[:8],'protocol_date':'2026-11-02','participants':[{'enrollment_id':e.id,'obligation_id':o.id,'knowledge_check_date':'2026-11-02','knowledge_check_result':'satisfactory'}]};digest=snapshot_digest(snap)
  p=Protocol(id=pid,course_id=c.id,protocol_number=snap['protocol_number'],protocol_date=date(2026,11,2),status='recorded',created_by_user_id=ACTOR,recorded_at=datetime.now(timezone.utc),recorded_by_user_id=ACTOR,recording_request_id=str(uuid.uuid4()),recorded_snapshot=snap,recorded_snapshot_sha256=digest)
  if signed:
   p.signed_at=datetime.now(timezone.utc);p.signed_on=date(2026,11,2);p.signed_by_user_id=ACTOR;p.signing_request_id=str(uuid.uuid4());p.signed_source_sha256=digest
  s.add(p);await s.flush();s.add(Member(protocol_id=pid,enrollment_id=e.id,obligation_id=o.id,knowledge_check_date=date(2026,11,2),knowledge_check_result='satisfactory'));return pid
 return run(f)

def metadata(pid):return query('select signed_scan_path,signed_scan_sha256,signed_scan_size,signed_scan_media_type,signed_scan_uploaded_at,signed_scan_uploaded_by_user_id from mintrud_knowledge_protocols where id=:id',id=pid)[0]
def test_sign_without_scan():
 pid=protocol(False);row=query('select updated_at from mintrud_knowledge_protocols where id=:id',id=pid)[0]
 r=httpx.post(BASE+'/'+pid+'/confirm-signature',json={'expected_updated_at':row['updated_at'].isoformat(),'confirmation_id':str(uuid.uuid4()),'signed_on':'2026-11-02','confirmed_paper_original_signed':True},headers={'Authorization':'Bearer '+TOKEN},trust_env=False,timeout=30)
 assert r.status_code==200,r.text
 Path('/harness/sign-without-scan.json').write_text(json.dumps(r.json(),default=str,indent=2))
 assert query('select signed_at,signed_scan_path from mintrud_knowledge_protocols where id=:id',id=pid)[0]['signed_at']
 assert metadata(pid)['signed_scan_path'] is None
 assert r.json()['auto_sync']['status']=='UPDATED'
 contexts=query('select row_to_json(t)::text as row from mintrud_registry_contexts t order by id')
 sync_count=query("select count(*) as n from audit_events where entity_id=:id and action='admin.mintrud_protocol_registry_fields_synced'",id=pid)[0]['n']
 assert upload(pid).status_code==200
 assert download(pid).status_code==200
 assert query('select row_to_json(t)::text as row from mintrud_registry_contexts t order by id')==contexts
 assert query("select count(*) as n from audit_events where entity_id=:id and action='admin.mintrud_protocol_registry_fields_synced'",id=pid)[0]['n']==sync_count==1

@pytest.mark.parametrize('data,name,media',[(PDF,'a.pdf','application/pdf'),(JPG,'a.jpg','image/jpeg'),(PNG,'a.png','image/png')], ids=['pdf','jpeg','png'])
def test_upload_download_commit_audit(data,name,media):
 pid=protocol();r=upload(pid,data,name,media);assert r.status_code==200,r.text
 m=metadata(pid);assert m['signed_scan_size']==len(data);assert m['signed_scan_sha256']==hashlib.sha256(data).hexdigest()
 assert m['signed_scan_media_type']==media
 assert m['signed_scan_uploaded_at'] and m['signed_scan_uploaded_by_user_id']==ACTOR
 d=download(pid);assert d.status_code==200;assert d.content==data
 assert d.headers.get('content-disposition','').startswith('attachment;')
 audit=query("select payload from audit_events where entity_id=:id and action='admin.mintrud_protocol_signed_scan_attached'",id=pid)
 assert len(audit)==1;assert audit[0]['payload']['sha256']==m['signed_scan_sha256'];assert audit[0]['payload']['registry_updated'] is False
 assert download(pid,BADTOKEN).status_code==403
 assert download(pid,'').status_code==401

@pytest.mark.parametrize('data,name,media,status',[(b'bad','a.exe','application/octet-stream',415),(PNG,'a.pdf','application/pdf',415),(b'x'*(10*1024*1024+1),'a.pdf','application/pdf',413)], ids=['unsupported-extension','content-mismatch','oversize'])
def test_bad_files(data,name,media,status):
 pid=protocol();assert upload(pid,data,name,media).status_code==status;assert metadata(pid)['signed_scan_path'] is None

def test_unsigned_rejected():
 pid=protocol(False);assert upload(pid).status_code==409;assert metadata(pid)['signed_scan_path'] is None

def test_duplicate_and_concurrent_upload():
 pid=protocol()
 with ThreadPoolExecutor(2) as pool:codes=list(pool.map(lambda _:upload(pid).status_code,range(2)))
 assert sorted(codes)==[200,409]
 digest=metadata(pid)['signed_scan_sha256'];assert upload(pid,JPG,'b.jpg','image/jpeg').status_code==409
 assert metadata(pid)['signed_scan_sha256']==digest
 assert len(list((Path('/private')/Path(metadata(pid)['signed_scan_path']).parent).glob('*')))==3
 assert len(query("select id from audit_events where entity_id=:id and action='admin.mintrud_protocol_signed_scan_attached'",id=pid))==1

def test_integrity_and_private_access():
 pid=protocol();assert upload(pid).status_code==200
 path=metadata(pid)['signed_scan_path'];Path('/private',path).write_bytes(b'tampered')
 assert download(pid).status_code==409
 assert httpx.get('http://127.0.0.1:8011/'+path,trust_env=False).status_code==404

def test_storage_failure_no_metadata():
 pid=protocol();folder=Path('/private/mintrud/signed-protocol-scans');folder.mkdir(parents=True,exist_ok=True);(folder/pid).write_bytes(b'block synthetic directory')
 assert upload(pid).status_code==503;assert metadata(pid)['signed_scan_path'] is None
 (folder/pid).unlink()

def test_commit_failure_no_uncontrolled_file():
 pid=protocol()
 query(f"""CREATE FUNCTION fail_m45_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_id = '{pid}' THEN RAISE EXCEPTION 'synthetic commit failure' USING ERRCODE='23514'; END IF; RETURN NEW; END $$""")
 query("CREATE CONSTRAINT TRIGGER m45_deferred_failure AFTER INSERT ON audit_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fail_m45_commit()")
 try:
  assert upload(pid).status_code==409
  assert metadata(pid)['signed_scan_path'] is None
  assert not query("select id from audit_events where entity_id=:id and action='admin.mintrud_protocol_signed_scan_attached'",id=pid)
  files=list(Path('/private/mintrud/signed-protocol-scans',pid).glob('*'))
  assert len(files)==3
  marker=next(p for p in files if p.name.endswith('.pending.json'))
  assert json.loads(marker.read_text())['protocol_id']==pid
 finally:
  query('DROP TRIGGER m45_deferred_failure ON audit_events');query('DROP FUNCTION fail_m45_commit()')

def test_scan_has_no_registry_side_effects():
 pid=protocol()
 tables=['mintrud_registry_contexts','registry_obligations','registry_submission_batches','registry_submission_attempts']
 def snapshot():return {t:query('select row_to_json(t)::text as row from '+t+' t order by id') for t in tables}
 before=snapshot();assert upload(pid).status_code==200;assert download(pid).status_code==200;assert snapshot()==before
 assert not query("select id from audit_events where entity_id=:id and action like '%registry_fields_synced%'",id=pid)
 assert not list(Path('/private').rglob('*.xml'))

def test_unknown_commit_keeps_valid_file_and_recovery_manifest():
 pid=protocol()
 r=httpx.post(BASE+'/'+pid+'/signed-scan',headers={'Authorization':'Bearer '+TOKEN,'x-m45-commit-uncertain':'1'},files={'file':('scan.pdf',PDF,'application/pdf')},trust_env=False,timeout=30)
 assert r.status_code==503
 m=metadata(pid);assert m['signed_scan_path']
 path=Path('/private',m['signed_scan_path']);assert path.read_bytes()==PDF
 recovery=json.loads(Path(str(path)+'.pending.json').read_text())
 assert recovery['protocol_id']==pid;assert recovery['sha256']==hashlib.sha256(PDF).hexdigest()
 assert download(pid).status_code==200
 assert upload(pid).status_code==409
