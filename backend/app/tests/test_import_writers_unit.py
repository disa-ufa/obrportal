import ast
from pathlib import Path
from types import SimpleNamespace as NS
import pytest
from app.tests.test_registry_catalog_policy_fence_unit import FakeSession
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence as begin
from app.services.registry_import_transaction import ImportScope, KEY, require_import_scope, _TOKEN
from app.services.registry_import_identity_keys import identity_lock_key
from app.services.learner_import_batches import apply_learner_import_batch

@pytest.mark.asyncio
@pytest.mark.parametrize('state',['missing','wrong','foreign','ended','nested','dirty','new','deleted','reused'])
async def test_reject_before_sql(state):
    s=FakeSession();s.info={};batch=NS(id='batch',course_id=None,organization_id=None,learning_group_id=None)
    fence=await begin(session=s,mode='shared')
    scope=ImportScope(s,fence,'batch',frozenset({'u'}),frozenset({'e'}),(None,None,None),_token=_TOKEN);s.info[KEY]=scope
    if state=='missing':s.info.clear()
    if state=='wrong':s.info[KEY]=object()
    if state=='foreign':scope.session=object()
    if state=='ended':await s.rollback()
    if state=='nested':s.nested=True
    if state in ('dirty','new','deleted'):getattr(s,state).add(object())
    if state=='reused':scope.started=True
    count=len(s.sql)
    with pytest.raises(Exception):await apply_learner_import_batch(s,batch=batch)
    assert len(s.sql)==count

@pytest.mark.asyncio
async def test_scope_clean_and_expansion():
    s=FakeSession();s.info={};b=NS(id='batch',course_id=None,organization_id=None,learning_group_id=None);f=await begin(session=s,mode='shared')
    lease=ImportScope(s,f,'batch',frozenset({'u'}),frozenset({'e'}),(None,None,None),_token=_TOKEN,planned_identity_keys=frozenset({identity_lock_key('email','planned@example.invalid')}));s.info[KEY]=lease
    assert require_import_scope(s,b) is lease
    identity=NS(users_by_email={'x':NS(id='foreign')},users_by_phone={},enrollments_by_user_id={})
    with pytest.raises(Exception,match='expanded'):lease.verify_lookups(NS(identity=identity))
    with pytest.raises(Exception,match='unplanned_identity'):lease.require_user(None,email='unplanned@example.invalid',phone=None,snils=None)
    with pytest.raises(Exception,match='unplanned_enrollment'):lease.require_enrollment(None,user=None,course_id=None,created_user=False,email='planned@example.invalid',phone=None,snils=None)
    b.organization_id='another'
    with pytest.raises(Exception,match='parent_scope_changed'):lease.require(s,b)

def test_no_unprepared_evidence():
    with pytest.raises(Exception,match='use_prepare_boundary'):
        ImportScope(None,None,'batch',frozenset(),frozenset(),(None,None,None))

def test_http_uses_shared_fresh_owner_and_same_permission():
    tree=ast.parse(Path('app/api/v1/admin.py').read_text(encoding='utf-8-sig'))
    node=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='apply_learner_import')
    text=ast.unparse(node)
    assert 'Depends(require_registry_import_user)' in text
    assert 'Depends(get_registry_import_db)' in text
    assert text.index('prepare_import_scope(')<text.index('build_learner_import_preflight(')<text.index('apply_learner_import_batch(')<text.index('await session.commit()')

def test_savepoint_has_explicit_prelude_and_no_new_early_lock():
    text=Path('app/services/learner_import_batches.py').read_text(encoding='utf-8-sig')
    body=text[text.index('async def apply_learner_import_batch('):]
    assert body.index('import_scope.before_savepoint(')<body.index('db.begin_nested()')
    assert 'begin_registry_catalog_policy_fence' not in body
    assert 'acquire_discovered_registry_source_write_scope' not in body
