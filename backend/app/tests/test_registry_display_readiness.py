"""Synthetic checks: registry readiness and the draft synchronization boundary."""
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import HTTPException
from app.tests.test_compliance_registry_readiness import (
    completed_enrollment, course, learner, profile, mintrud_context, mintrud_program,
)
from app.services.compliance_registry_readiness import evaluate_registry_readiness
from app.services.mintrud_protocol_sync import apply_mintrud_protocol_sync


def mintrud(**overrides):
    values = dict(registry="mintrud", enrollment=completed_enrollment(), course=course(),
                  learner=learner(), learner_profile=profile(snils="112-233-445 95"),
                  mintrud_context=mintrud_context(), mintrud_learn_programs=(mintrud_program(),),
                  mintrud_reporting_organization=SimpleNamespace(name="Synthetic Org", inn="0274000000"))
    values.update(overrides)
    return evaluate_registry_readiness(**values)


def test_missing_sex_does_not_block_mintrud_xml():
    result = mintrud(learner_profile=profile(sex=None, snils="112-233-445 95"))
    assert result.is_ready
    assert not any("sex" in code for code in result.error_codes)


def test_unsynchronized_fields_remain_missing():
    result = mintrud(mintrud_context=mintrud_context(
        protocol_number=None, knowledge_check_date=None, knowledge_check_result=None))
    assert not result.is_ready
    assert "mintrud.protocol_number_missing" in result.error_codes
    assert "mintrud.knowledge_check_date_missing" in result.error_codes
    assert "mintrud.knowledge_check_result_missing" in result.error_codes


@pytest.mark.asyncio
async def test_draft_sync_rejected_before_any_writes():
    session = SimpleNamespace(scalar=AsyncMock(return_value=SimpleNamespace(status="draft")))
    with pytest.raises(HTTPException) as error:
        await apply_mintrud_protocol_sync(session, protocol_id="synthetic-protocol",
            actor_user_id="synthetic-actor", request_id=UUID(int=1), expected_plan_token="synthetic-plan",
            obligation_ids=["synthetic-obligation"], request_ip=None, user_agent=None)
    assert error.value.status_code == 409
    assert session.scalar.await_count == 1
