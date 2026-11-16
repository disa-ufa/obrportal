from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.sql import Select

from app.api.v1 import account
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.user import User
from app.services.enrollment_completion_readiness import (
    EnrollmentEmployerData,
    evaluate_enrollment_completion_readiness,
)
from test_m21_enrollment_source_fence_pg import make_enrollment
from test_registry_applicability_writer_pg import pg_applicability_db


@pytest.fixture
def records():
    user = User(id="owner", full_name="Display Name That Is Not A Profile")
    course = Course(id="course", regulatory_program_type="vocational_training",
                    frdo_requirement_mode="auto", mintrud_requirement_mode="auto")
    enrollment = Enrollment(id="enrollment", user_id=user.id, course_id=course.id, status="in_progress")
    profile = LearnerProfile(user_id=user.id, last_name="Synthetic", first_name="Learner",
                             birth_date=date(1990, 1, 1), sex="female", citizenship_country_code="643",
                             snils="001-001-998 00")
    return enrollment, course, user, profile


def issue_fields(issues):
    return {issue.field for issue in issues}


def test_unit_complete_profile_and_no_future_artifacts(records):
    result = evaluate_enrollment_completion_readiness(*records)
    assert result.is_ready and result.status == "ready"
    assert not result.missing_fields and not result.invalid_fields
    assert not result.requires_administrator_action and not result.policy_unresolved


def test_unit_absent_profile_ignores_user_full_name(records):
    result = evaluate_enrollment_completion_readiness(*records[:3], None)
    assert not result.is_ready
    assert {"learner_profile.last_name", "learner_profile.first_name"} <= issue_fields(result.missing_fields)
    assert records[2].full_name not in result.model_dump_json()


@pytest.mark.parametrize("field", ["first_name", "last_name", "snils"])
def test_unit_required_profile_field(records, field):
    setattr(records[3], field, "  ")
    result = evaluate_enrollment_completion_readiness(*records)
    assert issue_fields(result.missing_fields) == {f"learner_profile.{field}"}
    assert not result.is_ready


@pytest.mark.parametrize("value", ["112-233-445 00", "letters only", "A001-001-998 00"])
def test_unit_invalid_snils_is_not_returned(records, value):
    records[3].snils = value
    result = evaluate_enrollment_completion_readiness(*records)
    assert issue_fields(result.invalid_fields) == {"learner_profile.snils"}
    assert value not in result.model_dump_json()


def test_unit_optional_supplied_data_is_validated(records):
    profile = records[3]
    profile.birth_date = date.today() + timedelta(days=1)
    profile.phone = "invalid-contact"
    profile.email = "invalid-email"
    profile.sex = "unknown"
    profile.citizenship_country_code = "invalid-code"
    assert issue_fields(evaluate_enrollment_completion_readiness(*records).invalid_fields) == {
        f"learner_profile.{field}" for field in ("birth_date", "phone", "email", "sex", "citizenship_country_code")
    }


def test_unit_mintrud_not_required_no_employer_or_snils(records):
    records[1].mintrud_requirement_mode = "not_required"
    records[1].frdo_requirement_mode = "not_required"
    records[3].snils = None
    assert evaluate_enrollment_completion_readiness(*records).is_ready


def test_unit_occupational_safety_uses_employer_contract(records):
    enrollment, course, _, profile = records
    course.regulatory_program_type = "occupational_safety_training"
    course.frdo_requirement_mode = "not_required"
    profile.birth_date = profile.sex = profile.citizenship_country_code = None
    result = evaluate_enrollment_completion_readiness(*records)
    assert not result.is_ready and result.requires_administrator_action
    assert [item.code for item in result.missing_fields] == ["completion.employer.source_unavailable"]
    employer = EnrollmentEmployerData(enrollment.id, "Synthetic role", "Synthetic employer", "1234567890")
    assert evaluate_enrollment_completion_readiness(*records, employer=employer).is_ready
    assert not evaluate_enrollment_completion_readiness(
        *records, employer=EnrollmentEmployerData("other-enrollment", "Role", "Employer", "1234567890")
    ).is_ready
    incomplete = evaluate_enrollment_completion_readiness(*records, employer=EnrollmentEmployerData(enrollment.id))
    assert issue_fields(incomplete.missing_fields) == {
        "employer.profession_or_position", "employer.employer_name", "employer.employer_inn",
    }


def test_unit_unresolved_applicability_is_not_ready(records):
    records[1].regulatory_program_type = "unspecified"
    result = evaluate_enrollment_completion_readiness(*records)
    assert result.status == "policy_unresolved" and result.policy_unresolved
    assert not result.is_ready and result.requires_administrator_action
    assert issue_fields(result.missing_fields) == {"course.frdo_requirement_mode", "course.mintrud_requirement_mode"}


def test_unit_historical_completion_skips_new_requirements(records):
    records[0].status = "completed"
    records[1].regulatory_program_type = "unspecified"
    result = evaluate_enrollment_completion_readiness(*records[:3], None)
    assert result.status == "already_completed" and not result.is_ready
    assert not result.policy_unresolved and not result.missing_fields and not result.invalid_fields


@pytest.fixture
def api_client(records):
    enrollment, course, owner, profile = records
    user = owner
    session = SimpleNamespace(execute=AsyncMock())

    async def execute(statement):
        assert isinstance(statement, Select)
        params = statement.compile().params
        assert set(params.values()) == {enrollment.id, user.id}
        assert "enrollments.user_id =" in str(statement.whereclause)
        return SimpleNamespace(one_or_none=lambda: (enrollment, course, profile) if user is owner else None)

    session.execute.side_effect = execute
    application = FastAPI()
    application.include_router(account.router, prefix="/api/v1")

    def authenticate():
        if user is None:
            raise HTTPException(401, "Not authenticated")
        return user

    def set_user(value):
        nonlocal user
        user = value

    application.dependency_overrides[account.get_current_user] = authenticate
    application.dependency_overrides[account.get_db] = lambda: session
    with TestClient(application) as client:
        yield client, set_user, session, f"/api/v1/account/courses/{enrollment.id}/completion-readiness"


def test_api_owner_only_and_authentication(api_client):
    client, set_user, _, path = api_client
    assert client.get(path).status_code == 200
    set_user(User(id="another-user"))
    assert client.get(path).status_code == 404
    set_user(None)
    assert client.get(path).status_code == 401


def test_api_only_select_and_no_mutation_or_personal_values(api_client, records):
    client, _, session, path = api_client
    records[3].first_name = None
    response = client.get(path)
    assert response.status_code == 200
    assert response.json() == {
        "is_ready": False, "status": "incomplete",
        "missing_fields": [{
            "code": "completion.learner_profile.first_name.missing", "field": "learner_profile.first_name",
            "message": "Укажите имя.", "resolvable_by": "learner",
        }],
        "invalid_fields": [], "requires_administrator_action": False, "policy_unresolved": False,
    }
    assert records[3].last_name not in response.text
    assert records[0].status == "in_progress" and records[0].completed_at is None
    assert records[3].first_name is None
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_api_against_postgresql_read_only_transaction(pg_applicability_db):
    engine = create_async_engine(pg_applicability_db)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    try:
        _, actor_id, enrollment_id = await make_enrollment(maker)
        async with maker() as session:
            enrollment = await session.get(Enrollment, enrollment_id)
            learner = await session.get(User, enrollment.user_id)
            another_user = await session.get(User, actor_id)

        application = FastAPI()
        application.include_router(account.router, prefix="/api/v1")
        user = learner
        application.dependency_overrides[account.get_current_user] = lambda: user

        async def readonly_session():
            async with maker() as session:
                await session.execute(text("SET TRANSACTION READ ONLY"))
                yield session

        application.dependency_overrides[account.get_db] = readonly_session
        path = f"/api/v1/account/courses/{enrollment_id}/completion-readiness"
        async with AsyncClient(transport=ASGITransport(app=application), base_url="http://test") as client:
            response = await client.get(path)
            assert response.status_code == 200
            assert response.json()["is_ready"] is False
            user = another_user
            assert (await client.get(path)).status_code == 404
    finally:
        await engine.dispose()
