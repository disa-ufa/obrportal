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
    RegistrySubmissionBatchError,
    build_registry_submission_batch_artifact_path,
    create_mintrud_registry_submission_batch,
    normalize_batch_obligation_ids,
    read_registry_submission_batch_artifact,
)
from app.services.compliance_registry_contract import (
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
