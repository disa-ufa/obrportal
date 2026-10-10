from __future__ import annotations

import asyncio
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
from uuid import uuid4
from types import SimpleNamespace

import pytest

from app.core.config import settings

import app.services.frdo_po_batches as service
from app.services.compliance_registry_approval import (
    FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
    fingerprint_registry_approval_snapshot,
)
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
)
from app.services.compliance_registry_batches import (
    RegistrySubmissionBatchError,
)
from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
)
from app.services.frdo_po_xlsx_formatter import (
    FrdoPoXlsxFormatterError,
)
from app.services.frdo_po_xlsx_validator import (
    FrdoPoXlsxValidatorError,
)


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, rows, fail_flush=False):
        self.rows = rows
        self.fail_flush = fail_flush
        self.batch = None
        self.items = []
        self.flush_calls = 0

    async def execute(self, statement):
        return FakeResult(self.rows)

    def add(self, batch):
        self.batch = batch

    def add_all(self, items):
        self.items = list(items)

    async def flush(self):
        self.flush_calls += 1

        if self.fail_flush:
            raise RuntimeError("simulated flush failure")


def make_obligation(index):
    snapshot = {
        "schema_version": FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
        "registry": "frdo",
        "enrollment": {"status": "completed"},
        "course": {
            "regulatory_program_type": (
                PROGRAM_TYPE_VOCATIONAL_TRAINING
            ),
        },
        "learner_profile": {},
        "document": {
            "document_number": str(index),
        },
        "frdo_context": {},
    }

    return SimpleNamespace(
        id="obligation-" + str(index),
        registry="frdo",
        status="approved",
        approval_snapshot_json=snapshot,
        approval_fingerprint=(
            fingerprint_registry_approval_snapshot(snapshot)
        ),
    )


@pytest.fixture
def isolated_dependencies(monkeypatch):
    events = []

    async def current_approval(session, *, obligation):
        events.append(("approval", str(obligation.id)))

    def template(*, program_type):
        assert program_type == PROGRAM_TYPE_VOCATIONAL_TRAINING
        events.append(("template",))
        return b"mock-template"

    def formatter(*, approval_snapshots, template_bytes):
        assert template_bytes == b"mock-template"
        events.append(("format", len(approval_snapshots)))
        return b"PKFRDO-BATCH"

    def validator(*, content, approval_snapshots, template_bytes):
        assert content == b"PKFRDO-BATCH"
        assert template_bytes == b"mock-template"
        events.append(("validate", len(approval_snapshots)))

    def write(path, content):
        assert path.startswith("generated/registry/frdo/batches/")
        assert path.endswith(".xlsx")
        assert content == b"PKFRDO-BATCH"
        events.append(("write", path))
        return path

    def delete(path):
        events.append(("delete", path))
        return True

    monkeypatch.setattr(
        service,
        "validate_registry_approval_current",
        current_approval,
    )
    monkeypatch.setattr(
        service,
        "read_verified_frdo_po_template_bytes",
        template,
    )
    monkeypatch.setattr(
        service,
        "format_frdo_po_batch_xlsx",
        formatter,
    )
    monkeypatch.setattr(
        service,
        "validate_frdo_po_batch_xlsx",
        validator,
    )
    monkeypatch.setattr(
        service,
        "write_frdo_batch_artifact_exclusive",
        write,
    )
    monkeypatch.setattr(
        service,
        "delete_registry_submission_batch_artifact_safely",
        delete,
    )

    return events


def run_create(session, ids):
    return asyncio.run(
        service.create_frdo_registry_submission_batch(
            session,
            obligation_ids=ids,
            generated_by_user_id="test-user",
        )
    )


def assert_no_storage(events):
    assert not any(
        event[0] in ("write", "delete")
        for event in events
    )


def test_create_frdo_batch_preserves_order_and_snapshots(
    isolated_dependencies,
):
    first = make_obligation(1)
    second = make_obligation(2)
    before = deepcopy([
        first.approval_snapshot_json,
        second.approval_snapshot_json,
    ])

    session = FakeSession([second, first])

    batch = run_create(
        session,
        [first.id, second.id],
    )

    assert batch.registry == "frdo"
    assert batch.status == "exported"
    assert batch.schema_version == "frdo-po-working-reference-v1"
    assert batch.record_count == 2
    assert batch.obligation_count == 2
    assert batch.artifact_sha256 == sha256(b"PKFRDO-BATCH").hexdigest()
    assert batch.artifact_path.endswith(".xlsx")

    assert [item.obligation_id for item in session.items] == [
        first.id,
        second.id,
    ]
    assert [item.position for item in session.items] == [0, 1]
    assert [item.record_count for item in session.items] == [1, 1]

    for index, obligation in enumerate([first, second]):
        item = session.items[index]
        assert item.approval_fingerprint == obligation.approval_fingerprint
        assert item.approval_snapshot_json == before[index]
        assert item.approval_snapshot_json is not (
            obligation.approval_snapshot_json
        )

    assert [
        first.approval_snapshot_json,
        second.approval_snapshot_json,
    ] == before

    assert session.flush_calls == 1

    kinds = [event[0] for event in isolated_dependencies]
    assert kinds.index("format") < kinds.index("validate")
    assert kinds.index("validate") < kinds.index("write")
    assert "delete" not in kinds


def test_frdo_batch_rejects_1002_before_database(
    isolated_dependencies,
):
    session = FakeSession([])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="1001",
    ):
        run_create(
            session,
            ["obligation-" + str(i) for i in range(1002)],
        )

    assert session.batch is None
    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_duplicate_ids(
    isolated_dependencies,
):
    session = FakeSession([])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="Duplicate",
    ):
        run_create(session, ["same-id", "same-id"])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_missing_obligation(
    isolated_dependencies,
):
    session = FakeSession([make_obligation(1)])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="not found",
    ):
        run_create(
            session,
            ["obligation-1", "obligation-missing"],
        )

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_non_frdo_obligation(
    isolated_dependencies,
):
    obligation = make_obligation(1)
    obligation.registry = "mintrud"

    session = FakeSession([obligation])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="Non-FRDO",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_unapproved_obligation(
    isolated_dependencies,
):
    obligation = make_obligation(1)
    obligation.status = "exported"

    session = FakeSession([obligation])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="not approved",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_stale_approval(
    isolated_dependencies,
    monkeypatch,
):
    obligation = make_obligation(1)
    session = FakeSession([obligation])

    async def stale(session, *, obligation):
        raise RegistrySubmissionAttemptError("stale")

    monkeypatch.setattr(
        service,
        "validate_registry_approval_current",
        stale,
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="stale",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_bad_fingerprint(
    isolated_dependencies,
):
    obligation = make_obligation(1)
    obligation.approval_fingerprint = "0" * 64

    session = FakeSession([obligation])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="fingerprint",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_wrong_snapshot_contract(
    isolated_dependencies,
):
    obligation = make_obligation(1)
    obligation.approval_snapshot_json["course"][
        "regulatory_program_type"
    ] = "other"

    obligation.approval_fingerprint = (
        fingerprint_registry_approval_snapshot(
            obligation.approval_snapshot_json
        )
    )

    session = FakeSession([obligation])

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="Unsupported FRDO",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_formatter_failure_without_storage(
    isolated_dependencies,
    monkeypatch,
):
    obligation = make_obligation(1)
    session = FakeSession([obligation])

    def formatter(**kwargs):
        raise FrdoPoXlsxFormatterError(
            "funding_source_budget"
        )

    monkeypatch.setattr(
        service,
        "format_frdo_po_batch_xlsx",
        formatter,
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="funding_source_budget",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_rejects_validation_failure_without_storage(
    isolated_dependencies,
    monkeypatch,
):
    obligation = make_obligation(1)
    session = FakeSession([obligation])

    def validator(**kwargs):
        raise FrdoPoXlsxValidatorError(
            "invalid middle row"
        )

    monkeypatch.setattr(
        service,
        "validate_frdo_po_batch_xlsx",
        validator,
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="invalid middle row",
    ):
        run_create(session, [obligation.id])

    assert_no_storage(isolated_dependencies)


def test_frdo_batch_flush_failure_cleans_artifact(
    isolated_dependencies,
):
    obligation = make_obligation(1)
    session = FakeSession(
        [obligation],
        fail_flush=True,
    )

    with pytest.raises(
        RuntimeError,
        match="flush failure",
    ):
        run_create(session, [obligation.id])

    assert session.flush_calls == 1

    events = isolated_dependencies
    writes = [event for event in events if event[0] == "write"]
    deletes = [event for event in events if event[0] == "delete"]

    assert len(writes) == 1
    assert len(deletes) == 1
    assert deletes[0][1] == writes[0][1]


def test_frdo_batch_file_collision_does_not_delete_existing(
    isolated_dependencies,
    monkeypatch,
):
    obligation = make_obligation(1)
    session = FakeSession([obligation])

    def collision(path, content):
        raise FileExistsError(path)

    monkeypatch.setattr(
        service,
        "write_frdo_batch_artifact_exclusive",
        collision,
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="already exists",
    ):
        run_create(session, [obligation.id])

    assert session.batch is None
    assert not any(
        event[0] == "delete"
        for event in isolated_dependencies
    )


def test_frdo_batch_artifact_path_rejects_invalid_id():
    with pytest.raises(RegistrySubmissionBatchError):
        service.build_frdo_po_batch_artifact_path("../escape")


def _real_test_artifact_path():
    return service.build_frdo_po_batch_artifact_path(
        str(uuid4())
    )


def test_frdo_real_file_write_success(tmp_path, monkeypatch):
    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(tmp_path),
    )

    relative = _real_test_artifact_path()
    content = b"PK-real-frdo-artifact"

    stored = service.write_frdo_batch_artifact_exclusive(
        relative,
        content,
    )

    target = tmp_path.joinpath(*relative.split("/"))

    assert stored == relative
    assert target.is_file()
    assert target.read_bytes() == content


def test_frdo_real_file_collision_preserves_existing(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(tmp_path),
    )

    relative = _real_test_artifact_path()
    target = tmp_path.joinpath(*relative.split("/"))

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"existing-content")

    with pytest.raises(FileExistsError):
        service.write_frdo_batch_artifact_exclusive(
            relative,
            b"PK-new-artifact",
        )

    assert target.read_bytes() == b"existing-content"


def test_frdo_real_partial_file_failure_cleans_artifact(
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(tmp_path),
    )

    relative = _real_test_artifact_path()
    target = tmp_path.joinpath(*relative.split("/"))

    original_open = Path.open

    class InterruptedFile:
        def __init__(self, handle):
            self.handle = handle

        def __enter__(self):
            self.handle.__enter__()
            return self

        def __exit__(self, *args):
            return self.handle.__exit__(*args)

        def write(self, content):
            self.handle.write(content[:4])
            raise OSError("simulated interrupted file write")

    def interrupted_open(path, mode="r", *args, **kwargs):
        handle = original_open(
            path,
            mode,
            *args,
            **kwargs,
        )

        if path == target and mode == "xb":
            return InterruptedFile(handle)

        return handle

    monkeypatch.setattr(
        Path,
        "open",
        interrupted_open,
    )

    with pytest.raises(
        OSError,
        match="simulated interrupted file write",
    ):
        service.write_frdo_batch_artifact_exclusive(
            relative,
            b"PK-this-file-must-not-survive",
        )

    assert not target.exists()
    assert not list(tmp_path.rglob("*.xlsx"))
