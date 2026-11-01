from __future__ import annotations

from app.tests.test_import_writers_pg import env as import_pg_env
from app.tests import import_boundary_scenarios as scenarios

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.api.v1 import admin
from app.models.import_batch import ImportBatch
from app.services.learner_import_batches import (
    LearnerImportApplyResult,
    LearnerImportCourseNotificationCandidate,
    LearnerImportPreflightResult,
    LearnerImportPreflightRow,
)


class FakeSession:
    def __init__(
        self,
        *,
        user: object,
        course: object,
    ) -> None:
        self.info: dict[str, object] = {}
        self.user = user
        self.course = course
        self.commit_count = 0
        self.rollback_count = 0

    async def get(
        self,
        model,
        object_id: str,
    ):
        del object_id

        if model is admin.User:
            return self.user

        if model is admin.Course:
            return self.course

        return None

    async def commit(self) -> None:
        self.commit_count += 1

    async def rollback(self) -> None:
        self.rollback_count += 1


def make_batch() -> ImportBatch:
    now = datetime.now(timezone.utc)

    return ImportBatch(
        id="batch-course-notification",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        status="applied",
        organization_id="org-1",
        learning_group_id="group-1",
        course_id="course-1",
        total_rows=1,
        valid_rows=1,
        invalid_rows=0,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=1,
        uploaded_by_user_id="admin-1",
        notes=None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_apply_api_sends_and_returns_course_notification(import_pg_env, monkeypatch) -> None:
    # New-enrollment notifications are forbidden; verify real auth, rollback,
    # then the allowed existing-enrollment update with no notification.
    await scenarios.http_contract(import_pg_env,monkeypatch)

def test_batch_detail_maps_applied_row_outcome() -> None:
    now = datetime.now(timezone.utc)

    row = SimpleNamespace(
        id="row-outcome",
        row_number=3,
        status="applied",
        raw_data_json={
            "email": "active@example.org",
        },
        normalized_data_json={
            "email": "active@example.org",
        },
        validation_errors_json=[],
        error_summary=None,
        user_id="active-user",
        learner_profile_id="profile-1",
        enrollment_id="enrollment-1",
        created_at=now,
        updated_at=now,
    )

    batch = SimpleNamespace(
        id="batch-outcome",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        source_digest=None,
        status="applied",
        organization_id="org-1",
        learning_group_id="group-1",
        course_id="course-1",
        total_rows=1,
        valid_rows=1,
        invalid_rows=0,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=1,
        uploaded_by_user_id="admin-1",
        notes=None,
        created_at=now,
        updated_at=now,
        rows=[row],
    )

    detail = (
        admin.build_admin_learner_import_batch_detail(
            batch,
            applied_row_outcomes={
                "row-outcome": {
                    "classification": (
                        "existing_active_user"
                    ),
                    "account_state": "active",
                    "user_action": "unchanged",
                    "profile_action": "unchanged",
                    "enrollment_action": "created",
                    "notification_action": (
                        "new_course_notification"
                    ),
                    "email_delivery_status": "sent",
                    "email_delivery_detail": (
                        "Email sent."
                    ),
                    "email_delivery_error": None,
                },
            },
        )
    )

    assert len(detail.rows) == 1

    outcome = detail.rows[0]

    assert (
        outcome.classification
        == "existing_active_user"
    )
    assert outcome.account_state == "active"
    assert outcome.user_action == "unchanged"
    assert outcome.profile_action == "unchanged"
    assert outcome.enrollment_action == "created"
    assert (
        outcome.notification_action
        == "new_course_notification"
    )
    assert outcome.email_delivery_status == "sent"
    assert (
        outcome.email_delivery_detail
        == "Email sent."
    )
    assert outcome.email_delivery_error is None


def test_batch_detail_maps_not_required_delivery() -> None:
    now = datetime.now(timezone.utc)

    row = SimpleNamespace(
        id="row-existing-enrollment",
        row_number=4,
        status="applied",
        raw_data_json={},
        normalized_data_json={},
        validation_errors_json=[],
        error_summary=None,
        user_id="assigned-user",
        learner_profile_id="profile-assigned",
        enrollment_id="enrollment-assigned",
        created_at=now,
        updated_at=now,
    )

    batch = SimpleNamespace(
        id="batch-not-required",
        import_type="learner_roster",
        source_filename="learners.csv",
        source_content_type="text/csv",
        source_digest=None,
        status="applied",
        organization_id=None,
        learning_group_id=None,
        course_id="course-1",
        total_rows=1,
        valid_rows=1,
        invalid_rows=0,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id="admin-1",
        notes=None,
        created_at=now,
        updated_at=now,
        rows=[row],
    )

    detail = (
        admin.build_admin_learner_import_batch_detail(
            batch,
            applied_row_outcomes={
                "row-existing-enrollment": {
                    "classification": (
                        "existing_enrollment"
                    ),
                    "account_state": "active",
                    "user_action": "unchanged",
                    "profile_action": "unchanged",
                    "enrollment_action": "unchanged",
                    "notification_action": (
                        "not_required"
                    ),
                    "email_delivery_status": (
                        "not_required"
                    ),
                    "email_delivery_detail": (
                        "Email delivery was not required."
                    ),
                    "email_delivery_error": None,
                },
            },
        )
    )

    outcome = detail.rows[0]

    assert (
        outcome.classification
        == "existing_enrollment"
    )
    assert outcome.notification_action == "not_required"
    assert (
        outcome.email_delivery_status
        == "not_required"
    )


@pytest.mark.asyncio

@pytest.mark.asyncio
async def test_get_learner_import_course_title() -> None:
    expected_title = (
        "\u041e\u043a\u0430\u0437\u0430\u043d\u0438\u0435 "
        "\u043f\u0435\u0440\u0432\u043e\u0439 "
        "\u043f\u043e\u043c\u043e\u0449\u0438 "
        "\u043f\u043e\u0441\u0442\u0440\u0430"
        "\u0434\u0430\u0432\u0448\u0438\u043c"
    )

    course = SimpleNamespace(
        id="course-1",
        title=expected_title,
    )

    class CourseSession:
        async def get(
            self,
            model: object,
            entity_id: str,
        ) -> object:
            assert model is admin.Course
            assert entity_id == "course-1"

            return course

    title = (
        await admin.get_learner_import_course_title(
            CourseSession(),
            "course-1",
        )
    )

    assert title == expected_title


@pytest.mark.asyncio

@pytest.mark.asyncio
async def test_get_learner_import_course_title_uses_russian_fallback() -> None:
    class MissingCourseSession:
        async def get(
            self,
            model: object,
            entity_id: str,
        ) -> None:
            assert model is admin.Course
            assert entity_id == "missing-course"

            return None

    title = (
        await admin.get_learner_import_course_title(
            MissingCourseSession(),
            "missing-course",
        )
    )

    assert title == (
        "\u041d\u0430\u0437\u043d\u0430"
        "\u0447\u0435\u043d\u043d\u044b\u0439 "
        "\u043a\u0443\u0440\u0441"
    )
