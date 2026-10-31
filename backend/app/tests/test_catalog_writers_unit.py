import pytest
from app.tests.test_registry_catalog_policy_fence_unit import FakeSession
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence as begin, RegistryCatalogFenceError
from app.services.mintrud_learn_programs import sync_mintrud_learn_program_catalog_v109 as sync

@pytest.mark.asyncio
@pytest.mark.parametrize('case',['missing','shared','foreign','ended','nested'])
async def test_sync_refuses_before_any_sql(case):
    s=FakeSession(); f=None
    if case != 'missing':
        f=await begin(session=s,mode='shared' if case=='shared' else 'exclusive')
    if case=='foreign': s=FakeSession()
    if case=='ended': await s.rollback()
    if case=='nested': s.nested=True
    count=len(s.sql)
    with pytest.raises(RegistryCatalogFenceError): await sync(s,catalog_fence=f)
    assert len(s.sql)==count

@pytest.mark.asyncio
async def test_same_session_validation_no_sql():
    s=FakeSession(); f=await begin(session=s,mode='exclusive')
    n=len(s.sql);f.require_session(s,'exclusive');assert len(s.sql)==n
