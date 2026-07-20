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
        self.refreshed: list[object] = []

    def add(
        self,
        instance: object,
    ) -> None:
        self.added.append(instance)

    async def flush(self) -> None:
        self.flush_count += 1

    async def refresh(
        self,
        instance: object,
    ) -> None:
        self.refreshed.append(instance)

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
    async def find_role(
        db: object,
    ) -> object:
        del db
        return SimpleNamespace(id="role-1")

    identity = service.LearnerImportPreflightLookups(
        users_by_email={
            str(email).lower(): user
            for email, user in users.items()
        },
        users_by_phone={
            str(user.phone): user
            for user in users.values()
            if user.phone
        },
        profiles_by_user_id=dict(profiles),
        profiles_by_snils={
            str(profile.snils): profile
            for profile in profiles.values()
            if profile.snils
        },
        enrollments_by_user_id=dict(
            enrollments
        ),
    )

    lookups = service.LearnerImportApplyLookups(
        identity=identity,
    )

    async def load_apply_lookups(
        db: object,
        *,
        rows: list[ImportRow],
        course_id: str | None,
        learner_role: object,
    ) -> service.LearnerImportApplyLookups:
        del db, rows, course_id, learner_role
        return lookups

    original_resolver = (
        service.resolve_learner_import_user
    )

    def resolve_user(
        *,
        email: str,
        phone: str,
        lookups: (
            service.LearnerImportPreflightLookups
        ),
    ) -> tuple[User | None, str | None]:
        if email == failing_email:
            raise IntegrityError(
                "resolve user",
                {},
                RuntimeError("constraint"),
            )

        return original_resolver(
            email=email,
            phone=phone,
            lookups=lookups,
        )

    async def assign_role(
        db: object,
        *,
        user_id: str,
        learner_role: object,
        lookups: (
            service.LearnerImportApplyLookups
        ),
    ) -> bool:
        del db, user_id, learner_role, lookups
        return False

    monkeypatch.setattr(
        service,
        "find_or_create_learner_role",
        find_role,
    )
    monkeypatch.setattr(
        service,
        "load_learner_import_apply_lookups",
        load_apply_lookups,
    )
    monkeypatch.setattr(
        service,
        "resolve_learner_import_user",
        resolve_user,
    )
    monkeypatch.setattr(
        service,
        "assign_learner_role_from_apply_lookups",
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
    assert (
        result.invitation_candidates[0].course_id
        == "course-1"
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

@pytest.mark.asyncio
async def test_apply_rejects_phone_identity_conflict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    batch = make_batch(
        "new-person@example.org"
    )
    row = batch.rows[0]

    row.normalized_data_json[
        "phone"
    ] = "+79000000002"

    conflicting_user = make_user(
        user_id="phone-owner",
        email="phone-owner@example.org",
        is_active=True,
    )
    conflicting_user.phone = "+79000000002"

    async def find_role(
        db: object,
    ) -> object:
        del db
        return SimpleNamespace(id="role-1")

    async def load_apply_lookups(
        db: object,
        *,
        rows: list[ImportRow],
        course_id: str | None,
        learner_role: object,
    ) -> service.LearnerImportApplyLookups:
        del db, rows, course_id, learner_role

        return service.LearnerImportApplyLookups(
            identity=(
                service.LearnerImportPreflightLookups(
                    users_by_phone={
                        "+79000000002": (
                            conflicting_user
                        ),
                    },
                )
            ),
        )

    class NestedTransaction:
        async def __aenter__(
            self,
        ) -> None:
            return None

        async def __aexit__(
            self,
            exc_type: object,
            exc: object,
            traceback: object,
        ) -> None:
            del exc_type, exc, traceback

    class FakeSession:
        def begin_nested(
            self,
        ) -> NestedTransaction:
            return NestedTransaction()

        async def flush(
            self,
        ) -> None:
            return None

    monkeypatch.setattr(
        service,
        "find_or_create_learner_role",
        find_role,
    )
    monkeypatch.setattr(
        service,
        "load_learner_import_apply_lookups",
        load_apply_lookups,
    )

    result = await service.apply_learner_import_batch(
        FakeSession(),
        batch=batch,
    )

    assert row.status == "error"
    assert row.user_id is None
    assert row.learner_profile_id is None
    assert row.enrollment_id is None
    assert row.error_summary == (
        "Phone belongs to another user "
        "with a different email."
    )

    assert result.created_users_count == 0
    assert result.updated_users_count == 0
    assert result.created_profiles_count == 0
    assert result.updated_profiles_count == 0
    assert result.created_enrollments_count == 0
    assert result.error_rows_count == 1
    assert result.invitation_candidates == ()
    assert (
        result.course_notification_candidates
        == ()
    )



class FakeApplyLookupScalarResult:
    def __init__(
        self,
        items: list[object],
    ) -> None:
        self.items = items

    def scalars(
        self,
    ) -> FakeApplyLookupScalarResult:
        return self

    def all(self) -> list[object]:
        return list(self.items)


class FakeApplyLookupSession:
    def __init__(
        self,
        result_sets: list[list[object]],
    ) -> None:
        self.result_sets = list(result_sets)
        self.statements: list[object] = []

    async def execute(
        self,
        statement: object,
    ) -> FakeApplyLookupScalarResult:
        self.statements.append(statement)

        if not self.result_sets:
            raise AssertionError(
                "Unexpected additional database query."
            )

        return FakeApplyLookupScalarResult(
            self.result_sets.pop(0)
        )


@pytest.mark.asyncio
async def test_apply_lookup_loader_uses_four_queries_for_many_rows() -> None:
    row_count = 25
    emails = [
        f"apply-{index}@example.org"
        for index in range(row_count)
    ]

    batch = make_batch(*emails)

    users: list[User] = []
    profiles: list[LearnerProfile] = []
    enrollments: list[Enrollment] = []

    for index, row in enumerate(batch.rows):
        user_id = f"apply-user-{index}"
        email = emails[index]
        phone = f"+7999222{index:04d}"
        snils = f"111-222-{index:03d} 00"

        user = make_user(
            user_id=user_id,
            email=email,
            is_active=True,
        )
        user.phone = phone

        profile = make_profile(
            user_id=user_id,
            email=email,
        )
        profile.phone = phone
        profile.snils = snils

        enrollment = make_enrollment(
            user_id=user_id
        )

        row.normalized_data_json[
            "phone"
        ] = phone
        row.normalized_data_json[
            "snils"
        ] = snils

        users.append(user)
        profiles.append(profile)
        enrollments.append(enrollment)

    assigned_role_user_ids = [
        str(user.id)
        for user in users[::2]
    ]

    session = FakeApplyLookupSession(
        [
            list(users),
            list(profiles),
            list(enrollments),
            list(assigned_role_user_ids),
        ]
    )

    lookups = (
        await service.load_learner_import_apply_lookups(
            session,
            rows=list(batch.rows),
            course_id=str(batch.course_id),
            learner_role=SimpleNamespace(
                id="role-1"
            ),
        )
    )

    assert len(session.statements) == 4
    assert session.result_sets == []

    assert (
        len(lookups.identity.users_by_email)
        == row_count
    )
    assert (
        len(lookups.identity.users_by_phone)
        == row_count
    )
    assert (
        len(
            lookups.identity.profiles_by_user_id
        )
        == row_count
    )
    assert (
        len(
            lookups.identity.enrollments_by_user_id
        )
        == row_count
    )
    assert lookups.learner_role_user_ids == set(
        assigned_role_user_ids
    )


@pytest.mark.asyncio
async def test_apply_lookup_loader_chunks_role_assignments(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row_count = 5
    users: list[User] = []

    for index in range(row_count):
        users.append(
            make_user(
                user_id=f"role-user-{index}",
                email=(
                    f"role-{index}@example.org"
                ),
                is_active=True,
            )
        )

    identity = service.LearnerImportPreflightLookups(
        users_by_email={
            str(user.email).lower(): user
            for user in users
        }
    )

    async def load_identity(
        db: object,
        *,
        rows: list[ImportRow],
        course_id: str | None,
    ) -> service.LearnerImportPreflightLookups:
        del db

        assert rows == []
        assert course_id is None

        return identity

    monkeypatch.setattr(
        service,
        "load_learner_import_preflight_lookups",
        load_identity,
    )
    monkeypatch.setattr(
        service,
        "LEARNER_IMPORT_PREFLIGHT_LOOKUP_CHUNK_SIZE",
        2,
    )

    role_user_ids = [
        str(user.id)
        for user in users
    ]

    session = FakeApplyLookupSession(
        [
            role_user_ids[0:2],
            role_user_ids[2:4],
            role_user_ids[4:5],
        ]
    )

    lookups = (
        await service.load_learner_import_apply_lookups(
            session,
            rows=[],
            course_id=None,
            learner_role=SimpleNamespace(
                id="role-1"
            ),
        )
    )

    assert len(session.statements) == 3
    assert session.result_sets == []
    assert lookups.identity is identity
    assert lookups.learner_role_user_ids == set(
        role_user_ids
    )



@pytest.mark.asyncio
async def test_assign_role_from_apply_lookups_defers_cache_update() -> None:
    existing_user_id = "existing-role-user"
    new_user_id = "new-role-user"

    lookups = service.LearnerImportApplyLookups(
        identity=(
            service.LearnerImportPreflightLookups()
        ),
        learner_role_user_ids={
            existing_user_id,
        },
    )

    session = FakeApplySession()
    learner_role = SimpleNamespace(
        id="role-1"
    )

    existing_assigned = (
        await service.assign_learner_role_from_apply_lookups(
            session,
            user_id=existing_user_id,
            learner_role=learner_role,
            lookups=lookups,
        )
    )

    assert existing_assigned is False
    assert session.added == []
    assert session.flush_count == 0

    new_assigned = (
        await service.assign_learner_role_from_apply_lookups(
            session,
            user_id=new_user_id,
            learner_role=learner_role,
            lookups=lookups,
        )
    )

    assert new_assigned is True
    assert len(session.added) == 1
    assert session.flush_count == 1

    assignment = session.added[0]

    assert (
        type(assignment).__name__
        == "UserRole"
    )
    assert assignment.user_id == new_user_id
    assert assignment.role_id == "role-1"
    assert assignment.organization_id is None

    assert (
        new_user_id
        not in lookups.learner_role_user_ids
    )


def test_remember_apply_success_updates_all_lookups() -> None:
    user = make_user(
        user_id="remembered-user",
        email="Remembered@Example.Org",
        is_active=False,
    )
    user.phone = "+79993334455"

    profile = make_profile(
        user_id=str(user.id),
        email=str(user.email),
    )
    profile.snils = "123-456-789 00"

    enrollment = make_enrollment(
        user_id=str(user.id)
    )

    lookups = service.LearnerImportApplyLookups(
        identity=(
            service.LearnerImportPreflightLookups()
        )
    )

    service.remember_learner_import_apply_success(
        lookups=lookups,
        user=user,
        profile=profile,
        enrollment=enrollment,
        learner_role_assigned=True,
    )

    assert (
        lookups.identity.users_by_email[
            "remembered@example.org"
        ]
        is user
    )
    assert (
        lookups.identity.users_by_phone[
            "+79993334455"
        ]
        is user
    )
    assert (
        lookups.identity.profiles_by_user_id[
            "remembered-user"
        ]
        is profile
    )
    assert (
        lookups.identity.profiles_by_snils[
            "123-456-789 00"
        ]
        is profile
    )
    assert (
        lookups.identity.enrollments_by_user_id[
            "remembered-user"
        ]
        is enrollment
    )
    assert (
        "remembered-user"
        in lookups.learner_role_user_ids
    )



class SuccessfulApplyNestedTransaction:
    async def __aenter__(
        self,
    ) -> None:
        return None

    async def __aexit__(
        self,
        exc_type: object,
        exc: object,
        traceback: object,
    ) -> None:
        del exc_type, exc, traceback


class BatchedApplySession(
    FakeApplyLookupSession
):
    def __init__(
        self,
        result_sets: list[list[object]],
    ) -> None:
        super().__init__(result_sets)
        self.added: list[object] = []
        self.flush_count = 0
        self.nested_count = 0

    def add(
        self,
        instance: object,
    ) -> None:
        self.added.append(instance)

    async def flush(self) -> None:
        self.flush_count += 1

    def begin_nested(
        self,
    ) -> SuccessfulApplyNestedTransaction:
        self.nested_count += 1
        return SuccessfulApplyNestedTransaction()


@pytest.mark.asyncio
async def test_apply_uses_only_batched_lookup_queries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row_count = 25
    emails = [
        f"batched-{index}@example.org"
        for index in range(row_count)
    ]

    batch = make_batch(*emails)

    users: list[User] = []
    profiles: list[LearnerProfile] = []
    enrollments: list[Enrollment] = []

    for index, row in enumerate(batch.rows):
        user_id = f"batched-user-{index}"
        email = emails[index]
        phone = f"+7999444{index:04d}"
        snils = f"222-333-{index:03d} 00"

        user = make_user(
            user_id=user_id,
            email=email,
            is_active=True,
        )
        user.phone = phone

        profile = make_profile(
            user_id=user_id,
            email=email,
        )
        profile.phone = phone
        profile.snils = snils

        enrollment = make_enrollment(
            user_id=user_id
        )

        row.normalized_data_json[
            "phone"
        ] = phone
        row.normalized_data_json[
            "snils"
        ] = snils

        users.append(user)
        profiles.append(profile)
        enrollments.append(enrollment)

    async def find_role(
        db: object,
    ) -> object:
        del db
        return SimpleNamespace(id="role-1")

    monkeypatch.setattr(
        service,
        "find_or_create_learner_role",
        find_role,
    )

    session = BatchedApplySession(
        [
            list(users),
            list(profiles),
            list(enrollments),
            [
                str(user.id)
                for user in users
            ],
        ]
    )

    result = await service.apply_learner_import_batch(
        session,
        batch=batch,
    )

    assert len(session.statements) == 4
    assert session.result_sets == []
    assert session.nested_count == row_count
    assert session.flush_count == row_count + 1
    assert session.added == []

    assert result.created_users_count == 0
    assert result.created_profiles_count == 0
    assert result.created_enrollments_count == 0
    assert result.assigned_learner_roles_count == 0
    assert result.error_rows_count == 0

    assert all(
        row.status == "applied"
        for row in batch.rows
    )


class GeneratedIdApplySession:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.flush_count = 0
        self.nested_count = 0
        self.user_count = 0
        self.profile_count = 0

    def add(
        self,
        instance: object,
    ) -> None:
        self.added.append(instance)

        if isinstance(instance, User):
            if not instance.id:
                self.user_count += 1
                instance.id = (
                    f"generated-user-"
                    f"{self.user_count}"
                )

        if isinstance(
            instance,
            LearnerProfile,
        ):
            if not instance.id:
                self.profile_count += 1
                instance.id = (
                    f"generated-profile-"
                    f"{self.profile_count}"
                )

    async def flush(self) -> None:
        self.flush_count += 1

    def begin_nested(
        self,
    ) -> SuccessfulApplyNestedTransaction:
        self.nested_count += 1
        return SuccessfulApplyNestedTransaction()


@pytest.mark.asyncio
async def test_apply_reuses_objects_created_by_previous_row(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = "duplicate-row@example.org"

    batch = make_batch(
        email,
        email,
        course_id=None,
    )

    lookups = service.LearnerImportApplyLookups(
        identity=(
            service.LearnerImportPreflightLookups()
        )
    )

    loader_calls = 0

    async def find_role(
        db: object,
    ) -> object:
        del db
        return SimpleNamespace(id="role-1")

    async def load_apply_lookups(
        db: object,
        *,
        rows: list[ImportRow],
        course_id: str | None,
        learner_role: object,
    ) -> service.LearnerImportApplyLookups:
        nonlocal loader_calls
        del db, rows, learner_role

        assert course_id is None
        loader_calls += 1
        return lookups

    monkeypatch.setattr(
        service,
        "find_or_create_learner_role",
        find_role,
    )
    monkeypatch.setattr(
        service,
        "load_learner_import_apply_lookups",
        load_apply_lookups,
    )
    monkeypatch.setattr(
        service,
        "get_password_hash",
        lambda value: f"hash:{value}",
    )

    session = GeneratedIdApplySession()

    result = await service.apply_learner_import_batch(
        session,
        batch=batch,
    )

    assert loader_calls == 1
    assert session.nested_count == 2

    assert result.created_users_count == 1
    assert result.created_profiles_count == 1
    assert result.created_enrollments_count == 0
    assert result.assigned_learner_roles_count == 1
    assert result.error_rows_count == 0

    assert batch.rows[0].status == "applied"
    assert batch.rows[1].status == "applied"

    assert (
        batch.rows[0].user_id
        == batch.rows[1].user_id
    )
    assert (
        batch.rows[0].learner_profile_id
        == batch.rows[1].learner_profile_id
    )

    added_type_names = [
        type(instance).__name__
        for instance in session.added
    ]

    assert added_type_names.count("User") == 1
    assert (
        added_type_names.count(
            "LearnerProfile"
        )
        == 1
    )
    assert (
        added_type_names.count("UserRole")
        == 1
    )


@pytest.mark.asyncio
async def test_apply_reloads_lookups_after_integrity_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failed_email = "failed-refresh@example.org"
    good_email = "good-refresh@example.org"

    good_user = make_user(
        user_id="good-refresh-user",
        email=good_email,
        is_active=True,
    )
    good_profile = make_profile(
        user_id=str(good_user.id),
        email=good_email,
    )

    lookups = service.LearnerImportApplyLookups(
        identity=(
            service.LearnerImportPreflightLookups(
                users_by_email={
                    good_email: good_user,
                },
                profiles_by_user_id={
                    str(good_user.id): (
                        good_profile
                    ),
                },
            )
        ),
    )

    loader_calls = 0
    failure_raised = False

    async def find_role(
        db: object,
    ) -> object:
        del db
        return SimpleNamespace(id="role-1")

    async def load_apply_lookups(
        db: object,
        *,
        rows: list[ImportRow],
        course_id: str | None,
        learner_role: object,
    ) -> service.LearnerImportApplyLookups:
        nonlocal loader_calls
        del db, rows, learner_role

        assert course_id is None
        loader_calls += 1
        return lookups

    original_resolver = (
        service.resolve_learner_import_user
    )

    def resolve_user(
        *,
        email: str,
        phone: str,
        lookups: (
            service.LearnerImportPreflightLookups
        ),
    ) -> tuple[User | None, str | None]:
        nonlocal failure_raised

        if (
            email == failed_email
            and not failure_raised
        ):
            failure_raised = True
            raise IntegrityError(
                "resolve user",
                {},
                RuntimeError("constraint"),
            )

        return original_resolver(
            email=email,
            phone=phone,
            lookups=lookups,
        )

    async def assign_role(
        db: object,
        *,
        user_id: str,
        learner_role: object,
        lookups: (
            service.LearnerImportApplyLookups
        ),
    ) -> bool:
        del db, user_id, learner_role, lookups
        return False

    monkeypatch.setattr(
        service,
        "find_or_create_learner_role",
        find_role,
    )
    monkeypatch.setattr(
        service,
        "load_learner_import_apply_lookups",
        load_apply_lookups,
    )
    monkeypatch.setattr(
        service,
        "resolve_learner_import_user",
        resolve_user,
    )
    monkeypatch.setattr(
        service,
        "assign_learner_role_from_apply_lookups",
        assign_role,
    )

    batch = make_batch(
        failed_email,
        good_email,
        course_id=None,
    )
    session = FakeApplySession()

    result = await service.apply_learner_import_batch(
        session,
        batch=batch,
    )

    assert loader_calls == 2
    assert session.nested_count == 2
    assert result.error_rows_count == 1

    assert batch.rows[0].status == "error"
    assert batch.rows[1].status == "applied"
    assert batch.status == "applied"



@pytest.mark.asyncio
async def test_apply_refreshes_row_after_integrity_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failed_email = "refresh-row@example.org"

    batch = make_batch(
        failed_email,
        course_id=None,
    )
    row = batch.rows[0]
    session = FakeApplySession()

    configure_apply_lookups(
        monkeypatch,
        users={},
        profiles={},
        enrollments={},
        failing_email=failed_email,
    )

    original_mark_error = (
        service.mark_import_row_error
    )

    def mark_error(
        current_row: ImportRow,
        message: str,
    ) -> None:
        assert session.refreshed == [
            current_row
        ]

        original_mark_error(
            current_row,
            message,
        )

    monkeypatch.setattr(
        service,
        "mark_import_row_error",
        mark_error,
    )

    result = (
        await service.apply_learner_import_batch(
            session,
            batch=batch,
        )
    )

    assert session.refreshed == [row]
    assert result.error_rows_count == 1
    assert row.status == "error"
    assert row.error_summary == (
        "Database constraint conflict "
        "while applying learner import row."
    )
    assert batch.status == "applied"
