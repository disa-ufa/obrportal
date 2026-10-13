"""Synthetic live API regression: legacy approval -> reapproval -> batch history."""

import asyncio
from hashlib import sha256
import xml.etree.ElementTree as ET

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.models.learner_profile import LearnerProfile
from app.models.enrollment import Enrollment
from app.models.document_record import DocumentRecord
from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import RegistrySubmissionBatch
from app.services.compliance_registry_approval import evaluate_registry_approval
from app.services.compliance_registry_attempts import (
    _build_current_registry_approval_snapshot,
)
from app.services.document_storage import delete_private_storage_file
from app.services.mintrud_eisot_xsd import validate_mintrud_eisot_xml_v109
from app.tests.test_admin_mintrud_registry_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    LEARNER_EMAIL,
    LEARNER_PASSWORD,
    cleanup_mintrud_fixtures,
    create_mintrud_fixture,
    get_mintrud_audit_actions,
    login,
    request_bytes,
    request_json,
)


def test_legacy_reapproval_batch_download_repeat_history_and_no_external_transition():
    fixture = create_mintrud_fixture(with_context=True, obligation_status="approved")
    obligation_id = fixture["obligation_id"]
    batches = []
    paths = []

    async def db_action(action):
        engine = create_async_engine(str(settings.database_url))
        try:
            async with AsyncSession(engine, expire_on_commit=False) as session:
                await action(session)
                await session.commit()
        finally:
            await engine.dispose()

    async def prepare_profile(session):
        profile = await session.scalar(
            select(LearnerProfile).where(LearnerProfile.user_id == fixture["user_id"])
        )
        profile.snils = "112-233-445 95"
        profile.last_name = "Тестовый"
        profile.first_name = "Слушатель"
        session.add(
            RegistryObligation(
                registry="frdo",
                enrollment_id=fixture["enrollment_id"],
                status="needs_approval",
                readiness_errors=[],
            )
        )

    try:
        asyncio.run(db_action(prepare_profile))
        token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        learner = login(LEARNER_EMAIL, LEARNER_PASSWORD)
        batch_path = "/api/v1/admin/mintrud/batches"
        payload = {"obligation_ids": [obligation_id]}
        status, rejected = request_json("POST", batch_path, payload, token=token)
        assert status == 409 and "missing_snapshot" in str(rejected)
        approve_path = f"/api/v1/admin/mintrud/obligations/{obligation_id}/approve"
        assert request_json("POST", approve_path, token=learner)[0] == 403
        mapping_path = f"/api/v1/admin/courses/{fixture['course_id']}/mintrud-programs"
        mapping = {"mintrud_learn_program_ids": [fixture["mintrud_program_id"]]}
        assert request_json("PUT", mapping_path, mapping, token=learner)[0] == 403
        assert (
            request_json(
                "PUT", mapping_path, {"mintrud_learn_program_ids": []}, token=token
            )[0]
            == 200
        )
        status, missing_program = request_json("POST", approve_path, token=token)
        assert status == 409 and "mintrud.learn_program_missing" in str(missing_program)
        assert request_json("PUT", mapping_path, mapping, token=token)[0] == 200
        status, approved = request_json("POST", approve_path, token=token)
        assert status == 200 and approved["status"] == "approved"
        assert approved["approved_at"] and approved["approved_by_user_id"]
        # Repeating the same mapping must not invalidate the fresh approval.
        assert request_json("PUT", mapping_path, mapping, token=token)[0] == 200

        async def check_current(session):
            obligation = await session.get(RegistryObligation, obligation_id)
            snapshot = await _build_current_registry_approval_snapshot(
                session, obligation=obligation
            )
            assert evaluate_registry_approval(
                obligation, current_snapshot=snapshot
            ).is_current
            assert obligation.status == "approved"
            assert obligation.submitted_at is None and obligation.accepted_at is None
            frdo = await session.scalar(
                select(RegistryObligation).where(
                    RegistryObligation.enrollment_id == fixture["enrollment_id"],
                    RegistryObligation.registry == "frdo",
                )
            )
            assert (
                frdo.status == "needs_approval" and frdo.approval_invalidated_at is None
            )
            assert (
                await session.get(Enrollment, fixture["enrollment_id"])
            ).status == "completed"
            assert (
                await session.get(DocumentRecord, fixture["document_id"])
            ).status == "draft"

        asyncio.run(db_action(check_current))
        assert "admin.mintrud_obligation_approved" in get_mintrud_audit_actions(
            obligation_id
        ) or "admin.mintrud_obligation_reapproved" in get_mintrud_audit_actions(
            obligation_id
        )
        assert request_json("POST", batch_path, payload, token=learner)[0] == 403
        for _ in range(2):
            status, batch = request_json("POST", batch_path, payload, token=token)
            assert status == 201 and batch["status"] == "exported"
            batches.append(batch["id"])
            assert batch["record_count"] == 1
            download_path = f"{batch_path}/{batch['id']}/download"
            code, xml, headers = request_bytes("GET", download_path, token=token)
            assert code == 200 and xml.startswith(b"<?xml")
            assert sha256(xml).hexdigest() == batch["artifact_sha256"]
            validate_mintrud_eisot_xml_v109(xml)
            assert "Тестовый".encode() in xml
            records = ET.fromstring(xml).findall("RegistryRecord")
            assert (
                len(records) == 1
                and records[0].find("Test").attrib["learnProgramId"] == "1"
            )
            assert request_bytes("GET", download_path, token=token)[1] == xml
            assert request_bytes("GET", download_path, token=learner)[0] == 403
        assert batches[0] != batches[1]
        status, history = request_json("GET", batch_path, token=token)
        assert status == 200 and set(batches) <= {b["id"] for b in history}
        asyncio.run(db_action(check_current))
    finally:

        async def cleanup(session):
            for batch_id in batches:
                batch = await session.get(RegistrySubmissionBatch, batch_id)
                if batch:
                    paths.append(batch.artifact_path)
                    await session.execute(
                        delete(RegistrySubmissionBatch).where(
                            RegistrySubmissionBatch.id == batch_id
                        )
                    )

        asyncio.run(db_action(cleanup))
        for path in paths:
            delete_private_storage_file(path)
        cleanup_mintrud_fixtures([fixture])
