import ast
from pathlib import Path
import pytest
from app.tests.test_registry_catalog_policy_fence_unit import FakeSession
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence as begin
from app.services.registry_document_transaction import require_document_boundary, _KEY

@pytest.mark.asyncio
@pytest.mark.parametrize('case',['missing','foreign','ended','nested','new','dirty','deleted','repeat'])
async def test_boundary_rejects_unsafe_state(case):
    s=FakeSession();s.info={}
    f=await begin(session=s,mode='shared');s.info[_KEY]=f
    if case=='missing':s.info.clear()
    elif case=='foreign':s=FakeSession();s.info={_KEY:f}
    elif case=='ended':await s.rollback()
    elif case=='nested':s.nested=True
    elif case=='repeat':s.info['registry.document.scope_taken']=True
    else:getattr(s,case).add(object())
    count=len(s.sql)
    with pytest.raises(ValueError):require_document_boundary(s)
    assert len(s.sql)==count

def test_only_document_endpoints_use_new_dependency():
    tree=ast.parse(Path('app/api/v1/admin.py').read_text(encoding='utf-8'))
    names={n.name for n in tree.body if isinstance(n,ast.AsyncFunctionDef)
           and 'Depends(get_registry_document_db)' in ast.unparse(n.args)}
    assert names=={'create_admin_document','update_admin_document','delete_admin_document'}

def test_org_delete_has_unconditional_refusal_before_delete():
    tree=ast.parse(Path('app/api/v1/admin.py').read_text(encoding='utf-8'))
    node=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='delete_organization')
    assert isinstance(node.body[0],ast.Raise)
