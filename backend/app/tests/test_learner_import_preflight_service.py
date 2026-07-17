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
    async def load_lookups(
        db: object,
        *,
        rows: list[ImportRow],
        course_id: str | None,
    ) -> service.LearnerImportPreflightLookups:
        del db, rows, course_id

        profiles_by_user_id = {}

        if (
            user is not None
            and profile is not None
        ):
            profiles_by_user_id[
                str(user.id)
            ] = profile

        profiles_by_snils = {}

        if (
            snils_profile is not None
            and snils_profile.snils
        ):
            profiles_by_snils[
                str(snils_profile.snils)
            ] = snils_profile

        enrollments_by_user_id = {}

        if (
            user is not None
            and enrollment is not None
        ):
            enrollments_by_user_id[
                str(user.id)
            ] = enrollment

        return service.LearnerImportPreflightLookups(
            profiles_by_user_id=(
                profiles_by_user_id
            ),
            profiles_by_snils=(
                profiles_by_snils
            ),
            enrollments_by_user_id=(
                enrollments_by_user_id
            ),
        )

    def resolve_user(
        *,
        email: str,
        phone: str,
        lookups: (
            service.LearnerImportPreflightLookups
        ),
    ) -> tuple[User | None, str | None]:
        del email, phone, lookups

        return user, user_conflict

    monkeypatch.setattr(
        service,
        "load_learner_import_preflight_lookups",
        load_lookups,
    )
    monkeypatch.setattr(
        service,
        "resolve_learner_import_user",
        resolve_user,
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


@pytest.mark.asyncio
async def test_preflight_existing_inactive_enrollment_has_no_notification(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(is_active=False)

    configure_lookups(
        monkeypatch,
        user=user,
        profile=make_profile(),
        snils_profile=make_profile(),
        enrollment=make_enrollment(),
    )

    result = (
        await service.build_learner_import_preflight(
            object(),
            batch=make_batch(),
        )
    )

    row = result.rows[0]

    assert row.classification == "existing_enrollment"
    assert row.account_state == "inactive"
    assert row.notification_action == "not_required"
    assert result.existing_enrollments_count == 1
    assert result.existing_inactive_users_count == 0
    assert result.existing_active_users_count == 0
    assert result.password_setup_invitations_count == 0
    assert result.new_course_notifications_count == 0


def test_preflight_summary_classifications_are_mutually_exclusive() -> None:
    rows = [
        service.LearnerImportPreflightRow(
            row_id="row-new",
            row_number=1,
            email="new@example.org",
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
        ),
        service.LearnerImportPreflightRow(
            row_id="row-inactive",
            row_number=2,
            email="inactive@example.org",
            classification=(
                "existing_inactive_user"
            ),
            account_state="inactive",
            user_id="user-inactive",
            learner_profile_id="profile-inactive",
            enrollment_id=None,
            user_action="unchanged",
            profile_action="unchanged",
            enrollment_action="created",
            notification_action=(
                "password_setup_invitation"
            ),
        ),
        service.LearnerImportPreflightRow(
            row_id="row-active",
            row_number=3,
            email="active@example.org",
            classification="existing_active_user",
            account_state="active",
            user_id="user-active",
            learner_profile_id="profile-active",
            enrollment_id=None,
            user_action="unchanged",
            profile_action="unchanged",
            enrollment_action="created",
            notification_action=(
                "new_course_notification"
            ),
        ),
        service.LearnerImportPreflightRow(
            row_id="row-enrollment",
            row_number=4,
            email="assigned@example.org",
            classification="existing_enrollment",
            account_state="inactive",
            user_id="user-assigned",
            learner_profile_id="profile-assigned",
            enrollment_id="enrollment-assigned",
            user_action="unchanged",
            profile_action="unchanged",
            enrollment_action="unchanged",
            notification_action="not_required",
        ),
        service.LearnerImportPreflightRow(
            row_id="row-conflict",
            row_number=5,
            email="conflict@example.org",
            classification="identity_conflict",
            account_state="active",
            user_id="user-conflict",
            learner_profile_id=None,
            enrollment_id=None,
            user_action="conflict",
            profile_action="skipped",
            enrollment_action="skipped",
            notification_action="not_required",
        ),
        service.LearnerImportPreflightRow(
            row_id="row-invalid",
            row_number=6,
            email="",
            classification="invalid_row",
            account_state="unknown",
            user_id=None,
            learner_profile_id=None,
            enrollment_id=None,
            user_action="skipped",
            profile_action="skipped",
            enrollment_action="skipped",
            notification_action="not_required",
        ),
    ]

    result = (
        service.build_learner_import_preflight_result(
            rows
        )
    )

    category_total = sum(
        [
            result.new_users_count,
            result.existing_inactive_users_count,
            result.existing_active_users_count,
            result.existing_enrollments_count,
            result.identity_conflicts_count,
            result.invalid_rows_count,
        ]
    )

    assert category_total == len(rows)
    assert result.new_users_count == 1
    assert result.existing_inactive_users_count == 1
    assert result.existing_active_users_count == 1
    assert result.existing_enrollments_count == 1
    assert result.identity_conflicts_count == 1
    assert result.invalid_rows_count == 1

@pytest.mark.asyncio
async def test_find_user_for_import_row_rejects_phone_only_match() -> None:
    phone_owner = User(
        id="phone-owner",
        email="owner@example.org",
        phone="+79000000002",
        full_name="Existing Owner",
        hashed_password="hash",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )

    class ScalarResult:
        def __init__(
            self,
            value: User | None,
        ) -> None:
            self.value = value

        def scalar_one_or_none(
            self,
        ) -> User | None:
            return self.value

    class SequentialSession:
        def __init__(
            self,
            values: list[User | None],
        ) -> None:
            self.values = values

        async def execute(
            self,
            statement: object,
        ) -> ScalarResult:
            del statement

            return ScalarResult(
                self.values.pop(0)
            )

    session = SequentialSession(
        [
            None,
            phone_owner,
        ]
    )

    user, conflict = (
        await service.find_user_for_import_row(
            session,
            email="new-person@example.org",
            phone="+79000000002",
        )
    )

    assert user is None
    assert conflict == (
        "Phone belongs to another user "
        "with a different email."
    )


@pytest.mark.asyncio
async def test_find_user_for_import_row_rejects_email_with_different_phone() -> None:
    email_owner = User(
        id="email-owner",
        email="owner@example.org",
        phone="+79000000001",
        full_name="Existing Owner",
        hashed_password="hash",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )

    class ScalarResult:
        def __init__(
            self,
            value: User | None,
        ) -> None:
            self.value = value

        def scalar_one_or_none(
            self,
        ) -> User | None:
            return self.value

    class SequentialSession:
        def __init__(
            self,
            values: list[User | None],
        ) -> None:
            self.values = values

        async def execute(
            self,
            statement: object,
        ) -> ScalarResult:
            del statement

            return ScalarResult(
                self.values.pop(0)
            )

    session = SequentialSession(
        [
            email_owner,
            None,
        ]
    )

    user, conflict = (
        await service.find_user_for_import_row(
            session,
            email="owner@example.org",
            phone="+79000000002",
        )
    )

    assert user is None
    assert conflict == (
        "Email belongs to a user "
        "with a different phone."
    )



class FakePreflightScalarResult:
    def __init__(
        self,
        items: list[object],
    ) -> None:
        self.items = items

    def scalars(
        self,
    ) -> FakePreflightScalarResult:
        return self

    def all(self) -> list[object]:
        return list(self.items)


class FakePreflightLookupSession:
    def __init__(
        self,
        result_sets: list[list[object]],
    ) -> None:
        self.result_sets = list(result_sets)
        self.statements: list[object] = []

    async def execute(
        self,
        statement: object,
    ) -> FakePreflightScalarResult:
        self.statements.append(statement)

        if not self.result_sets:
            raise AssertionError(
                "Unexpected additional database query."
            )

        return FakePreflightScalarResult(
            self.result_sets.pop(0)
        )


@pytest.mark.asyncio
async def test_preflight_uses_three_queries_for_many_rows() -> None:
    row_count = 25

    batch = ImportBatch(
        id="batch-query-count",
        status="parsed",
        import_type="learner_roster",
        course_id="course-1",
        organization_id="org-1",
        learning_group_id="group-1",
        total_rows=row_count,
        valid_rows=row_count,
        invalid_rows=0,
    )

    users: list[User] = []
    profiles: list[LearnerProfile] = []
    enrollments: list[Enrollment] = []

    for index in range(row_count):
        user_id = f"user-{index}"
        email = f"learner-{index}@example.org"
        phone = f"+7999000{index:04d}"
        snils = f"123-456-{index:03d} 00"

        user = User(
            id=user_id,
            email=email,
            phone=phone,
            full_name=f"Learner {index}",
            hashed_password="hash",
            is_active=True,
            is_email_verified=True,
            mfa_enabled=False,
        )
        profile = LearnerProfile(
            id=f"profile-{index}",
            user_id=user_id,
            first_name="Learner",
            last_name=str(index),
            phone=phone,
            email=email,
            snils=snils,
        )
        enrollment = Enrollment(
            id=f"enrollment-{index}",
            user_id=user_id,
            course_id="course-1",
            organization_id="org-1",
            learning_group_id="group-1",
            status="assigned",
        )

        users.append(user)
        profiles.append(profile)
        enrollments.append(enrollment)

        batch.rows.append(
            ImportRow(
                id=f"row-{index}",
                row_number=index + 2,
                status="valid",
                raw_data_json={},
                normalized_data_json={
                    "full_name": f"Learner {index}",
                    "first_name": "Learner",
                    "last_name": str(index),
                    "middle_name": "",
                    "email": email,
                    "phone": phone,
                    "snils": snils,
                },
                validation_errors_json=[],
            )
        )

    session = FakePreflightLookupSession(
        [
            list(users),
            list(profiles),
            list(enrollments),
        ]
    )

    result = (
        await service.build_learner_import_preflight(
            session,
            batch=batch,
        )
    )

    assert len(session.statements) == 3
    assert session.result_sets == []
    assert len(result.rows) == row_count
    assert all(
        row.classification
        == "existing_enrollment"
        for row in result.rows
    )
    assert result.existing_enrollments_count == row_count
    assert result.identity_conflicts_count == 0



def test_resolver_rejects_distinct_email_and_phone_users() -> None:
    email_user = User(
        id="email-user",
        email="email@example.org",
        phone="+79990000001",
        full_name="Email User",
        hashed_password="hash",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    phone_user = User(
        id="phone-user",
        email="phone@example.org",
        phone="+79990000002",
        full_name="Phone User",
        hashed_password="hash",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )

    lookups = service.LearnerImportPreflightLookups(
        users_by_email={
            "email@example.org": email_user,
        },
        users_by_phone={
            "+79990000002": phone_user,
        },
    )

    user, conflict = (
        service.resolve_learner_import_user(
            email="EMAIL@EXAMPLE.ORG",
            phone="+79990000002",
            lookups=lookups,
        )
    )

    assert user is None
    assert conflict == (
        "Email and phone belong to different users."
    )


@pytest.mark.asyncio
async def test_preflight_lookup_normalizes_email_dictionary_key() -> None:
    user = User(
        id="mixed-case-user",
        email="Mixed.Case@Example.Org",
        phone=None,
        full_name="Mixed Case",
        hashed_password="hash",
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )

    row = ImportRow(
        id="mixed-case-row",
        row_number=2,
        status="valid",
        raw_data_json={},
        normalized_data_json={
            "full_name": "Mixed Case",
            "email": "mixed.case@example.org",
            "phone": "",
            "snils": "",
        },
        validation_errors_json=[],
    )

    session = FakePreflightLookupSession(
        [
            [user],
            [],
        ]
    )

    lookups = (
        await service.load_learner_import_preflight_lookups(
            session,
            rows=[row],
            course_id=None,
        )
    )

    assert len(session.statements) == 2
    assert (
        lookups.users_by_email[
            "mixed.case@example.org"
        ]
        is user
    )

    resolved_user, conflict = (
        service.resolve_learner_import_user(
            email="MIXED.CASE@EXAMPLE.ORG",
            phone="",
            lookups=lookups,
        )
    )

    assert resolved_user is user
    assert conflict is None



@pytest.mark.asyncio
async def test_preflight_lookup_chunks_large_value_sets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        service,
        "LEARNER_IMPORT_PREFLIGHT_LOOKUP_CHUNK_SIZE",
        2,
    )

    row_count = 5
    rows: list[ImportRow] = []
    users: list[User] = []
    profiles: list[LearnerProfile] = []
    enrollments: list[Enrollment] = []

    for index in range(row_count):
        user_id = f"chunk-user-{index}"
        email = (
            f"chunk-{index}@example.org"
        )
        phone = f"+7999111{index:04d}"
        snils = f"987-654-{index:03d} 00"

        rows.append(
            ImportRow(
                id=f"chunk-row-{index}",
                row_number=index + 2,
                status="valid",
                raw_data_json={},
                normalized_data_json={
                    "full_name": (
                        f"Chunk Learner {index}"
                    ),
                    "email": email,
                    "phone": phone,
                    "snils": snils,
                },
                validation_errors_json=[],
            )
        )

        users.append(
            User(
                id=user_id,
                email=email,
                phone=phone,
                full_name=(
                    f"Chunk Learner {index}"
                ),
                hashed_password="hash",
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )
        )

        profiles.append(
            LearnerProfile(
                id=f"chunk-profile-{index}",
                user_id=user_id,
                first_name="Chunk",
                last_name=str(index),
                email=email,
                phone=phone,
                snils=snils,
            )
        )

        enrollments.append(
            Enrollment(
                id=f"chunk-enrollment-{index}",
                user_id=user_id,
                course_id="course-1",
                status="assigned",
            )
        )

    def chunks(
        items: list[object],
    ) -> list[list[object]]:
        return [
            items[start:start + 2]
            for start in range(
                0,
                len(items),
                2,
            )
        ]

    session = FakePreflightLookupSession(
        [
            *chunks(list(users)),
            *chunks(list(profiles)),
            *chunks(list(enrollments)),
        ]
    )

    lookups = (
        await service.load_learner_import_preflight_lookups(
            session,
            rows=rows,
            course_id="course-1",
        )
    )

    assert len(session.statements) == 9
    assert session.result_sets == []

    assert len(lookups.users_by_email) == row_count
    assert len(lookups.users_by_phone) == row_count
    assert (
        len(lookups.profiles_by_user_id)
        == row_count
    )
    assert (
        len(lookups.profiles_by_snils)
        == row_count
    )
    assert (
        len(lookups.enrollments_by_user_id)
        == row_count
    )
