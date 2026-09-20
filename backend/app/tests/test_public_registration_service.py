from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy import func, select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models.learner_profile import LearnerProfile
from app.models.role import Role, UserRole
from app.models.user import User
from app.models.user_password_token import UserPasswordToken
from app.services import public_registration as service
from app.services.public_registration import (
    PUBLIC_REGISTRATION_OUTCOME_EXISTING_ACTIVE_USER,
    PUBLIC_REGISTRATION_OUTCOME_EXISTING_INACTIVE_USER,
    PUBLIC_REGISTRATION_OUTCOME_IDENTITY_CONFLICT,
    PUBLIC_REGISTRATION_OUTCOME_USER_CREATED,
    normalize_public_registration_data,
    prepare_public_registration,
)
from app.services.user_password_tokens import (
    create_user_password_token,
)


def unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}@example.com"


def unique_phone() -> str:
    return f"+7999{uuid4().int % 10_000_000:07d}"


def run_database_scenario(
    scenario: Callable[[], Awaitable[None]],
) -> None:
    async def runner() -> None:
        try:
            await scenario()
        finally:
            await engine.dispose()

    asyncio.run(runner())


async def ensure_learner_role(session) -> Role:
    result = await session.execute(
        select(Role).where(Role.code == "learner_fl")
    )
    role = result.scalar_one_or_none()

    if role is not None:
        return role

    role = Role(
        code="learner_fl",
        name="Individual learner",
        description="Test learner role.",
    )
    session.add(role)
    await session.flush()
    return role


async def count_rows(session, model, *criteria) -> int:
    statement = select(func.count()).select_from(model)

    if criteria:
        statement = statement.where(*criteria)

    result = await session.execute(statement)
    return int(result.scalar_one())


def test_prepare_public_registration_creates_inactive_learner() -> None:
    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            await ensure_learner_role(session)

            email = unique_email("public_new")
            phone = unique_phone()
            data = normalize_public_registration_data(
                last_name="Ivanov",
                first_name="Ivan",
                middle_name="Ivanovich",
                email=email.upper(),
                phone=phone,
            )

            result = await prepare_public_registration(
                session,
                data=data,
            )

            assert result.outcome == (
                PUBLIC_REGISTRATION_OUTCOME_USER_CREATED
            )
            assert result.user is not None
            assert result.profile is not None
            assert result.created_token is not None
            assert result.learner_role_assigned is True

            assert result.user.email == email
            assert result.user.phone == phone
            assert result.user.full_name == (
                "Ivanov Ivan Ivanovich"
            )
            assert result.user.is_active is False
            assert result.user.is_email_verified is False

            assert result.profile.user_id == result.user.id
            assert result.profile.last_name == "Ivanov"
            assert result.profile.first_name == "Ivan"
            assert result.profile.middle_name == "Ivanovich"
            assert result.profile.source == "public_registration"
            assert (
                result.profile.personal_data_basis
                == "public_registration"
            )
            assert (
                result.profile.personal_data_consent_at
                is not None
            )

            assignment_count = await count_rows(
                session,
                UserRole,
                UserRole.user_id == result.user.id,
                UserRole.organization_id.is_(None),
            )
            assert assignment_count == 1

            await session.rollback()

    run_database_scenario(scenario)


def test_prepare_public_registration_reuses_imported_user() -> None:
    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            role = await ensure_learner_role(session)

            email = unique_email("public_imported")
            phone = unique_phone()
            user = User(
                email=email,
                phone=None,
                full_name="Imported Full Name",
                hashed_password=get_password_hash(
                    "ImportedInitial123!"
                ),
                is_active=False,
                is_email_verified=False,
                mfa_enabled=False,
            )
            session.add(user)
            await session.flush()

            profile = LearnerProfile(
                user_id=user.id,
                last_name="Imported",
                first_name="Learner",
                middle_name=None,
                phone=None,
                email=email,
                source="learner_import",
                personal_data_basis="import",
                personal_data_consent_at=None,
            )
            session.add(profile)
            session.add(
                UserRole(
                    user_id=user.id,
                    role_id=role.id,
                    organization_id=None,
                )
            )
            await session.flush()

            old_token = await create_user_password_token(
                session,
                user=user,
            )

            data = normalize_public_registration_data(
                last_name="Must Not Replace",
                first_name="Must Not Replace",
                middle_name="Filled",
                email=email,
                phone=phone,
            )

            result = await prepare_public_registration(
                session,
                data=data,
            )

            assert result.outcome == (
                PUBLIC_REGISTRATION_OUTCOME_EXISTING_INACTIVE_USER
            )
            assert result.user is user
            assert result.profile is profile
            assert result.created_token is not None
            assert result.learner_role_assigned is False

            assert user.full_name == "Imported Full Name"
            assert user.phone == phone
            assert profile.last_name == "Imported"
            assert profile.first_name == "Learner"
            assert profile.middle_name == "Filled"
            assert profile.source == "learner_import"
            assert profile.personal_data_basis == "import"
            assert profile.personal_data_consent_at is not None

            assert old_token.record.used_at is not None
            assert (
                result.created_token.record.token_hash
                != old_token.record.token_hash
            )

            await session.rollback()

    run_database_scenario(scenario)


def test_prepare_public_registration_does_not_change_active_user() -> None:
    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            email = unique_email("public_active")
            user = User(
                email=email,
                phone=None,
                full_name="Active User",
                hashed_password=get_password_hash(
                    "ActiveUser123!"
                ),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )
            session.add(user)
            await session.flush()

            data = normalize_public_registration_data(
                last_name="New",
                first_name="User",
                middle_name=None,
                email=email.upper(),
                phone=unique_phone(),
            )

            result = await prepare_public_registration(
                session,
                data=data,
            )

            assert result.outcome == (
                PUBLIC_REGISTRATION_OUTCOME_EXISTING_ACTIVE_USER
            )
            assert result.user is user
            assert result.profile is None
            assert result.created_token is None
            assert result.learner_role_assigned is False
            assert user.full_name == "Active User"
            assert user.phone is None

            token_count = await count_rows(
                session,
                UserPasswordToken,
                UserPasswordToken.user_id == user.id,
            )
            assert token_count == 0

            await session.rollback()

    run_database_scenario(scenario)


def test_prepare_public_registration_hides_phone_conflict() -> None:
    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            await ensure_learner_role(session)

            phone = unique_phone()
            owner = User(
                email=unique_email("phone_owner"),
                phone=phone,
                full_name="Phone Owner",
                hashed_password=get_password_hash(
                    "PhoneOwner123!"
                ),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )
            session.add(owner)
            await session.flush()

            requested_email = unique_email("phone_conflict")
            data = normalize_public_registration_data(
                last_name="Another",
                first_name="User",
                middle_name=None,
                email=requested_email,
                phone=phone,
            )

            result = await prepare_public_registration(
                session,
                data=data,
            )

            assert result.outcome == (
                PUBLIC_REGISTRATION_OUTCOME_IDENTITY_CONFLICT
            )
            assert result.user is None
            assert result.profile is None
            assert result.created_token is None

            created_count = await count_rows(
                session,
                User,
                User.email == requested_email,
            )
            assert created_count == 0

            await session.rollback()

    run_database_scenario(scenario)


def test_prepare_public_registration_is_idempotent_for_inactive_user() -> None:
    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            await ensure_learner_role(session)

            email = unique_email("public_repeat")
            data = normalize_public_registration_data(
                last_name="Repeat",
                first_name="Learner",
                middle_name=None,
                email=email,
                phone=unique_phone(),
            )

            first = await prepare_public_registration(
                session,
                data=data,
            )
            second = await prepare_public_registration(
                session,
                data=data,
            )

            assert first.outcome == (
                PUBLIC_REGISTRATION_OUTCOME_USER_CREATED
            )
            assert second.outcome == (
                PUBLIC_REGISTRATION_OUTCOME_EXISTING_INACTIVE_USER
            )
            assert first.user is second.user
            assert first.profile is second.profile
            assert first.created_token is not None
            assert second.created_token is not None
            assert first.created_token.record.used_at is not None

            user_count = await count_rows(
                session,
                User,
                User.email == email,
            )
            profile_count = await count_rows(
                session,
                LearnerProfile,
                LearnerProfile.user_id == first.user.id,
            )
            role_count = await count_rows(
                session,
                UserRole,
                UserRole.user_id == first.user.id,
                UserRole.organization_id.is_(None),
            )
            active_token_count = await count_rows(
                session,
                UserPasswordToken,
                UserPasswordToken.user_id == first.user.id,
                UserPasswordToken.used_at.is_(None),
            )

            assert user_count == 1
            assert profile_count == 1
            assert role_count == 1
            assert active_token_count == 1

            await session.rollback()

    run_database_scenario(scenario)

def test_prepare_public_registration_existing_profile_middle_name_runs_approval_lifecycle(
    monkeypatch,
) -> None:
    async def scenario() -> None:
        user_id = "existing-public-middle-name-user"
        email = "existing-middle-name@example.org"
        phone = "+79990000001"

        user = User(
            id=user_id,
            email=email,
            phone=phone,
            full_name="Existing Learner",
            hashed_password="hash",
            is_active=False,
            is_email_verified=False,
            mfa_enabled=False,
        )

        profile = LearnerProfile(
            id="existing-public-middle-name-profile",
            user_id=user_id,
            last_name="Existing",
            first_name="Learner",
            middle_name=None,
            phone=phone,
            email=email,
            source="learner_import",
            personal_data_basis="import",
        )

        data = normalize_public_registration_data(
            last_name="Must Not Replace",
            first_name="Must Not Replace",
            middle_name="Ivanovich",
            email=email,
            phone=phone,
        )

        class FakeSession:
            def __init__(self):
                self.flush_count = 0

            async def flush(self):
                self.flush_count += 1

            def add(self, instance):
                raise AssertionError(
                    "Existing profile flow "
                    "must not add a new profile"
                )

        session = FakeSession()

        learner_role = SimpleNamespace(
            id="learner-role"
        )

        existing_assignment = SimpleNamespace(
            id="learner-assignment"
        )

        lifecycle_calls = []

        async def get_user_by_email(
            current_session,
            *,
            email,
        ):
            assert current_session is session
            assert email == user.email
            return user

        async def get_phone_owner(
            current_session,
            *,
            phone,
        ):
            assert current_session is session
            assert phone == user.phone
            return user

        async def get_role(
            current_session,
        ):
            assert current_session is session
            return learner_role

        async def get_profile(
            current_session,
            *,
            user_id,
        ):
            assert current_session is session
            assert str(user_id) == str(user.id)
            return profile

        async def get_assignment(
            current_session,
            *,
            user_id,
            role_id,
        ):
            assert current_session is session
            assert str(user_id) == str(user.id)
            assert role_id == learner_role.id
            return existing_assignment

        async def ensure_assignment(
            current_session,
            *,
            user_id,
            role,
        ):
            assert current_session is session
            assert str(user_id) == str(user.id)
            assert role is learner_role
            return False

        async def create_token(
            current_session,
            *,
            user,
            delivery_target_email,
            **kwargs,
        ):
            del kwargs

            assert current_session is session
            assert user is not None
            assert delivery_target_email == email

            return SimpleNamespace(
                record=SimpleNamespace(
                    id="token-record"
                )
            )

        async def lock_approvals(
            current_session,
            *,
            user_id,
            changed_fields,
        ):
            assert current_session is session

            lifecycle_calls.append(
                (
                    "lock",
                    str(user_id),
                    tuple(changed_fields),
                )
            )

            return ()

        async def invalidate_approvals(
            current_session,
            *,
            user_id,
            changed_fields,
            invalidated_at,
        ):
            assert current_session is session
            assert invalidated_at is not None

            lifecycle_calls.append(
                (
                    "invalidate",
                    str(user_id),
                    tuple(changed_fields),
                )
            )

            return ()

        async def unexpected_readiness_refresh(
            current_session,
            *,
            user_id,
        ):
            del current_session, user_id

            raise AssertionError(
                "middle_name must not trigger "
                "registry readiness refresh"
            )

        monkeypatch.setattr(
            service,
            "_get_user_by_email",
            get_user_by_email,
        )

        monkeypatch.setattr(
            service,
            "_get_phone_owner",
            get_phone_owner,
        )

        monkeypatch.setattr(
            service,
            "_get_learner_role",
            get_role,
        )

        monkeypatch.setattr(
            service,
            "_get_learner_profile",
            get_profile,
        )

        monkeypatch.setattr(
            service,
            "_get_global_learner_assignment",
            get_assignment,
        )

        monkeypatch.setattr(
            service,
            "_ensure_global_learner_assignment",
            ensure_assignment,
        )

        monkeypatch.setattr(
            service,
            "create_user_password_token",
            create_token,
        )

        monkeypatch.setattr(
            service,
            "lock_registry_approvals_for_learner_profile",
            lock_approvals,
        )

        monkeypatch.setattr(
            service,
            "invalidate_registry_approvals_for_learner_profile",
            invalidate_approvals,
        )

        monkeypatch.setattr(
            service,
            "refresh_registry_readiness_for_user",
            unexpected_readiness_refresh,
        )

        result = await service.prepare_public_registration(
            session,
            data=data,
        )

        assert result.outcome == (
            PUBLIC_REGISTRATION_OUTCOME_EXISTING_INACTIVE_USER
        )

        assert result.user is user
        assert result.profile is profile
        assert profile.middle_name == "Ivanovich"

        assert lifecycle_calls == [
            (
                "lock",
                user_id,
                (
                    "middle_name",
                ),
            ),
            (
                "invalidate",
                user_id,
                (
                    "middle_name",
                ),
            ),
        ]

    asyncio.run(
        scenario()
    )
