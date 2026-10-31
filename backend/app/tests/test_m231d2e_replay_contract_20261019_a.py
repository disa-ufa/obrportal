"""M2.3.1D.2E test-first contracts (synthetic data; no external registry IO).

Run this file with pytest -p no:cacheprovider. No application startup is used.
HTTP is exercised through ASGI, with the REAL routes, batch services, approval
validator, audit writer and filesystem writer. Authentication, current source
snapshot retrieval and XML/XLSX formatting are isolated dependencies. These
tests do not certify payload formatting, source-data locking or database races.
The companion *_pg_*.py file covers races with independent PostgreSQL sessions.
Failures are intentional contract failures, not xfail acceptance of duplicates.
"""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from fastapi.routing import APIRoute

import app.api.v1.admin as admin
from app.core.config import settings
from app.models.audit_event import AuditEvent
from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import RegistrySubmissionBatch, RegistrySubmissionBatchItem
import app.services.compliance_registry_attempts as attempts
import app.services.compliance_registry_batches as mintrud
import app.services.frdo_po_batches as frdo
from app.services.compliance_registry_approval import (
    apply_registry_approval, invalidate_registry_approval,
    FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
)
from app.services.compliance_registry_contract import PROGRAM_TYPE_VOCATIONAL_TRAINING

NOW = datetime(2026, 10, 19, 10, tzinfo=timezone.utc)


def synthetic_snapshot(registry, label):
    return {
        "schema_version": FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION if registry == "frdo" else "registry-approval-v1",
        "registry": registry,
        "enrollment": {"status": "completed"},
        "course": {"title": "Synthetic " + label, "regulatory_program_type": PROGRAM_TYPE_VOCATIONAL_TRAINING},
        "learner_profile": {}, "document": {}, "frdo_context": {},
        "mintrud_learn_programs": [{"learn_program_id": 1}],
    }


def approve(obligation, actor, snapshot, when=NOW):
    return apply_registry_approval(
        obligation, current_snapshot=snapshot,
        approved_by_user_id=actor, approved_at=when,
    )


def isolate_dependencies(monkeypatch, root, snapshots):
    # Keep replay/COMMIT business logic real; C/S/D/O has a separate real PG test.
    from app.services import registry_batch_transaction
    async def qualified_test_boundary(*args, **kwargs):
        return None
    monkeypatch.setattr(registry_batch_transaction, 'require_batch_transaction', qualified_test_boundary)
    monkeypatch.setattr(settings, "document_storage_dir", str(root))

    async def current_snapshot(session, *, obligation):
        return deepcopy(snapshots[str(obligation.id)])

    # Keep real validate_registry_approval_current/evaluate_registry_approval.
    monkeypatch.setattr(attempts, "_build_current_registry_approval_snapshot", current_snapshot)

    def encoded(snapshots):
        return json.dumps(snapshots, sort_keys=True).encode()

    monkeypatch.setattr(mintrud, "serialize_mintrud_eisot_batch_xml_v109", encoded)
    monkeypatch.setattr(mintrud, "validate_mintrud_eisot_xml_v109", lambda content: None)
    monkeypatch.setattr(frdo, "read_verified_frdo_po_template_bytes", lambda **kw: b"synthetic-template")
    monkeypatch.setattr(frdo, "format_frdo_po_batch_xlsx", lambda **kw: encoded(kw["approval_snapshots"]))
    monkeypatch.setattr(frdo, "validate_frdo_po_batch_xlsx", lambda **kw: None)


def make_app(registry, actor, session_dependency):
    app = FastAPI()
    app.include_router(admin.router, prefix="/api/v1")
    path = f"/api/v1/admin/{registry}/batches"
    route = next(r for r in app.routes if isinstance(r, APIRoute) and r.path == path and "POST" in r.methods)
    app.dependency_overrides[admin.get_registry_batch_db] = session_dependency

    async def authenticated_actor():
        return SimpleNamespace(id=actor)

    auth = next(d.call for d in route.dependant.dependencies if d.name == "current_user")
    app.dependency_overrides[auth] = authenticated_actor
    return app, path


def row_snapshot(row):
    return {c.key: deepcopy(getattr(row, c.key)) for c in row.__table__.columns}


def file_snapshot(root):
    return {p.relative_to(root).as_posix(): sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file()}


class Rows:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return list(self.rows)

    def scalar_one_or_none(self):
        assert len(self.rows) <= 1
        return self.rows[0] if self.rows else None


class MemorySession:
    """Sequential transaction double only. Unknown queries fail, never silently succeed."""
    def __init__(self, harness):
        self.h = harness
        self.pending = []
        self.flushed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def begin(self):
        return self

    async def execute(self, statement, parameters=None):
        from sqlalchemy.sql.elements import TextClause
        if isinstance(statement, TextClause):
            sql = str(statement)
            if sql == "SHOW transaction_isolation":
                class IsolationResult:
                    def scalar_one(self):
                        return "read committed"
                return IsolationResult()
            assert sql in (
                "SELECT pg_advisory_xact_lock(:fence_key)",
                "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
                "SET LOCAL lock_timeout = '4s'",
                "SET LOCAL statement_timeout = '5s'",
            ), "Unknown transaction-double SQL"
            if "fence_key" in sql:
                assert type(parameters['fence_key']) is int
            return Rows([])
        entities = [d.get("entity") for d in statement.column_descriptions]
        if entities == [RegistrySubmissionBatch]:
            batch_id = next(iter(statement.compile().params.values()))
            return Rows([r for r in self.h.batches() if r.id == batch_id])
        ids = next(v for v in statement.compile().params.values() if isinstance(v, list))
        if entities == [RegistrySubmissionBatchItem]:
            return Rows([r for r in self.h.items() if r.obligation_id in ids])
        assert entities == [RegistryObligation], "Unknown transaction-double query"
        return Rows([self.h.obligations[i] for i in ids if i in self.h.obligations])

    def add(self, row):
        self.pending.append(row)

    def add_all(self, rows):
        self.pending.extend(rows)

    async def flush(self):
        self.h.inject("flush")
        for row in self.pending:
            if getattr(row, "id", None) is None:
                row.id = str(uuid4())
            for name in ("created_at", "updated_at", "generated_at"):
                if hasattr(row, name) and getattr(row, name) is None:
                    setattr(row, name, NOW)
            if isinstance(row, RegistrySubmissionBatchItem) and row.errors_json is None:
                row.errors_json = []
        self.flushed = True

    async def commit(self):
        self.h.inject("commit_before")
        self.h.committed.extend(self.pending)
        self.pending = []
        self.h.commits += 1
        self.h.inject("commit_after")

    async def rollback(self):
        self.pending = []
        self.h.rollbacks += 1


class Harness:
    def __init__(self, registry, root, monkeypatch):
        self.registry, self.root = registry, root
        self.actor = str(uuid4())
        self.obligations, self.snapshots = {}, {}
        self.committed, self.sessions = [], []
        self.commits = self.rollbacks = 0
        self.failure = None
        # Unit-only independent committed-state reader. The PG companion never
        # constructs Harness and keeps the real session factory and fences.
        import app.services.registry_batch_commit_outcome as commit_outcome
        monkeypatch.setattr(commit_outcome, 'AsyncSessionLocal', lambda: MemorySession(self))
        for label in "ABC":
            oid = str(uuid4())
            obj = RegistryObligation(id=oid, registry=registry, status="needs_approval", readiness_errors=[])
            snap = synthetic_snapshot(registry, label)
            approve(obj, self.actor, snap)
            self.obligations[oid], self.snapshots[oid] = obj, snap
        self.ids = list(self.obligations)
        isolate_dependencies(monkeypatch, root, self.snapshots)

        async def dependency():
            session = MemorySession(self)
            self.sessions.append(session)
            try:
                yield session
            finally:
                if session.pending:
                    await session.rollback()

        self.app, self.path = make_app(registry, self.actor, dependency)

    def inject(self, point):
        if self.failure and self.failure[0] == point:
            _, error = self.failure
            self.failure = None
            raise error

    async def post(self, ids=None, *, lose_response=False):
        app = self.app
        if lose_response:
            real_app = app

            async def drop_response(scope, receive, send):
                async def discard(message):
                    pass
                await real_app(scope, receive, discard)
                raise httpx.ReadError("simulated response loss AFTER app completion/commit")
            app = drop_response
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test.invalid") as client:
            return await client.post(self.path, json={"obligation_ids": self.ids[:2] if ids is None else ids})

    def batches(self):
        return [r for r in self.committed if isinstance(r, RegistrySubmissionBatch)]

    def items(self):
        return [r for r in self.committed if isinstance(r, RegistrySubmissionBatchItem)]

    def assert_integrity(self):
        files = file_snapshot(self.root)
        assert files == {r.artifact_path: r.artifact_sha256 for r in self.batches()}, (
            "Committed rows and artifact files disagree", len(self.batches()), files
        )


@pytest.fixture(params=["mintrud", "frdo"])
def h(request, tmp_path, monkeypatch):
    return Harness(request.param, tmp_path, monkeypatch)


@pytest.mark.asyncio
async def test_a_first_http_request_creates_one_batch_and_file(h):
    response = await h.post()
    assert response.status_code == 201, response.text
    assert len(h.batches()) == 1 and len(h.items()) == 2 and h.commits == 1
    assert response.json()["id"] == h.batches()[0].id
    h.assert_integrity()


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["exact", "lost_http_response", "reversed_order"])
async def test_b_c_i_replay_cannot_create_second_batch_or_file(h, mode):
    if mode == "lost_http_response":
        with pytest.raises(httpx.ReadError):
            await h.post(lose_response=True)
    else:
        assert (await h.post()).status_code == 201
    assert len(h.batches()) == 1 and h.commits == 1
    original = h.batches()[0].id
    before_files = file_snapshot(h.root)
    response = await h.post(list(reversed(h.ids[:2])) if mode == "reversed_order" else None)
    assert response.status_code in (200, 201, 409), response.text
    assert (len(h.batches()), file_snapshot(h.root)) == (1, before_files), (
        "Replay duplicated batch/artifact", len(h.batches()), len(file_snapshot(h.root))
    )
    if response.status_code != 409:
        assert response.json()["id"] == original
    h.assert_integrity()


@pytest.mark.asyncio
async def test_e_overlap_cannot_export_b_twice(h):
    assert (await h.post(h.ids[:2])).status_code == 201
    before_files = file_snapshot(h.root)
    response = await h.post(h.ids[1:])
    assert response.status_code in (200, 201, 409)
    assert sum(i.obligation_id == h.ids[1] for i in h.items()) == 1, "B exported twice in one approval event"
    assert len(h.batches()) == 1 and file_snapshot(h.root) == before_files
    h.assert_integrity()


@pytest.mark.asyncio
async def test_f_new_legal_approval_same_fingerprint_can_export_again(h):
    oid = h.ids[0]
    assert (await h.post([oid])).status_code == 201
    obj = h.obligations[oid]
    old_fp, old_at = obj.approval_fingerprint, obj.approved_at
    historical = [row_snapshot(r) for r in h.committed]
    # A source change followed by a revert can invalidate approval without
    # changing its final snapshot. Use the actual invalidation/approval writers.
    assert invalidate_registry_approval(obj, reason="course_title_changed", invalidated_at=NOW + timedelta(seconds=1))
    approve(obj, h.actor, h.snapshots[oid], NOW + timedelta(seconds=2))
    assert obj.approved_at != old_at and obj.approval_fingerprint == old_fp
    response = await h.post([oid])
    assert response.status_code == 201, response.text
    assert len(h.batches()) == 2 and h.batches()[0].id != h.batches()[1].id
    assert [row_snapshot(r) for r in h.committed[:len(historical)]] == historical
    h.assert_integrity()


@pytest.mark.asyncio
async def test_g_existing_historical_rows_and_artifact_stay_immutable(h):
    assert (await h.post(h.ids[:2])).status_code == 201
    rows = list(h.committed)
    before = [row_snapshot(r) for r in rows]
    files = file_snapshot(h.root)
    await h.post(h.ids[:2])
    assert all(any(r is old for r in h.committed) for old in rows)
    assert [row_snapshot(r) for r in rows] == before
    assert all(file_snapshot(h.root).get(path) == digest for path, digest in files.items())


@pytest.mark.asyncio
@pytest.mark.parametrize("phase", [
    "write", "flush", "audit", "commit_before", "commit_after",
    "cancel_flush", "cancel_audit", "cancel_commit_before", "cancel_commit_after",
])
async def test_h_failure_or_cancellation_keeps_rows_and_files_consistent(h, monkeypatch, phase):
    if phase == "write":
        # Failure inside the REAL exclusive writer, after bytes were written.
        service = mintrud if h.registry == "mintrud" else frdo
        writer = service.write_private_storage_file_exclusive if h.registry == "mintrud" else service.write_frdo_batch_artifact_exclusive
        module = __import__(writer.__module__, fromlist=["sync_artifact_directory_chain"])

        def fail_sync(*args):
            raise OSError("injected file durability failure")
        monkeypatch.setattr(module, "sync_artifact_directory_chain", fail_sync)
    elif phase in ("audit", "cancel_audit"):
        async def fail_audit(*args, **kwargs):
            if phase == "cancel_audit":
                raise asyncio.CancelledError("injected audit cancellation")
            raise RuntimeError("injected audit failure")
        monkeypatch.setattr(admin, "create_admin_audit_event", fail_audit)
    else:
        point = phase.removeprefix("cancel_")
        error = asyncio.CancelledError("injected cancellation") if phase.startswith("cancel_") else RuntimeError("injected transaction failure")
        h.failure = (point, error)

    try:
        response = await h.post()
        assert phase == "write" and response.status_code == 409, response.text
    except (RuntimeError, OSError, asyncio.CancelledError):
        pass
    assert len(h.batches()) == (1 if phase in ("commit_after", "cancel_commit_after") else 0)
    # Ambiguous COMMIT with a committed row must retain its file.
    # Definite no-COMMIT currently leaks an unreferenced file: RED contract.
    h.assert_integrity()


@pytest.mark.asyncio
@pytest.mark.parametrize("cancel", [False, True])
async def test_h_ack_loss_retry_does_not_duplicate_committed_batch(h, cancel):
    h.failure = ("commit_after", asyncio.CancelledError("lost ACK") if cancel else ConnectionError("lost ACK"))
    with pytest.raises(asyncio.CancelledError if cancel else ConnectionError):
        await h.post()
    assert len(h.batches()) == 1
    h.assert_integrity()
    response = await h.post()
    assert response.status_code in (200, 201, 409)
    assert len(h.batches()) == 1, "Retry after committed ACK loss duplicated the export"
    h.assert_integrity()
