from types import SimpleNamespace as NS
from unittest.mock import AsyncMock,Mock
from copy import deepcopy
from datetime import datetime,timezone
import pytest
from fastapi import HTTPException
from app.services import registry_historical_mintrud_reconciliation as s
from app.core.config import settings
from app.services.compliance_registry_approval import fingerprint_registry_approval_snapshot

URL='postgresql+asyncpg://obrportal_m4p9_login@obr-m4p9-20261111-pg:5432/obrportal_m4p9_workspace_20261111'
ID='00000000-0000-4000-8000-000000000001'
@pytest.fixture(autouse=True)
def config(monkeypatch):
 for k,v in dict(database_url=URL,environment='local',production_exports_enabled=False,local_mintrud_xml_export_enabled=True).items():monkeypatch.setattr(settings,k,v)

@pytest.fixture
def case(monkeypatch):
 snapshot={'mintrud_context':{'protocol_number':'SYN','knowledge_check_date':'2026-11-01','knowledge_check_result':'satisfactory'}}
 digest=fingerprint_registry_approval_snapshot(snapshot)
 ob=NS(id=ID,registry='mintrud',enrollment_id=ID,status='approved',approved_at=datetime.now(timezone.utc),approval_invalidated_at=None,approval_event_id=ID,approval_snapshot_json=snapshot,approval_fingerprint=digest)
 context=NS(**snapshot['mintrud_context'])
 session=NS(in_transaction=Mock(return_value=False),in_nested_transaction=Mock(return_value=False),new=[],dirty=[],deleted=[],scalar=AsyncMock(),rollback=AsyncMock(),commit=AsyncMock(),flush=AsyncMock(),add=Mock())
 values=[NS(id=ID),'admin',context,None,None,None];session.scalar.side_effect=values
 fence=NS(action_lockset=AsyncMock(return_value=[ob]))
 monkeypatch.setattr(s,'begin_registry_catalog_policy_fence',AsyncMock(return_value=fence))
 monkeypatch.setattr(s,'get_user_permission_codes',AsyncMock(return_value={'mintrud.export','mintrud.approve'}))
 gate=AsyncMock();monkeypatch.setattr(s,'require_mintrud_batch_exports_enabled',gate)
 scope=NS(source_fences=(),targets=());monkeypatch.setattr(s,'discover_registry_action_scope',AsyncMock(return_value=scope))
 cur=NS(fingerprint='a'*64,evaluation=NS(status='required',rule_code='rule',rule_version='1',reason='Synthetic rule'))
 monkeypatch.setattr(s,'load_current_registry_applicability_inputs',AsyncMock(return_value=cur))
 args=dict(session=session,actor_id=ID,obligation_id=ID,expected_approval_event_id=ID,expected_approval_fingerprint=digest,expected_applicability_fingerprint='a'*64,operator_reason='Synthetic operator reason for dry run only')
 return NS(ob=ob,context=context,session=session,values=values,cur=cur,args=args,gate=gate)

async def test_dry_run_no_writes_or_approval_changes(case):
 before=deepcopy(vars(case.ob));result=await s.reconcile_historical_mintrud(**case.args)
 assert result['applied'] is False and vars(case.ob)==before
 case.session.add.assert_not_called();case.session.flush.assert_not_awaited();case.session.commit.assert_not_awaited();case.session.rollback.assert_awaited_once();case.gate.assert_awaited_once_with(case.session)

@pytest.mark.parametrize('change',['stale','fingerprint','batch','decision','protocol','permissions','marker'])
async def test_safety_denials(case,monkeypatch,change):
 if change=='stale':case.ob.approval_invalidated_at=datetime.now(timezone.utc)
 if change=='fingerprint':case.args['expected_applicability_fingerprint']='b'*64
 if change=='batch':case.values[4]='prior-batch'
 if change=='decision':case.values[5]='prior-decision'
 if change=='protocol':case.context.protocol_number=None
 if change=='permissions':monkeypatch.setattr(s,'get_user_permission_codes',AsyncMock(return_value={'mintrud.export'}))
 if change=='marker':case.gate.side_effect=HTTPException(409,'denied')
 with pytest.raises(s.HistoricalMintrudReconciliationError):await s.reconcile_historical_mintrud(**case.args)
 case.session.add.assert_not_called();case.session.commit.assert_not_awaited()
 if change=='permissions':case.gate.assert_not_awaited()

@pytest.mark.parametrize('key,value', [('database_url',URL.replace('workspace_20261111','prodclone')),('database_url',URL.replace('obr-m4p9-20261111-pg','postgres')),('database_url',URL.replace('obrportal_m4p9_login','obrportal_stage')),('database_url',URL+'?host=other'),('database_url',URL.replace(':5432',':5433')),('environment','production'),('production_exports_enabled',True),('local_mintrud_xml_export_enabled',False)])
def test_configuration_denied(monkeypatch,key,value):
 monkeypatch.setattr(settings,key,value)
 with pytest.raises(s.HistoricalMintrudReconciliationError):s.require_historical_local_target()

def test_http_contract_has_only_dry_run_and_forbids_actor():
 from app.api.v1.registry_historical_mintrud_api import router,HistoricalDryRunRequest
 assert len(router.routes)==1 and router.routes[0].path.endswith('/dry-run')
 assert 'actor_id' not in HistoricalDryRunRequest.model_fields
 assert HistoricalDryRunRequest.model_config['extra']=='forbid'

async def test_gate_follows_authorization_and_fence(case,monkeypatch):
 async def gate(session):
  assert s.begin_registry_catalog_policy_fence.await_count==1
  assert s.get_user_permission_codes.await_count==1
  assert session.scalar.await_count==2
  s.discover_registry_action_scope.assert_not_awaited()
 monkeypatch.setattr(s,'require_mintrud_batch_exports_enabled',gate)
 await s.reconcile_historical_mintrud(**case.args)
