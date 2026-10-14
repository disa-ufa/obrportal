from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.registry_applicability_db_inputs import (
    load_current_registry_applicability_inputs,
)


class Result:
    def __init__(self, one=None, all_rows=None):
        self.one = one
        self.all_rows = all_rows or []

    def one_or_none(self):
        return self.one

    def scalar_one_or_none(self):
        return self.one

    def all(self):
        return self.all_rows


def course(**changes):
    data = dict(
        id="course-1",
        regulatory_program_type="occupational_safety_training",
        frdo_requirement_mode="auto",
        mintrud_requirement_mode="auto",
        document_type="certificate",
    )
    data.update(changes)
    return SimpleNamespace(**data)


def enrollment():
    return SimpleNamespace(
        id="enrollment-1",
        course_id="course-1",
        organization_id="org-1",
        completed_at=datetime(2026, 10, 13, tzinfo=timezone.utc),
    )


def obligation(registry):
    return SimpleNamespace(
        id="obligation-1",
        registry=registry,
        enrollment_id="enrollment-1",
        document_id="document-1",
    )


def document(**changes):
    data = dict(
        id="document-1",
        course_id="course-1",
        enrollment_id="enrollment-1",
        document_type="certificate",
        issued_at=None,
    )
    data.update(changes)
    return SimpleNamespace(**data)


def db(*responses):
    session = MagicMock()
    session.execute = AsyncMock(side_effect=responses)
    return session


@pytest.mark.asyncio
async def test_mintrud_reads_course_document_context_and_catalog():
    session = db(
        Result(one=(enrollment(), course())),
        Result(one=document()),
        Result(one=SimpleNamespace(reporting_scenario="external_training_provider", employer_name="Тестовый работодатель", employer_inn="0276000001")),
        Result(all_rows=[("1.0.9", "ИД34")]),
    )
    result = await load_current_registry_applicability_inputs(
        session=session,
        obligation=obligation("mintrud"),
    )
    assert result.evaluation.status == "required"
    assert result.inputs.organization_id == "org-1"
    assert result.inputs.reporting_scenario == "external_training_provider"
    assert result.inputs.employer_name == "Тестовый работодатель"
    assert result.inputs.employer_inn == "0276000001"
    assert result.inputs.mintrud_program_codes == ("1.0.9:ИД34",)
    assert result.inputs.effective_date.isoformat() == "2026-10-13"
    assert len(result.fingerprint) == 64
    assert session.execute.await_count == 4


@pytest.mark.asyncio
async def test_frdo_does_not_guess_requirement_or_query_mintrud_context():
    session = db(
        Result(one=(enrollment(), course())),
        Result(one=document()),
    )
    result = await load_current_registry_applicability_inputs(
        session=session,
        obligation=obligation("frdo"),
    )
    assert result.evaluation.status == "needs_review"
    assert not result.evaluation.allows_submission
    assert result.inputs.reporting_scenario is None
    assert result.inputs.mintrud_program_codes == ()
    assert session.execute.await_count == 2


@pytest.mark.asyncio
async def test_changed_course_classification_changes_fingerprint():
    a = db(Result(one=(enrollment(), course())), Result(one=document()))
    b = db(
        Result(one=(enrollment(), course(regulatory_program_type="dpo_advanced_training"))),
        Result(one=document()),
    )
    first = await load_current_registry_applicability_inputs(
        session=a, obligation=obligation("frdo")
    )
    second = await load_current_registry_applicability_inputs(
        session=b, obligation=obligation("frdo")
    )
    assert first.fingerprint != second.fingerprint
    assert second.evaluation.status == "required"


@pytest.mark.asyncio
async def test_document_binding_mismatch_fails_closed():
    session = db(
        Result(one=(enrollment(), course())),
        Result(one=document(id="different-document")),
    )
    with pytest.raises(ValueError, match="does not match"):
        await load_current_registry_applicability_inputs(
            session=session,
            obligation=obligation("frdo"),
        )
