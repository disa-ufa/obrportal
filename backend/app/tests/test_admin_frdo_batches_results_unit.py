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
from app.schemas.admin import (
    AdminFrdoSubmissionBatchResultUpdate,
)
from app.services import compliance_registry_batches as shared
from app.services.compliance_registry_approval import (
    fingerprint_registry_approval_snapshot,
)


def make_state(count=2):
    now = datetime.now(timezone.utc)

    batch = SimpleNamespace(
        id="00000000-0000-4000-8000-000000000001",
        registry="frdo",
        status="submitted",
        artifact_kind="portal-upload-artifact",
        transport="file",
        schema_version="frdo-po-working-reference-v1",
        obligation_count=count,
        record_count=count,
        artifact_path="registry/frdo/test.xlsx",
        artifact_sha256="a" * 64,
        generated_by_user_id="author",
        generated_at=now,
        submitted_by_user_id="sender",
        submitted_at=now,
        imported_by_user_id=None,
        imported_at=None,
        external_reference=None,
        reconciled_by_user_id=None,
        reconciled_at=None,
        created_at=now,
        updated_at=now,
    )

    items = []
    obligations = []

    for index in range(count):
        snapshot = {"record": {"index": index}}

        fingerprint = (
            fingerprint_registry_approval_snapshot(snapshot)
        )

        obligation_id = f"obligation-{index}"

        items.append(
            SimpleNamespace(
                id=f"item-{index}",
                obligation_id=obligation_id,
                position=index,
                record_count=1,
                approval_snapshot_json=snapshot,
                approval_fingerprint=fingerprint,
                result_status=None,
                errors_json=[],
                external_id=None,
                result_recorded_by_user_id=None,
                result_recorded_at=None,
            )
        )

        obligations.append(
            SimpleNamespace(
                id=obligation_id,
                registry="frdo",
                status="submitted",
                submitted_at=now,
                accepted_at=None,
                external_id=None,
                last_error=None,
            )
        )

    return batch, items, obligations


class FakeSession:
    def __init__(self, batch, items, obligations):
        self.batch = batch
        self.items = items
        self.obligations = obligations
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
            raise AssertionError("Unexpected entity")

        return SimpleNamespace(all=lambda: list(rows))

    async def flush(self):
        self.flushed += 1

    async def commit(self):
        self.committed += 1

    async def rollback(self):
        self.rolled_back += 1


def setup_reader(monkeypatch):
    monkeypatch.setattr(
        shared,
        "read_registry_submission_batch_artifact",
        lambda batch: b"PK-test-xlsx",
    )


def entry(index, result_status="accepted", **fields):
    result = {
        "obligation_id": f"obligation-{index}",
        "result_status": result_status,
        "external_id": None,
        "errors": [],
    }
    result.update(fields)
    return result


def record(session, results):
    return asyncio.run(
        service.record_frdo_registry_submission_batch_results(
            session,
            batch_id=session.batch.id,
            recorded_by_user_id="operator-1",
            results=results,
        )
    )


def test_frdo_result_route_registered():
    matches = [
        route for route in admin.router.routes
        if isinstance(route, APIRoute)
        and route.path == "/admin/frdo/batches/{batch_id}/results"
        and "POST" in route.methods
    ]
    assert len(matches) == 1


def test_frdo_result_schema_rejects_empty_and_oversized():
    with pytest.raises(Exception):
        AdminFrdoSubmissionBatchResultUpdate(
            source_description="External response",
            items=[],
        )

    with pytest.raises(Exception):
        AdminFrdoSubmissionBatchResultUpdate(
            source_description="External response",
            items=[entry(0)] * 1002,
        )


def test_frdo_result_partial_then_complete(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state(2)
    session = FakeSession(batch, items, obligations)

    result_batch, result_items = record(
        session,
        [entry(0, external_id="FRDO-1")],
    )

    assert result_batch is batch
    assert batch.reconciled_at is None
    assert batch.reconciled_by_user_id is None
    assert items[0].result_status == "accepted"
    assert items[1].result_status is None
    assert obligations[0].status == "accepted"
    assert obligations[1].status == "submitted"

    record(session, [entry(
        1,
        "correction_required",
        errors=["Incorrect document date"],
    )])

    assert batch.reconciled_at is not None
    assert batch.reconciled_by_user_id == "operator-1"
    assert items[1].result_status == "correction_required"
    assert obligations[1].status == "correction_required"
    assert obligations[1].last_error == "Incorrect document date"
    assert session.flushed == 2


def test_frdo_result_full_mixed_outcomes(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state(3)
    session = FakeSession(batch, items, obligations)

    record(session, [
        entry(0, external_id="ID-1"),
        entry(1, "rejected", errors=["Invalid SNILS"]),
        entry(2, "correction_required", errors=["Check date"]),
    ])

    assert [item.result_status for item in items] == [
        "accepted",
        "rejected",
        "correction_required",
    ]
    assert [obligation.status for obligation in obligations] == [
        "accepted",
        "rejected",
        "correction_required",
    ]
    assert obligations[0].accepted_at is not None
    assert obligations[0].external_id == "ID-1"
    assert batch.reconciled_at is not None


def test_frdo_result_duplicate_entry_rejected(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state()
    session = FakeSession(batch, items, obligations)

    with pytest.raises(shared.RegistrySubmissionBatchError):
        record(session, [entry(0), entry(0)])

    assert session.flushed == 0


def test_frdo_result_unknown_obligation_rejected(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state()
    session = FakeSession(batch, items, obligations)

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="outside this batch",
    ):
        record(session, [entry(90)])

    assert session.flushed == 0


def test_frdo_result_repeated_record_rejected(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state()
    session = FakeSession(batch, items, obligations)

    record(session, [entry(0)])

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="already recorded",
    ):
        record(session, [entry(0)])

    assert items[1].result_status is None
    assert session.flushed == 1


def test_frdo_result_unsubmitted_rejected(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state()
    batch.status = "exported"
    session = FakeSession(batch, items, obligations)

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="must be submitted",
    ):
        record(session, [entry(0)])

    assert session.flushed == 0


def test_frdo_result_wrong_registry_rejected(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state()
    batch.registry = "mintrud"
    session = FakeSession(batch, items, obligations)

    with pytest.raises(shared.RegistrySubmissionBatchError):
        record(session, [entry(0)])

    assert session.flushed == 0


def test_frdo_result_corrupt_xlsx_rejected(monkeypatch):
    batch, items, obligations = make_state()
    session = FakeSession(batch, items, obligations)

    def reject_file(batch):
        raise shared.RegistrySubmissionBatchError(
            "artifact digest mismatch"
        )

    monkeypatch.setattr(
        shared,
        "read_registry_submission_batch_artifact",
        reject_file,
    )

    with pytest.raises(
        shared.RegistrySubmissionBatchError,
        match="digest mismatch",
    ):
        record(session, [entry(0)])

    assert session.flushed == 0


def test_frdo_result_invalid_status_error_mix_rejected(monkeypatch):
    setup_reader(monkeypatch)
    batch, items, obligations = make_state()
    session = FakeSession(batch, items, obligations)

    with pytest.raises(shared.RegistrySubmissionBatchError):
        record(session, [
            entry(0, "accepted", errors=["Should not exist"])
        ])

    assert session.flushed == 0


def test_frdo_result_api_audit_and_commit(monkeypatch):
    batch, items, obligations = make_state(1)
    session = FakeSession(batch, items, obligations)
    observed = []

    async def fake_record(*args, **kwargs):
        items[0].result_status = "accepted"
        items[0].external_id = "FRDO-1"
        items[0].result_recorded_at = datetime.now(timezone.utc)
        items[0].result_recorded_by_user_id = "operator-1"
        obligations[0].status = "accepted"
        batch.reconciled_at = datetime.now(timezone.utc)
        batch.reconciled_by_user_id = "operator-1"
        return batch, items

    async def fake_audit(*args, **kwargs):
        observed.append(kwargs)

    monkeypatch.setattr(
        admin,
        "record_frdo_registry_submission_batch_results",
        fake_record,
    )
    monkeypatch.setattr(
        admin,
        "create_admin_audit_event",
        fake_audit,
    )

    payload = AdminFrdoSubmissionBatchResultUpdate(
        source_description="FRDO portal response",
        source_reference="RECEIPT-123",
        items=[entry(0, external_id="FRDO-1")],
    )

    response = asyncio.run(
        admin.record_admin_frdo_submission_batch_results(
            batch_id=batch.id,
            payload=payload,
            request=object(),
            current_user=SimpleNamespace(id="operator-1"),
            session=session,
        )
    )

    assert response.items[0].result_status == "accepted"
    assert response.reconciled_at is not None
    assert session.committed == 1
    assert session.rolled_back == 0
    assert observed[0]["payload"]["fully_reconciled"] is True
    assert observed[0]["payload"]["remaining_count"] == 0
    assert observed[0]["payload"]["source_reference"] == "RECEIPT-123"
    assert observed[0]["payload"]["external_registry_io"] is False


def test_frdo_result_api_domain_error_is_409(monkeypatch):
    batch, items, obligations = make_state(1)
    session = FakeSession(batch, items, obligations)

    async def reject(*args, **kwargs):
        raise shared.RegistrySubmissionBatchError(
            "Result already recorded"
        )

    monkeypatch.setattr(
        admin,
        "record_frdo_registry_submission_batch_results",
        reject,
    )

    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            admin.record_admin_frdo_submission_batch_results(
                batch_id=batch.id,
                payload=AdminFrdoSubmissionBatchResultUpdate(
                    source_description="FRDO portal response",
                    items=[entry(0)],
                ),
                request=object(),
                current_user=SimpleNamespace(id="operator-1"),
                session=session,
            )
        )

    assert captured.value.status_code == 409
    assert session.rolled_back == 1
    assert session.committed == 0


def test_frdo_result_api_missing_is_404():
    session = FakeSession(None, [], [])

    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            admin.record_admin_frdo_submission_batch_results(
                batch_id="missing",
                payload=AdminFrdoSubmissionBatchResultUpdate(
                    source_description="FRDO portal response",
                    items=[entry(0)],
                ),
                request=object(),
                current_user=SimpleNamespace(id="operator-1"),
                session=session,
            )
        )

    assert captured.value.status_code == 404
