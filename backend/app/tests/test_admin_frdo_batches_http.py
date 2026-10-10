"""Real HTTP regression for the FRDO PO submission batch lifecycle.

Requires an isolated PostgreSQL database, isolated document storage
and an independently running FastAPI server.
"""

import asyncio
import hashlib
import os
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import (
    RegistrySubmissionBatch,
    RegistrySubmissionBatchItem,
)
from app.tests import test_admin_frdo_registry_api as base


BATCH_PATH = "/api/v1/admin/frdo/batches"


def _require_disposable_environment():
    if os.environ.get("OBRPORTAL_STEP12K_ISOLATED") != "1":
        pytest.skip(
            "Step-12K HTTP test requires explicit disposable "
            "database opt-in"
        )

    database_url = str(settings.database_url)
    parsed = urlparse(database_url)

    assert parsed.scheme == "postgresql+asyncpg"
    assert parsed.hostname == "127.0.0.1"
    assert parsed.path == "/regression_test"
    assert parsed.username == "regression_test"

    assert os.environ.get("DOCUMENT_STORAGE_DIR")
    assert base.BASE_URL.startswith("http://127.0.0.1:")


def _request(method, path, payload=None, *, token):
    return base.request_json(
        method,
        path,
        payload,
        token=token,
    )


def _assert_status(response, expected):
    status, data = response
    assert status == expected, (
        f"Expected HTTP {expected}, got {status}: {data!r}"
    )
    return data


async def _read_persisted_state(batch_id, obligation_ids):
    engine = create_async_engine(str(settings.database_url))

    try:
        session_factory = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        async with session_factory() as session:
            batch = await session.scalar(
                select(RegistrySubmissionBatch).where(
                    RegistrySubmissionBatch.id == batch_id
                )
            )

            assert batch is not None

            result = await session.scalars(
                select(RegistrySubmissionBatchItem)
                .where(
                    RegistrySubmissionBatchItem.batch_id == batch_id
                )
                .order_by(RegistrySubmissionBatchItem.position)
            )
            items = list(result.all())

            result = await session.scalars(
                select(RegistryObligation).where(
                    RegistryObligation.id.in_(obligation_ids)
                )
            )
            obligations = {
                str(item.id): item
                for item in result.all()
            }

            result = await session.scalars(
                select(base.AuditEvent.action).where(
                    base.AuditEvent.entity_type
                    == "registry_submission_batch",
                    base.AuditEvent.entity_id == batch_id,
                )
            )
            audit_actions = list(result.all())

            return {
                "batch_status": batch.status,
                "reconciled_at": batch.reconciled_at,
                "reconciled_by": batch.reconciled_by_user_id,
                "items": [
                    {
                        "obligation_id": str(item.obligation_id),
                        "status": item.result_status,
                        "external_id": item.external_id,
                        "errors": list(item.errors_json or []),
                        "recorded_at": item.result_recorded_at,
                        "recorded_by": item.result_recorded_by_user_id,
                    }
                    for item in items
                ],
                "obligations": {
                    obligation_id: {
                        "status": obligations[obligation_id].status,
                        "external_id": obligations[obligation_id].external_id,
                        "last_error": obligations[obligation_id].last_error,
                        "accepted_at": obligations[obligation_id].accepted_at,
                    }
                    for obligation_id in obligation_ids
                },
                "audit_actions": audit_actions,
            }
    finally:
        await engine.dispose()


def test_frdo_batch_http_lifecycle_and_audit():
    _require_disposable_environment()

    # Each fixture gets its own user, course, document and obligation.
    fixtures = [
        base.create_frdo_fixture(
            with_profile=True,
            obligation_status="needs_approval",
        )
        for _ in range(2)
    ]

    obligation_ids = [
        fixture["obligation_id"]
        for fixture in fixtures
    ]

    admin_token = base.login(
        base.ADMIN_EMAIL,
        base.ADMIN_PASSWORD,
    )

    learner_token = base.login(
        base.LEARNER_EMAIL,
        base.LEARNER_PASSWORD,
    )

    # Actual HTTP approval creates the authoritative snapshots.
    for obligation_id in obligation_ids:
        approved = _assert_status(
            _request(
                "POST",
                "/api/v1/admin/frdo/obligations/"
                + obligation_id
                + "/approve",
                token=admin_token,
            ),
            200,
        )

        assert approved["status"] == "approved"
        assert approved["approved_at"] is not None
        assert approved["readiness_errors"] == []

    # Prepare a single XLSX batch from two approved obligations.
    created = _assert_status(
        _request(
            "POST",
            BATCH_PATH,
            {"obligation_ids": obligation_ids},
            token=admin_token,
        ),
        201,
    )

    batch_id = created["id"]
    detail_path = BATCH_PATH + "/" + batch_id
    results_path = detail_path + "/results"

    assert created["registry"] == "frdo"
    assert created["status"] == "exported"
    assert created["obligation_count"] == 2
    assert created["record_count"] == 2
    assert created["has_artifact"] is True

    detail = _assert_status(
        _request(
            "GET",
            detail_path,
            token=admin_token,
        ),
        200,
    )

    assert len(detail["items"]) == 2
    assert {
        item["obligation_id"]
        for item in detail["items"]
    } == set(obligation_ids)

    assert all(
        item["result_status"] is None
        for item in detail["items"]
    )

    assert all(
        item["approval_snapshot_json"]
        and item["approval_fingerprint"]
        for item in detail["items"]
    )

    # Verify that the real downloadable XLSX matches its SHA256.
    download = Request(
        base.BASE_URL + detail_path + "/download",
        headers={"Authorization": "Bearer " + admin_token},
        method="GET",
    )

    with urlopen(download, timeout=20) as response:
        assert response.status == 200
        xlsx_content = response.read()

    assert xlsx_content.startswith(b"PK")
    assert (
        hashlib.sha256(xlsx_content).hexdigest()
        == created["artifact_sha256"]
    )

    # Permission and lifecycle safeguards before submission.
    _assert_status(
        _request(
            "GET",
            detail_path,
            token=learner_token,
        ),
        403,
    )

    first_result = {
        "obligation_id": obligation_ids[0],
        "result_status": "accepted",
        "external_id": "FRDO-TEST-ACCEPTED-001",
        "errors": [],
    }

    before_submission = {
        "source_description": "Test operator feedback",
        "items": [first_result],
    }

    _assert_status(
        _request(
            "POST",
            results_path,
            before_submission,
            token=admin_token,
        ),
        409,
    )

    # Sending is only marked locally; no external FRDO I/O.
    submitted = _assert_status(
        _request(
            "POST",
            detail_path + "/submitted",
            {"external_reference": "  FRDO-TEST-SEND-001  "},
            token=admin_token,
        ),
        200,
    )

    assert submitted["status"] == "submitted"
    assert submitted["submitted_at"] is not None
    assert submitted["external_reference"] == "FRDO-TEST-SEND-001"

    _assert_status(
        _request(
            "POST",
            detail_path + "/submitted",
            {},
            token=admin_token,
        ),
        409,
    )

    _assert_status(
        _request(
            "POST",
            results_path,
            before_submission,
            token=learner_token,
        ),
        403,
    )

    _assert_status(
        _request(
            "POST",
            results_path,
            {
                "source_description": "   ",
                "items": [first_result],
            },
            token=admin_token,
        ),
        422,
    )

    missing_batch_path = (
        BATCH_PATH + "/" + str(uuid4()) + "/results"
    )

    _assert_status(
        _request(
            "POST",
            missing_batch_path,
            before_submission,
            token=admin_token,
        ),
        404,
    )

    unknown_obligation = {
        "source_description": "Test operator feedback",
        "items": [{
            "obligation_id": str(uuid4()),
            "result_status": "accepted",
            "external_id": "FRDO-UNKNOWN",
            "errors": [],
        }],
    }

    _assert_status(
        _request(
            "POST",
            results_path,
            unknown_obligation,
            token=admin_token,
        ),
        409,
    )

    # Partial reconciliation.
    partial = _assert_status(
        _request(
            "POST",
            results_path,
            {
                "source_description": "First FRDO operator response",
                "source_reference": "FRDO-RECEIPT-PART-1",
                "items": [first_result],
            },
            token=admin_token,
        ),
        200,
    )

    assert partial["reconciled_at"] is None
    assert partial["reconciled_by_user_id"] is None

    statuses = {
        item["obligation_id"]: item["result_status"]
        for item in partial["items"]
    }

    assert statuses[obligation_ids[0]] == "accepted"
    assert statuses[obligation_ids[1]] is None

    # Already recorded result must not be overwritten.
    _assert_status(
        _request(
            "POST",
            results_path,
            before_submission,
            token=admin_token,
        ),
        409,
    )

    # Completing the reconciliation with a different outcome.
    second_result = {
        "obligation_id": obligation_ids[1],
        "result_status": "correction_required",
        "external_id": None,
        "errors": ["Incorrect document date"],
    }

    completed = _assert_status(
        _request(
            "POST",
            results_path,
            {
                "source_description": "Final FRDO operator response",
                "source_reference": "FRDO-RECEIPT-PART-2",
                "items": [second_result],
            },
            token=admin_token,
        ),
        200,
    )

    assert completed["reconciled_at"] is not None
    assert completed["reconciled_by_user_id"] is not None

    completed_items = {
        item["obligation_id"]: item
        for item in completed["items"]
    }

    assert (
        completed_items[obligation_ids[0]]["result_status"]
        == "accepted"
    )
    assert (
        completed_items[obligation_ids[1]]["result_status"]
        == "correction_required"
    )
    assert completed_items[obligation_ids[1]]["errors_json"] == [
        "Incorrect document date"
    ]

    # Reconciliation must be immutable after completion.
    _assert_status(
        _request(
            "POST",
            results_path,
            {
                "source_description": "Unexpected repeat",
                "items": [second_result],
            },
            token=admin_token,
        ),
        409,
    )

    # Fresh SQLAlchemy session: verify persistence, not merely HTTP.
    persisted = asyncio.run(
        _read_persisted_state(batch_id, obligation_ids)
    )

    assert persisted["batch_status"] == "submitted"
    assert persisted["reconciled_at"] is not None
    assert persisted["reconciled_by"] is not None

    saved_items = {
        item["obligation_id"]: item
        for item in persisted["items"]
    }

    assert len(saved_items) == 2

    assert saved_items[obligation_ids[0]]["status"] == "accepted"
    assert saved_items[obligation_ids[0]]["recorded_at"] is not None
    assert saved_items[obligation_ids[0]]["recorded_by"] is not None

    assert (
        saved_items[obligation_ids[1]]["status"]
        == "correction_required"
    )
    assert saved_items[obligation_ids[1]]["errors"] == [
        "Incorrect document date"
    ]

    saved_obligations = persisted["obligations"]

    assert saved_obligations[obligation_ids[0]]["status"] == "accepted"
    assert (
        saved_obligations[obligation_ids[0]]["external_id"]
        == "FRDO-TEST-ACCEPTED-001"
    )
    assert saved_obligations[obligation_ids[0]]["accepted_at"] is not None

    assert (
        saved_obligations[obligation_ids[1]]["status"]
        == "correction_required"
    )
    assert (
        saved_obligations[obligation_ids[1]]["last_error"]
        == "Incorrect document date"
    )

    actions = persisted["audit_actions"]

    assert "admin.frdo_submission_batch_prepared" in actions
    assert (
        "admin.frdo_submission_batch_submission_recorded"
        in actions
    )
    assert actions.count(
        "admin.frdo_submission_batch_results_recorded"
    ) == 2
