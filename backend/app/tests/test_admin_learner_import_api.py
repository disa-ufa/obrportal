from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

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
            validation_errors_json=["email is invalid."],
            error_summary="email is invalid.",
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
    assert detail.rows[1].validation_errors_json == ["email is invalid."]
    assert detail.rows[1].error_summary == "email is invalid."


def test_build_admin_learner_import_batch_item_maps_summary_without_rows() -> None:
    now = datetime.now(timezone.utc)

    batch = ImportBatch(
        id="batch-summary-1",
        import_type="learner_roster",
        source_filename="summary.csv",
        source_content_type="text/csv",
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
    assert item.status == "parsed"
    assert item.organization_id == "org-1"
    assert item.learning_group_id == "group-1"
    assert item.course_id == "course-1"
    assert item.total_rows == 10
    assert item.valid_rows == 8
    assert item.invalid_rows == 2
    assert item.uploaded_by_user_id == "admin-1"
    assert item.notes == "Summary item"
