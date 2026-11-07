"""Disposable real HTTP/PG/private-files tests for no-destructive-cleanup policy."""
from app.tests.m4_disposable import require_disposable
require_disposable()
import json,hashlib,os,errno,subprocess,sys
from pathlib import Path
import pytest,httpx
from app.tests.test_mintrud_protocol_scans_integration_m45 import (
 server,protocol,metadata,query,BASE,TOKEN,PDF,download,upload,
)
from app.services.mintrud_scan_resources import inspect_manifest,Resource,cleanup_owned
from app.services.mintrud_scan_namespace import Namespace,StorageFailure

def fault_upload(pid,mode):
 return httpx.post(BASE+'/'+pid+'/signed-scan',headers={'Authorization':'Bearer '+TOKEN,'x-m45-fault':mode},files={'file':('scan.pdf',PDF,'application/pdf')},timeout=30,trust_env=False)
def files(pid):
 result=[]
 for name in (pid,pid+'.detached'):
  folder=Path('/private/mintrud/signed-protocol-scans',name)
  if folder.is_dir() and not folder.is_symlink():result.extend(folder.iterdir())
 return result
def audits(pid):return query("select payload from audit_events where entity_id=:id and action='admin.mintrud_protocol_signed_scan_attached'",id=pid)
def state(pid):
 return {'metadata':metadata(pid),'audit':audits(pid),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files(pid) if p.is_file() and not p.is_symlink()}}

@pytest.mark.parametrize('mode',['enospc_manifest_write','enospc_manifest_fsync','enospc_publish','enospc_scan_write','enospc_scan_fsync','enospc_scan_directory'])
def test_enospc(mode):
    other=protocol();before=state(other)
    pid=protocol()
    exports=query('select count(*) as n from registry_submission_batches')
    sync_before=query("select count(*) as n from audit_events where action='admin.mintrud_protocol_registry_fields_synced'")
    response=fault_upload(pid,mode)
    assert response.status_code==503,response.text
    assert 'synthetic' not in response.text and '/private' not in response.text
    assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
    found=state(pid)['files'];assert found
    assert len(found)==(1 if mode in ('enospc_manifest_write','enospc_manifest_fsync') else 2 if mode=='enospc_publish' else 3)
    assert any('.writing-' in n for n in found)
    assert any(n.endswith('.pending.json') for n in found)==(mode not in ('enospc_manifest_write','enospc_manifest_fsync'))
    data=json.loads(subprocess.check_output([sys.executable,'-m','app.mintrud_scan_inventory_cli','--root','/private'],text=True))
    assert data['complete'],data['errors']
    observed=[a for a in data['artifacts'] if any(pid in p for p in a['found_paths'])]
    assert observed
    expected={'enospc_manifest_write':'INVALID_MANIFEST','enospc_manifest_fsync':'UNPUBLISHED_MANIFEST','enospc_publish':'FILE_MISSING','enospc_scan_write':'INTEGRITY_MISMATCH','enospc_scan_fsync':'COMMIT_UNKNOWN','enospc_scan_directory':'COMMIT_UNKNOWN'}[mode]
    assert any(a['state']==expected for a in observed),observed
    assert all(a['state']!='CONFIRMED_MATCH' and not a['destructive_action_allowed'] for a in observed)
    assert found==state(pid)['files'] and before==state(other)
    assert query('select count(*) as n from registry_submission_batches')==exports
    assert not Path('/harness/forbidden-unlinks.jsonl').exists()
    assert not list(Path('/private').rglob('*.xml'))
    assert query("select count(*) as n from audit_events where action='admin.mintrud_protocol_registry_fields_synced'")==sync_before


@pytest.mark.parametrize('mode',['write','scan_fsync','write_unlink','fsync_unlink','unlink_fsync','directory_fsync'])
def test_failed_upload_retains_artifacts(mode):
 pid=protocol();assert fault_upload(pid,mode).status_code==503
 assert metadata(pid)['signed_scan_path'] is None;assert audits(pid)==[]
 found=files(pid);assert any(p.suffix=='.pdf' for p in found)
 marker=next(p for p in found if p.name.endswith('.pending.json'))
 data=json.loads(marker.read_text());assert data['schema_version']==1 and data['protocol_id']==pid
 assert any('.writing-' in p.name for p in found)
 assert not Path('/harness/forbidden-unlinks.jsonl').exists()

def test_identity_replacement_is_not_deleted():
 pid=protocol();assert fault_upload(pid,'identity_swap').status_code==503
 found=files(pid);foreign=next(p for p in found if p.suffix=='.pdf');assert foreign.read_bytes()==b'FOREIGN-REPLACEMENT'
 assert any(p.name.endswith('.owned-original') for p in found)
 assert any(p.name.endswith('.pending.json') for p in found)
 assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
 assert not Path('/harness/forbidden-unlinks.jsonl').exists()

@pytest.mark.parametrize('mode',['parent_symlink','parent_swap'])
def test_parent_symlink_cannot_write_outside(mode):
 pid=protocol();outside=Path('/outside-synthetic');outside.mkdir(exist_ok=True)
 before={p.name:p.read_bytes() for p in outside.iterdir() if p.is_file()}
 assert fault_upload(pid,mode).status_code==503
 assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
 assert before=={p.name:p.read_bytes() for p in outside.iterdir() if p.is_file()}
 if mode=='parent_swap':assert any('.writing-' in p.name for p in files(pid))

@pytest.mark.parametrize('mode',['manifest_collision','scan_collision'])
def test_foreign_collision_preserved(mode):
 pid=protocol();assert fault_upload(pid,mode).status_code==409
 found=files(pid);assert any(p.read_bytes()==b'FOREIGN-'+mode.encode() for p in found)
 assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
 assert any('.writing-' in p.name for p in found)
 assert not Path('/harness/forbidden-unlinks.jsonl').exists()

def test_cleaned_resource_never_processed_again():
 pid=protocol();assert upload(pid).status_code==200
 before=state(pid);r=Resource(str(files(pid)[0]),created=True,cleanup_confirmed=True)
 assert cleanup_owned(r) is True;assert cleanup_owned(r) is True
 assert state(pid)==before

@pytest.mark.parametrize('mode',['post_os','post_integrity','response_read','commit_unknown'])
def test_commit_outcomes_preserve_artifacts(mode):
 pid=protocol();assert fault_upload(pid,mode).status_code==503
 found=files(pid);marker=next(p for p in found if p.name.endswith('.pending.json'))
 data=json.loads(marker.read_text());assert Path('/private',data['storage_path']).read_bytes()==PDF
 before=state(pid);m=metadata(pid)
 if mode=='commit_unknown':
  assert m['signed_scan_path'] is None and audits(pid)==[]
  assert inspect_manifest(marker)['state']=='COMMIT_UNKNOWN'
  assert inspect_manifest(marker,database_authoritative=True)['state']=='UNREFERENCED_REVIEW'
 else:
  assert m['signed_scan_path']==data['storage_path'];assert len(audits(pid))==1
  assert download(pid).content==PDF and upload(pid).status_code==409
  assert inspect_manifest(marker,m,True)['state']=='CONFIRMED_MATCH'
 assert state(pid)==before
 assert 'InvalidRequestError' not in Path('/harness/api.log').read_text()

@pytest.mark.parametrize('present',[False,True])
def test_non_authoritative_source_never_confirms(present):
 pid=protocol();assert upload(pid).status_code==200
 marker=next(p for p in files(pid) if p.name.endswith('.pending.json'));before=state(pid)
 result=inspect_manifest(marker,metadata(pid) if present else None,False)
 assert result['state']=='COMMIT_UNKNOWN'
 assert result['observed_match'] is (True if present else None)
 assert result['destructive_action_allowed'] is False
 assert state(pid)==before

def test_valid_temporary_is_not_published():
 pid=protocol();assert upload(pid).status_code==200
 temporary=next(p for p in files(pid) if '.writing-' in p.name);before=state(pid)
 result=inspect_manifest(temporary,metadata(pid),True)
 assert result['state']=='UNPUBLISHED_MANIFEST' and result['observed_match'] is True
 assert result['manifest_kind']=='temporary';assert state(pid)==before

def test_actual_unpublished_complete_temporary_without_scan():
 pid=protocol();assert fault_upload(pid,'before_publish').status_code==503
 found=files(pid);assert len(found)==1 and '.writing-' in found[0].name
 assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
 before=state(pid);result=inspect_manifest(found[0],None,True)
 assert result['state']=='UNPUBLISHED_MANIFEST' and result['file_state']=='FILE_MISSING'
 assert result['manifest_state']=='unpublished' and result['destructive_action_allowed'] is False
 assert state(pid)==before

def test_read_errors_are_not_corruption(monkeypatch):
 pid=protocol();assert upload(pid).status_code==200
 marker=next(p for p in files(pid) if p.name.endswith('.pending.json'));before=state(pid)
 original=Namespace.read
 for code,expected in [(errno.EACCES,'ACCESS_DENIED'),(errno.EIO,'STORAGE_UNAVAILABLE')]:
  def failing(*args,**kwargs):raise OSError(code,'synthetic read unavailable')
  with monkeypatch.context() as ctx:
   ctx.setattr(Namespace,'read',failing)
   assert inspect_manifest(marker,metadata(pid),True)['state']==expected
 assert state(pid)==before

def test_real_permission_denied_in_nonroot_process():
 pid=protocol();assert upload(pid).status_code==200
 marker=next(p for p in files(pid) if p.name.endswith('.pending.json'));data=json.loads(marker.read_text())
 base=Path('/permission-fixtures')/pid;base.mkdir(parents=True)
 target=base/data['storage_path'];target.parent.mkdir(parents=True)
 target.write_bytes(PDF);copy=Path(str(target)+'.pending.json');copy.write_bytes(marker.read_bytes())
 for path in [base,*base.rglob('*')]:
  os.chown(path,10001,10001);os.chmod(path,0o700 if path.is_dir() else 0o600)
 os.chmod(copy,0)
 program="from app.core.config import settings; settings.document_storage_dir="+repr(str(base))+"; from app.services.mintrud_scan_resources import inspect_manifest; import json; print(json.dumps(inspect_manifest("+repr(str(copy))+")))"
 def demote():os.setgid(10001);os.setuid(10001)
 result=subprocess.run([sys.executable,'-c',program],capture_output=True,text=True,preexec_fn=demote,env={**os.environ,'PYTHONPATH':'/app'},check=True)
 assert json.loads(result.stdout)['state']=='ACCESS_DENIED'
 assert metadata(pid)['signed_scan_path'] and len(audits(pid))==1

def test_missing_corrupt_invalid_and_mismatch_are_distinct():
 pid=protocol();assert upload(pid).status_code==200
 marker=next(p for p in files(pid) if p.name.endswith('.pending.json'));data=json.loads(marker.read_text());m=metadata(pid)
 assert inspect_manifest('/outside-synthetic/no.json',m,True)['state']=='INVALID_PATH'
 absent=Path(str(marker)+'.missing');assert inspect_manifest(absent,m,True)['state']=='MANIFEST_MISSING'
 marker.write_bytes(b'{');assert inspect_manifest(marker,m,True)['state']=='INVALID_MANIFEST'
 temporary=next(p for p in files(pid) if '.writing-' in p.name);temporary.write_bytes(b'{');assert inspect_manifest(temporary,m,True)['state']=='INCOMPLETE_MANIFEST'
 marker.write_text(json.dumps(data));path=Path('/private',data['storage_path']);path.write_bytes(b'tampered')
 invalid=dict(data);invalid['storage_path']='../outside.pdf';marker.write_text(json.dumps(invalid))
 assert inspect_manifest(marker,m,True)['state']=='INVALID_PATH'
 marker.write_text(json.dumps(data))
 assert inspect_manifest(marker,m,True)['state']=='INTEGRITY_MISMATCH'
 moved=Path(str(path)+'.test-moved');os.rename(path,moved)
 assert inspect_manifest(marker,m,True)['state']=='MISSING_REFERENCED_FILE'

@pytest.mark.parametrize('mode',['quota','disk_full','unsupported_fsync','unsupported_pinning'])
def test_resource_guarantees_fail_closed(mode):
 pid=protocol();assert fault_upload(pid,mode).status_code==503
 assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
 assert not any(p.suffix=='.pdf' for p in files(pid))

def test_world_writable_namespace_rejected():
 pid=protocol();root=Path('/private');mode=root.stat().st_mode & 0o777
 try:
  os.chmod(root,0o777);assert upload(pid).status_code==503
 finally:os.chmod(root,mode)
 assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[] and files(pid)==[]

def test_immediate_postgresql_rejection_preserves_evidence():
 pid=protocol()
 query(f"""CREATE FUNCTION fail_2f_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_id='{pid}' THEN RAISE EXCEPTION 'synthetic before commit' USING ERRCODE='23514'; END IF; RETURN NEW; END $$""")
 query('CREATE TRIGGER fail_2f_insert BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_2f_insert()')
 try:
  assert upload(pid).status_code==409;assert metadata(pid)['signed_scan_path'] is None and audits(pid)==[]
  assert len(files(pid))==3
 finally:
  query('DROP TRIGGER fail_2f_insert ON audit_events');query('DROP FUNCTION fail_2f_insert()')
