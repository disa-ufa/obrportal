from __future__ import annotations

from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.enrollment import Enrollment
from app.models.import_batch import ImportBatch, ImportRow
from app.models.learner_profile import LearnerProfile
from app.models.user import User
from app.services import learner_import_batches as service
from app.services.learner_import_batches import (
    assign_learner_role_if_available,
    normalize_import_text,
)


def test_normalize_import_text_strips_none_and_spaces() -> None:
    assert normalize_import_text(None) == ""
    assert normalize_import_text("  Value  ") == "Value"


@pytest.mark.asyncio
async def test_assign_learner_role_if_available_skips_when_role_is_missing() -> None:
    class NoopSession:
        def add(self, instance: object) -> None:
            del instance
            raise AssertionError(
                "add should not be called "
                "when learner role is missing"
            )

        async def flush(self) -> None:
            raise AssertionError(
                "flush should not be called "
                "when learner role is missing"
            )

    assigned = (
        await assign_learner_role_if_available(
            NoopSession(),
            user_id="user-1",
            learner_role=None,
        )
    )

    assert assigned is False


class FakeNestedTransaction:
    async def __aenter__(
        self,
    ) -> "FakeNestedTransaction":
        return self

    async def __aexit__(
        self,
        exc_type,
        exc,
        traceback,
    ) -> bool:
        del exc_type, exc, traceback
        return False


class FakeApplySession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.flush_count = 0
        self.nested_count = 0

    def add(self, instance: object) -> None:
        self.added.append(instance)

    async def flush(self) -> None:
        self.flush_count += 1

    def begin_nested(
        self,
    ) -> FakeNestedTransaction:
        self.nested_count += 1
        return FakeNestedTransaction()


def make_batch(
    *emails: str,
    course_id: str | None = "course-1",
) -> ImportBatch:
    batch = ImportBatch(
        id="batch-apply",
        import_type="learner_roster",
        status="parsed",
        organization_id="org-1",
        learning_group_id="group-1",
        course_id=course_id,
        total_rows=len(emails),
        valid_rows=len(emails),
        invalid_rows=0,
    )

    for index, email in enumerate(
        emails,
        start=1,
    ):
        batch.rows.append(
            ImportRow(
                id=f"row-{index}",
                row_number=index + 1,
                status="valid",
                raw_data_json={},
                normalized_data_json={
                    "full_name": f"Learner {index}",
                    "first_name": "Learner",
                    "last_name": str(index),
                    "email": email,
                    "phone": "",
                    "snils": "",
                },
                validation_errors_json=[],
            )
        )

    return batch


def make_user(
    *,
    user_id: str,
    email: str,
    is_active: bool,
) -> User:
    return User(
        id=user_id,
        email=email,
        phone=None,
        full_name=None,
        hashed_password="hash",
        is_active=is_active,
        is_email_verified=is_active,
        mfa_enabled=False,
    )


def make_profile(
    *,
    user_id: str,
    email: str,
) -> LearnerProfile:
    return LearnerProfile(
        id=f"profile-{user_id}",
        user_id=user_id,
        first_name="Learner",
        last_name="Existing",
        email=email,
    )


def make_enrollment(
    *,
    user_id: str,
) -> Enrollment:
    return Enrollment(
        id=f"enrollment-{user_id}",
        user_id=user_id,
        course_id="course-1",
        organization_id="org-1",
        learning_group_id="group-1",
        status="assigned",
    )


def configure_apply_lookups(
    monkeypatch: pytest.MonkeyPatch,
    *,
    users: dict[str, User],
    profiles: dict[str, LearnerProfile],
    enrollments: dict[str, Enrollment],
    failing_email: str | None = None,
) -> None:
    async def find_role(db):
        del db
        return SimpleNamespace(id="role-1")

    async def find_user(
        db,
        *,
        email: str,
        phone: str,
    ):
        del db, phone

        if email == failing_email:
            raise IntegrityError(
                "select user",
                {},
                RuntimeError("constraint"),
            )

        return users.get(email), None

    async def find_snils_profile(
        db,
        snils: str,
    ):
        del db, snils
        return None

    async def find_profile(
        db,
        user_id: str,
    ):
        del db
        return profiles.get(user_id)

    async def find_enrollment(
        db,
        *,
        user_id: str,
        course_id: str,
    ):
        del db, course_id
        return enrollments.get(user_id)

    async def assign_role(
        db,
        *,
        user_id: str,
        learner_role,
    ) -> bool:
        del db, user_id, learner_role
        return False

    monkeypatch.setattr(
        service,
        "find_or_create_learner_role",
        find_role,
    )
    monkeypatch.setattr(
        service,
        "find_user_for_import_row",
        find_user,
    )
    monkeypatch.setattr(
        service,
        "find_profile_by_snils",
        find_snils_profile,
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
    monkeypatch.setattr(
        service,
        "assign_learner_role_if_available",
        assign_role,
    )
    monkeypatch.setattr(
        service,
        "get_password_hash",
        lambda value: f"hash:{value}",
    )


@pytest.mark.asyncio
async def test_apply_invites_existing_inactive_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "inactive@example.org"

    user = make_user(
        user_id="inactive-user",
        email=email,
        is_active=False,
    )

    batch = make_batch(email)
    db = FakeApplySession()

    configure_apply_lookups(
        monkeypatch,
        users={email: user},
        profiles={
            user.id: make_profile(
                user_id=user.id,
                email=email,
            )
        },
        enrollments={},
    )

    result = (
        await service.apply_learner_import_batch(
            db,
            batch=batch,
        )
    )

    assert batch.rows[0].status == "applied"
    assert len(result.invitation_candidates) == 1
    assert (
        result.invitation_candidates[0].user_id
        == user.id
    )
    assert result.course_notification_candidates == ()
    assert result.created_enrollments_count == 1
    assert db.nested_count == 1


@pytest.mark.asyncio
async def test_apply_notifies_active_user_about_new_course(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "active@example.org"

    user = make_user(
        user_id="active-user",
        email=email,
        is_active=True,
    )

    batch = make_batch(email)
    db = FakeApplySession()

    configure_apply_lookups(
        monkeypatch,
        users={email: user},
        profiles={
            user.id: make_profile(
                user_id=user.id,
                email=email,
            )
        },
        enrollments={},
    )

    result = (
        await service.apply_learner_import_batch(
            db,
            batch=batch,
        )
    )

    assert result.invitation_candidates == ()
    assert len(
        result.course_notification_candidates
    ) == 1

    notification = (
        result.course_notification_candidates[0]
    )

    assert notification.user_id == user.id
    assert notification.course_id == "course-1"


@pytest.mark.asyncio
async def test_apply_existing_enrollment_has_no_notification(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "assigned@example.org"

    user = make_user(
        user_id="assigned-user",
        email=email,
        is_active=False,
    )

    batch = make_batch(email)
    db = FakeApplySession()

    configure_apply_lookups(
        monkeypatch,
        users={email: user},
        profiles={
            user.id: make_profile(
                user_id=user.id,
                email=email,
            )
        },
        enrollments={
            user.id: make_enrollment(
                user_id=user.id
            )
        },
    )

    result = (
        await service.apply_learner_import_batch(
            db,
            batch=batch,
        )
    )

    assert result.invitation_candidates == ()
    assert result.course_notification_candidates == ()
    assert result.created_enrollments_count == 0


@pytest.mark.asyncio
async def test_apply_uses_independent_savepoint_per_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failing_email = "failed@example.org"
    good_email = "good@example.org"

    good_user = make_user(
        user_id="good-user",
        email=good_email,
        is_active=True,
    )

    batch = make_batch(
        failing_email,
        good_email,
        course_id=None,
    )
    db = FakeApplySession()

    configure_apply_lookups(
        monkeypatch,
        users={good_email: good_user},
        profiles={
            good_user.id: make_profile(
                user_id=good_user.id,
                email=good_email,
            )
        },
        enrollments={},
        failing_email=failing_email,
    )

    result = (
        await service.apply_learner_import_batch(
            db,
            batch=batch,
        )
    )

    assert db.nested_count == 2
    assert result.error_rows_count == 1
    assert batch.rows[0].status == "error"
    assert batch.rows[1].status == "applied"
    assert batch.status == "applied"
