"""Synthetic sessions only: no engine, storage, or application database."""
def run(coro):
    try:
        coro.send(None)
    except StopIteration as result:
        return result.value
    raise AssertionError('Synthetic readiness unexpectedly performed I/O')
import copy
from datetime import date, datetime
from types import SimpleNamespace as NS

import pytest

from app.api.v1 import mintrud_protocol_drafts as api


def sample():
    protocol = NS(id='p', course_id='c', status='draft', protocol_number='1',
                  protocol_date=date(2026, 1, 2), commission_order_number='1',
                  commission_order_date=date(2026, 1, 1), commission_chair='A',
                  commission_members_json=['B', 'C'])
    row = NS(id='m', enrollment_id='e', obligation_id='o', course_id='c',
             status='completed', completed_at=datetime(2026, 1, 1), user_id='u',
             full_name='Synthetic', registry_obligation_id='o', registry='mintrud',
             existing_approved_at=None, existing_submitted_at=None, existing_approval_snapshot=None,
             manual_protocol_number=None, manual_check_date=None, manual_check_result=None,
             profession_or_position='Worker', employer_name='External', employer_inn='0274000001',
             reporting_scenario='external_training_provider',
             knowledge_check_date=date(2026, 1, 2), knowledge_check_result='satisfactory')
    return protocol, row


class ReadOnlySession:
    def __init__(self, row):
        self.row = row

    async def scalar(self, query):
        if 'courses' in str(query):
            return NS(title='Synthetic course', hours=16, mintrud_requirement_mode='required')
        return 0

    async def execute(self, query):
        assert 'reporting_scenario' in str(query) and 'employer_inn' in str(query)
        return NS(all=lambda: [self.row])


def report(monkeypatch, **changes):
    monkeypatch.setattr(api.settings, 'document_org_name', 'Central')
    monkeypatch.setattr(api.settings, 'document_org_inn', '0274000002')
    protocol, row = sample()
    for key, value in changes.items():
        setattr(row, key, value)
    before = copy.deepcopy(vars(row))
    result = run(api._recording_report(ReadOnlySession(row), protocol))
    assert vars(row) == before
    return result


@pytest.mark.parametrize('scenario,title,source', [
    ('external_training_provider', 'External', 'mintrud_context'),
    ('employer_self_training', 'Central', 'mintrud_reporting_organization'),
])
def test_scenario_and_frozen_source(monkeypatch, scenario, title, source):
    result = report(monkeypatch, reporting_scenario=scenario)
    assert result['fieldsComplete'], result['issues']
    participant = result['snapshot']['participants'][0]
    assert participant['workplace'] == title
    assert participant['employer_source'] == source
    monkeypatch.setattr(api.settings, 'document_org_name', 'Changed later')
    assert participant['workplace'] == title


@pytest.mark.parametrize('field', ['employer_name', 'employer_inn'])
def test_external_requires_both_fields(monkeypatch, field):
    result = report(monkeypatch, **{field: ' '})
    assert 'workplace:e' in [x['code'] for x in result['issues']]


@pytest.mark.parametrize('field', ['document_org_name', 'document_org_inn'])
def test_missing_central_is_fail_closed_no_context_fallback(monkeypatch, field):
    report(monkeypatch)  # initialize synthetic settings
    monkeypatch.setattr(api.settings, field, ' ')
    protocol, row = sample()
    row.reporting_scenario = 'employer_self_training'
    result = run(api._recording_report(ReadOnlySession(row), protocol))
    assert not result['fieldsComplete']
    assert 'central_employer:e' in [x['code'] for x in result['issues']]
    assert result['snapshot']['participants'][0]['workplace'] is None


@pytest.mark.parametrize('field,value,code', [
    ('existing_approved_at', datetime(2026, 1, 1), 'legacy_approval:e'),
    ('existing_submitted_at', datetime(2026, 1, 1), 'legacy_approval:e'),
    ('existing_approval_snapshot', {}, 'legacy_approval:e'),
    ('manual_protocol_number', 'other', 'legacy_number:e'),
    ('manual_check_date', date(2026, 1, 1), 'legacy_date:e'),
    ('manual_check_result', 'unsatisfactory', 'legacy_result:e'),
    ('reporting_scenario', None, 'scenario:e'),
])
def test_protected_conflicts_remain_blocking(monkeypatch, field, value, code):
    result = report(monkeypatch, **{field: value})
    assert not result['fieldsComplete']
    assert code in [x['code'] for x in result['issues']]


def test_readonly_http_report_omits_snapshot_and_performs_no_writes(monkeypatch):
    report(monkeypatch)
    protocol, row = sample()
    class Session(ReadOnlySession):
        async def scalar(self, query):
            if 'mintrud_knowledge_protocols' in str(query):
                return protocol
            return await super().scalar(query)
    result = run(api.get_protocol_recording_readiness('p', None, Session(row)))
    assert result['fieldsComplete']
    assert 'snapshot' not in result


def test_recorded_protocol_stays_blocked(monkeypatch):
    report(monkeypatch)
    protocol, row = sample()
    protocol.status = 'recorded'
    result = run(api._recording_report(ReadOnlySession(row), protocol))
    assert not result['fieldsComplete']
    assert 'status' in [x['code'] for x in result['issues']]
