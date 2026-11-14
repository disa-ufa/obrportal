from app.tests.m4_disposable import require_disposable
require_disposable()
import json, os, subprocess, sys, hashlib, uuid
from pathlib import Path
import pytest
from app.core.config import settings
from app.services.mintrud_scan_resources import inspect_manifest
from app.services.mintrud_scan_inventory import inventory


def test_os_denied_root():
    root=Path('/private/denied-'+uuid.uuid4().hex);root.mkdir(mode=0o700)
    code="from app.core.config import settings; from app.services.mintrud_scan_resources import inspect_manifest; import json; settings.document_storage_dir="+repr(str(root))+"; print(json.dumps(inspect_manifest("+repr(str(root)+'/x.pending.json')+")))"
    def unprivileged():os.setgid(65534);os.setuid(65534)
    result=subprocess.run([sys.executable,'-c',code],preexec_fn=unprivileged,capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    assert json.loads(result.stdout)['state']=='ACCESS_DENIED'

def snapshot(root):
    return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and not p.is_symlink()}

def test_restart_discovery():
    root=Path('/private/restart-'+uuid.uuid4().hex);root.mkdir(mode=0o700)
    # First process pins the directory, then another process renames it.
    code='''import os,sys,json,subprocess,uuid
root=sys.argv[1];os.mkdir(root+'/original',0o700)
fd=os.open(root+'/original',os.O_RDONLY|os.O_DIRECTORY)
subprocess.run([sys.executable,'-c',"import os,sys;os.rename(sys.argv[1]+'/original',sys.argv[1]+'/'+sys.argv[2])",root,uuid.uuid4().hex],check=True)
data={'storage_path':'mintrud/signed-protocol-scans/old/x.pdf','upload_attempt_id':'a'*32}
f=os.open('x.pdf.pending.json.writing-'+data['upload_attempt_id'],os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600,dir_fd=fd);os.write(f,json.dumps(data).encode());os.close(f)
os.link('x.pdf.pending.json.writing-'+data['upload_attempt_id'],'x.pdf.pending.json',src_dir_fd=fd,dst_dir_fd=fd)
f=os.open('x.pdf',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600,dir_fd=fd);os.write(f,b'%PDF-partial');os.close(f);os.close(fd)
'''
    subprocess.run([sys.executable,'-c',code,str(root)],check=True)
    before=snapshot(root)
    response=subprocess.check_output([sys.executable,'-m','app.mintrud_scan_inventory_cli','--root',str(root)],text=True)
    data=json.loads(response)
    assert data['complete'] and len(data['artifacts'])==2
    manifests=[a for a in data['artifacts'] if a['state']=='RELOCATION_REVIEW']
    assert len(manifests)==1 and len(manifests[0]['found_paths'])==2
    assert before==snapshot(root)

def test_restart_real_scan_attempt():
    root=Path('/private/attempt-'+uuid.uuid4().hex);root.mkdir(mode=0o700)
    code="""import os,sys,json,uuid,hashlib,subprocess
from app.core.config import settings
from app.services.mintrud_scan_resources import ScanAttempt
from app.services.mintrud_scan_namespace import Namespace
settings.document_storage_dir=sys.argv[1]
pid=str(uuid.uuid4());target='mintrud/signed-protocol-scans/'+pid+'/'+uuid.uuid4().hex+'.pdf'
content=b'%PDF-1.4 synthetic %%EOF'
data=dict(schema_version=1,upload_attempt_id=uuid.uuid4().hex,protocol_id=pid,storage_path=target,size=len(content),sha256=hashlib.sha256(content).hexdigest(),media_type='application/pdf',created_at='2026-11-04T00:00:00+00:00',state='PENDING_DATABASE_COMMIT')
original=Namespace.parent
moved=False
def parent(self,relative,create=False):
 global moved
 result=original(self,relative,create)
 if not moved and '.writing-' in relative:
  moved=True
  folder=sys.argv[1]+'/'+relative.rsplit('/',1)[0]
  subprocess.run([sys.executable,'-c','import os,sys;os.rename(sys.argv[1],sys.argv[2])',folder,folder.rsplit('/',1)[0]+'/'+uuid.uuid4().hex],check=True)
 return result
Namespace.parent=parent
attempt=ScanAttempt(target,data)
try:
 attempt.publish_manifest()
 raise AssertionError('Publication must fail after directory relocation')
except FileNotFoundError:
 attempt.retain()
finally:attempt.close()
"""
    subprocess.run([sys.executable,'-c',code,str(root)],check=True)
    before=snapshot(root)
    data=json.loads(subprocess.check_output([sys.executable,'-m','app.mintrud_scan_inventory_cli','--root',str(root)],text=True))
    assert data['complete']
    assert any(a['state']=='RELOCATION_REVIEW' for a in data['artifacts'])
    assert all(a['state']!='CONFIRMED_MATCH' for a in data['artifacts'])
    assert before==snapshot(root)

def test_limits(monkeypatch):
    root=Path('/private/limits-'+uuid.uuid4().hex);root.mkdir(mode=0o700)
    (root/'a').mkdir(mode=0o700);(root/'a'/'b.pdf').write_bytes(b'pdf')
    monkeypatch.setattr(settings,'document_storage_dir',str(root))
    assert inventory(max_depth=0)['complete'] is False
    assert inventory(max_entries=1)['complete'] is False
    os.symlink('/etc',root/'outside')
    result=inventory();assert result['complete'] is False
    assert any(e['reason']=='SYMLINK_NOT_FOLLOWED' for e in result['errors'])
