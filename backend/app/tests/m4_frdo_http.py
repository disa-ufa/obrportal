from app.tests.m4_disposable import require_disposable
require_disposable()
import asyncio,os,subprocess,sys,time,json
from pathlib import Path
import httpx
from sqlalchemy import select
from app.db.seed import seed
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.role import Role,UserRole
from app.core.security import get_password_hash
async def setup():
 await seed()
 async with AsyncSessionLocal() as s:
  role=await s.scalar(select(Role).where(Role.code=='admin'))
  for email,password,admin in [('admin@synthetic.test','SyntheticAdmin123!',True),('learner@synthetic.test','SyntheticLearner123!',False)]:
   u=User(email=email,hashed_password=get_password_hash(password),is_active=True,is_email_verified=True)
   s.add(u);await s.flush()
   if admin:s.add(UserRole(user_id=u.id,role_id=role.id))
  await s.commit()
asyncio.run(setup())
env={**os.environ,'TEST_BASE_URL':'http://127.0.0.1:8000','TEST_ADMIN_EMAIL':'admin@synthetic.test','TEST_ADMIN_PASSWORD':'SyntheticAdmin123!','TEST_LEARNER_EMAIL':'learner@synthetic.test','TEST_LEARNER_PASSWORD':'SyntheticLearner123!','NO_PROXY':'*'}
with open('/harness/frdo-api.log','w') as log:
 p=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],stdout=log,stderr=log,env=env)
 try:
  for _ in range(100):
   try:
    if httpx.get('http://127.0.0.1:8000/health',trust_env=False).status_code==200:break
   except httpx.HTTPError:pass
   time.sleep(.2)
  else:raise RuntimeError('API failed startup')
  r=subprocess.run([sys.executable,'-m','pytest','-p','no:cacheprovider','app/tests/test_admin_frdo_registry_api.py','--junitxml=/harness/frdo-http.xml','-q','--tb=short'],env=env)
  sys.exit(r.returncode)
 finally:p.terminate();p.wait(timeout=15)
