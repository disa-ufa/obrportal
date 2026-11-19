"""Disposable-only adversarial server; never an application entrypoint."""
from app.tests.m4_disposable import require_disposable
require_disposable()
from contextvars import ContextVar
from pathlib import Path
from uuid import UUID
import os,errno,json
from sqlalchemy import event
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.main import app
from app.api.v1 import mintrud_protocol_drafts as api
from app.services import mintrud_scan_resources as resources
from app.services import mintrud_scan_namespace as ns

fault=ContextVar('fault',default='')
scan_synced=ContextVar('scan_synced',default=False)
real_uuid=api.uuid4
real_unlink=os.unlink
real_path_unlink=Path.unlink
real_write=ns.write_chunk
real_sync=ns.sync_fd
real_parent=ns.Namespace.parent
real_budget=ns.Namespace.budget
real_publish=ns.Namespace.publish
real_space=os.fstatvfs

def private_unlink(path,*args,**kwargs):
 raw=str(path)
 parent=kwargs.get('dir_fd')
 if raw.startswith('/private') or (parent is not None and os.readlink('/proc/self/fd/'+str(parent)).startswith('/private')):
  with open('/harness/forbidden-unlinks.jsonl','a') as log:log.write(json.dumps({'path':raw,'mode':fault.get()})+'\n')
  raise AssertionError('Private unlink is forbidden in scan HTTP')
 return real_unlink(path,*args,**kwargs)
os.unlink=private_unlink
def path_unlink(path,*args,**kwargs):
 if str(path).startswith('/private'):return private_unlink(path,*args,**kwargs)
 return real_path_unlink(path,*args,**kwargs)
Path.unlink=path_unlink

@app.middleware('http')
async def injection(request,call_next):
 mode=request.headers.get('x-m45-fault','legacy_unknown' if request.headers.get('x-m45-commit-uncertain') else '')
 t=fault.set(mode);s=scan_synced.set(False);original_fcntl=ns.fcntl
 if mode=='unsupported_pinning':ns.fcntl=None
 try:
  if mode in ('manifest_collision','scan_collision','parent_symlink'):
   pid=request.url.path.split('/')[-2];folder=Path('/private/mintrud/signed-protocol-scans')
   folder.mkdir(parents=True,exist_ok=True)
   if mode=='parent_symlink':
    outside=Path('/outside-synthetic');outside.mkdir(exist_ok=True)
    os.symlink(str(outside),str(folder/pid))
   else:
    (folder/pid).mkdir(exist_ok=True)
    path=folder/pid/(UUID(int=42).hex+'.pdf'+('.pending.json' if mode=='manifest_collision' else ''))
    with path.open('xb') as handle:handle.write(b'FOREIGN-'+mode.encode())
  return await call_next(request)
 finally:ns.fcntl=original_fcntl;fault.reset(t);scan_synced.reset(s)

api.uuid4=lambda: UUID(int=42) if fault.get() in ('manifest_collision','scan_collision') else real_uuid()

def injected_write(fd,content):
 path=os.readlink('/proc/self/fd/'+str(fd))
 if fault.get()=='enospc_manifest_write' and '.writing-' in path:
  real_write(fd,content[:len(content)//2]);raise OSError(errno.ENOSPC,'synthetic')
 if fault.get()=='enospc_scan_write' and path.endswith('.pdf'):
  real_write(fd,content[:len(content)//2]);raise OSError(errno.ENOSPC,'synthetic')
 if path.endswith('.pdf') and fault.get() in ('write','write_unlink','identity_swap'):
  real_write(fd,content[:len(content)//2])
  if fault.get()=='identity_swap':
   os.rename(path,path+'.owned-original')
   with open(path,'xb') as f:f.write(b'FOREIGN-REPLACEMENT')
  raise OSError(errno.EIO,'synthetic partial write')
 return real_write(fd,content)
ns.write_chunk=injected_write

def injected_sync(fd):
 path=os.readlink('/proc/self/fd/'+str(fd))
 mode=fault.get()
 if mode=='enospc_publish' and os.path.isdir(path) and any(n.endswith('.pending.json') for n in os.listdir(fd)):raise OSError(errno.ENOSPC,'synthetic publication directory sync')
 if mode=='enospc_manifest_fsync' and '.writing-' in path:raise OSError(errno.ENOSPC,'synthetic')
 if mode=='enospc_scan_fsync' and path.endswith('.pdf'):raise OSError(errno.ENOSPC,'synthetic')
 if mode=='enospc_scan_directory' and scan_synced.get() and os.path.isdir(path):raise OSError(errno.ENOSPC,'synthetic')
 if path.endswith('.pdf'):
  if mode in ('scan_fsync','fsync_unlink','unlink_fsync'):raise OSError(errno.EIO,'synthetic scan fsync failure')
  scan_synced.set(True)
 if mode=='directory_fsync' and scan_synced.get() and os.path.isdir(path):raise OSError(errno.EIO,'synthetic directory fsync failure')
 if mode=='unsupported_fsync' and os.path.isdir(path):raise OSError(errno.ENOTSUP,'synthetic unsupported directory fsync')
 return real_sync(fd)
ns.sync_fd=injected_sync

def injected_parent(self,relative,create=False):
 result=real_parent(self,relative,create)
 if fault.get()=='parent_swap' and '.writing-' in relative:
  # Pin first, then replace the name with a symlink to an outside directory.
  path=Path('/private')/Path(relative).parent
  if not path.is_symlink():
   outside=Path('/outside-synthetic');outside.mkdir(exist_ok=True)
   os.rename(path,str(path)+'.detached');os.symlink(str(outside),path)
 return result
ns.Namespace.parent=injected_parent

def injected_publish(self,*args):
 if fault.get()=='before_publish':raise ns.StorageFailure('PUBLICATION_UNCONFIRMED')
 return real_publish(self,*args)
ns.Namespace.publish=injected_publish

def injected_budget(self,size):
 if fault.get()=='quota':
  prior=ns.MAX_ARTIFACTS;ns.MAX_ARTIFACTS=0
  try:return real_budget(self,size)
  finally:ns.MAX_ARTIFACTS=prior
 if fault.get()=='disk_full':
  from types import SimpleNamespace
  os.fstatvfs=lambda fd:SimpleNamespace(f_bavail=0,f_frsize=4096)
  try:return real_budget(self,size)
  finally:os.fstatvfs=real_space
 return real_budget(self,size)
ns.Namespace.budget=injected_budget

@event.listens_for(Session,'before_commit')
def unknown_commit(session):
 if fault.get()=='commit_unknown':raise OSError('synthetic unconfirmed commit')

@event.listens_for(Session,'after_commit')
def post_commit(session):
 if fault.get()=='post_integrity':raise IntegrityError('synthetic',{},Exception('synthetic postcommit'))
 if fault.get() in ('post_os','legacy_unknown'):raise OSError('synthetic postcommit')

detail=api._detail
async def injected_detail(*args,**kwargs):
 if fault.get()=='response_read':raise OSError('synthetic response read failure')
 return await detail(*args,**kwargs)
api._detail=injected_detail
