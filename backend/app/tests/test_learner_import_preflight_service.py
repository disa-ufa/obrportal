from __future__ import annotations

import pytest

from app.models.enrollment import Enrollment
from app.models.import_batch import (
    ImportBatch,
    ImportRow,
)
from app.models.learner_profile import LearnerProfile
from app.models.user import User
from app.services import learner_import_batches as service


def make_batch(
    *,
    row_status: str = "valid",
    course_id: str | None = "course-1",
) -> ImportBatch:
    batch = ImportBatch(
        id="batch-1",
        status="parsed",
        import_type="learner_roster",
        course_id=course_id,
        organization_id="org-1",
        learning_group_id="group-1",
        total_rows=1,
        valid_rows=(
            1 if row_status == "valid" else 0
        ),
        invalid_rows=(
            0 if row_status == "valid" else 1
        ),
    )

    batch.rows.append(
        ImportRow(
            id="row-1",
            row_number=2,
            status=row_status,
            normalized_data_json={
                "full_name": "Learner One",
                "first_name": "Learner",
                "last_name": "One",
                "email": "learner@example.org",
                "phone": "+79170000001",
                "snils": "123-456-789 01",
            },
            raw_data_json={},
            validation_errors_json=(
                []
                if row_status == "valid"
                else ["Invalid row."]
            ),
            error_summary=(
                None
                if row_status == "valid"
                else "Invalid row."
            ),
        )
    )

    return batch


def make_user(
    *,
    is_active: bool,
) -> User:
    return User(
        id="user-1",
        email="learner@example.org",
        phone=None,
        full_name=None,
        hashed_password="hash",
        is_active=is_active,
        is_email_verified=is_active,
        mfa_enabled=False,
    )


def make_profile() -> LearnerProfile:
    return LearnerProfile(
        id="profile-1",
        user_id="user-1",
        first_name="Learner",
        last_name="One",
        email="learner@example.org",
        phone=None,
        snils="123-456-789 01",
    )


def make_enrollment() -> Enrollment:
    return Enrollment(
        id="enrollment-1",
        user_id="user-1",
        course_id="course-1",
        organization_id="org-1",
        learning_group_id="group-1",
        status="assigned",
    )


def configure_lookups(
    monkeypatch: pytest.MonkeyPatch,
    *,
    user: User | None = None,
    user_conflict: str | None = None,
    profile: LearnerProfile | None = None,
    snils_profile: LearnerProfile | None = None,
    enrollment: Enrollment | None = None,
) -> None:
    async def find_user(
        db: object,
        *,
        email: str,
        phone: str,
    ) -> tuple[User | None, str | None]:
        del db, email, phone
        return user, user_conflict

    async def find_profile_by_snils(
        db: object,
        snils: str,
    ) -> LearnerProfile | None:
        del db, snils
        return snils_profile

    async def find_profile(
        db: object,
        user_id: str,
    ) -> LearnerProfile | None:
        del db, user_id
        return profile

    async def find_enrollment(
        db: object,
        *,
        user_id: str,
        course_id: str,
    ) -> Enrollment | None:
        del db, user_id, course_id
        return enrollment

    monkeypatch.setattr(
        service,
        "find_user_for_import_row",
        find_user,
    )
    monkeypatch.setattr(
        service,
        "find_profile_by_snils",
        find_profile_by_snils,
    )
    monkeypatch.setattr(
        service,
        "find_profile_for_user",
        find_profile,
    )
    monkeypatch.setattr(
        service,
        "find_enrollment",
        find_enrollment,
    )


@pytest.mark.asyncio
async def test_preflight_classifies_new_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_lookups(
        monkeypatch,
        user=None,
        snils_profile=None,
    )

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(),
    )

    row = result.rows[0]

    assert row.classification == "new_user"
    assert row.account_state == "new"
    assert row.user_action == "created"
    assert row.profile_action == "created"
    assert row.enrollment_action == "created"
    assert (
        row.notification_action
        == "password_setup_invitation"
    )
    assert result.new_users_count == 1
    assert result.new_profiles_count == 1
    assert result.new_enrollments_count == 1
    assert (
        result.password_setup_invitations_count
        == 1
    )


@pytest.mark.asyncio
async def test_preflight_classifies_inactive_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(is_active=False)

    configure_lookups(
        monkeypatch,
        user=user,
        profile=make_profile(),
        snils_profile=make_profile(),
        enrollment=None,
    )

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(),
    )

    row = result.rows[0]

    assert (
        row.classification
        == "existing_inactive_user"
    )
    assert row.account_state == "inactive"
    assert row.enrollment_action == "created"
    assert (
        row.notification_action
        == "password_setup_invitation"
    )
    assert (
        result.existing_inactive_users_count
        == 1
    )
    assert result.new_enrollments_count == 1


@pytest.mark.asyncio
async def test_preflight_classifies_active_user_with_new_course(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(is_active=True)

    configure_lookups(
        monkeypatch,
        user=user,
        profile=make_profile(),
        snils_profile=make_profile(),
        enrollment=None,
    )

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(),
    )

    row = result.rows[0]

    assert (
        row.classification
        == "existing_active_user"
    )
    assert row.account_state == "active"
    assert row.enrollment_action == "created"
    assert (
        row.notification_action
        == "new_course_notification"
    )
    assert result.existing_active_users_count == 1
    assert result.new_course_notifications_count == 1


@pytest.mark.asyncio
async def test_preflight_classifies_existing_enrollment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(is_active=True)
    enrollment = make_enrollment()

    configure_lookups(
        monkeypatch,
        user=user,
        profile=make_profile(),
        snils_profile=make_profile(),
        enrollment=enrollment,
    )

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(),
    )

    row = result.rows[0]

    assert (
        row.classification
        == "existing_enrollment"
    )
    assert row.enrollment_id == "enrollment-1"
    assert row.enrollment_action == "unchanged"
    assert row.notification_action == "not_required"
    assert result.existing_enrollments_count == 1
    assert result.new_enrollments_count == 0


@pytest.mark.asyncio
async def test_preflight_classifies_email_phone_conflict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_lookups(
        monkeypatch,
        user_conflict=(
            "email and phone belong to different users."
        ),
    )

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(),
    )

    row = result.rows[0]

    assert row.classification == "identity_conflict"
    assert row.user_action == "conflict"
    assert row.error_code == "identity_conflict"
    assert result.identity_conflicts_count == 1


@pytest.mark.asyncio
async def test_preflight_classifies_snils_conflict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    conflicting_profile = LearnerProfile(
        id="profile-2",
        user_id="different-user",
        first_name="Other",
        last_name="Learner",
        snils="123-456-789 01",
    )

    configure_lookups(
        monkeypatch,
        user=None,
        snils_profile=conflicting_profile,
    )

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(),
    )

    row = result.rows[0]

    assert row.classification == "identity_conflict"
    assert row.error_code == "snils_conflict"
    assert result.identity_conflicts_count == 1


@pytest.mark.asyncio
async def test_preflight_preserves_invalid_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_lookups(monkeypatch)

    result = await service.build_learner_import_preflight(
        object(),
        batch=make_batch(row_status="invalid"),
    )

    row = result.rows[0]

    assert row.classification == "invalid_row"
    assert row.error_code == "validation_error"
    assert row.error_message == "Invalid row."
    assert result.invalid_rows_count == 1
