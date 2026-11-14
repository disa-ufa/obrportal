"""Real HTTP/JWT/RBAC; disposable database only."""
from app.tests.m4_disposable import require_disposable
require_disposable()
import asyncio,os,subprocess,sys,time,uuid
import httpx,pytest
from sqlalchemy import select,delete
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from sqlalchemy.pool import NullPool
import app.db.base
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.models.role import Role,Permission,RolePermission,UserRole
from app.models.organization import Organization
BASE='http://127.0.0.1:8026';users={};roles={}
async def db(fn):
 engine=create_async_engine(settings.database_url,poolclass=NullPool)
 try:
  async with async_sessionmaker(engine,expire_on_commit=False)() as s:
   result=await fn(s);await s.commit();return result
 finally:await engine.dispose()
def run(fn):return asyncio.run(db(fn))
def headers(kind):return {'Authorization':'Bearer '+create_access_token(users[kind])}
def get(path,kind):return httpx.get(BASE+path,headers=headers(kind),trust_env=False)
@pytest.fixture(scope='module',autouse=True)
def server():
 async def seed(s):
  org=Organization(name='Synthetic',inn='0274000000');s.add(org);await s.flush()
  for name,codes,scoped in [('both',['mintrud.read','mintrud.write'],False),('read',['mintrud.read'],False),('none',[],False),('org',['mintrud.read','mintrud.write'],True),('write',['mintrud.write'],False),('admin',['admin.roles.read'],False)]:
   u=User(email=uuid.uuid4().hex+'@synthetic.test',hashed_password='unused',is_active=True);r=Role(code='synthetic-'+uuid.uuid4().hex,name=name);s.add_all([u,r]);await s.flush();users[name]=str(u.id);roles[name]=str(r.id)
   s.add(UserRole(user_id=u.id,role_id=r.id,organization_id=org.id if scoped else None))
   for code in codes:
    p=await s.scalar(select(Permission).where(Permission.code==code))
    if p is None:p=Permission(code=code,name=code);s.add(p);await s.flush()
    s.add(RolePermission(role_id=r.id,permission_id=p.id))
 run(seed)
 log=open('/harness/permissions-api.log','w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8026'],stdout=log,stderr=log)
 try:
  for _ in range(100):
   try:
    if httpx.get(BASE+'/health',trust_env=False).status_code==200:break
   except httpx.HTTPError:pass
   time.sleep(.2)
  else:raise RuntimeError('API startup failed')
  yield
 finally:proc.terminate();proc.wait(timeout=15);log.close()
def test_unauthorized():
 assert httpx.get(BASE+'/api/v1/auth/me/permissions',trust_env=False).status_code==401
 assert httpx.get(BASE+'/api/v1/auth/me/permissions',headers={'Authorization':'Bearer invalid'},trust_env=False).status_code==401
@pytest.mark.parametrize('kind,read,write',[('both',True,True),('read',True,False),('none',False,False),('org',False,False),('write',False,True),('admin',False,False)])
def test_effective_parity(kind,read,write):
 response=get('/api/v1/auth/me/permissions',kind);assert response.status_code==200
 assert response.json()=={'mintrud':{'read':read,'write':write}}
 assert response.headers['cache-control']=='no-store' and response.headers['vary']=='Authorization'
 assert get('/api/v1/admin/mintrud/protocol-drafts',kind).status_code==(200 if read else 403)
 # Valid payload, nonexistent resource: 404 proves dependency allowed; no writes occur.
 response=httpx.post(BASE+'/api/v1/admin/mintrud/protocol-drafts/'+str(uuid.UUID(int=1))+'/confirm-signature',headers=headers(kind),json={'expected_updated_at':'2026-11-04T00:00:00Z','confirmation_id':str(uuid.uuid4()),'signed_on':'2026-11-04','confirmed_paper_original_signed':True},trust_env=False)
 assert response.status_code==(404 if write else 403),response.text
 assert get('/api/v1/admin/mintrud/protocol-drafts/'+str(uuid.UUID(int=1))+'/signed-scan',kind).status_code==(404 if read else 403)
 if kind in ('both','read'):assert get('/api/v1/admin/roles',kind).status_code==403
 # No FRDO permission emerges from mintrud grants or admin.roles.read.
 assert get('/api/v1/admin/frdo/obligations',kind).status_code==403
 async def canonical(s):
  from app.api.v1.rbac import get_user_permission_codes
  return await get_user_permission_codes(await s.get(User,users[kind]),s)
 codes=run(canonical);assert ('mintrud.read' in codes)==read and ('mintrud.write' in codes)==write

def test_own_only_and_me_compatible():
 assert get('/api/v1/auth/me/permissions?user_id='+users['both'],'none').status_code==422
 assert get('/api/v1/auth/me/permissions/'+users['both'],'none').status_code==404
 me=get('/api/v1/auth/me','both');assert me.status_code==200
 assert me.json()['id']==users['both'] and 'permissions' not in me.json()
 assert get('/api/v1/admin/rbac-check','both').status_code==403
 assert get('/api/v1/auth/me/permissions','none').json()=={'mintrud':{'read':False,'write':False}}

def test_next_request_reflects_assignment_change():
 async def revoke(s):await s.execute(delete(UserRole).where(UserRole.user_id==users['both']))
 assert get('/api/v1/auth/me/permissions','both').json()['mintrud']['write']
 run(revoke)
 assert get('/api/v1/auth/me/permissions','both').json()=={'mintrud':{'read':False,'write':False}}
 assert get('/api/v1/admin/mintrud/protocol-drafts','both').status_code==403
 async def restore(s):s.add(UserRole(user_id=users['both'],role_id=roles['both']))
 run(restore)
 assert get('/api/v1/auth/me/permissions','both').json()['mintrud']['write']
