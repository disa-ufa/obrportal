from __future__ import annotations

import asyncio
import xml.etree.ElementTree as ET
from hashlib import sha256
from pathlib import Path
from types import SimpleNamespace

import pytest

import app.services.compliance_registry_batches as batch_service
from app.models.registry_submission_batch import (
    RegistrySubmissionBatch,
    RegistrySubmissionBatchItem,
)
from app.services.compliance_registry_approval import (
    fingerprint_registry_approval_snapshot,
)
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
)
from app.services.compliance_registry_batches import (
    REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED,
    REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED,
    REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED,
    RegistrySubmissionBatchError,
    build_registry_submission_batch_artifact_path,
    create_mintrud_registry_submission_batch,
    mark_mintrud_registry_submission_batch_imported,
    mark_mintrud_registry_submission_batch_submitted,
    normalize_batch_obligation_ids,
    normalize_batch_result_items,
    record_mintrud_registry_submission_batch_result,
    read_registry_submission_batch_artifact,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_ACCEPTED,
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_CORRECTION_REQUIRED,
    OBLIGATION_STATUS_EXPORTED,
    OBLIGATION_STATUS_REJECTED,
    OBLIGATION_STATUS_SUBMITTED,
    REGISTRY_MINTRUD,
)


def make_snapshot(
    *,
    last_name: str,
    program_ids: tuple[int, ...],
) -> dict:
    return {
        "schema_version": "registry-approval-v1",
        "registry": REGISTRY_MINTRUD,
        "enrollment": {
            "status": "completed",
            "completed_at": (
                "2026-09-22T10:00:00+00:00"
            ),
        },
        "course": {
            "title": "Batch course",
        },
        "learner_profile": {
            "last_name": last_name,
            "first_name": "Ivan",
            "middle_name": "Petrovich",
            "snils": "123-456-789 01",
        },
        "mintrud_context": {
            "reporting_scenario": (
                "external_training_provider"
            ),
            "profession_or_position": (
                "Engineer"
            ),
            "employer_name": (
                "External Employer"
            ),
            "employer_inn": "0274000001",
            "knowledge_check_result": (
                "satisfactory"
            ),
            "knowledge_check_date": (
                "2026-09-22"
            ),
            "protocol_number": (
                "PR-2026-77"
            ),
        },
        "mintrud_learn_programs": [
            {
                "id": (
                    "program-"
                    + str(program_id)
                ),
                "learn_program_id": (
                    program_id
                ),
                "code": (
                    "P"
                    + str(program_id)
                ),
                "title": (
                    "Program "
                    + str(program_id)
                ),
                "schema_version": "1.0.9",
            }
            for program_id
            in program_ids
        ],
        "mintrud_reporting_organization": {
            "name": (
                "Training Organization"
            ),
            "inn": "0274000002",
        },
    }


def make_obligation(
    obligation_id: str,
    snapshot: dict,
    *,
    registry: str = REGISTRY_MINTRUD,
):
    return SimpleNamespace(
        id=obligation_id,
        registry=registry,
        approval_snapshot_json=snapshot,
        approval_fingerprint=(
            fingerprint_registry_approval_snapshot(
                snapshot
            )
        ),
    )


class FakeScalarResult:
    def __init__(
        self,
        rows,
    ):
        self.rows = list(
            rows
        )

    def scalars(self):
        return self

    def all(self):
        return list(
            self.rows
        )


class FakeSession:
    def __init__(
        self,
        rows=(),
        *,
        fail_flush: bool = False,
    ):
        self.rows = list(
            rows
        )
        self.fail_flush = (
            fail_flush
        )
        self.execute_count = 0
        self.flush_count = 0
        self.added = []

    async def execute(
        self,
        statement,
    ):
        self.execute_count += 1

        return FakeScalarResult(
            self.rows
        )

    def add(
        self,
        value,
    ):
        self.added.append(
            value
        )

    def add_all(
        self,
        values,
    ):
        self.added.extend(
            list(values)
        )

    async def flush(self):
        self.flush_count += 1

        if self.fail_flush:
            raise RuntimeError(
                "forced flush failure"
            )


async def noop_current_approval(
    session,
    *,
    obligation,
):
    return None


def test_normalize_batch_obligation_ids():
    assert normalize_batch_obligation_ids(
        [
            " a ",
            "b",
        ]
    ) == [
        "a",
        "b",
    ]

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="At least one",
    ):
        normalize_batch_obligation_ids(
            []
        )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="Duplicate",
    ):
        normalize_batch_obligation_ids(
            [
                "same",
                "same",
            ]
        )


def test_batch_artifact_path_is_separate():
    path = (
        build_registry_submission_batch_artifact_path(
            "batch-123"
        )
    )

    assert path == (
        "generated/registry/mintrud/"
        "batches/batch-123.xml"
    )


def test_create_batch_preserves_requested_order_and_snapshots(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="FirstWorker",
        program_ids=(
            1,
            2,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="SecondWorker",
        program_ids=(
            3,
        ),
    )

    first = make_obligation(
        "obligation-1",
        first_snapshot,
    )

    second = make_obligation(
        "obligation-2",
        second_snapshot,
    )

    session = FakeSession(
        [
            second,
            first,
        ]
    )

    validated = []
    storage = {}
    deleted = []

    async def validate_current(
        session_arg,
        *,
        obligation,
    ):
        validated.append(
            str(
                obligation.id
            )
        )

    def write_file(
        storage_path,
        content,
    ):
        storage[
            "path"
        ] = str(
            storage_path
        )

        storage[
            "content"
        ] = content

        return str(
            storage_path
        )

    def delete_file(
        storage_path,
    ):
        deleted.append(
            storage_path
        )
        return True

    monkeypatch.setattr(
        batch_service,
        "validate_registry_approval_current",
        validate_current,
    )

    monkeypatch.setattr(
        batch_service,
        "write_private_storage_file_exclusive",
        write_file,
    )

    monkeypatch.setattr(
        batch_service,
        "delete_private_storage_file",
        delete_file,
    )

    batch = asyncio.run(
        create_mintrud_registry_submission_batch(
            session,
            obligation_ids=[
                "obligation-1",
                "obligation-2",
            ],
            generated_by_user_id=(
                "admin-user"
            ),
        )
    )

    assert isinstance(
        batch,
        RegistrySubmissionBatch,
    )

    assert validated == [
        "obligation-1",
        "obligation-2",
    ]

    assert session.execute_count == 1
    assert session.flush_count == 1

    assert batch.registry == REGISTRY_MINTRUD
    assert batch.status == "exported"
    assert batch.transport == "file"
    assert batch.schema_version == "1.0.9"
    assert batch.obligation_count == 2
    assert batch.record_count == 3
    assert batch.generated_by_user_id == (
        "admin-user"
    )

    assert batch.artifact_path == (
        storage[
            "path"
        ]
    )

    assert batch.artifact_sha256 == (
        sha256(
            storage[
                "content"
            ]
        ).hexdigest()
    )

    assert (
        "/batches/"
        in batch.artifact_path
    )

    assert deleted == []

    items = [
        value
        for value in session.added
        if isinstance(
            value,
            RegistrySubmissionBatchItem,
        )
    ]

    assert len(items) == 2

    assert [
        item.obligation_id
        for item in items
    ] == [
        "obligation-1",
        "obligation-2",
    ]

    assert [
        item.position
        for item in items
    ] == [
        0,
        1,
    ]

    assert [
        item.record_count
        for item in items
    ] == [
        2,
        1,
    ]

    assert (
        items[0]
        .approval_snapshot_json
        == first_snapshot
    )

    assert (
        items[0]
        .approval_snapshot_json
        is not first_snapshot
    )

    assert (
        items[0]
        .approval_fingerprint
        == first.approval_fingerprint
    )

    root = ET.fromstring(
        storage[
            "content"
        ]
    )

    records = root.findall(
        "RegistryRecord"
    )

    assert len(records) == 3

    assert [
        record.findtext(
            "Worker/LastName"
        )
        for record in records
    ] == [
        "FirstWorker",
        "FirstWorker",
        "SecondWorker",
    ]


def test_batch_rejects_duplicate_ids_before_query():
    session = FakeSession()

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="Duplicate",
    ):
        asyncio.run(
            create_mintrud_registry_submission_batch(
                session,
                obligation_ids=[
                    "obligation-1",
                    "obligation-1",
                ],
                generated_by_user_id=(
                    "admin-user"
                ),
            )
        )

    assert session.execute_count == 0
    assert session.added == []


def test_batch_rejects_missing_obligation_before_storage(
    monkeypatch,
):
    snapshot = make_snapshot(
        last_name="OnlyWorker",
        program_ids=(
            1,
        ),
    )

    session = FakeSession(
        [
            make_obligation(
                "obligation-1",
                snapshot,
            )
        ]
    )

    storage_called = []

    monkeypatch.setattr(
        batch_service,
        "write_private_storage_file_exclusive",
        lambda path, content: (
            storage_called.append(
                str(path)
            )
            or str(path)
        ),
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="were not found",
    ):
        asyncio.run(
            create_mintrud_registry_submission_batch(
                session,
                obligation_ids=[
                    "obligation-1",
                    "obligation-missing",
                ],
                generated_by_user_id=(
                    "admin-user"
                ),
            )
        )

    assert storage_called == []
    assert session.added == []


def test_batch_requires_mintrud_and_current_approval(
    monkeypatch,
):
    snapshot = make_snapshot(
        last_name="Worker",
        program_ids=(
            1,
        ),
    )

    non_mintrud = (
        make_obligation(
            "obligation-frdo",
            snapshot,
            registry="frdo",
        )
    )

    session = FakeSession(
        [
            non_mintrud
        ]
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="Mintrud obligations only",
    ):
        asyncio.run(
            create_mintrud_registry_submission_batch(
                session,
                obligation_ids=[
                    "obligation-frdo",
                ],
                generated_by_user_id=(
                    "admin-user"
                ),
            )
        )

    current = make_obligation(
        "obligation-stale",
        snapshot,
    )

    stale_session = FakeSession(
        [
            current
        ]
    )

    async def stale_validator(
        session_arg,
        *,
        obligation,
    ):
        raise RegistrySubmissionAttemptError(
            "approval is stale"
        )

    monkeypatch.setattr(
        batch_service,
        "validate_registry_approval_current",
        stale_validator,
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="approval is stale",
    ):
        asyncio.run(
            create_mintrud_registry_submission_batch(
                stale_session,
                obligation_ids=[
                    "obligation-stale",
                ],
                generated_by_user_id=(
                    "admin-user"
                ),
            )
        )

    assert stale_session.added == []


def test_xsd_validation_happens_before_storage_and_persistence(
    monkeypatch,
):
    snapshot = make_snapshot(
        last_name="Worker",
        program_ids=(
            1,
        ),
    )

    obligation = make_obligation(
        "obligation-1",
        snapshot,
    )

    session = FakeSession(
        [
            obligation
        ]
    )

    storage_called = []

    monkeypatch.setattr(
        batch_service,
        "validate_registry_approval_current",
        noop_current_approval,
    )

    monkeypatch.setattr(
        batch_service,
        "serialize_mintrud_eisot_batch_xml_v109",
        lambda snapshots: (
            b'<?xml version="1.0" '
            b'encoding="utf-8"?>'
            b"<RegistrySet />"
        ),
    )

    monkeypatch.setattr(
        batch_service,
        "write_private_storage_file_exclusive",
        lambda path, content: (
            storage_called.append(
                str(path)
            )
            or str(path)
        ),
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
    ):
        asyncio.run(
            create_mintrud_registry_submission_batch(
                session,
                obligation_ids=[
                    "obligation-1",
                ],
                generated_by_user_id=(
                    "admin-user"
                ),
            )
        )

    assert storage_called == []
    assert session.added == []
    assert session.flush_count == 0


def test_database_flush_failure_cleans_written_artifact(
    monkeypatch,
):
    snapshot = make_snapshot(
        last_name="Worker",
        program_ids=(
            1,
        ),
    )

    obligation = make_obligation(
        "obligation-1",
        snapshot,
    )

    session = FakeSession(
        [
            obligation
        ],
        fail_flush=True,
    )

    written = []
    deleted = []

    monkeypatch.setattr(
        batch_service,
        "validate_registry_approval_current",
        noop_current_approval,
    )

    def write_file(
        storage_path,
        content,
    ):
        written.append(
            str(storage_path)
        )

        return str(
            storage_path
        )

    def delete_file(
        storage_path,
    ):
        deleted.append(
            storage_path
        )

        return True

    monkeypatch.setattr(
        batch_service,
        "write_private_storage_file_exclusive",
        write_file,
    )

    monkeypatch.setattr(
        batch_service,
        "delete_private_storage_file",
        delete_file,
    )

    with pytest.raises(
        RuntimeError,
        match="forced flush failure",
    ):
        asyncio.run(
            create_mintrud_registry_submission_batch(
                session,
                obligation_ids=[
                    "obligation-1",
                ],
                generated_by_user_id=(
                    "admin-user"
                ),
            )
        )

    assert len(written) == 1
    assert deleted == written


def test_read_batch_artifact_checks_sha256(
    monkeypatch,
    tmp_path: Path,
):
    content = b"<RegistrySet />"

    artifact = (
        tmp_path
        / "batch.xml"
    )

    artifact.write_bytes(
        content
    )

    batch = SimpleNamespace(
        artifact_path=(
            "generated/registry/mintrud/"
            "batches/batch.xml"
        ),
        artifact_sha256=(
            sha256(
                content
            ).hexdigest()
        ),
    )

    monkeypatch.setattr(
        batch_service,
        "resolve_private_storage_path",
        lambda storage_path: artifact,
    )

    assert (
        read_registry_submission_batch_artifact(
            batch
        )
        == content
    )

    batch.artifact_sha256 = (
        "0" * 64
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="checksum mismatch",
    ):
        read_registry_submission_batch_artifact(
            batch
        )


def make_lifecycle_obligation(
    obligation_id: str,
    snapshot: dict,
    *,
    status: str,
):
    return SimpleNamespace(
        id=obligation_id,
        registry=REGISTRY_MINTRUD,
        status=status,
        approval_snapshot_json=snapshot,
        approval_fingerprint=(
            fingerprint_registry_approval_snapshot(
                snapshot
            )
        ),
        submitted_at=None,
        accepted_at=None,
        external_id=None,
        last_error=None,
    )


def make_lifecycle_item(
    batch_id: str,
    obligation,
    *,
    position: int,
):
    snapshot = dict(
        obligation.approval_snapshot_json
    )

    return SimpleNamespace(
        batch_id=batch_id,
        obligation_id=str(
            obligation.id
        ),
        position=position,
        approval_snapshot_json=snapshot,
        approval_fingerprint=(
            fingerprint_registry_approval_snapshot(
                snapshot
            )
        ),
        record_count=len(
            snapshot[
                "mintrud_learn_programs"
            ]
        ),
        result_status=None,
        errors_json=[],
        external_id=None,
        result_recorded_by_user_id=None,
        result_recorded_at=None,
    )


def make_lifecycle_batch(
    *,
    status: str,
    obligation_count: int,
    record_count: int,
):
    return SimpleNamespace(
        id="batch-lifecycle-1",
        registry=REGISTRY_MINTRUD,
        status=status,
        obligation_count=obligation_count,
        record_count=record_count,
        artifact_path=(
            "generated/registry/mintrud/"
            "batches/batch-lifecycle-1.xml"
        ),
        artifact_sha256=(
            "a" * 64
        ),
        imported_by_user_id=None,
        imported_at=None,
        submitted_by_user_id=None,
        submitted_at=None,
        external_reference=None,
        reconciled_by_user_id=None,
        reconciled_at=None,
    )


def install_lifecycle_loaders(
    monkeypatch,
    *,
    batch,
    items,
    obligations,
):
    async def load_batch(
        session,
        *,
        batch_id,
    ):
        assert batch_id == str(
            batch.id
        )

        return batch

    async def load_items_and_obligations(
        session,
        *,
        batch,
    ):
        return (
            items,
            obligations,
        )

    async def validate_current(
        session,
        *,
        obligation,
    ):
        return None

    monkeypatch.setattr(
        batch_service,
        "_load_mintrud_batch_for_update",
        load_batch,
    )

    monkeypatch.setattr(
        batch_service,
        "_load_batch_items_and_obligations_for_update",
        load_items_and_obligations,
    )

    monkeypatch.setattr(
        batch_service,
        "validate_registry_approval_current",
        validate_current,
    )


def test_batch_import_transition_updates_all_obligations(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="ImportOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="ImportTwo",
        program_ids=(
            2,
            3,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-import-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_APPROVED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-import-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_APPROVED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
        ),
        obligation_count=2,
        record_count=3,
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    artifact_checks = []

    monkeypatch.setattr(
        batch_service,
        "read_registry_submission_batch_artifact",
        lambda value: (
            artifact_checks.append(
                str(
                    value.id
                )
            )
            or b"<RegistrySet />"
        ),
    )

    result = asyncio.run(
        mark_mintrud_registry_submission_batch_imported(
            session,
            batch_id=str(
                batch.id
            ),
            imported_by_user_id=(
                " admin-import "
            ),
        )
    )

    assert result is batch

    assert batch.status == (
        REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
    )

    assert batch.imported_by_user_id == (
        "admin-import"
    )

    assert batch.imported_at is not None

    assert (
        batch.imported_at.tzinfo
        is not None
    )

    assert batch.submitted_at is None
    assert batch.submitted_by_user_id is None

    assert first.status == (
        OBLIGATION_STATUS_EXPORTED
    )

    assert second.status == (
        OBLIGATION_STATUS_EXPORTED
    )

    assert artifact_checks == [
        "batch-lifecycle-1",
    ]

    assert session.flush_count == 1


def test_batch_import_validates_every_item_before_mutation(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="AtomicOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="AtomicTwo",
        program_ids=(
            2,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-atomic-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_APPROVED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-atomic-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_EXPORTED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
        ),
        obligation_count=2,
        record_count=2,
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    monkeypatch.setattr(
        batch_service,
        "read_registry_submission_batch_artifact",
        lambda value: b"<RegistrySet />",
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="must be approved",
    ):
        asyncio.run(
            mark_mintrud_registry_submission_batch_imported(
                session,
                batch_id=str(
                    batch.id
                ),
                imported_by_user_id=(
                    "admin-import"
                ),
            )
        )

    assert first.status == (
        OBLIGATION_STATUS_APPROVED
    )

    assert second.status == (
        OBLIGATION_STATUS_EXPORTED
    )

    assert batch.status == (
        REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
    )

    assert batch.imported_at is None
    assert session.flush_count == 0


def test_batch_import_rejects_item_fingerprint_mismatch(
    monkeypatch,
):
    snapshot = make_snapshot(
        last_name="Fingerprint",
        program_ids=(
            1,
        ),
    )

    obligation = make_lifecycle_obligation(
        "obligation-fingerprint",
        snapshot,
        status=(
            OBLIGATION_STATUS_APPROVED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
        ),
        obligation_count=1,
        record_count=1,
    )

    item = make_lifecycle_item(
        str(batch.id),
        obligation,
        position=0,
    )

    item.approval_fingerprint = (
        "0" * 64
    )

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=[
            item,
        ],
        obligations=[
            obligation,
        ],
    )

    monkeypatch.setattr(
        batch_service,
        "read_registry_submission_batch_artifact",
        lambda value: b"<RegistrySet />",
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="fingerprint mismatch",
    ):
        asyncio.run(
            mark_mintrud_registry_submission_batch_imported(
                session,
                batch_id=str(
                    batch.id
                ),
                imported_by_user_id=(
                    "admin-import"
                ),
            )
        )

    assert obligation.status == (
        OBLIGATION_STATUS_APPROVED
    )

    assert batch.status == (
        REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
    )

    assert session.flush_count == 0


def test_batch_submit_transition_updates_all_obligations(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="SubmitOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="SubmitTwo",
        program_ids=(
            2,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-submit-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_EXPORTED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-submit-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_EXPORTED
        ),
    )

    first.accepted_at = "old-accepted"
    first.external_id = "old-external"
    first.last_error = "old-error"

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
        ),
        obligation_count=2,
        record_count=2,
    )

    batch.imported_by_user_id = (
        "admin-import"
    )

    batch.imported_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    artifact_checks = []

    monkeypatch.setattr(
        batch_service,
        "read_registry_submission_batch_artifact",
        lambda value: (
            artifact_checks.append(
                str(
                    value.id
                )
            )
            or b"<RegistrySet />"
        ),
    )

    result = asyncio.run(
        mark_mintrud_registry_submission_batch_submitted(
            session,
            batch_id=str(
                batch.id
            ),
            submitted_by_user_id=(
                " admin-submit "
            ),
            external_reference=(
                " EISOT-SET-77 "
            ),
        )
    )

    assert result is batch

    assert batch.status == (
        REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
    )

    assert batch.submitted_by_user_id == (
        "admin-submit"
    )

    assert batch.external_reference == (
        "EISOT-SET-77"
    )

    assert batch.submitted_at is not None

    assert first.status == (
        OBLIGATION_STATUS_SUBMITTED
    )

    assert second.status == (
        OBLIGATION_STATUS_SUBMITTED
    )

    assert first.submitted_at == (
        batch.submitted_at
    )

    assert second.submitted_at == (
        batch.submitted_at
    )

    assert first.accepted_at is None
    assert first.external_id is None
    assert first.last_error is None

    assert artifact_checks == [
        "batch-lifecycle-1",
    ]

    assert session.flush_count == 1


def test_batch_submit_validates_every_item_before_mutation(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="SubmitAtomicOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="SubmitAtomicTwo",
        program_ids=(
            2,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-submit-atomic-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_EXPORTED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-submit-atomic-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_APPROVED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
        ),
        obligation_count=2,
        record_count=2,
    )

    batch.imported_by_user_id = (
        "admin-import"
    )

    batch.imported_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    monkeypatch.setattr(
        batch_service,
        "read_registry_submission_batch_artifact",
        lambda value: b"<RegistrySet />",
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="must be exported",
    ):
        asyncio.run(
            mark_mintrud_registry_submission_batch_submitted(
                session,
                batch_id=str(
                    batch.id
                ),
                submitted_by_user_id=(
                    "admin-submit"
                ),
                external_reference=None,
            )
        )

    assert first.status == (
        OBLIGATION_STATUS_EXPORTED
    )

    assert first.submitted_at is None

    assert second.status == (
        OBLIGATION_STATUS_APPROVED
    )

    assert batch.status == (
        REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
    )

    assert batch.submitted_at is None

    assert session.flush_count == 0


def test_batch_lifecycle_rejects_invalid_transition_state(
    monkeypatch,
):
    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
        ),
        obligation_count=1,
        record_count=1,
    )

    session = FakeSession()

    async def load_batch(
        session_arg,
        *,
        batch_id,
    ):
        return batch

    monkeypatch.setattr(
        batch_service,
        "_load_mintrud_batch_for_update",
        load_batch,
    )

    artifact_called = []

    monkeypatch.setattr(
        batch_service,
        "read_registry_submission_batch_artifact",
        lambda value: (
            artifact_called.append(
                True
            )
            or b""
        ),
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="must be exported",
    ):
        asyncio.run(
            mark_mintrud_registry_submission_batch_imported(
                session,
                batch_id=str(
                    batch.id
                ),
                imported_by_user_id=(
                    "admin-import"
                ),
            )
        )

    assert artifact_called == []
    assert session.flush_count == 0


@pytest.mark.parametrize(
    (
        "payload",
        "message",
    ),
    [
        (
            [
                {
                    "obligation_id": "obligation-1",
                    "result_status": "accepted",
                    "external_id": None,
                    "errors": [
                        "must-not-exist",
                    ],
                },
            ],
            "must not contain errors",
        ),
        (
            [
                {
                    "obligation_id": "obligation-1",
                    "result_status": "rejected",
                    "external_id": "external-1",
                    "errors": [],
                },
            ],
            "allowed only for accepted",
        ),
        (
            [
                {
                    "obligation_id": "obligation-1",
                    "result_status": "accepted",
                    "external_id": None,
                    "errors": [],
                },
                {
                    "obligation_id": "obligation-1",
                    "result_status": "accepted",
                    "external_id": None,
                    "errors": [],
                },
            ],
            "Duplicate",
        ),
    ],
)
def test_normalize_batch_result_items_semantics(
    payload,
    message,
):
    with pytest.raises(
        RegistrySubmissionBatchError,
        match=message,
    ):
        normalize_batch_result_items(
            payload
        )


def test_batch_result_reconciliation_updates_every_item_atomically(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="ResultOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="ResultTwo",
        program_ids=(
            2,
            3,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-result-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_SUBMITTED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-result-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_SUBMITTED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
        ),
        obligation_count=2,
        record_count=3,
    )

    batch.submitted_by_user_id = (
        "admin-submit"
    )

    batch.submitted_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    result_batch, result_items = asyncio.run(
        record_mintrud_registry_submission_batch_result(
            session,
            batch_id=str(
                batch.id
            ),
            recorded_by_user_id=(
                " admin-result "
            ),
            results=[
                {
                    "obligation_id": (
                        str(
                            second.id
                        )
                    ),
                    "result_status": (
                        OBLIGATION_STATUS_CORRECTION_REQUIRED
                    ),
                    "external_id": None,
                    "errors": [
                        " issue one ",
                        "",
                        "issue two",
                    ],
                },
                {
                    "obligation_id": (
                        str(
                            first.id
                        )
                    ),
                    "result_status": (
                        OBLIGATION_STATUS_ACCEPTED
                    ),
                    "external_id": (
                        " EXT-001 "
                    ),
                    "errors": [],
                },
            ],
        )
    )

    assert result_batch is batch
    assert result_items == items

    assert (
        batch.status
        == REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
    )

    assert (
        batch.reconciled_by_user_id
        == "admin-result"
    )

    assert batch.reconciled_at is not None

    assert (
        first.status
        == OBLIGATION_STATUS_ACCEPTED
    )

    assert (
        first.accepted_at
        == batch.reconciled_at
    )

    assert (
        first.external_id
        == "EXT-001"
    )

    assert first.last_error is None

    assert (
        items[0].result_status
        == OBLIGATION_STATUS_ACCEPTED
    )

    assert items[0].errors_json == []

    assert (
        items[0].external_id
        == "EXT-001"
    )

    assert (
        items[0].result_recorded_by_user_id
        == "admin-result"
    )

    assert (
        items[0].result_recorded_at
        == batch.reconciled_at
    )

    assert (
        second.status
        == OBLIGATION_STATUS_CORRECTION_REQUIRED
    )

    assert second.accepted_at is None
    assert second.external_id is None

    assert (
        second.last_error
        == "issue one\nissue two"
    )

    assert (
        items[1].result_status
        == OBLIGATION_STATUS_CORRECTION_REQUIRED
    )

    assert items[1].errors_json == [
        "issue one",
        "issue two",
    ]

    assert items[1].external_id is None

    assert session.flush_count == 1


def test_batch_result_requires_complete_payload_before_mutation(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="CoverageOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="CoverageTwo",
        program_ids=(
            2,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-coverage-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_SUBMITTED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-coverage-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_SUBMITTED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
        ),
        obligation_count=2,
        record_count=2,
    )

    batch.submitted_by_user_id = (
        "admin-submit"
    )

    batch.submitted_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="cover every batch item exactly once",
    ):
        asyncio.run(
            record_mintrud_registry_submission_batch_result(
                session,
                batch_id=str(
                    batch.id
                ),
                recorded_by_user_id=(
                    "admin-result"
                ),
                results=[
                    {
                        "obligation_id": (
                            str(
                                first.id
                            )
                        ),
                        "result_status": (
                            OBLIGATION_STATUS_ACCEPTED
                        ),
                        "external_id": None,
                        "errors": [],
                    },
                ],
            )
        )

    assert (
        first.status
        == OBLIGATION_STATUS_SUBMITTED
    )

    assert (
        second.status
        == OBLIGATION_STATUS_SUBMITTED
    )

    assert items[0].result_status is None
    assert items[1].result_status is None
    assert batch.reconciled_at is None
    assert session.flush_count == 0


def test_batch_result_validates_every_obligation_before_mutation(
    monkeypatch,
):
    first_snapshot = make_snapshot(
        last_name="AtomicResultOne",
        program_ids=(
            1,
        ),
    )

    second_snapshot = make_snapshot(
        last_name="AtomicResultTwo",
        program_ids=(
            2,
        ),
    )

    first = make_lifecycle_obligation(
        "obligation-result-atomic-1",
        first_snapshot,
        status=(
            OBLIGATION_STATUS_SUBMITTED
        ),
    )

    second = make_lifecycle_obligation(
        "obligation-result-atomic-2",
        second_snapshot,
        status=(
            OBLIGATION_STATUS_ACCEPTED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
        ),
        obligation_count=2,
        record_count=2,
    )

    batch.submitted_by_user_id = (
        "admin-submit"
    )

    batch.submitted_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    items = [
        make_lifecycle_item(
            str(batch.id),
            first,
            position=0,
        ),
        make_lifecycle_item(
            str(batch.id),
            second,
            position=1,
        ),
    ]

    session = FakeSession()

    install_lifecycle_loaders(
        monkeypatch,
        batch=batch,
        items=items,
        obligations=[
            first,
            second,
        ],
    )

    payload = [
        {
            "obligation_id": str(
                first.id
            ),
            "result_status": (
                OBLIGATION_STATUS_ACCEPTED
            ),
            "external_id": None,
            "errors": [],
        },
        {
            "obligation_id": str(
                second.id
            ),
            "result_status": (
                OBLIGATION_STATUS_REJECTED
            ),
            "external_id": None,
            "errors": [
                "portal rejected",
            ],
        },
    ]

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="must be submitted",
    ):
        asyncio.run(
            record_mintrud_registry_submission_batch_result(
                session,
                batch_id=str(
                    batch.id
                ),
                recorded_by_user_id=(
                    "admin-result"
                ),
                results=payload,
            )
        )

    assert (
        first.status
        == OBLIGATION_STATUS_SUBMITTED
    )

    assert (
        second.status
        == OBLIGATION_STATUS_ACCEPTED
    )

    assert items[0].result_status is None
    assert items[1].result_status is None
    assert batch.reconciled_at is None
    assert session.flush_count == 0


def test_batch_result_is_immutable_after_reconciliation(
    monkeypatch,
):
    snapshot = make_snapshot(
        last_name="ImmutableResult",
        program_ids=(
            1,
        ),
    )

    obligation = make_lifecycle_obligation(
        "obligation-result-immutable",
        snapshot,
        status=(
            OBLIGATION_STATUS_SUBMITTED
        ),
    )

    batch = make_lifecycle_batch(
        status=(
            REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
        ),
        obligation_count=1,
        record_count=1,
    )

    batch.submitted_by_user_id = (
        "admin-submit"
    )

    batch.submitted_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    batch.reconciled_by_user_id = (
        "previous-admin"
    )

    batch.reconciled_at = (
        batch_service.datetime.now(
            batch_service.timezone.utc
        )
    )

    session = FakeSession()

    async def load_batch(
        session_arg,
        *,
        batch_id,
    ):
        return batch

    monkeypatch.setattr(
        batch_service,
        "_load_mintrud_batch_for_update",
        load_batch,
    )

    with pytest.raises(
        RegistrySubmissionBatchError,
        match="already recorded",
    ):
        asyncio.run(
            record_mintrud_registry_submission_batch_result(
                session,
                batch_id=str(
                    batch.id
                ),
                recorded_by_user_id=(
                    "admin-result"
                ),
                results=[
                    {
                        "obligation_id": (
                            str(
                                obligation.id
                            )
                        ),
                        "result_status": (
                            OBLIGATION_STATUS_ACCEPTED
                        ),
                        "external_id": None,
                        "errors": [],
                    },
                ],
            )
        )

    assert session.flush_count == 0
