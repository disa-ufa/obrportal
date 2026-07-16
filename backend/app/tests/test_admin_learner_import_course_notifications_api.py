from __future__ import annotations

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
async def test_apply_api_sends_and_returns_course_notification(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    batch = make_batch()

    notified_user = SimpleNamespace(
        id="active-user",
        email="active@example.org",
    )
    course = SimpleNamespace(
        id="course-1",
        title="First aid",
    )
    session = FakeSession(
        user=notified_user,
        course=course,
    )

    candidate = (
        LearnerImportCourseNotificationCandidate(
            row_id="row-1",
            row_number=2,
            user_id="active-user",
            email="active@example.org",
            course_id="course-1",
        )
    )

    apply_result = LearnerImportApplyResult(
        created_enrollments_count=1,
        course_notification_candidates=(
            candidate,
        ),
    )

    preflight_result = (
        LearnerImportPreflightResult(
            rows=(
                LearnerImportPreflightRow(
                    row_id="row-1",
                    row_number=2,
                    email="active@example.org",
                    classification=(
                        "existing_active_user"
                    ),
                    account_state="active",
                    user_id="active-user",
                    learner_profile_id=(
                        "profile-1"
                    ),
                    enrollment_id=None,
                    user_action="unchanged",
                    profile_action="unchanged",
                    enrollment_action="created",
                    notification_action=(
                        "new_course_notification"
                    ),
                ),
            ),
            existing_active_users_count=1,
            new_enrollments_count=1,
            new_course_notifications_count=1,
        )
    )

    batch_reads = 0
    delivery_calls: list[dict] = []
    audit_payloads: list[dict] = []

    async def get_batch(
        batch_id: str,
        current_session,
    ) -> ImportBatch:
        nonlocal batch_reads
        del current_session

        assert (
            batch_id
            == "batch-course-notification"
        )

        batch_reads += 1
        return batch

    async def build_preflight(
        current_session,
        *,
        batch: ImportBatch,
    ) -> LearnerImportPreflightResult:
        del current_session

        assert (
            batch.id
            == "batch-course-notification"
        )

        return preflight_result

    async def apply_batch(
        current_session,
        *,
        batch: ImportBatch,
    ) -> LearnerImportApplyResult:
        del current_session

        assert (
            batch.id
            == "batch-course-notification"
        )

        return apply_result

    def send_notification(
        **kwargs,
    ):
        delivery_calls.append(kwargs)

        return SimpleNamespace(
            status="sent",
            sent=True,
            detail="Email sent.",
            error=None,
        )

    async def create_audit(
        current_session,
        **kwargs,
    ) -> None:
        del current_session

        audit_payloads.append(
            kwargs["payload"]
        )

    monkeypatch.setattr(
        admin,
        "get_admin_learner_import_batch_or_404",
        get_batch,
    )
    monkeypatch.setattr(
        admin,
        "build_learner_import_preflight",
        build_preflight,
    )
    monkeypatch.setattr(
        admin,
        "apply_learner_import_batch",
        apply_batch,
    )
    monkeypatch.setattr(
        admin,
        "send_course_assignment_email",
        send_notification,
    )
    monkeypatch.setattr(
        admin,
        "create_admin_audit_event",
        create_audit,
    )

    response = await admin.apply_learner_import(
        "batch-course-notification",
        request=SimpleNamespace(),
        current_user=SimpleNamespace(
            id="admin-1"
        ),
        session=session,
    )

    assert batch_reads == 2
    assert session.commit_count == 1
    assert session.rollback_count == 0
    assert response.invitations == []
    assert len(
        response.course_notifications
    ) == 1

    notification = (
        response.course_notifications[0]
    )

    assert notification.row_id == "row-1"
    assert notification.user_id == "active-user"
    assert notification.course_id == "course-1"
    assert notification.course_title == "First aid"
    assert (
        notification.email_delivery_status
        == "sent"
    )

    assert len(delivery_calls) == 1
    assert (
        delivery_calls[0]["recipient"]
        == "active@example.org"
    )
    assert (
        delivery_calls[0]["course_title"]
        == "First aid"
    )

    assert len(audit_payloads) == 1
    assert (
        audit_payloads[0][
            "course_notifications_count"
        ]
        == 1
    )
    assert (
        audit_payloads[0][
            "sent_course_notifications_count"
        ]
        == 1
    )

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
