"""Real API, RBAC and COMMIT checks against an explicitly marked disposable restore."""
import asyncio
from datetime import datetime, timedelta
from io import BytesIO
import json
import os
from types import SimpleNamespace
from uuid import UUID, uuid4

import httpx
import pytest
import pytest_asyncio
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy import func, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.base import utcnow
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.mintrud_learn_program import MintrudLearnProgram
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_applicability import RegistryApplicabilityEvent, RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User
from app.services.compliance_registry_approval import fingerprint_registry_approval_snapshot
from app.services.mintrud_historical_reapproval import APPLIED, AUTHORIZED, LOCAL_ZONE, ORIGINAL, REVIEWED
from app.services.mintrud_learn_programs import replace_course_mintrud_learn_programs


RUN = os.getenv("MINTRUD_REAPPROVAL_TEST_RUN")
pytestmark = pytest.mark.skipif(not RUN, reason="requires marked isolated PostgreSQL")
ROOT = "/api/v1/admin/mintrud"
AUTHORITY = {
    "reviewer": {"mintrud.read", "mintrud.write"},
    "approver": {"mintrud.read", "mintrud.approve", "mintrud.applicability.confirm", "mintrud.export"},
    "both": {"mintrud.read", "mintrud.write", "mintrud.approve", "mintrud.applicability.confirm"},
    "reader": {"mintrud.read"},
}


def document(name, *lines):
    data = BytesIO()
    pdf = Canvas(data, invariant=1)
    for index, line in enumerate(("SYNTHETIC TEST DOCUMENT", *lines)):
        pdf.drawString(48, 770 - 18 * index, line)
    pdf.save()
    return name + ".pdf", data.getvalue(), "application/pdf"


def documents(evidence):
    return {
        "protocol": document("protocol", evidence["protocol_reference"], evidence["protocol_number"],
                             evidence["knowledge_check_date"], evidence["knowledge_check_result"],
                             evidence.get("knowledge_check_at") or "Historical check", evidence["signed_on"]),
        "commission_order": document("order", evidence["commission_order_reference"], evidence["commission_order_date"]),
        "authority": document("authority", evidence["authority_reference"], "Test delegation"),
    }


@pytest_asyncio.fixture
async def stand(monkeypatch):
    assert engine.url.host == os.environ["REHEARSAL_HOST"] and engine.url.username == "rehearsal_restore"
    async with AsyncSession(engine) as session:
        identity = (await session.execute(text(
            "SELECT current_database(), current_user, current_setting('application_name'), host(inet_server_addr())"
        ))).one()
        assert tuple(identity) == ("obrportal", "rehearsal_restore", RUN, os.environ["REHEARSAL_DB_ADDRESS"])
    assert not settings.production_exports_enabled and not settings.local_mintrud_xml_export_enabled
    monkeypatch.setattr(settings, "document_org_name", "Synthetic training provider")
    monkeypatch.setattr(settings, "document_org_inn", "0274000000")
    async with AsyncSessionLocal.begin() as session:
        nonce = uuid4().hex
        actor_ids = {}
        for label, codes in AUTHORITY.items():
            actor = User(email=f"{nonce}-{label}@example.test", hashed_password="no login in test", is_active=True)
            role = Role(code="reapproval-" + label + "-" + nonce[:16], name="Synthetic " + label)
            session.add_all((actor, role))
            await session.flush()
            actor_ids[label] = actor.id
            session.add(UserRole(user_id=actor.id, role_id=role.id))
            for code in sorted(codes):
                permission = await session.scalar(select(Permission).where(Permission.code == code))
                if permission is None:
                    permission = Permission(code=code, name=code)
                    session.add(permission)
                    await session.flush()
                session.add(RolePermission(role_id=role.id, permission_id=permission.id))
        course = Course(slug="reapproval-" + nonce, title="Synthetic first aid", hours=14, document_type="certificate",
                        regulatory_program_type="occupational_safety_training", mintrud_requirement_mode="auto")
        session.add(course)
        await session.flush()
        program = await session.scalar(select(MintrudLearnProgram).where(
            MintrudLearnProgram.learn_program_id == 1, MintrudLearnProgram.schema_version == "1.0.9",
            MintrudLearnProgram.is_active.is_(True),
        ))
        assert program is not None
        await replace_course_mintrud_learn_programs(session, course_id=course.id, programs=(program,))
        learner = User(email=f"{nonce}-learner@example.test", hashed_password="no login in test", is_active=True)
        session.add(learner)
        await session.flush()
        base = "99" + str(UUID(learner.id).int)[-7:]
        remainder = sum(int(digit) * (9 - i) for i, digit in enumerate(base)) % 101
        session.add(LearnerProfile(user_id=learner.id, first_name="Тестовый", last_name="Обучающийся",
                                   snils=base + f"{0 if remainder == 100 else remainder:02}"))
        when = utcnow()
        enrollment = Enrollment(user_id=learner.id, course_id=course.id, status="completed",
                                completed_at=when - timedelta(days=25))
        session.add(enrollment)
        await session.flush()
        obligation = RegistryObligation(registry="mintrud", enrollment_id=enrollment.id, status="approved",
                                        approved_by_user_id=actor_ids["approver"], approved_at=when - timedelta(days=15))
        session.add(obligation)
        await session.flush()
        knowledge_date = (when - timedelta(days=20)).astimezone(LOCAL_ZONE).date()
        context = MintrudRegistryContext(
            obligation_id=obligation.id, reporting_scenario="external_training_provider",
            profession_or_position="Synthetic operator", employer_name="Synthetic employer", employer_inn="0274000000",
            protocol_number="SYNTHETIC-HISTORICAL", knowledge_check_date=knowledge_date,
            knowledge_check_result="satisfactory",
        )
        old_audit = AuditEvent(actor_user_id=actor_ids["approver"], action=ORIGINAL, entity_type="registry_obligation",
                               entity_id=obligation.id, payload={"synthetic_original": True})
        session.add_all((context, old_audit))
        await session.flush()
        evidence = dict(
            operation_id=str(uuid4()), mode="historical_protocol", protocol_reference="synthetic:historical-original",
            protocol_number=context.protocol_number, protocol_date=str(knowledge_date), signed_on=str(knowledge_date),
            knowledge_check_date=str(knowledge_date), knowledge_check_result="satisfactory",
            commission_order_date=str(knowledge_date - timedelta(days=2)), commission_order_reference="synthetic:order",
            authority_reference="synthetic:delegation", program_uuid=program.id, reporter_name=settings.document_org_name,
            reporter_inn=settings.document_org_inn, originals_and_participant_checked=True,
        )
        ids = (obligation.id, enrollment.id, old_audit.id, context.id)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield SimpleNamespace(client=client, actors=actor_ids, evidence=evidence,
                              obligation=ids[0], enrollment=ids[1], old_audit=ids[2], context=ids[3],
                              path=f"{ROOT}/obligations/{ids[0]}/historical-reapproval")
    await engine.dispose()


def headers(stand, role):
    return {"Authorization": "Bearer " + create_access_token(stand.actors[role])}


async def send(stand, step, role, *, plan=None, evidence=None, docs=None, status=200):
    evidence = evidence or stand.evidence
    payload = dict(step=step, expected_plan=plan, evidence=evidence)
    response = await stand.client.post(stand.path, headers=headers(stand, role),
                                       data={"payload": json.dumps(payload)}, files=docs or documents(evidence))
    assert response.status_code == status, (response.status_code, response.text)
    return response.json()


async def plan_and_review(stand, role="reviewer", evidence=None):
    plan = (await send(stand, "preview", role, evidence=evidence))["plan_fingerprint"]
    await send(stand, "review", role, plan=plan, evidence=evidence)
    return plan


async def verify(stand, result=None):
    async with AsyncSessionLocal() as session:
        obligation = await session.get(RegistryObligation, stand.obligation)
        original = await session.get(AuditEvent, stand.old_audit)
        assert original.payload == {"synthetic_original": True} and original.action == ORIGINAL
        audits = (await session.scalars(select(AuditEvent).where(AuditEvent.entity_id == stand.obligation))).all()
        events = (await session.scalars(select(RegistryApplicabilityEvent).where(
            RegistryApplicabilityEvent.enrollment_id == stand.enrollment,
        ))).all()
        decision = await session.scalar(select(RegistryApplicabilityRecord).where(
            RegistryApplicabilityRecord.enrollment_id == stand.enrollment,
        ))
        for model in (RegistrySubmissionAttempt, RegistrySubmissionBatchItem):
            assert not await session.scalar(select(func.count()).select_from(model).where(
                model.obligation_id == stand.obligation,
            ))
        if result is None:
            assert obligation.approval_event_id is None and obligation.approval_fingerprint is None
            assert not events and not decision and not any(audit.action == APPLIED for audit in audits)
            return
        assert UUID(obligation.approval_event_id).version == 4 and obligation.approval_event_id == result["approval_event_id"]
        assert obligation.approval_fingerprint == result["approval_fingerprint"] == fingerprint_registry_approval_snapshot(
            obligation.approval_snapshot_json
        )
        assert obligation.approved_by_user_id == stand.actors["approver"] and obligation.approved_at > original.created_at
        assert len(events) == 1 and events[0].input_fingerprint == decision.input_fingerprint == result["applicability_fingerprint"]
        assert events[0].decision == decision.decision == "required"
        (applied,) = [audit for audit in audits if audit.action == APPLIED]
        (review,) = [audit for audit in audits if audit.action == REVIEWED
                     and audit.payload["operation_id"] == result["operation_id"]]
        assert applied.payload["before"]["approval_audit_id"] == original.id
        assert applied.payload["review_audit_id"] == review.id and applied.payload["decision_id"] == decision.id
        assert applied.actor_user_id != review.actor_user_id
    response = await stand.client.get(f"{ROOT}/obligations/{stand.obligation}/export-readiness",
                                      headers=headers(stand, "approver"))
    assert response.status_code == 200 and response.json()["batch_eligible"] and not response.json()["issue_codes"]
    gate = await stand.client.get(f"{ROOT}/export-status", headers=headers(stand, "approver"))
    assert gate.status_code == 200 and gate.json()["enabled"] is False


@pytest.mark.asyncio
async def test_historical_two_person_review_idempotency_and_xml_readiness(stand):
    assert (await stand.client.post(stand.path)).status_code in (401, 422)
    await send(stand, "preview", "reader", status=403)
    await send(stand, "preview", "reviewer", evidence=stand.evidence | {"protocol_number": "synthetic-mismatch"}, status=409)
    first = await send(stand, "preview", "both")
    await verify(stand)
    plan = first["plan_fingerprint"]
    await send(stand, "apply", "approver", plan=plan, status=409)
    await send(stand, "review", "both", plan=plan)
    await send(stand, "apply", "both", plan=plan, status=403)
    await send(stand, "apply", "reviewer", plan=plan, status=403)
    changed = documents(stand.evidence) | {"authority": document("authority", "Different synthetic authority")}
    await send(stand, "apply", "approver", plan=plan, docs=changed, status=409)
    results = await asyncio.gather(*(send(stand, "apply", "approver", plan=plan) for _ in range(2)))
    assert results[0] == results[1]
    await send(stand, "apply", "approver", plan=plan, docs=changed, status=409)
    await verify(stand, results[0])


@pytest.mark.asyncio
async def test_new_check_after_documented_authorization(stand):
    new = stand.evidence | {"mode": "new_check", "protocol_number": "SYNTHETIC-NEW",
                            "protocol_reference": "synthetic:new-original"}
    await send(stand, "preview", "reviewer", evidence=new, status=409)
    authorization_payload = dict(operation_id=new["operation_id"], authorization_reference="synthetic:commission-instruction",
                                 signed_original_unavailable=True)
    response = await stand.client.post(stand.path + "/new-check-authorization", json=authorization_payload,
                                       headers=headers(stand, "reviewer"))
    assert response.status_code == 200
    authorized_at = datetime.fromisoformat(response.json()["authorized_at"])
    await asyncio.sleep(0.01)
    check_at = utcnow()
    today = str(check_at.astimezone(LOCAL_ZONE).date())
    new.update(protocol_date=today, signed_on=today, knowledge_check_date=today, knowledge_check_at=check_at.isoformat())
    await send(stand, "preview", "reviewer", evidence=new | {
        "knowledge_check_at": (authorized_at - timedelta(seconds=1)).isoformat(),
    }, status=409)
    plan = await plan_and_review(stand, evidence=new)
    result = await send(stand, "apply", "approver", plan=plan, evidence=new)
    await verify(stand, result)
    async with AsyncSessionLocal() as session:
        context = await session.get(MintrudRegistryContext, stand.context)
        assert context.protocol_number == new["protocol_number"] and str(context.knowledge_check_date) == today
        actions = (await session.scalars(select(AuditEvent.action).where(AuditEvent.entity_id == stand.obligation))).all()
        assert actions.count(AUTHORIZED) == 1


@pytest.mark.asyncio
async def test_rollback_on_database_error_and_receipt_after_unconfirmed_commit(stand, monkeypatch):
    plan = await plan_and_review(stand)
    async with engine.begin() as connection:
        await connection.execute(text("""
            CREATE OR REPLACE FUNCTION reapproval_test_abort() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.action = 'admin.mintrud_historical_reapproval_applied' THEN
                RAISE EXCEPTION 'Synthetic rollback' USING ERRCODE='23514';
              END IF;
              RETURN NEW;
            END $$;
        """))
        await connection.execute(text("""
            CREATE TRIGGER reapproval_test_abort BEFORE INSERT ON audit_events
            FOR EACH ROW EXECUTE FUNCTION reapproval_test_abort()
        """))
    try:
        await send(stand, "apply", "approver", plan=plan, status=409)
    finally:
        async with engine.begin() as connection:
            await connection.execute(text("DROP TRIGGER reapproval_test_abort ON audit_events"))
            await connection.execute(text("DROP FUNCTION reapproval_test_abort()"))
    await verify(stand)
    original = AsyncSession.commit

    async def lost_ack(session):
        await original(session)
        raise OperationalError(None, None, RuntimeError("synthetic lost commit response"))

    with monkeypatch.context() as patch:
        patch.setattr(AsyncSession, "commit", lost_ack)
        error = await send(stand, "apply", "approver", plan=plan, status=503)
        assert error["detail"]["next_action"] == "read_receipt"
    response = await stand.client.get(stand.path + "/" + stand.evidence["operation_id"], headers=headers(stand, "approver"))
    assert response.status_code == 200 and response.json()["state"] == "applied"
    await verify(stand, response.json())


@pytest.mark.asyncio
async def test_protected_history_and_different_operations(stand):
    plan = await plan_and_review(stand)
    different = stand.evidence | {"operation_id": str(uuid4())}
    other_plan = await plan_and_review(stand, evidence=different)
    results = await asyncio.gather(*(
        stand.client.post(stand.path, headers=headers(stand, "approver"), files=documents(evidence), data={
            "payload": json.dumps(dict(step="apply", expected_plan=token, evidence=evidence)),
        })
        for token, evidence in ((plan, stand.evidence), (other_plan, different))
    ))
    assert sorted(result.status_code for result in results) == [200, 409]
    await verify(stand, next(result.json() for result in results if result.status_code == 200))


@pytest.mark.asyncio
async def test_export_history_prevents_reapproval(stand):
    # Even audit-only evidence of past preparation must stop the workflow.
    async with AsyncSessionLocal.begin() as session:
        session.add(AuditEvent(action="admin.mintrud_registry_export_prepared", entity_type="registry_obligation",
                               entity_id=stand.obligation, payload={"synthetic": True}))
    result = await send(stand, "preview", "reviewer", status=409)
    assert result["detail"]["code"].endswith("export_history_present")
    await verify(stand)


@pytest.mark.asyncio
async def test_unconfirmed_commit_without_persisted_receipt(stand, monkeypatch):
    plan = await plan_and_review(stand)

    async def disconnected(_session):
        raise OperationalError(None, None, RuntimeError("synthetic disconnect before commit"))

    with monkeypatch.context() as patch:
        patch.setattr(AsyncSession, "commit", disconnected)
        response = await send(stand, "apply", "approver", plan=plan, status=503)
        assert response["detail"]["next_action"] == "read_receipt"
    response = await stand.client.get(stand.path + "/" + stand.evidence["operation_id"], headers=headers(stand, "approver"))
    assert response.status_code == 200 and response.json()["state"] == "reviewed"
    await verify(stand)


@pytest.mark.asyncio
async def test_reporter_change_and_revoked_reviewer_stop_application(stand, monkeypatch):
    plan = await plan_and_review(stand)
    with monkeypatch.context() as patch:
        patch.setattr(settings, "document_org_inn", "0123456789")
        failure = await send(stand, "apply", "approver", plan=plan, status=409)
        assert failure["detail"]["code"].endswith("reporting_organization_changed")
    async with AsyncSessionLocal.begin() as session:
        reviewer = await session.get(User, stand.actors["reviewer"])
        reviewer.is_active = False
    failure = await send(stand, "apply", "approver", plan=plan, status=409)
    assert failure["detail"]["code"].endswith("reviewer_no_longer_authorized")
    await verify(stand)
