"""Live HTTP and transaction regression on an explicitly marked disposable PostgreSQL."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import date
import os
from pathlib import Path
import secrets
import subprocess
import sys
from threading import Barrier
import time

import httpx
import pytest
from sqlalchemy import select, text

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.seed import seed
from app.db.session import AsyncSessionLocal, engine
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation
from app.models.role import Role, UserRole
from app.models.user import User
from app.services.registry_applicability_confirmation import inspect_automatic_applicability
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_applicability_export_guard import RegistryApplicabilityGateError
from app.services.registry_batch_p0_policy import BatchApplicabilityInput, require_current_registry_batch_applicability


REGISTRIES = ("mintrud", "frdo")
RUN = os.environ.get("M139B01_TEST_RUN")
pytestmark = pytest.mark.skipif(not RUN, reason="requires the new isolated M139B01 PostgreSQL stand")


def db(query, parameters=None, *, ddl=False):
    async def execute():
        try:
            async with engine.begin() as connection:
                if not ddl:
                    await connection.execute(text("SET TRANSACTION READ ONLY"))
                result = await connection.execute(text(query), parameters or {})
                return result.mappings().all() if result.returns_rows else None
        finally:
            await engine.dispose()
    return asyncio.run(execute())


class Stand:
    def __init__(self):
        self.client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30, trust_env=False)
        self.log = Path("/evidence/b01-uvicorn.log").open("w")
        self.process = None

    def start(self):
        self.process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--no-access-log"],
            stdout=self.log, stderr=subprocess.STDOUT,
        )
        for _ in range(60):
            assert self.process.poll() is None
            try:
                if self.client.get("/health").status_code == 200:
                    return
            except httpx.ConnectError:
                pass
            time.sleep(.25)
        pytest.fail("isolated backend did not become healthy")

    def stop(self):
        if self.process is not None:
            self.process.terminate()
            self.process.wait(timeout=20)
            self.process = None

    def request(self, method, path, token=None, *, want=200, form=None, **kwargs):
        response = self.client.request(method, "/api/v1" + path, data=form,
            headers={"Authorization": f"Bearer {token}"} if token else {}, **kwargs)
        assert response.status_code == want, (method, path, response.status_code)
        return response.json()

    def user(self, label, role):
        email, password = f"b01-{label}@example.test", "Synthetic!" + secrets.token_hex(12)
        user = self.request("POST", "/admin/users", self.admin, want=201, json={
            "email": email, "password": password, "full_name": "Synthetic " + label,
            "is_active": True, "is_email_verified": True,
        })
        self.request("POST", f"/admin/users/{user['id']}/roles", self.admin,
                     json={"role_id": self.roles[role], "organization_id": None})
        token = self.request("POST", "/auth/login", json={"email": email, "password": password})["access_token"]
        return user["id"], token

    def provision(self, label, program):
        payload = dict(slug="b01-" + label, title="Synthetic " + label, hours=24, format="online", is_active=True, is_public=True,
            regulatory_program_type={"mintrud": "occupational_safety_training", "frdo": "vocational_training", "review": "unspecified"}[program],
            document_type="Свидетельство о профессии рабочего, должности служащего" if program == "frdo" else "certificate",
            mintrud_requirement_mode="auto" if program != "frdo" else "not_required",
            frdo_requirement_mode="auto" if program != "mintrud" else "not_required")
        course = self.request("POST", "/admin/courses", self.admin, json=payload, want=201)["id"]
        if program == "mintrud":
            catalog = self.request("GET", "/admin/mintrud/learn-programs", self.admin)
            selected = next(item for item in catalog if item["is_active"])
            self.request("PUT", f"/admin/courses/{course}/mintrud-programs", self.admin,
                         json={"mintrud_learn_program_ids": [selected["id"]]})
        module = self.request("POST", f"/admin/courses/{course}/modules", self.admin, want=201,
                              json=dict(title="Synthetic module", position=1, is_active=True))["id"]
        lesson = self.request("POST", f"/admin/course-modules/{module}/lessons", self.admin, want=201,
            json=dict(title="Synthetic lesson", position=1, content_type="text", content_text="Synthetic material",
                      is_required=True, is_active=True))["id"]
        self.request("POST", f"/admin/course-lessons/{lesson}/publish", self.admin)
        user, token = self.user(label, "learner_fl")
        enrollment = self.request("POST", "/admin/enrollments", self.admin, want=201,
            json=dict(user_id=user, course_id=course, status="assigned"))["id"]
        self.request("POST", f"/account/courses/{enrollment}/start", token)
        self.request("POST", f"/account/courses/{enrollment}/lessons/{lesson}/complete", token)
        detail = self.request("GET", f"/account/courses/{enrollment}", token)
        assert detail["status"] == "completed" and detail["required_lessons_completed"] == 1
        obligations = {}
        for registry in REGISTRIES:
            rows = self.request("GET", f"/admin/{registry}/obligations?course_id={course}", self.operators[registry])
            (row,) = [item for item in rows if item["enrollment_id"] == enrollment]
            obligations[registry] = row
        return {"course": course, "user": user, "enrollment": enrollment, "obligations": obligations}

    def fill(self, target, registry, snils_index):
        base = f"9900001{snils_index:02}"
        checksum = sum(int(n) * (9 - i) for i, n in enumerate(base)) % 101
        self.request("PATCH", f"/admin/users/{target['user']}/learner-profile", self.admin, json=dict(
            last_name="Тестовый", first_name="Обучающийся", middle_name="Синтетический", birth_date="1990-01-02",
            sex="male", citizenship_country_code="643", snils=base + f"{0 if checksum == 100 else checksum:02}"))
        if registry == "mintrud":
            context = dict(reporting_scenario="external_training_provider", profession_or_position="Synthetic operator",
                employer_name="Synthetic employer", employer_inn="0274000000", knowledge_check_result="satisfactory",
                knowledge_check_date=str(date.today()), protocol_number=f"B01-SYNTHETIC-{snils_index}")
        else:
            doc = target["obligations"][registry]["document_id"]
            self.request("PATCH", f"/admin/documents/{doc}", self.admin, form=dict(
                document_series="B01", issued_at=str(date.today()), registration_number=f"B01-{snils_index}", status="available"))
            context = dict(document_status="Оригинал", loss_confirmation="Нет", exchange_confirmation="Нет",
                destruction_confirmation="Нет", study_form="Очная", funding_source="Платное обучение",
                education_delivery_form="в образовательной организации",
                po_document_type="Свидетельство о профессии рабочего, должности служащего",
                po_program_type="Программа профессиональной подготовки по профессии рабочего, должности служащего",
                po_profession="Водитель автомобиля")
        self.request("PATCH", self.target(registry, target) + "/context", self.operators[registry], json=context)

    def target(self, registry, course):
        return f"/admin/{registry}/obligations/{course['obligations'][registry]['id']}"

    def inspect(self, registry, course):
        return self.request("GET", self.target(registry, course) + "/applicability", self.operators[registry])

    def confirm(self, registry, course, preview, *, want=200, changes=None):
        return self.request("POST", self.target(registry, course) + "/applicability/confirm-auto", self.operators[registry],
                            want=want, json=expectation(preview) | (changes or {}))


def expectation(preview):
    return dict(expected_version=preview["decision_version"], expected_rule_version=preview["rule_version"],
                expected_input_fingerprint=preview["input_fingerprint"])


@pytest.fixture(scope="module")
def stand():
    assert not settings.production_exports_enabled and not settings.local_mintrud_xml_export_enabled
    assert settings.local_mintrud_db_marker is None
    assert set(os.listdir("/sys/class/net")) == {"lo"}
    assert engine.url.host == "127.0.0.1" and engine.url.database == "regression_test"
    (identity,) = db("""SELECT current_database() AS db, host(inet_server_addr()) AS host,
        current_setting('server_version_num') AS version, shobj_description(oid,'pg_database') AS marker
        FROM pg_database WHERE datname=current_database()""")
    assert dict(identity) == dict(db="regression_test", host="127.0.0.1", version="160013",
                                  marker="OBRPORTAL_M139B01_SYNTHETIC_ONLY_" + RUN)
    password = os.environ["TEST_ADMIN_PASSWORD"]
    email = os.environ["TEST_ADMIN_EMAIL"]

    async def bootstrap():
        await seed()
        async with AsyncSessionLocal.begin() as session:
            role = await session.scalar(select(Role).where(Role.code == "admin"))
            user = User(email=email, full_name="Synthetic administrator", hashed_password=get_password_hash(password),
                        is_active=True, is_email_verified=True, mfa_enabled=False)
            session.add(user)
            await session.flush()
            session.add(UserRole(user_id=user.id, role_id=role.id))
        await engine.dispose()

    asyncio.run(bootstrap())
    instance = Stand()
    try:
        instance.start()
        instance.admin = instance.request("POST", "/auth/login", json={"email": email, "password": password})["access_token"]
        instance.roles = {row["code"]: row["id"] for row in instance.request("GET", "/admin/roles", instance.admin)}
        operators = {reg: instance.user(reg + "-operator", reg + "_operator") for reg in REGISTRIES}
        instance.operator_ids = {reg: data[0] for reg, data in operators.items()}
        instance.operators = {reg: data[1] for reg, data in operators.items()}
        _, instance.learner = instance.user("access-control", "learner_fl")
        yield instance
    finally:
        instance.stop()
        instance.client.close()
        instance.log.close()


def evidence(course, registry):
    parameters = dict(eid=course["enrollment"], registry=registry, oid=course["obligations"][registry]["id"])
    (row,) = db("""SELECT o.status, o.approval_event_id, a.decision, a.source, a.decision_version, a.input_fingerprint,
           (SELECT count(*) FROM registry_applicability_events e WHERE e.applicability_id=a.id) AS events,
           (SELECT count(*) FROM audit_events u WHERE u.entity_id=o.id
             AND u.action='admin.' || o.registry || '_applicability_confirmed') AS audits,
           (SELECT actor_user_id FROM audit_events u WHERE u.entity_id=o.id
             AND u.action='admin.' || o.registry || '_applicability_confirmed' ORDER BY created_at DESC LIMIT 1) AS actor
        FROM registry_obligations o LEFT JOIN registry_applicability a
        ON a.enrollment_id=o.enrollment_id AND a.registry=o.registry
        WHERE o.id=:oid AND o.enrollment_id=:eid AND o.registry=:registry""", parameters)
    return dict(row)


def p0_rejects(course, registry, code):
    async def verify():
        try:
            async with AsyncSessionLocal() as session:
                obligation = await session.get(RegistryObligation, course["obligations"][registry]["id"])
                decision = await session.scalar(select(RegistryApplicabilityRecord).where(
                    RegistryApplicabilityRecord.enrollment_id == course["enrollment"],
                    RegistryApplicabilityRecord.registry == registry))
                current = await load_current_registry_applicability_inputs(session=session, obligation=obligation)
                with pytest.raises(RegistryApplicabilityGateError, match=code):
                    require_current_registry_batch_applicability(registry=registry, entries=[BatchApplicabilityInput(obligation, decision, current)])
        finally:
            await engine.dispose()
    asyncio.run(verify())


@pytest.mark.parametrize("registry,other,index", [("mintrud", "frdo", 1), ("frdo", "mintrud", 2)])
def test_live_operator_required_and_not_required_with_restart(stand, registry, other, index):
    course = stand.provision(registry + "-walkthrough", registry)
    stand.fill(course, registry, index)
    opposite_before = evidence(course, other)
    want = stand.inspect(registry, course)
    assert want["calculated_decision"] == "required" and want["can_confirm"] is True
    assert stand.confirm(registry, course, want) == {"saved": True, "decision_version": 1}
    assert stand.confirm(registry, course, want) == {"saved": False, "decision_version": 1}
    after = evidence(course, registry)
    assert (after["source"], after["decision"], after["decision_version"], after["events"], after["audits"], after["actor"]) == (
        "auto", "required", 1, 1, 1, stand.operator_ids[registry])
    assert after["input_fingerprint"] == want["input_fingerprint"]
    assert evidence(course, other) == opposite_before
    excluded = stand.inspect(other, course)
    assert excluded["calculated_decision"] == "not_required" and excluded["can_confirm"] is True
    stand.confirm(other, course, excluded)
    assert evidence(course, other)["decision"] == "not_required"
    p0_rejects(course, other, "registry.current_rule_not_required")
    assert evidence(course, registry) == after
    stand.stop()
    stand.start()
    saved = stand.inspect(registry, course)
    assert saved["decision_state"] == "current" and saved["decided_at"] and saved["confirmed_by"]
    assert evidence(course, registry) == after
    assert stand.inspect(other, course)["decision_state"] == "current"
    target = stand.target(registry, course)
    assert stand.request("POST", target + "/validate", stand.operators[registry])["is_ready"] is True
    assert stand.request("POST", target + "/approve", stand.operators[registry])["status"] == "approved"
    assert evidence(course, registry)["approval_event_id"]
    for reg in (registry, other):
        result = stand.request("POST", f"/admin/{reg}/batches", stand.operators[reg], want=409,
                               json={"obligation_ids": [course["obligations"][reg]["id"]]})
        assert result["detail"]["code"] == "registry.batch_export.disabled"
    assert not db("SELECT id FROM registry_submission_batches")


def test_authorization_requires_own_registry_and_authentication(stand):
    course = stand.provision("access", "mintrud")
    for reg, other in (("mintrud", "frdo"), ("frdo", "mintrud")):
        path = stand.target(reg, course) + "/applicability"
        body = expectation(stand.inspect(reg, course))
        for token, status in ((None, 401), (stand.learner, 403), (stand.operators[other], 403)):
            stand.request("GET", path, token, want=status)
            stand.request("POST", path + "/confirm-auto", token, want=status, json=body)
        stand.confirm(reg, course, stand.inspect(reg, course), want=422, changes={"source": "manual"})
        assert evidence(course, reg)["decision"] is None


def test_inspection_without_confirmation_permission_is_read_only(stand):
    registry = "mintrud"
    course = stand.provision("read-only", registry)
    authorized = stand.inspect(registry, course)
    assert authorized["can_confirm"] is True

    async def verify():
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SET TRANSACTION READ ONLY"))
                obligation = await session.get(RegistryObligation, authorized["obligation_id"])
                view, calculation = await inspect_automatic_applicability(session, obligation, can_write=False)
                assert calculation.fingerprint == authorized["input_fingerprint"]
                assert view["decision_state"] == "missing" and view["saved_decision"] is None
                assert view["can_confirm"] is False and view["block_reason"] == "permission_required"
                await session.rollback()
        finally:
            await engine.dispose()

    asyncio.run(verify())
    after = evidence(course, registry)
    assert after["decision"] is None and after["events"] == after["audits"] == 0


def test_needs_review_is_displayed_without_confirmation(stand):
    course = stand.provision("review", "review")
    for reg in REGISTRIES:
        review = stand.inspect(reg, course)
        assert review["calculated_decision"] == "needs_review" and review["can_confirm"] is False
        response = stand.confirm(reg, course, review, want=409)
        assert response["detail"]["code"] == "registry.applicability_needs_review"
        assert evidence(course, reg)["events"] == evidence(course, reg)["audits"] == 0


def test_authoritative_change_invalidates_fingerprint_and_old_decision(stand):
    course = stand.provision("stale", "mintrud")
    reg = "mintrud"
    preview = stand.inspect(reg, course)
    stand.confirm(reg, course, preview, want=409, changes={"expected_rule_version": "outdated"})
    stand.confirm(reg, course, preview)
    stand.request("PATCH", f"/admin/courses/{course['course']}", stand.admin, json={"mintrud_requirement_mode": "not_required"})
    fresh = stand.inspect(reg, course)
    assert fresh["calculated_decision"] == "not_required" and fresh["decision_state"] == "stale"
    assert fresh["input_fingerprint"] != preview["input_fingerprint"]
    assert stand.confirm(reg, course, preview, want=409)["detail"]["code"] == "registry.applicability_changed"
    stand.confirm(reg, course, fresh)
    saved = evidence(course, reg)
    assert (saved["decision"], saved["decision_version"], saved["events"], saved["audits"]) == ("not_required", 2, 2, 2)


def test_concurrent_confirmation_creates_one_event(stand):
    reg = "frdo"
    course = stand.provision("race", reg)
    view = stand.inspect(reg, course)
    barrier = Barrier(2)

    def confirm():
        barrier.wait(timeout=10)
        return stand.confirm(reg, course, view)["saved"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        tasks = [pool.submit(confirm) for _ in range(2)]
        assert sorted(task.result(timeout=40) for task in tasks) == [False, True]
    saved = evidence(course, reg)
    assert saved["events"] == saved["audits"] == 1


def test_deferred_commit_error_rolls_back_decision_event_and_audit(stand):
    reg = "mintrud"
    course = stand.provision("commit", reg)
    view = stand.inspect(reg, course)
    db("""CREATE FUNCTION b01_reject_confirmation_commit() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'synthetic deferred COMMIT rejection' USING ERRCODE='23514'; END $$""", ddl=True)
    try:
        db("""CREATE CONSTRAINT TRIGGER b01_commit_error AFTER INSERT ON audit_events
              DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
              WHEN (NEW.action = 'admin.mintrud_applicability_confirmed')
              EXECUTE FUNCTION b01_reject_confirmation_commit()""", ddl=True)
        response = stand.confirm(reg, course, view, want=503)
        assert response["detail"]["code"] == "registry.applicability_save_unconfirmed"
        saved = evidence(course, reg)
        assert saved["decision"] is None and saved["events"] == saved["audits"] == 0
    finally:
        db("DROP TRIGGER IF EXISTS b01_commit_error ON audit_events", ddl=True)
        db("DROP FUNCTION b01_reject_confirmation_commit()", ddl=True)
    assert stand.confirm(reg, course, view)["saved"] is True


@pytest.mark.parametrize("registry,index", [("mintrud", 3), ("frdo", 4)])
def test_historical_approval_without_applicability_remains_protected(stand, registry, index):
    course = stand.provision(registry + "-protected", registry)
    stand.fill(course, registry, index)
    target = stand.target(registry, course)
    assert stand.request("POST", target + "/validate", stand.operators[registry])["is_ready"] is True
    stand.request("POST", target + "/approve", stand.operators[registry])
    review = stand.inspect(registry, course)
    assert review["decision_state"] == "missing" and review["protected_history"] is True
    assert review["can_confirm"] is False and review["calculated_decision"] == "required"
    before = evidence(course, registry)
    assert before["approval_event_id"] and before["decision"] is None
    response = stand.confirm(registry, course, review, want=409)
    assert response["detail"]["code"] == "registry.applicability_protected_history"
    assert evidence(course, registry) == before
    p0_rejects(course, registry, "registry.applicability_missing")
