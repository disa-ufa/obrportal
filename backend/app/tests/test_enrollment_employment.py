import asyncio
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1.account import normalize_account_learner_profile_update_data
from app.core.security import create_access_token
from app.db.session import get_db
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.base import utcnow
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.enrollment_employment_details import EnrollmentEmploymentDetails
from app.models.learner_profile import LearnerProfile
from app.models.registry_obligation import RegistryObligation
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User
from app.services import registry_document_transaction
from app.services.enrollment_employment import is_valid_russian_inn
from app.services.registry_session_coordination import RegistryCoordinatedSession
from test_registry_applicability_writer_pg import pg_applicability_db


@pytest.mark.parametrize("value,valid", [
    ("1234567894", True), ("123456789047", True), ("1234567890", False),
    ("123456789048", False), ("123456789057", False), ("0000000000", False),
    ("123-4567894", False), ("12345", False),
])
def test_russian_inn(value, valid):
    assert is_valid_russian_inn(value) is valid


def test_middle_name_and_citizenship_validation():
    normalize = normalize_account_learner_profile_update_data
    assert normalize({"no_middle_name": True, "citizenship_country_code": "643"}) == {
        "no_middle_name": True, "middle_name": None, "citizenship_country_code": "643",
    }
    assert normalize({"middle_name": " Actual "}) == {"middle_name": "Actual", "no_middle_name": None}
    with pytest.raises(HTTPException) as conflict:
        normalize({"no_middle_name": True, "middle_name": "Actual"})
    assert conflict.value.status_code == 422
    with pytest.raises(HTTPException) as unknown:
        normalize({"citizenship_country_code": "999"})
    assert unknown.value.status_code == 422
    profile = LearnerProfile(no_middle_name=True)
    profile.middle_name = "Actual"
    assert profile.no_middle_name is None


@pytest_asyncio.fixture
async def stand(pg_applicability_db, monkeypatch):
    engine = create_async_engine(pg_applicability_db)
    maker = async_sessionmaker(engine, expire_on_commit=False, sync_session_class=RegistryCoordinatedSession)
    run = uuid4().hex
    async with maker.begin() as session:
        owner, admin = [User(email=f"m2-{run}-{label}@example.invalid", hashed_password="test-only", is_active=True)
                        for label in ("owner", "admin")]
        role = Role(code="m2-" + run, name="Synthetic administrator")
        courses = [Course(slug=f"m2-{run}-{i}", title=f"Synthetic {i}",
                          regulatory_program_type="occupational_safety_training",
                          frdo_requirement_mode="not_required") for i in range(4)]
        session.add_all([owner, admin, role, *courses])
        await session.flush()
        permission = await session.scalar(select(Permission).where(Permission.code == "mintrud.write"))
        if permission is None:
            permission = Permission(code="mintrud.write", name="Synthetic permission")
            session.add(permission)
            await session.flush()
        session.add_all([RolePermission(role_id=role.id, permission_id=permission.id),
                         UserRole(user_id=admin.id, role_id=role.id)])
        enrollments = [Enrollment(user_id=owner.id, course_id=course.id, status="active") for course in courses]
        archived = enrollments[2]
        archived.status = "completed"
        archived.completed_at = utcnow()
        session.add_all(enrollments)
        await session.flush()
        document = DocumentRecord(user_id=owner.id, course_id=archived.course_id, enrollment_id=archived.id,
                                  document_number="SYNTH-" + run, document_type="certificate",
                                  title="Archived synthetic certificate", storage_path="fixture/old.pdf")
        protected = RegistryObligation(enrollment_id=enrollments[3].id, registry="frdo", status="approved")
        session.add_all([document, protected])
        await session.flush()
        enrollment_ids, document_id = [row.id for row in enrollments], document.id
        tokens = {label: {"Authorization": "Bearer " + create_access_token(user.id)}
                  for label, user in (("owner", owner), ("admin", admin))}

    async def test_db():
        async with maker() as session:
            yield session

    monkeypatch.setitem(app.dependency_overrides, get_db, test_db)
    monkeypatch.setattr(registry_document_transaction, "AsyncSessionLocal", maker)
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield SimpleNamespace(client=client, maker=maker, ids=enrollment_ids, document=document_id, tokens=tokens)
    finally:
        await engine.dispose()


def path(enrollment, action="employment"):
    return f"/api/v1/account/courses/{enrollment}/{action}"


def scenario_path(enrollment):
    return f"/api/v1/admin/enrollments/{enrollment}/employment-reporting-scenario"


@pytest.mark.asyncio
async def test_partial_updates_idempotency_and_enrollment_isolation(stand):
    client, first, second = stand.client, *stand.ids[:2]
    owner, admin = stand.tokens["owner"], stand.tokens["admin"]
    assert (await client.get(path(first), headers=admin)).status_code == 404
    assert (await client.patch(path(first), headers=admin, json={"employer_name": "Other"})).status_code == 404
    assert (await client.patch(scenario_path(first), headers=owner,
                               json={"reporting_scenario": "employer_self_training"})).status_code == 403
    assert (await client.patch(path(first), headers=owner,
                               json={"reporting_scenario": "employer_self_training"})).status_code == 422

    draft = {"profession_or_position": "  Test   operator "}
    responses = await asyncio.gather(*(client.patch(path(first), headers=owner, json=draft) for _ in range(2)))
    assert all(response.status_code == 200 for response in responses)
    saved = responses[0].json()
    assert saved["profession_or_position"] == "Test operator" and saved["employer_name"] is None
    assert saved["source"] == "learner" and saved["reporting_scenario"] is None
    bad = await client.patch(path(first), headers=owner, json={"employer_inn": "1234567890"})
    assert bad.status_code == 422 and "1234567890" not in bad.text
    for enrollment, name, inn in ((first, "Employer One", "1234567894"), (second, "Employer Two", "123456789047")):
        result = await client.patch(path(enrollment), headers=owner, json={"employer_name": name, "employer_inn": inn})
        assert result.status_code == 200
        assert result.json()["employer_name"] == name
    assert (await client.get(path(first), headers=owner)).json()["employer_name"] == "Employer One"
    async with stand.maker() as session:
        assert await session.scalar(select(func.count()).select_from(EnrollmentEmploymentDetails).where(
            EnrollmentEmploymentDetails.enrollment_id == first)) == 1
        audit = (await session.scalars(select(AuditEvent).where(AuditEvent.entity_id == first))).all()
        assert {tuple(item.payload["changed_fields"]) for item in audit} == {
            ("profession_or_position",), ("employer_inn", "employer_name"),
        }
        assert len(audit) == 2


@pytest.mark.asyncio
async def test_profile_and_readiness_after_administrative_scenario(stand):
    client, enrollment = stand.client, stand.ids[0]
    owner, admin = stand.tokens["owner"], stand.tokens["admin"]
    codes = await client.get("/api/v1/account/profile/citizenship-options", headers=owner)
    assert codes.status_code == 200 and {"643", "398", "004"} <= set(codes.json())
    profile = await client.patch("/api/v1/account/profile", headers=owner, json={
        "last_name": "Synthetic", "first_name": "Learner", "no_middle_name": True,
        "birth_date": "1990-01-01", "sex": "female", "citizenship_country_code": "398",
        "snils": "001-001-998 00",
    })
    assert profile.status_code == 200, profile.text
    assert {key: profile.json()[key] for key in ("sex","citizenship_country_code","middle_name","no_middle_name")} == {
        "sex": "female", "citizenship_country_code": "398", "middle_name": None, "no_middle_name": True,
    }
    readiness = path(enrollment, "completion-readiness")
    before = (await client.get(readiness, headers=owner)).json()
    assert before["policy_unresolved"]
    assert not any(item["field"] == "employer.employer_inn" for item in before["missing_fields"])
    assert (await client.patch(path(enrollment), headers=owner, json={"profession_or_position": "Test operator"})).status_code == 200
    position_saved = (await client.get(readiness, headers=owner)).json()
    assert position_saved["policy_unresolved"] and not position_saved["is_ready"]

    for scenario, status in (("employer_self_training", "ready"), ("external_training_provider", "incomplete")):
        configured = await client.patch(scenario_path(enrollment), headers=admin, json={"reporting_scenario": scenario})
        assert configured.status_code == 200, configured.text
        assert (await client.get(readiness, headers=owner)).json()["status"] == status
    filled = await client.patch(path(enrollment), headers=owner,
                                json={"employer_name": "Synthetic employer", "employer_inn": "1234567894"})
    assert filled.status_code == 200
    after = (await client.get(readiness, headers=owner)).json()
    assert after["is_ready"] and after["status"] == "ready"
    assert "Synthetic employer" not in str(after)


@pytest.mark.asyncio
async def test_protected_records_and_training_state_are_preserved(stand):
    client, owner = stand.client, stand.tokens["owner"]
    active, _, archived, approved = stand.ids

    async def snapshot():
        async with stand.maker() as session:
            return (
                (await session.execute(text("SELECT row_to_json(d)::text FROM document_records d WHERE id=:id"),
                                       {"id": stand.document})).scalar_one(),
                tuple((await session.execute(select(Enrollment.status, Enrollment.started_at, Enrollment.completed_at)
                     .where(Enrollment.id.in_(stand.ids)).order_by(Enrollment.id))).all()),
                await session.scalar(select(func.count()).select_from(RegistryObligation).where(
                    RegistryObligation.enrollment_id.in_(stand.ids))),
                await session.scalar(select(func.count()).select_from(DocumentRecord).where(
                    DocumentRecord.enrollment_id.in_(stand.ids))),
            )

    before = await snapshot()
    for enrollment in (archived, approved):
        assert not (await client.get(path(enrollment), headers=owner)).json()["can_edit"]
        response = await client.patch(path(enrollment), headers=owner, json={"profession_or_position": "New"})
        assert response.status_code == 409
    assert (await client.patch(path(active), headers=owner, json={"profession_or_position": "Test"})).status_code == 200
    assert (await client.get(path(archived, "completion-readiness"), headers=owner)).json()["status"] == "already_completed"
    assert await snapshot() == before
