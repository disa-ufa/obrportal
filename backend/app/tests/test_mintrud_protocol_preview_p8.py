"""P8 synthetic tests. No engine, socket, production data or database is required."""
from contextlib import contextmanager
from copy import deepcopy
from datetime import date, datetime, timezone
from types import SimpleNamespace as NS
from uuid import UUID, uuid4
import ast
import json
from pathlib import Path
from unittest.mock import AsyncMock
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.sql.selectable import Select
from app.services import mintrud_protocol_export_preview as svc
from app.services.compliance_registry_approval import build_registry_approval_snapshot, fingerprint_registry_approval_snapshot
from app.services.registry_applicability_fingerprint import RegistryApplicabilityInputs, fingerprint_applicability_inputs

D = date(2026, 11, 1)
T = datetime(2026, 10, 31, tzinfo=timezone.utc)
def uid(n): return str(UUID(int=n))


def refresh_decisions(s):
    course=s['courses'][0]
    ev=svc.evaluate_course_registry_applicability(regulatory_program_type=course['regulatory_program_type'],frdo_requirement_mode=course['frdo_requirement_mode'],mintrud_requirement_mode=course['mintrud_requirement_mode'])['mintrud']
    for m,e,c,d in zip(s['members'],s['enrollments'],s['contexts'],s['decisions']):
        inputs=RegistryApplicabilityInputs('mintrud',e['id'],course['id'],course['regulatory_program_type'],course['mintrud_requirement_mode'],ev.rule_code,ev.rule_version,None,None,None,c.get('reporting_scenario'),e['completed_at'].date() if e.get('completed_at') else None,tuple(sorted(f"{p['schema_version']}:{p['code']}" for p in s['programs'])),c.get('employer_name'),c.get('employer_inn'))
        d.update(rule_code=ev.rule_code,rule_version=ev.rule_version,input_fingerprint=fingerprint_applicability_inputs(inputs))


def fixture(n=2, recorded=True):
    p=dict(id=uid(1),course_id=uid(2),protocol_number='SYNTHETIC-P8',protocol_date=D,status='recorded' if recorded else 'draft',commission_order_number='SYN-ORDER',commission_order_date=D,commission_chair='Synthetic Chair',commission_members_json=['Synthetic Chair','Synthetic Two','Synthetic Three'],recorded_at=T,recorded_by_user_id=uid(3),recording_request_id=uid(4),updated_at=T)
    course=dict(id=uid(2),title='Synthetic training',hours=40,regulatory_program_type='occupational_safety_training',frdo_requirement_mode='auto',mintrud_requirement_mode='required',document_type=None)
    s=dict(protocol=p,courses=[course],members=[],enrollments=[],users=[],profiles=[],obligations=[],contexts=[],decisions=[],documents=[],programs=[dict(id=uid(5),learn_program_id=1,code='A',title='Synthetic A',schema_version='1.0.9',is_active=True)],attempts=[],items=[],batches=[],provider=dict(name='Synthetic Provider',inn='0000000000'))
    for i in range(n):
        m,e,o,u=map(uid,[1000+i,2000+i,3000+i,4000+i])
        s['members'].append(dict(id=m,protocol_id=p['id'],enrollment_id=e,obligation_id=o,knowledge_check_date=D,knowledge_check_result='satisfactory'))
        s['enrollments'].append(dict(id=e,user_id=u,course_id=course['id'],status='completed',completed_at=T,organization_id=None))
        s['users'].append(dict(id=u,full_name='Synthetic Same Name',is_active=True))
        s['profiles'].append(dict(id=uid(5000+i),user_id=u,last_name='Synthetic',first_name='Person',middle_name=None,snils='SYNTHETIC-NOT-REAL'))
        s['obligations'].append(dict(id=o,enrollment_id=e,registry='mintrud',status='ready',document_id=None))
        s['contexts'].append(dict(id=uid(6000+i),obligation_id=o,reporting_scenario='external_training_provider',profession_or_position='Synthetic position',employer_name='Synthetic Employer',employer_inn='0000000000',protocol_number=p['protocol_number'],knowledge_check_date=D,knowledge_check_result='satisfactory'))
        s['decisions'].append(dict(id=uid(7000+i),enrollment_id=e,registry='mintrud',decision='required',source='auto',reason='Synthetic explicit rule',decision_version=1))
    frozen=dict(kind='ADMINISTRATIVELY_RECORDED_COMMISSION_CHECK_NOT_SIGNED_NOT_EXPORTED',protocol_id=p['id'],course_id=p['course_id'],protocol_number=p['protocol_number'],protocol_date=D.isoformat(),training_provider_name=s['provider']['name'],program_title=course['title'],program_hours=40,commission_order_number=p['commission_order_number'],commission_order_date=D.isoformat(),commission_chair=p['commission_chair'],commission_members=p['commission_members_json'],participants=[dict(enrollment_id=m['enrollment_id'],obligation_id=m['obligation_id'],user_id=e['user_id'],knowledge_check_date=D.isoformat(),knowledge_check_result='satisfactory') for m,e in zip(s['members'],s['enrollments'])])
    p.update(recorded_snapshot=frozen,recorded_snapshot_sha256=svc.input_revision(frozen))
    refresh_decisions(s)
    return s


def run(s): return svc.evaluate_protocol_preview(s,svc.input_revision(s))
def category(s): return run(s)['members'][0]['category']
def approve(s):
    current=build_registry_approval_snapshot(registry='mintrud',enrollment=NS(**s['enrollments'][0]),course=NS(**s['courses'][0]),learner_profile=NS(**s['profiles'][0]),mintrud_context=NS(**s['contexts'][0]),mintrud_learn_programs=tuple(NS(**p) for p in s['programs']),mintrud_reporting_organization=NS(**s['provider']))
    s['obligations'][0].update(status='approved',approved_at=T,approved_by_user_id=uid(3),approval_event_id=str(uuid4()),approval_snapshot_json=current,approval_fingerprint=fingerprint_registry_approval_snapshot(current))


def test_multiple_same_name_are_distinct_and_no_mutation():
    s=fixture(); before=deepcopy(s); result=run(s)
    assert result['counts']['ready_for_approval']==2
    assert len({m['enrollment_id'] for m in result['members']})==2
    assert result['not_authorization_for_export'] is True
    assert 'ready_for_export' not in json.dumps(result,default=str)
    assert s==before


def test_empty():
    with pytest.raises(HTTPException) as err:run(fixture(0))
    assert err.value.status_code==409


def test_draft_not_commission():assert category(fixture(recorded=False))=='not_eligible'


def test_recorded_sha_mismatch():
    s=fixture();s['protocol']['recorded_snapshot_sha256']='0'*64
    with pytest.raises(HTTPException) as err:run(s)
    assert err.value.status_code==409


@pytest.mark.parametrize('mutation',[
 lambda s:s['enrollments'].clear(),
 lambda s:s['obligations'].clear(),
 lambda s:s['obligations'][0].update(registry='frdo'),
 lambda s:s['obligations'][0].update(enrollment_id=uid(999)),
 lambda s:s['enrollments'][0].update(course_id=uid(999)),
 lambda s:s['users'].clear(),
 lambda s:s['members'][0].update(obligation_id=uid(999)),
])
def test_invalid_links(mutation):
    s=fixture();mutation(s);assert category(s)=='conflict'


@pytest.mark.parametrize('decision,expected',[('not_required','not_eligible'),('needs_review','applicability_review')])
def test_applicability(decision,expected):
    s=fixture();s['decisions'][0]['decision']=decision;assert category(s)==expected


def test_stale_applicability():
    s=fixture();s['decisions'][0]['input_fingerprint']='0'*64;assert category(s)=='applicability_review'


@pytest.mark.parametrize('field',['snils','first_name','last_name'])
def test_missing_profile(field):
    s=fixture();s['profiles'][0][field]=None;assert category(s)=='needs_data'


def test_missing_context():
    s=fixture();s['contexts'][0]['profession_or_position']=None;assert category(s)=='needs_data'


def test_missing_employer():
    s=fixture();s['contexts'][0]['employer_name']=None;refresh_decisions(s);assert category(s)=='needs_data'


def test_xml_character():
    s=fixture();s['profiles'][0]['last_name']='Synthetic\x01';assert category(s)=='needs_data'


def test_current_approval():
    s=fixture();approve(s);assert category(s)=='approved_current'


def test_stale_approval_fingerprint():
    s=fixture();approve(s);s['profiles'][0]['first_name']='Changed';assert category(s)=='conflict'


def test_legacy_approval():
    s=fixture();s['obligations'][0]['status']='approved';assert category(s)=='protected_history'


def test_history_attempt():
    s=fixture();s['attempts']=[dict(id=uid(99),obligation_id=s['obligations'][0]['id'])];assert category(s)=='protected_history'


def test_reexport_event():
    s=fixture();approve(s);o=s['obligations'][0];s['batches']=[dict(id=uid(99),registry='mintrud')];s['items']=[dict(id=uid(98),batch_id=uid(99),obligation_id=o['id'],approval_event_id=o['approval_event_id'])];assert category(s)=='already_exported'


def test_old_batch():
    s=fixture();s['batches']=[dict(id=uid(99),registry='mintrud')];s['items']=[dict(id=uid(98),batch_id=uid(99),obligation_id=s['obligations'][0]['id'],approval_event_id=None)];assert category(s)=='protected_history'


def test_context_commission_conflict():
    s=fixture();s['contexts'][0]['protocol_number']='DIFFERENT';assert category(s)=='conflict'


def test_full_100():
    r=run(fixture(100));assert r['participant_count']==100 and r['counts']['ready_for_approval']==100


def test_recorded_member_change():
    s=fixture();s['members'].pop()
    with pytest.raises(HTTPException):run(s)


class ReadOnlySession:
    def __init__(self,s,change=False):self.data=s;self.queries=[];self.depth=0;self.passes=0;self.change=change
    @property
    @contextmanager
    def no_autoflush(self):
        self.depth+=1
        try:yield
        finally:self.depth-=1
    def check(self,q):
        assert self.depth and isinstance(q,Select)
        assert q.get_execution_options().get('populate_existing')
        assert q._for_update_arg is None
        self.queries.append(q)
    async def scalar(self,q):
        self.check(q);self.passes+=1
        if self.data is None:return None
        if self.change and self.passes==2:self.data['protocol']['protocol_number']='Changed during read'
        from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol
        return MintrudKnowledgeProtocol(**self.data['protocol'])
    async def scalars(self,q):
        self.check(q)
        model=q.column_descriptions[0]['entity']
        keys={'MintrudKnowledgeProtocolMember':'members','Enrollment':'enrollments','Course':'courses','User':'users','LearnerProfile':'profiles','RegistryObligation':'obligations','MintrudRegistryContext':'contexts','RegistryApplicabilityRecord':'decisions','DocumentRecord':'documents','MintrudLearnProgram':'programs','RegistrySubmissionAttempt':'attempts','RegistrySubmissionBatchItem':'items','RegistrySubmissionBatch':'batches'}
        return NS(all=lambda:[model(**r) for r in self.data[keys[model.__name__]]])
    def __getattr__(self,name):raise AssertionError('Forbidden session operation: '+name)


@pytest.mark.asyncio
async def test_select_only_no_flush_commit_audit(monkeypatch):
    s=fixture(100);session=ReadOnlySession(s);monkeypatch.setattr(svc,'resolve_mintrud_reporting_organization',lambda:NS(**s['provider']))
    result=await svc.preview_protocol_export(session,uid(1))
    assert result['participant_count']==100 and len(session.queries)==28
    assert s['obligations'][0]['status']=='ready'


@pytest.mark.asyncio
async def test_concurrent_read_change_409(monkeypatch):
    s=fixture();session=ReadOnlySession(s,change=True);monkeypatch.setattr(svc,'resolve_mintrud_reporting_organization',lambda:NS(**s['provider']))
    with pytest.raises(HTTPException) as err:await svc.preview_protocol_export(session,uid(1))
    assert err.value.status_code==409


@pytest.mark.asyncio
async def test_missing_protocol():
    with pytest.raises(HTTPException) as err:await svc.preview_protocol_export(ReadOnlySession(None),uid(1))
    assert err.value.status_code==404


def test_api_permission_real_dependency_and_get_only(monkeypatch):
    from app.api.v1.mintrud_protocol_preview import router
    from app.api.v1 import rbac
    from app.api.v1.auth import get_current_user
    from app.db.session import get_db
    app=FastAPI();app.include_router(router,prefix='/api/v1/admin/mintrud/protocol-drafts')
    app.dependency_overrides[get_current_user]=lambda:NS(id=uid(9))
    app.dependency_overrides[get_db]=lambda:ReadOnlySession(None)
    monkeypatch.setattr(rbac,'get_user_permission_codes',AsyncMock(return_value=set()))
    with TestClient(app) as client:
        for path in ('catalog',uid(1)+'/participants',uid(1)+'/export-preview'):
            assert client.get('/api/v1/admin/mintrud/protocol-drafts/'+path).status_code==403
        assert client.post('/api/v1/admin/mintrud/protocol-drafts/'+uid(1)+'/export-preview').status_code==405
        monkeypatch.setattr(rbac,'get_user_permission_codes',AsyncMock(return_value={'mintrud.read'}))
        assert client.get('/api/v1/admin/mintrud/protocol-drafts/'+uid(1)+'/export-preview').status_code==404


def test_api_read_call_graph_excludes_writes_and_xml():
    root=Path(__file__).resolve().parents[1]
    for name in ('services/mintrud_protocol_export_preview.py','api/v1/mintrud_protocol_preview.py'):
        tree=ast.parse((root/name).read_text(encoding='utf-8-sig'))
        forbidden={'commit','flush','rollback','add','add_all','delete','update','insert','with_for_update','apply_registry_approval','apply_mintrud_protocol_sync','serialize_mintrud_eisot_xml_v109','serialize_mintrud_eisot_batch_xml_v109','AuditEvent'}
        calls={n.func.attr if isinstance(n.func,ast.Attribute) else n.func.id for n in ast.walk(tree) if isinstance(n,ast.Call) and isinstance(n.func,(ast.Attribute,ast.Name))}
        # dict.update only mutates new response dictionaries, never ORM objects.
        assert not (calls & (forbidden-{'update'}))

@pytest.mark.asyncio
async def test_catalog_server_total_and_pagination():
    from app.api.v1.mintrud_protocol_preview import protocol_catalog
    from sqlalchemy.dialects import postgresql
    class CatalogSession:
        no_autoflush=ReadOnlySession(fixture()).no_autoflush
        def __init__(self):self.queries=[]
        async def scalar(self,q):
            assert isinstance(q,Select);self.queries.append(q);return 151
        async def execute(self,q):
            assert isinstance(q,Select);self.queries.append(q)
            assert q._limit_clause.value==25 and q._offset_clause.value==100
            sql=str(q.compile(dialect=postgresql.dialect()))
            assert 'ILIKE' in sql and 'EXISTS' in sql and 'mintrud_knowledge_protocol_members' in sql
            return NS(all=lambda:[(NS(**fixture()['protocol']),'Synthetic training',100,True)])
    session=CatalogSession()
    result=await protocol_catalog(q='SYN%',course_id=UUID(uid(2)),status='recorded',offset=100,limit=25,_=None,session=session)
    assert result['total']==151 and result['has_more'] and result['offset']==100
    assert result['items'][0]['participant_count']==100
    assert result['items'][0]['data_check']=='not_checked'
    assert len(session.queries)==3


@pytest.mark.asyncio
async def test_loader_rejects_partial_more_than_100(monkeypatch):
    s=fixture(101);session=ReadOnlySession(s);monkeypatch.setattr(svc,'resolve_mintrud_reporting_organization',lambda:NS(**s['provider']))
    with pytest.raises(HTTPException) as error:await svc.preview_protocol_export(session,uid(1))
    assert error.value.status_code==409


def test_catalog_route_registered_before_legacy_dynamic():
    from app.api.v1.mintrud_protocol_drafts import router
    paths=[r.path for r in router.routes]
    assert paths.index('/mintrud/protocol-drafts/catalog') < paths.index('/mintrud/protocol-drafts/{protocol_id}')


def test_api_full_json_and_concurrent_409(monkeypatch):
    from app.api.v1.mintrud_protocol_drafts import router
    from app.api.v1 import rbac
    from app.api.v1.auth import get_current_user
    from app.db.session import get_db
    s=fixture(3)
    app=FastAPI();app.include_router(router,prefix='/api/v1/admin')
    app.dependency_overrides[get_current_user]=lambda:NS(id=uid(9))
    app.dependency_overrides[get_db]=lambda:ReadOnlySession(s)
    monkeypatch.setattr(rbac,'get_user_permission_codes',AsyncMock(return_value={'mintrud.read'}))
    monkeypatch.setattr(svc,'resolve_mintrud_reporting_organization',lambda:NS(**s['provider']))
    with TestClient(app) as client:
        base='/api/v1/admin/mintrud/protocol-drafts/'+uid(1)
        response=client.get(base+'/export-preview')
        assert response.status_code==200
        payload=response.json()
        assert payload['summary']['total']==3 and payload['counts']['ready_for_approval']==3
        assert 'T' in payload['checked_at'] and payload['not_authorization_for_export'] is True
        assert client.get(base+'/participants').json()['participant_count']==3
        app.dependency_overrides[get_db]=lambda:ReadOnlySession(s,change=True)
        assert client.get(base+'/export-preview').status_code==409
