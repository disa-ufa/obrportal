"""Synthetic HTTP diagnostics. No database connections."""
from contextlib import nullcontext
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock
from uuid import uuid4
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine
from app.api.v1 import mintrud_local_workflow as api, auth, rbac
from app.db.session import get_db
from app.core.config import settings
OID = str(uuid4())
MARKER = str(uuid4())
APPROVAL_EVENT_ID = str(uuid4())
URL = 'postgresql+asyncpg://obrportal_m4p9_login@obr-m4p9-20261111-pg:5432/obrportal_m4p9_workspace_20261111'
@pytest.fixture
def harness(monkeypatch):
    monkeypatch.setattr(settings, 'environment', 'production')
    monkeypatch.setattr(settings, 'production_exports_enabled', True)
    monkeypatch.setattr(settings, 'local_mintrud_xml_export_enabled', False)
    monkeypatch.setattr(settings, 'local_mintrud_db_marker', SecretStr(MARKER))
    session = NS(get_bind=Mock(return_value=create_engine(URL)), no_autoflush=nullcontext(),
        execute=AsyncMock(return_value=Mock(one_or_none=Mock(return_value=(
            'obrportal_m4p9_workspace_20261111', MARKER, 'obrportal_m4p9_login', True)))),
        commit=AsyncMock(), rollback=AsyncMock())
    async def db(): yield session
    app = FastAPI(); app.include_router(api.router)
    app.dependency_overrides[get_db] = db
    app.dependency_overrides[api.export_readonly_db] = db
    app.dependency_overrides[auth.get_current_user] = lambda: NS(id='synthetic')
    codes = AsyncMock(return_value={'mintrud.read', 'mintrud.export'})
    monkeypatch.setattr(rbac, 'get_user_permission_codes', codes)
    review = AsyncMock(return_value=(
        {'batch_eligible': True}, NS(approval_event_id=APPROVAL_EVENT_ID), None,
    ))
    monkeypatch.setattr(api, 'read_review', review)
    with TestClient(app) as client: yield client, session, codes, review
    session.commit.assert_not_awaited()
def test_authorized_production_diagnostic(harness):
    client, session, _, review = harness
    assert client.get('/admin/mintrud/export-status').json()['enabled'] is True
    response = client.get(f'/admin/mintrud/obligations/{OID}/export-readiness')
    assert response.status_code == 200
    assert response.json() == dict(
        obligation_id=OID, approval_event_id=APPROVAL_EVENT_ID,
        batch_eligible=True, block_reason=None, calculated_decision=None, issue_codes=[],
        read_only=True, not_authorization_for_export=True,
    )
    session.execute.assert_not_awaited(); review.assert_awaited_once()
def test_missing_approval_event_fails_closed_even_when_review_is_eligible(harness):
    client, _, _, review = harness
    review.return_value = ({'batch_eligible': True}, NS(approval_event_id=None), None)
    response = client.get(f'/admin/mintrud/obligations/{OID}/export-readiness')
    assert response.status_code == 200
    assert response.json() == dict(
        obligation_id=OID, approval_event_id=None, batch_eligible=False,
        block_reason='approval.event_unverified', calculated_decision=None, issue_codes=[],
        read_only=True, not_authorization_for_export=True,
    )
@pytest.mark.parametrize('local,valid,enabled', [(True,True,True),(True,False,False),(False,True,False)])
def test_local_identity_and_disabled_gate(harness, monkeypatch, local, valid, enabled):
    client, session, _, _ = harness
    monkeypatch.setattr(settings, 'environment', 'local')
    monkeypatch.setattr(settings, 'production_exports_enabled', False)
    monkeypatch.setattr(settings, 'local_mintrud_xml_export_enabled', local)
    if not valid: session.execute.return_value.one_or_none.return_value = None
    assert client.get('/admin/mintrud/export-status').json()['enabled'] is enabled
@pytest.mark.parametrize('permissions', [set(), {'mintrud.read'}, {'mintrud.approve'}])
def test_read_permission_never_grants_export(harness, permissions):
    client, session, codes, review = harness; codes.return_value = permissions
    for path in ['/export-status', f'/obligations/{OID}/export-readiness']:
        assert client.get('/admin/mintrud'+path).status_code == 403
    review.assert_not_awaited(); session.execute.assert_not_awaited()
@pytest.mark.parametrize('failure', [TimeoutError('private'), ValueError('private')])
def test_unknown_readiness_is_closed(harness, failure):
    client, _, _, review = harness; review.side_effect = failure
    response = client.get(f'/admin/mintrud/obligations/{OID}/export-readiness')
    assert response.status_code == 409 and 'private' not in response.text
def test_unready_record_and_repeat_remain_readonly(harness):
    client, _, _, review = harness; review.return_value = ({'batch_eligible':False},None,None)
    for _ in range(2):
        assert client.get(f'/admin/mintrud/obligations/{OID}/export-readiness').json()['batch_eligible'] is False
async def test_local_confirmation_still_rejects_production(harness):
    from app.services.mintrud_local_workflow import require_local_workspace
    with pytest.raises(HTTPException): await require_local_workspace(harness[1])


def test_ready_row_is_selectable_when_export_is_closed(harness, monkeypatch):
    client, _, _, review = harness
    gate = AsyncMock(side_effect=HTTPException(409, {'code': 'registry.batch_export.disabled'}))
    monkeypatch.setattr(api, 'require_mintrud_batch_exports_enabled', gate)
    assert not client.get('/admin/mintrud/export-status').json()['enabled']
    response = client.get(f'/admin/mintrud/obligations/{OID}/export-readiness')
    assert response.status_code == 200 and response.json()['batch_eligible'] is True
    assert response.json()['approval_event_id'] == APPROVAL_EVENT_ID
    assert response.json()['not_authorization_for_export'] is True
    gate.assert_awaited_once()
    assert review.await_args.kwargs['general_export'] is True


@pytest.mark.parametrize('block,issues', [
    ('mintrud.data_not_ready', [{'code': 'learner_profile.snils_missing', 'message': 'private'}]),
    ('approval.current_data_fingerprint_mismatch', []),
    ('registry.applicability_missing', []),
    ('registry.approval_already_exported', []),
])
def test_row_block_reason_keeps_approval_and_personal_values_out_of_response(harness, block, issues):
    client, _, _, review = harness
    review.return_value = ({'batch_eligible': False, 'block_reason': block, 'issues': issues},
                           NS(approval_event_id=APPROVAL_EVENT_ID), None)
    response = client.get(f'/admin/mintrud/obligations/{OID}/export-readiness')
    assert response.status_code == 200
    assert response.json()['batch_eligible'] is False
    assert response.json()['approval_event_id'] is None
    assert response.json()['block_reason'] == block
    assert response.json()['issue_codes'] == [issue['code'] for issue in issues]
    assert 'private' not in response.text
