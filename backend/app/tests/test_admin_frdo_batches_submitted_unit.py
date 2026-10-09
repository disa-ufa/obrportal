from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute

import app.api.v1.admin as admin
import app.services.frdo_po_batches as service

from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import (
    RegistrySubmissionBatchItem,
)
from app.schemas.admin import AdminFrdoSubmissionBatchMarkSubmitted
from app.services import compliance_registry_attempts as attempts
from app.services import compliance_registry_batches as shared
from app.services.compliance_registry_approval import (
    fingerprint_registry_approval_snapshot,
)


def make_state():
    now = datetime.now(timezone.utc)
    snapshot = {"test": {"approved": True}}
    fingerprint = fingerprint_registry_approval_snapshot(snapshot)

    batch = SimpleNamespace(
        id="00000000-0000-4000-8000-000000000001",
        registry="frdo",
        status="exported",
        artifact_kind="portal-upload-artifact",
        transport="file",
        schema_version="frdo-po-working-reference-v1",
        obligation_count=1,
        record_count=1,
        artifact_path="private/frdo/test.xlsx",
        artifact_sha256="a" * 64,
        generated_by_user_id="actor",
        generated_at=now,
        imported_by_user_id=None,
        imported_at=None,
        submitted_by_user_id=None,
        submitted_at=None,
        external_reference=None,
        reconciled_by_user_id=None,
        reconciled_at=None,
        created_at=now,
        updated_at=now,
    )

    item = SimpleNamespace(
        obligation_id="obligation-1",
        position=0,
        record_count=1,
        result_status=None,
        approval_snapshot_json=snapshot,
        approval_fingerprint=fingerprint,
    )

    obligation = SimpleNamespace(
        id="obligation-1",
        registry="frdo",
        status="approved",
        approval_fingerprint=fingerprint,
        submitted_at=None,
        accepted_at=None,
        external_id=None,
        last_error=None,
    )

    return batch, item, obligation


class FakeSession:
    def __init__(self, batch=None, items=None, obligations=None):
        self.batch = batch
        self.items = items or []
        self.obligations = obligations or []
        self.flushed = 0
        self.committed = 0
        self.rolled_back = 0

    async def scalar(self, statement):
        return self.batch

    async def scalars(self, statement):
        entity = statement.column_descriptions[0]["entity"]

        if entity is RegistrySubmissionBatchItem:
            rows = self.items
        elif entity is RegistryObligation:
            rows = self.obligations
        else:
            raise AssertionError("Unexpected query entity")

        return SimpleNamespace(all=lambda: list(rows))

    async def flush(self):
        self.flushed += 1

    async def commit(self):
        self.committed += 1

    async def rollback(self):
        self.rolled_back += 1


def allow_validation(monkeypatch):
    async def valid(*args, **kwargs):
        return None

    monkeypatch.setattr(
        attempts,
        "validate_registry_approval_current",
        valid,
    )

    monkeypatch.setattr(
        shared,
        "read_registry_submission_batch_artifact",
        lambda batch: b"PK-test-artifact",
    )


def test_frdo_submitted_route_registered():
    matches = [
        route
        for route in admin.router.routes
        if isinstance(route, APIRoute)
        and route.path == "/admin/frdo/batches/{batch_id}/submitted"
        and "POST" in route.methods
    ]
    assert len(matches) == 1


def test_frdo_submitted_reference_validation():
    with pytest.raises(Exception):
        AdminFrdoSubmissionBatchMarkSubmitted(
            external_reference="x" * 256
        )

    valid = AdminFrdoSubmissionBatchMarkSubmitted(
        external_reference="FRDO-TEST-1"
    )
    assert valid.external_reference == "FRDO-TEST-1"


def test_frdo_submission_service_success(monkeypatch):
    allow_validation(monkeypatch)
    batch, item, obligation = make_state()

    session = FakeSession(batch, [item], [obligation])

    result = asyncio.run(
        service.mark_frdo_registry_submission_batch_submitted(
            session,
            batch_id=batch.id,
            submitted_by_user_id="operator-1",
            external_reference="  REF-123  ",
        )
    )

    assert result is batch
    assert batch.status == "submitted"
    assert obligation.status == "submitted"
    assert batch.submitted_by_user_id == "operator-1"
    assert batch.external_reference == "REF-123"
    assert batch.submitted_at is not None
    assert obligation.submitted_at == batch.submitted_at
    assert session.flushed == 1


def test_frdo_submission_repeated_is_rejected(monkeypatch):
    allow_validation(monkeypatch)
    batch, item, obligation = make_state()
    batch.status = "submitted"
    batch.submitted_by_user_id = "previous-operator"

    session = FakeSession(batch, [item], [obligation])

    with pytest.raises(shared.RegistrySubmissionBatchError):
        asyncio.run(
            service.mark_frdo_registry_submission_batch_submitted(
                session,
                batch_id=batch.id,
                submitted_by_user_id="operator-1",
            )
        )

    assert session.flushed == 0


def test_frdo_submission_wrong_registry_rejected(monkeypatch):
    allow_validation(monkeypatch)
    batch, item, obligation = make_state()
    batch.registry = "mintrud"

    session = FakeSession(batch, [item], [obligation])

    with pytest.raises(shared.RegistrySubmissionBatchError):
        asyncio.run(
            service.mark_frdo_registry_submission_batch_submitted(
                session,
                batch_id=batch.id,
                submitted_by_user_id="operator-1",
            )
        )

    assert session.flushed == 0


def test_frdo_submission_snapshot_mismatch_rejected(monkeypatch):
    allow_validation(monkeypatch)
    batch, item, obligation = make_state()
    item.approval_fingerprint = "0" * 64

    session = FakeSession(batch, [item], [obligation])

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="frozen approval",
    ):
        asyncio.run(
            service.mark_frdo_registry_submission_batch_submitted(
                session,
                batch_id=batch.id,
                submitted_by_user_id="operator-1",
            )
        )

    assert batch.status == "exported"
    assert obligation.status == "approved"


def test_frdo_submission_corrupt_file_rejected(monkeypatch):
    allow_validation(monkeypatch)
    batch, item, obligation = make_state()

    def corrupt_file(value):
        raise shared.RegistrySubmissionBatchError(
            "artifact digest mismatch"
        )

    monkeypatch.setattr(
        shared,
        "read_registry_submission_batch_artifact",
        corrupt_file,
    )

    session = FakeSession(batch, [item], [obligation])

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="digest mismatch",
    ):
        asyncio.run(
            service.mark_frdo_registry_submission_batch_submitted(
                session,
                batch_id=batch.id,
                submitted_by_user_id="operator-1",
            )
        )

    assert batch.status == "exported"
    assert obligation.status == "approved"


def test_frdo_submission_stale_approval_rejected(monkeypatch):
    allow_validation(monkeypatch)
    batch, item, obligation = make_state()

    async def stale(*args, **kwargs):
        raise attempts.RegistrySubmissionAttemptError(
            "stale approval"
        )

    monkeypatch.setattr(
        attempts,
        "validate_registry_approval_current",
        stale,
    )

    session = FakeSession(batch, [item], [obligation])

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="no longer current",
    ):
        asyncio.run(
            service.mark_frdo_registry_submission_batch_submitted(
                session,
                batch_id=batch.id,
                submitted_by_user_id="operator-1",
            )
        )

    assert batch.status == "exported"
    assert obligation.status == "approved"


def test_frdo_submission_api_success_and_audit(monkeypatch):
    batch, item, obligation = make_state()
    session = FakeSession(batch, [item], [obligation])
    audit_payloads = []

    async def fake_service(*args, **kwargs):
        batch.status = "submitted"
        batch.submitted_by_user_id = "operator-1"
        batch.submitted_at = datetime.now(timezone.utc)
        batch.external_reference = "FRDO-123"
        return batch

    async def fake_audit(*args, **kwargs):
        audit_payloads.append(kwargs)

    monkeypatch.setattr(
        admin,
        "mark_frdo_registry_submission_batch_submitted",
        fake_service,
    )
    monkeypatch.setattr(
        admin,
        "create_admin_audit_event",
        fake_audit,
    )

    result = asyncio.run(
        admin.mark_admin_frdo_submission_batch_submitted(
            batch_id=batch.id,
            payload=AdminFrdoSubmissionBatchMarkSubmitted(
                external_reference="FRDO-123"
            ),
            request=object(),
            current_user=SimpleNamespace(id="operator-1"),
            session=session,
        )
    )

    assert result.status == "submitted"
    assert result.submitted_by_user_id == "operator-1"
    assert session.committed == 1
    assert session.rolled_back == 0
    assert len(audit_payloads) == 1
    assert audit_payloads[0]["payload"]["external_registry_io"] is False
    assert audit_payloads[0]["payload"]["before"]["status"] == "exported"
    assert audit_payloads[0]["payload"]["after"]["status"] == "submitted"


def test_frdo_submission_api_missing_is_404():
    session = FakeSession(batch=None)

    with pytest.raises(HTTPException) as result:
        asyncio.run(
            admin.mark_admin_frdo_submission_batch_submitted(
                batch_id="missing",
                payload=AdminFrdoSubmissionBatchMarkSubmitted(),
                request=object(),
                current_user=SimpleNamespace(id="operator-1"),
                session=session,
            )
        )

    assert result.value.status_code == 404


def test_frdo_submission_api_conflict_is_409(monkeypatch):
    batch, item, obligation = make_state()
    session = FakeSession(batch, [item], [obligation])

    async def reject(*args, **kwargs):
        raise shared.RegistrySubmissionBatchError(
            "batch already submitted"
        )

    monkeypatch.setattr(
        admin,
        "mark_frdo_registry_submission_batch_submitted",
        reject,
    )

    with pytest.raises(HTTPException) as result:
        asyncio.run(
            admin.mark_admin_frdo_submission_batch_submitted(
                batch_id=batch.id,
                payload=AdminFrdoSubmissionBatchMarkSubmitted(),
                request=object(),
                current_user=SimpleNamespace(id="operator-1"),
                session=session,
            )
        )

    assert result.value.status_code == 409
    assert session.rolled_back == 1
    assert session.committed == 0
