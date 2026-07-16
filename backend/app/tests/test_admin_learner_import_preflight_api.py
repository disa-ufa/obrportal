from __future__ import annotations

from datetime import datetime, timezone

from app.api.v1.admin import (
    build_admin_learner_import_batch_detail,
    build_admin_learner_import_preflight_item,
)
from app.models.import_batch import (
    ImportBatch,
    ImportRow,
)
from app.services.learner_import_batches import (
    LearnerImportPreflightResult,
    LearnerImportPreflightRow,
)


def make_batch() -> ImportBatch:
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
        notes="Preflight API test",
        created_at=now,
        updated_at=now,
    )

    batch.rows.append(
        ImportRow(
            id="row-1",
            row_number=2,
            status="valid",
            raw_data_json={},
            normalized_data_json={
                "full_name": "Learner One",
                "email": "learner@example.org",
            },
            validation_errors_json=[],
            error_summary=None,
            created_at=now,
            updated_at=now,
        )
    )

    return batch


def make_preflight() -> LearnerImportPreflightResult:
    row = LearnerImportPreflightRow(
        row_id="row-1",
        row_number=2,
        email="learner@example.org",
        classification="new_user",
        account_state="new",
        user_id=None,
        learner_profile_id=None,
        enrollment_id=None,
        user_action="created",
        profile_action="created",
        enrollment_action="created",
        notification_action=(
            "password_setup_invitation"
        ),
    )

    return LearnerImportPreflightResult(
        rows=(row,),
        new_users_count=1,
        new_profiles_count=1,
        new_enrollments_count=1,
        password_setup_invitations_count=1,
    )


def test_build_preflight_api_item_maps_counts_and_rows() -> None:
    item = build_admin_learner_import_preflight_item(
        make_batch(),
        make_preflight(),
    )

    assert item is not None
    assert item.total_rows == 2
    assert item.valid_rows == 1
    assert item.invalid_rows == 1
    assert item.new_users_count == 1
    assert item.new_profiles_count == 1
    assert item.new_enrollments_count == 1
    assert item.password_setup_invitations_count == 1

    assert len(item.rows) == 1
    assert item.rows[0].row_id == "row-1"
    assert item.rows[0].classification == "new_user"
    assert (
        item.rows[0].notification_action
        == "password_setup_invitation"
    )


def test_batch_detail_contains_preflight() -> None:
    detail = build_admin_learner_import_batch_detail(
        make_batch(),
        preflight=make_preflight(),
    )

    assert detail.preflight is not None
    assert detail.preflight.new_users_count == 1
    assert len(detail.preflight.rows) == 1
    assert (
        detail.preflight.rows[0].email
        == "learner@example.org"
    )


def test_batch_detail_without_preflight_remains_supported() -> None:
    detail = build_admin_learner_import_batch_detail(
        make_batch()
    )

    assert detail.preflight is None
