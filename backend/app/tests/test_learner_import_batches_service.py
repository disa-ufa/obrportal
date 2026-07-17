from __future__ import annotations

from io import BytesIO

import pytest
from openpyxl import Workbook

from app.models.import_batch import ImportBatch
from app.services.learner_import_batches import (
    build_learner_import_deduplication_key,
    compute_learner_import_source_digest,
    create_import_batch_from_parse_result,
)
from app.services.learner_import_parser import parse_learner_import_file


class FakeAsyncSession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.flush_called = False

    def add(self, instance: object) -> None:
        self.added.append(instance)

    async def flush(self) -> None:
        self.flush_called = True


@pytest.mark.asyncio
async def test_create_import_batch_from_csv_parse_result() -> None:
    content = (
        "\u0424\u0418\u041e;Email;\u0422\u0435\u043b\u0435\u0444\u043e\u043d;\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430\n"
        "\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447;ivanov@mail.ru;89171234567;\u041f\u0435\u0440\u0432\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c\n"
        ";bad-email;;\u041f\u0435\u0440\u0432\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c\n"
    ).encode("utf-8-sig")
    parse_result = parse_learner_import_file("learners.csv", content)
    db = FakeAsyncSession()

    source_digest = (
        compute_learner_import_source_digest(content)
    )

    batch = await create_import_batch_from_parse_result(
        db,
        parse_result=parse_result,
        source_content_type="text/csv",
        source_digest=source_digest,
        organization_id="org-1",
        learning_group_id="group-1",
        course_id="course-1",
        uploaded_by_user_id="admin-1",
        notes="Test import",
    )

    assert db.flush_called is True
    assert db.added == [batch]
    assert isinstance(batch, ImportBatch)

    assert batch.import_type == "learner_roster"
    assert batch.status == "parsed"
    assert batch.source_filename == "learners.csv"
    assert batch.source_content_type == "text/csv"
    assert batch.source_digest == source_digest
    assert batch.deduplication_key == (
        build_learner_import_deduplication_key(
            source_digest=source_digest,
            organization_id="org-1",
            learning_group_id="group-1",
            course_id="course-1",
        )
    )
    assert batch.organization_id == "org-1"
    assert batch.learning_group_id == "group-1"
    assert batch.course_id == "course-1"
    assert batch.uploaded_by_user_id == "admin-1"
    assert batch.notes == "Test import"

    assert batch.total_rows == 2
    assert batch.valid_rows == 1
    assert batch.invalid_rows == 1
    assert batch.created_users_count == 0
    assert batch.updated_users_count == 0
    assert batch.created_profiles_count == 0
    assert batch.updated_profiles_count == 0
    assert batch.created_enrollments_count == 0

    assert len(batch.rows) == 2

    valid_row = batch.rows[0]
    assert valid_row.row_number == 2
    assert valid_row.status == "valid"
    assert valid_row.raw_data_json["Email"] == "ivanov@mail.ru"
    assert valid_row.normalized_data_json["email"] == "ivanov@mail.ru"
    assert valid_row.normalized_data_json["phone"] == "+79171234567"
    assert valid_row.validation_errors_json == []
    assert valid_row.error_summary is None

    invalid_row = batch.rows[1]
    assert invalid_row.row_number == 3
    assert invalid_row.status == "invalid"
    assert "\u0424\u0418\u041e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e." in invalid_row.validation_errors_json
    assert "\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email." in invalid_row.validation_errors_json
    assert invalid_row.error_summary == "\u0424\u0418\u041e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e.; \u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email."


@pytest.mark.asyncio
async def test_create_import_batch_from_xlsx_parse_result() -> None:
    workbook = Workbook()
    sheet = workbook.active

    sheet.append(["\u041a\u0443\u0440\u0441\u0430\u043d\u0442\u044b \u043e\u0442 \u0420\u0426\u0414\u041e"])
    sheet.append([""])
    sheet.append(["\u0424\u0418\u041e", "Email", "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430", "\u0423\u041a\u0414"])
    sheet.append([
        "\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440 \u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447",
        "petrov@mail.ru",
        "\u041e\u043a\u0430\u0437\u0430\u043d\u0438\u0435 \u043f\u0435\u0440\u0432\u043e\u0439 \u043f\u043e\u043c\u043e\u0449\u0438",
        "01",
    ])

    stream = BytesIO()
    workbook.save(stream)

    parse_result = parse_learner_import_file("learners.xlsx", stream.getvalue())
    db = FakeAsyncSession()

    batch = await create_import_batch_from_parse_result(
        db,
        parse_result=parse_result,
        source_content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    assert db.flush_called is True
    assert db.added == [batch]

    assert batch.source_filename == "learners.xlsx"
    assert batch.source_content_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert batch.total_rows == 1
    assert batch.valid_rows == 1
    assert batch.invalid_rows == 0

    assert len(batch.rows) == 1
    assert batch.rows[0].row_number == 4
    assert batch.rows[0].status == "valid"
    assert batch.rows[0].normalized_data_json["full_name"] == "\u041f\u0435\u0442\u0440\u043e\u0432 \u041f\u0435\u0442\u0440 \u041f\u0435\u0442\u0440\u043e\u0432\u0438\u0447"
    assert batch.rows[0].normalized_data_json["course_code"] == "01"


def test_learner_import_deduplication_key_is_context_aware() -> None:
    first_digest = (
        compute_learner_import_source_digest(
            b"same learner file"
        )
    )
    second_digest = (
        compute_learner_import_source_digest(
            b"different learner file"
        )
    )

    first_key = build_learner_import_deduplication_key(
        source_digest=first_digest,
        organization_id="org-1",
        learning_group_id="group-1",
        course_id="course-1",
    )

    assert first_key == (
        build_learner_import_deduplication_key(
            source_digest=first_digest.upper(),
            organization_id="org-1",
            learning_group_id="group-1",
            course_id="course-1",
        )
    )

    assert first_key != (
        build_learner_import_deduplication_key(
            source_digest=first_digest,
            organization_id="org-2",
            learning_group_id="group-1",
            course_id="course-1",
        )
    )

    assert first_key != (
        build_learner_import_deduplication_key(
            source_digest=first_digest,
            organization_id="org-1",
            learning_group_id="group-2",
            course_id="course-1",
        )
    )

    assert first_key != (
        build_learner_import_deduplication_key(
            source_digest=first_digest,
            organization_id="org-1",
            learning_group_id="group-1",
            course_id="course-2",
        )
    )

    assert first_key != (
        build_learner_import_deduplication_key(
            source_digest=second_digest,
            organization_id="org-1",
            learning_group_id="group-1",
            course_id="course-1",
        )
    )


def test_learner_import_deduplication_key_rejects_invalid_digest() -> None:
    with pytest.raises(
        ValueError,
        match="64-character SHA-256",
    ):
        build_learner_import_deduplication_key(
            source_digest="not-a-sha256-digest",
        )
