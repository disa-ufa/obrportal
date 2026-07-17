from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, Response

from app.api.v1 import admin as admin_api
from app.api.v1.admin import (
    build_admin_learner_import_batch_detail,
    build_admin_learner_import_batch_item,
    normalize_learner_import_extension,
)
from app.models.import_batch import ImportBatch, ImportRow


def test_normalize_learner_import_extension_accepts_csv_and_xlsx() -> None:
    assert normalize_learner_import_extension("learners.csv") == ".csv"
    assert normalize_learner_import_extension("learners.xlsx") == ".xlsx"


def test_normalize_learner_import_extension_rejects_other_formats() -> None:
    with pytest.raises(HTTPException) as exc_info:
        normalize_learner_import_extension("learners.txt")

    assert exc_info.value.status_code == 415
    assert "Unsupported import format" in exc_info.value.detail


def test_build_admin_learner_import_batch_detail_sorts_rows_and_maps_payload() -> None:
    now = datetime.now(timezone.utc)

    batch = ImportBatch(
        id="batch-1",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        source_digest="a" * 64,
        status="parsed",
        organization_id="org-1",
        learning_group_id="group-1",
        course_id="course-1",
        total_rows=2,
        valid_rows=1,
        invalid_rows=1,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id="admin-1",
        notes="Uploaded from admin API",
        created_at=now,
        updated_at=now,
    )

    batch.rows.append(
        ImportRow(
            id="row-2",
            row_number=2,
            status="invalid",
            raw_data_json={"Email": "bad-email"},
            normalized_data_json={"email": "bad-email"},
            validation_errors_json=["\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email."],
            error_summary="\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email.",
            created_at=now,
            updated_at=now,
        )
    )
    batch.rows.append(
        ImportRow(
            id="row-1",
            row_number=1,
            status="valid",
            raw_data_json={"Email": "learner@mail.ru"},
            normalized_data_json={"email": "learner@mail.ru"},
            validation_errors_json=[],
            error_summary=None,
            created_at=now,
            updated_at=now,
        )
    )

    detail = build_admin_learner_import_batch_detail(batch)

    assert detail.id == "batch-1"
    assert detail.status == "parsed"
    assert detail.source_filename == "learners.csv"
    assert detail.source_content_type == "text/csv"
    assert detail.source_digest == "a" * 64
    assert detail.organization_id == "org-1"
    assert detail.learning_group_id == "group-1"
    assert detail.course_id == "course-1"
    assert detail.uploaded_by_user_id == "admin-1"
    assert detail.notes == "Uploaded from admin API"
    assert detail.total_rows == 2
    assert detail.valid_rows == 1
    assert detail.invalid_rows == 1

    assert [row.row_number for row in detail.rows] == [1, 2]
    assert detail.rows[0].status == "valid"
    assert detail.rows[0].normalized_data_json["email"] == "learner@mail.ru"
    assert detail.rows[1].status == "invalid"
    assert detail.rows[1].validation_errors_json == ["\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email."]
    assert detail.rows[1].error_summary == "\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email."


def test_build_admin_learner_import_batch_item_maps_summary_without_rows() -> None:
    now = datetime.now(timezone.utc)

    batch = ImportBatch(
        id="batch-summary-1",
        import_type="learner_roster",
        source_filename="summary.csv",
        source_content_type="text/csv",
        source_digest="b" * 64,
        status="parsed",
        organization_id="org-1",
        learning_group_id="group-1",
        course_id="course-1",
        total_rows=10,
        valid_rows=8,
        invalid_rows=2,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id="admin-1",
        notes="Summary item",
        created_at=now,
        updated_at=now,
    )

    item = build_admin_learner_import_batch_item(batch)

    assert item.id == "batch-summary-1"
    assert item.import_type == "learner_roster"
    assert item.source_filename == "summary.csv"
    assert item.source_content_type == "text/csv"
    assert item.source_digest == "b" * 64
    assert item.status == "parsed"
    assert item.organization_id == "org-1"
    assert item.learning_group_id == "group-1"
    assert item.course_id == "course-1"
    assert item.total_rows == 10
    assert item.valid_rows == 8
    assert item.invalid_rows == 2
    assert item.uploaded_by_user_id == "admin-1"
    assert item.notes == "Summary item"



class FakeLearnerImportUpload:
    filename = "learners.csv"
    content_type = "text/csv"

    def __init__(
        self,
        content: bytes,
    ) -> None:
        self.content = content

    async def read(self) -> bytes:
        return self.content


class FakeNestedTransaction:
    async def __aenter__(self) -> None:
        return None

    async def __aexit__(
        self,
        _exception_type: object,
        _exception: object,
        _traceback: object,
    ) -> bool:
        return False


class FakeLearnerImportSession:
    def __init__(self) -> None:
        self.commit_called = False
        self.nested_transaction_started = False

    def begin_nested(
        self,
    ) -> FakeNestedTransaction:
        self.nested_transaction_started = True

        return FakeNestedTransaction()

    async def commit(self) -> None:
        self.commit_called = True


@pytest.mark.asyncio
async def test_duplicate_learner_import_reuses_existing_batch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = (
        "full_name,email\n"
        "Learner One,learner@example.org\n"
    ).encode("utf-8")

    source_digest = (
        admin_api.compute_learner_import_source_digest(
            content
        )
    )
    deduplication_key = (
        admin_api.build_learner_import_deduplication_key(
            source_digest=source_digest,
        )
    )
    now = datetime.now(timezone.utc)

    existing_batch = ImportBatch(
        id="existing-batch",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        source_digest=source_digest,
        deduplication_key=deduplication_key,
        status="parsed",
        total_rows=1,
        valid_rows=1,
        invalid_rows=0,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id="admin-1",
        created_at=now,
        updated_at=now,
    )

    requested_keys: list[str] = []
    audit_actions: list[str] = []

    async def find_existing(
        _session: object,
        *,
        deduplication_key: str,
        import_type: str = "learner_roster",
    ) -> ImportBatch:
        assert import_type == "learner_roster"

        requested_keys.append(
            deduplication_key
        )

        return existing_batch

    async def add_audit_event(
        _session: object,
        *,
        action: str,
        **_kwargs: object,
    ) -> None:
        audit_actions.append(action)

    async def build_preflight(
        _session: object,
        *,
        batch: ImportBatch,
    ) -> None:
        assert batch is existing_batch

        return None

    def fail_if_parsed(
        _filename: str,
        _content: bytes,
    ) -> None:
        raise AssertionError(
            "Duplicate upload must not "
            "be parsed again."
        )

    monkeypatch.setattr(
        admin_api,
        "find_learner_import_batch_by_deduplication_key",
        find_existing,
    )
    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        add_audit_event,
    )
    monkeypatch.setattr(
        admin_api,
        "build_learner_import_preflight",
        build_preflight,
    )
    monkeypatch.setattr(
        admin_api,
        "parse_learner_import_file",
        fail_if_parsed,
    )

    response = Response(status_code=201)
    session = FakeLearnerImportSession()

    detail = await admin_api.create_learner_import(
        request=SimpleNamespace(),
        response=response,
        file=FakeLearnerImportUpload(content),
        organization_id=None,
        learning_group_id=None,
        course_id=None,
        notes=None,
        current_user=SimpleNamespace(
            id="admin-1"
        ),
        session=session,
    )

    assert detail.id == "existing-batch"
    assert detail.source_digest == source_digest
    assert response.status_code == 200
    assert (
        response.headers["X-Import-Reused"]
        == "true"
    )
    assert requested_keys == [
        deduplication_key
    ]
    assert audit_actions == [
        "admin.learner_import_reused"
    ]
    assert session.commit_called is True
    assert (
        session.nested_transaction_started
        is False
    )


@pytest.mark.asyncio
async def test_new_learner_import_passes_digest_to_batch_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = (
        "full_name,email\n"
        "Learner Two,learner-two@example.org\n"
    ).encode("utf-8")

    expected_digest = (
        admin_api.compute_learner_import_source_digest(
            content
        )
    )
    expected_key = (
        admin_api.build_learner_import_deduplication_key(
            source_digest=expected_digest,
        )
    )
    now = datetime.now(timezone.utc)

    new_batch = ImportBatch(
        id="new-batch",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        source_digest=None,
        deduplication_key=None,
        status="parsed",
        total_rows=1,
        valid_rows=1,
        invalid_rows=0,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id="admin-1",
        created_at=now,
        updated_at=now,
    )

    requested_keys: list[str] = []
    create_arguments: dict[str, object] = {}
    audit_actions: list[str] = []

    async def find_missing(
        _session: object,
        *,
        deduplication_key: str,
        import_type: str = "learner_roster",
    ) -> None:
        assert import_type == "learner_roster"

        requested_keys.append(
            deduplication_key
        )

        return None

    async def create_batch(
        _session: object,
        **kwargs: object,
    ) -> ImportBatch:
        create_arguments.update(kwargs)

        source_digest = kwargs.get(
            "source_digest"
        )

        assert isinstance(
            source_digest,
            str,
        )

        new_batch.source_digest = source_digest
        new_batch.deduplication_key = (
            admin_api.build_learner_import_deduplication_key(
                source_digest=source_digest,
            )
        )

        return new_batch

    async def add_audit_event(
        _session: object,
        *,
        action: str,
        **_kwargs: object,
    ) -> None:
        audit_actions.append(action)

    async def build_preflight(
        _session: object,
        *,
        batch: ImportBatch,
    ) -> None:
        assert batch is new_batch

        return None

    monkeypatch.setattr(
        admin_api,
        "find_learner_import_batch_by_deduplication_key",
        find_missing,
    )
    monkeypatch.setattr(
        admin_api,
        "create_import_batch_from_parse_result",
        create_batch,
    )
    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        add_audit_event,
    )
    monkeypatch.setattr(
        admin_api,
        "build_learner_import_preflight",
        build_preflight,
    )

    response = Response(status_code=201)
    session = FakeLearnerImportSession()

    detail = await admin_api.create_learner_import(
        request=SimpleNamespace(),
        response=response,
        file=FakeLearnerImportUpload(content),
        organization_id=None,
        learning_group_id=None,
        course_id=None,
        notes="New import",
        current_user=SimpleNamespace(
            id="admin-1"
        ),
        session=session,
    )

    assert detail.id == "new-batch"
    assert detail.source_digest == expected_digest
    assert response.status_code == 201
    assert (
        "X-Import-Reused"
        not in response.headers
    )
    assert requested_keys == [expected_key]
    assert (
        create_arguments["source_digest"]
        == expected_digest
    )
    assert (
        create_arguments["notes"]
        == "New import"
    )
    assert audit_actions == [
        "admin.learner_import_parsed"
    ]
    assert session.commit_called is True
    assert (
        session.nested_transaction_started
        is True
    )



def test_learner_import_route_documents_reused_response() -> None:
    route = next(
        item
        for item in admin_api.router.routes
        if (
            getattr(item, "path", None)
            == "/admin/learner-imports"
            and "POST"
            in getattr(item, "methods", set())
        )
    )

    assert route.status_code == 201
    assert 200 in route.responses

    reused_response = route.responses[200]

    assert (
        reused_response["description"]
        == "Existing learner import batch reused"
    )
    assert (
        reused_response["headers"]
        ["X-Import-Reused"]
        ["schema"]
        ["enum"]
        == ["true"]
    )



@pytest.mark.asyncio
async def test_concurrent_learner_import_reuses_winning_batch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = (
        "full_name,email\n"
        "Concurrent Learner,concurrent@example.org\n"
    ).encode("utf-8")

    source_digest = (
        admin_api.compute_learner_import_source_digest(
            content
        )
    )
    deduplication_key = (
        admin_api.build_learner_import_deduplication_key(
            source_digest=source_digest,
        )
    )
    now = datetime.now(timezone.utc)

    winning_batch = ImportBatch(
        id="winning-batch",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        source_digest=source_digest,
        deduplication_key=deduplication_key,
        status="parsed",
        total_rows=1,
        valid_rows=1,
        invalid_rows=0,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id="other-admin",
        created_at=now,
        updated_at=now,
    )

    lookup_calls: list[str] = []
    audit_actions: list[str] = []
    create_attempts = 0

    async def find_batch(
        _session: object,
        *,
        deduplication_key: str,
        import_type: str = "learner_roster",
    ) -> ImportBatch | None:
        assert import_type == "learner_roster"

        lookup_calls.append(
            deduplication_key
        )

        if len(lookup_calls) == 1:
            return None

        return winning_batch

    async def create_conflicting_batch(
        _session: object,
        **kwargs: object,
    ) -> ImportBatch:
        nonlocal create_attempts

        create_attempts += 1

        assert (
            kwargs["source_digest"]
            == source_digest
        )

        raise admin_api.IntegrityError(
            "INSERT INTO import_batches",
            {},
            Exception("duplicate key"),
        )

    async def add_audit_event(
        _session: object,
        *,
        action: str,
        **_kwargs: object,
    ) -> None:
        audit_actions.append(action)

    async def build_preflight(
        _session: object,
        *,
        batch: ImportBatch,
    ) -> None:
        assert batch is winning_batch

        return None

    monkeypatch.setattr(
        admin_api,
        "find_learner_import_batch_by_deduplication_key",
        find_batch,
    )
    monkeypatch.setattr(
        admin_api,
        "create_import_batch_from_parse_result",
        create_conflicting_batch,
    )
    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        add_audit_event,
    )
    monkeypatch.setattr(
        admin_api,
        "build_learner_import_preflight",
        build_preflight,
    )

    response = Response(status_code=201)
    session = FakeLearnerImportSession()

    detail = await admin_api.create_learner_import(
        request=SimpleNamespace(),
        response=response,
        file=FakeLearnerImportUpload(content),
        organization_id=None,
        learning_group_id=None,
        course_id=None,
        notes=None,
        current_user=SimpleNamespace(
            id="admin-1"
        ),
        session=session,
    )

    assert detail.id == "winning-batch"
    assert detail.source_digest == source_digest
    assert response.status_code == 200
    assert (
        response.headers["X-Import-Reused"]
        == "true"
    )
    assert lookup_calls == [
        deduplication_key,
        deduplication_key,
    ]
    assert create_attempts == 1
    assert audit_actions == [
        "admin.learner_import_reused"
    ]
    assert session.commit_called is True
    assert (
        session.nested_transaction_started
        is True
    )
