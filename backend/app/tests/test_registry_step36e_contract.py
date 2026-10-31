"""Factory coverage and fail-closed batch entry contracts; PG covered separately."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4
import pytest
from app.services.registry_session_coordination import coordinate_transaction,MODE_KEY

class Connection:
 def __init__(self,level='read committed',dialect='postgresql'):
  self.dialect=SimpleNamespace(name=dialect);self.level=level;self.calls=[]
 def execute(self,sql,params=None):
  self.calls.append((str(sql),params));return SimpleNamespace(scalar_one=lambda:self.level)

@pytest.mark.parametrize('mode',['shared','exclusive'])
def test_first_sql_and_next_autobegin(mode):
 s=SimpleNamespace(info={MODE_KEY:mode});t=SimpleNamespace(nested=False);c=Connection()
 coordinate_transaction(s,t,c)
 assert c.calls[0][0]=='SHOW transaction_isolation'
 assert ('lock_shared' in c.calls[1][0]) == (mode=='shared')
 assert MODE_KEY not in s.info
 c.calls=[];coordinate_transaction(s,t,c)
 assert 'lock_shared' in c.calls[1][0]  # no inherited exclusive mode after COMMIT

def test_nested_savepoint_keeps_outer_fence():
 c=Connection();coordinate_transaction(SimpleNamespace(info={}),SimpleNamespace(nested=True),c);assert not c.calls

@pytest.mark.parametrize('level',['repeatable read','serializable'])
def test_reject_unsafe_isolation_before_fence(level):
 c=Connection(level)
 with pytest.raises(RuntimeError,match='read_committed'):
  coordinate_transaction(SimpleNamespace(info={}),SimpleNamespace(nested=False),c)
 assert len(c.calls)==1

def test_reject_non_postgres():
 with pytest.raises(RuntimeError,match='postgresql_required'):
  coordinate_transaction(SimpleNamespace(info={}),SimpleNamespace(nested=False),Connection(dialect='sqlite'))

@pytest.mark.parametrize('registry',['frdo','mintrud'])
def test_real_batch_service_rejects_missing_boundary_before_source_read(registry):
 from app.services.compliance_registry_batches import create_mintrud_registry_submission_batch,RegistrySubmissionBatchError
 from app.services.frdo_po_batches import create_frdo_registry_submission_batch
 fn=create_frdo_registry_submission_batch if registry=='frdo' else create_mintrud_registry_submission_batch
 with pytest.raises(RegistrySubmissionBatchError,match='batch_transaction_required'):
  asyncio.run(fn(SimpleNamespace(info={}),obligation_ids=[str(uuid4())],generated_by_user_id=str(uuid4())))

@pytest.mark.parametrize('registry',['mintrud','frdo'])
def test_api_auth_and_endpoint_share_fresh_owner(registry):
 from app.main import app
 from app.services.registry_batch_transaction import get_registry_batch_db
 route=next(r for r in app.routes if getattr(r,'path','')==f'/api/v1/admin/{registry}/batches' and 'POST' in r.methods)
 deps=route.dependant.dependencies
 assert next(d for d in deps if d.name=='session').call is get_registry_batch_db
 auth=next(d for d in deps if d.name=='current_user')
 assert next(d for d in auth.dependencies if d.name=='session').call is get_registry_batch_db


def test_all_application_session_construction_is_accounted_for():
    import ast
    from pathlib import Path
    from app.db.session import AsyncSessionLocal
    from app.services.registry_session_coordination import RegistryCoordinatedSession
    assert AsyncSessionLocal.kw['sync_session_class'] is RegistryCoordinatedSession
    root=Path(__file__).parents[1]
    allowed={
        'create_async_engine': {'db/session.py','mintrud_catalog_cli.py',
            'registry_applicability_inventory_cli.py','registry_applicability_reconciliation_cli.py'},
        'async_sessionmaker': {'db/session.py'},
        'AsyncSession': {'mintrud_catalog_cli.py'},
        'create_engine': set(), 'sessionmaker': set(), 'Session': set(),
    }
    for path in root.rglob('*.py'):
        relative=path.relative_to(root)
        if relative.parts[0]=='tests':continue
        tree=ast.parse(path.read_text(encoding='utf-8-sig'))
        for node in ast.walk(tree):
            if not isinstance(node,ast.Call):continue
            name=ast.unparse(node.func).split('.')[-1]
            if name in allowed:
                assert relative.as_posix() in allowed[name], (relative,name)
