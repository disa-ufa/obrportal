from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock
import pytest
from fastapi import HTTPException
from app.services import mintrud_local_workflow as w
from app.api.v1 import mintrud_local_workflow as api
from app.services.registry_batch_transaction import KEY

def evidence(status='pending_data',decision=None,source='auto'):
    ob=NS(id='o',enrollment_id='e',status=status)
    cur=NS(fingerprint='a'*64,evaluation=NS(status='required',rule_code='rule',rule_version='v1',reason='Existing rule'))
    dec=None if decision is None else NS(decision=decision,source=source,decision_version=1,input_fingerprint='a'*64,rule_code='rule',rule_version='v1')
    return ob,dec,cur

@pytest.mark.parametrize('status',['approved','exported','submitted','accepted','rejected','correction_required'])
def test_protected_lifecycle_never_allows_generic_confirmation(status):
    assert not w.review_policy(*evidence(status),False)['can_save']

@pytest.mark.parametrize('field',w.PROTECTED_FIELDS)
def test_protected_fields_block_even_pending_rows(field):
    ob,dec,cur=evidence();setattr(ob,field,'evidence')
    assert not w.review_policy(ob,dec,cur,False)['can_save']

def test_missing_decision_offers_rule_review_not_automatic_write():
    result=w.review_policy(*evidence(),False)
    assert result['can_save'] and result['decision_state']=='missing'

def test_historical_batch_blocks():
    assert not w.review_policy(*evidence(),True)['can_save']

@pytest.mark.parametrize('source',['manual','legacy'])
def test_no_overwrite_manual_or_legacy(source):
    assert not w.review_policy(*evidence(decision='required',source=source),False)['can_save']

def test_current_decision_is_idempotently_unavailable():
    assert not w.review_policy(*evidence(decision='required'),False)['can_save']

def test_stale_auto_can_be_reviewed():
    ob,dec,cur=evidence(decision='required');dec.input_fingerprint='b'*64
    assert w.review_policy(ob,dec,cur,False)['can_save']

def test_no_invented_required_for_undetermined_rule():
    ob,dec,cur=evidence();cur.evaluation.status='needs_review'
    assert not w.review_policy(ob,dec,cur,False)['can_save']

@pytest.mark.parametrize('mismatch',['version','fingerprint','protected'])
async def test_stale_or_protected_confirmation_never_writes(monkeypatch,mismatch):
    ob,dec,cur=evidence()
    result=w.review_policy(ob,dec,cur,False)
    if mismatch=='protected':result['can_save']=False
    session=NS(info={KEY:Mock()},add=Mock())
    monkeypatch.setattr(w,'require_local_workspace',AsyncMock())
    monkeypatch.setattr(w,'read_review',AsyncMock(return_value=(result,ob,cur)))
    writer=AsyncMock();monkeypatch.setattr(w,'persist_registry_applicability',writer)
    with pytest.raises(HTTPException):
        await w.confirm_review(session,'o',1 if mismatch=='version' else 0,'b'*64 if mismatch=='fingerprint' else 'a'*64,'actor')
    writer.assert_not_awaited();session.add.assert_not_called()

async def test_confirm_uses_existing_writer_and_operator_audit(monkeypatch):
    ob,dec,cur=evidence();result=w.review_policy(ob,dec,cur,False)
    session=NS(info={KEY:Mock()},add=Mock())
    monkeypatch.setattr(w,'require_local_workspace',AsyncMock())
    monkeypatch.setattr(w,'read_review',AsyncMock(return_value=(result,ob,cur)))
    writer=AsyncMock(return_value=(NS(decision='required',decision_version=1),True))
    monkeypatch.setattr(w,'persist_registry_applicability',writer)
    reply=await w.confirm_review(session,'o',0,'a'*64,'actor')
    assert reply['saved']
    assert writer.await_args.kwargs['source']=='auto'
    assert 'actor_user_id' not in writer.await_args.kwargs
    assert session.add.call_args.args[0].actor_user_id=='actor'
    session.info[KEY].require_session.assert_called_once_with(session,'exclusive')

async def test_missing_transaction_fence_blocks_before_reads():
    with pytest.raises(HTTPException):await w.confirm_review(NS(info={}),'o',0,'a'*64,'actor')

async def test_export_status_does_not_expose_errors_or_enable_on_failure(monkeypatch):
    monkeypatch.setattr(api,'require_mintrud_batch_exports_enabled',AsyncMock(side_effect=TimeoutError('sensitive detail')))
    result=await api.export_status(session=NS())
    assert result['enabled'] is False and 'sensitive' not in str(result)

async def test_failure_rolls_back_without_commit(monkeypatch):
    monkeypatch.setattr(api,'confirm_review',AsyncMock(side_effect=ValueError('secret')))
    session=NS(commit=AsyncMock(),rollback=AsyncMock())
    with pytest.raises(HTTPException) as exc:
        await api.confirm('o',api.ConfirmRequest(expected_version=0,expected_input_fingerprint='a'*64,confirmed=True),NS(id='actor'),session)
    assert 'secret' not in str(exc.value.detail)
    session.commit.assert_not_awaited();session.rollback.assert_awaited_once()

@pytest.mark.parametrize('confirmed',[False])
async def test_explicit_confirmation_required(monkeypatch,confirmed):
    writer=AsyncMock();monkeypatch.setattr(api,'confirm_review',writer)
    with pytest.raises(HTTPException):
        await api.confirm('o',api.ConfirmRequest(expected_version=0,expected_input_fingerprint='a'*64,confirmed=confirmed),NS(id='actor'),NS())
    writer.assert_not_awaited()
