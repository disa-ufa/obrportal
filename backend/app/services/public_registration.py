from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.base import utcnow
from app.models.learner_profile import LearnerProfile
from app.models.organization import Organization  # noqa: F401
from app.models.role import Role, UserRole
from app.models.user import User
from app.services.learner_profile_fields import (
    normalize_learner_email,
    normalize_learner_name,
    normalize_learner_phone,
)
from app.services.user_password_tokens import (
    CreatedUserPasswordToken,
    create_user_password_token,
)


PUBLIC_REGISTRATION_ACCEPTED_STATUS = "accepted"
PUBLIC_REGISTRATION_ACCEPTED_MESSAGE = (
    "Если указанный адрес может быть использован для регистрации, "
    "на него будет отправлено письмо с дальнейшими инструкциями."
)
PUBLIC_REGISTRATION_LEARNER_ROLE_CODE = "learner_fl"
PUBLIC_REGISTRATION_PROFILE_SOURCE = "public_registration"
PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS = "public_registration"

PUBLIC_REGISTRATION_OUTCOME_USER_CREATED = "user_created"
PUBLIC_REGISTRATION_OUTCOME_EXISTING_INACTIVE_USER = (
    "existing_inactive_user"
)
PUBLIC_REGISTRATION_OUTCOME_EXISTING_ACTIVE_USER = (
    "existing_active_user"
)
PUBLIC_REGISTRATION_OUTCOME_IDENTITY_CONFLICT = "identity_conflict"

@dataclass(frozen=True)
class NormalizedPublicRegistrationData:
    last_name: str
    first_name: str
    middle_name: str | None
    email: str
    phone: str | None

    @property
    def full_name(self) -> str:
        return " ".join(
            part
            for part in (
                self.last_name,
                self.first_name,
                self.middle_name,
            )
            if part
        )


@dataclass(frozen=True)
class PreparedPublicRegistration:
    outcome: str
    user: User | None = None
    profile: LearnerProfile | None = None
    created_token: CreatedUserPasswordToken | None = None
    learner_role_assigned: bool = False


def normalize_public_registration_email(value: str) -> str:
    return normalize_learner_email(value) or ""


def normalize_public_registration_name(
    value: str | None,
) -> str | None:
    return normalize_learner_name(value)


def normalize_required_public_registration_name(
    value: str,
    *,
    field_name: str,
) -> str:
    normalized = normalize_public_registration_name(value)

    if normalized is None:
        raise ValueError(f"{field_name} must not be blank.")

    return normalized


def normalize_public_registration_phone(
    value: str | None,
) -> str | None:
    return normalize_learner_phone(value)


def normalize_public_registration_data(
    *,
    last_name: str,
    first_name: str,
    middle_name: str | None,
    email: str,
    phone: str | None,
) -> NormalizedPublicRegistrationData:
    return NormalizedPublicRegistrationData(
        last_name=normalize_required_public_registration_name(
            last_name,
            field_name="last_name",
        ),
        first_name=normalize_required_public_registration_name(
            first_name,
            field_name="first_name",
        ),
        middle_name=normalize_public_registration_name(
            middle_name
        ),
        email=normalize_public_registration_email(email),
        phone=normalize_public_registration_phone(phone),
    )


async def _get_user_by_email(
    session: AsyncSession,
    *,
    email: str,
) -> User | None:
    result = await session.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def _get_phone_owner(
    session: AsyncSession,
    *,
    phone: str | None,
) -> User | None:
    if phone is None:
        return None

    result = await session.execute(
        select(User).where(User.phone == phone)
    )
    return result.scalar_one_or_none()


async def _get_learner_profile(
    session: AsyncSession,
    *,
    user_id: str,
) -> LearnerProfile | None:
    result = await session.execute(
        select(LearnerProfile).where(
            LearnerProfile.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def _get_learner_role(
    session: AsyncSession,
) -> Role:
    result = await session.execute(
        select(Role).where(
            Role.code
            == PUBLIC_REGISTRATION_LEARNER_ROLE_CODE
        )
    )
    role = result.scalar_one_or_none()

    if role is None:
        raise RuntimeError(
            "Canonical learner role learner_fl is missing."
        )

    return role


async def _get_global_learner_assignment(
    session: AsyncSession,
    *,
    user_id: str,
    role_id: str,
) -> UserRole | None:
    result = await session.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.organization_id.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def _ensure_global_learner_assignment(
    session: AsyncSession,
    *,
    user_id: str,
    role: Role,
) -> bool:
    existing_assignment = (
        await _get_global_learner_assignment(
            session,
            user_id=user_id,
            role_id=role.id,
        )
    )

    if existing_assignment is not None:
        return False

    session.add(
        UserRole(
            user_id=user_id,
            role_id=role.id,
            organization_id=None,
        )
    )
    await session.flush()
    return True


def _fill_empty_profile_fields(
    profile: LearnerProfile,
    *,
    data: NormalizedPublicRegistrationData,
) -> None:
    if not profile.last_name:
        profile.last_name = data.last_name

    if not profile.first_name:
        profile.first_name = data.first_name

    if not profile.middle_name and data.middle_name:
        profile.middle_name = data.middle_name

    if not profile.phone and data.phone:
        profile.phone = data.phone

    if not profile.email:
        profile.email = data.email

    if not profile.personal_data_basis:
        profile.personal_data_basis = (
            PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS
        )

    if profile.personal_data_consent_at is None:
        profile.personal_data_consent_at = utcnow()


async def prepare_public_registration(
    session: AsyncSession,
    *,
    data: NormalizedPublicRegistrationData,
) -> PreparedPublicRegistration:
    existing_user = await _get_user_by_email(
        session,
        email=data.email,
    )

    if existing_user is not None and existing_user.is_active:
        return PreparedPublicRegistration(
            outcome=(
                PUBLIC_REGISTRATION_OUTCOME_EXISTING_ACTIVE_USER
            ),
            user=existing_user,
        )

    phone_owner = await _get_phone_owner(
        session,
        phone=data.phone,
    )

    if (
        phone_owner is not None
        and (
            existing_user is None
            or phone_owner.id != existing_user.id
        )
    ):
        return PreparedPublicRegistration(
            outcome=PUBLIC_REGISTRATION_OUTCOME_IDENTITY_CONFLICT
        )

    learner_role = await _get_learner_role(session)

    if existing_user is None:
        user = User(
            email=data.email,
            phone=data.phone,
            full_name=data.full_name,
            hashed_password=get_password_hash(
                f"PublicRegistration-{uuid4().hex}"
            ),
            is_active=False,
            is_email_verified=False,
            mfa_enabled=False,
        )
        session.add(user)
        await session.flush()

        profile = LearnerProfile(
            user_id=user.id,
            last_name=data.last_name,
            first_name=data.first_name,
            middle_name=data.middle_name,
            phone=data.phone,
            email=data.email,
            source=PUBLIC_REGISTRATION_PROFILE_SOURCE,
            personal_data_basis=(
                PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS
            ),
            personal_data_consent_at=utcnow(),
        )
        session.add(profile)
        await session.flush()

        learner_role_assigned = (
            await _ensure_global_learner_assignment(
                session,
                user_id=user.id,
                role=learner_role,
            )
        )
        created_token = await create_user_password_token(
            session,
            user=user,
            delivery_target_email=user.email,
        )

        return PreparedPublicRegistration(
            outcome=PUBLIC_REGISTRATION_OUTCOME_USER_CREATED,
            user=user,
            profile=profile,
            created_token=created_token,
            learner_role_assigned=learner_role_assigned,
        )

    profile = await _get_learner_profile(
        session,
        user_id=existing_user.id,
    )
    existing_assignment = (
        await _get_global_learner_assignment(
            session,
            user_id=existing_user.id,
            role_id=learner_role.id,
        )
    )

    if profile is None and existing_assignment is None:
        return PreparedPublicRegistration(
            outcome=PUBLIC_REGISTRATION_OUTCOME_IDENTITY_CONFLICT
        )

    if not existing_user.full_name:
        existing_user.full_name = data.full_name

    if not existing_user.phone and data.phone:
        existing_user.phone = data.phone

    if profile is None:
        profile = LearnerProfile(
            user_id=existing_user.id,
            last_name=data.last_name,
            first_name=data.first_name,
            middle_name=data.middle_name,
            phone=data.phone,
            email=data.email,
            source=PUBLIC_REGISTRATION_PROFILE_SOURCE,
            personal_data_basis=(
                PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS
            ),
            personal_data_consent_at=utcnow(),
        )
        session.add(profile)
        await session.flush()
    else:
        _fill_empty_profile_fields(
            profile,
            data=data,
        )
        await session.flush()

    learner_role_assigned = (
        await _ensure_global_learner_assignment(
            session,
            user_id=existing_user.id,
            role=learner_role,
        )
    )
    created_token = await create_user_password_token(
        session,
        user=existing_user,
        delivery_target_email=existing_user.email,
    )

    return PreparedPublicRegistration(
        outcome=(
            PUBLIC_REGISTRATION_OUTCOME_EXISTING_INACTIVE_USER
        ),
        user=existing_user,
        profile=profile,
        created_token=created_token,
        learner_role_assigned=learner_role_assigned,
    )
