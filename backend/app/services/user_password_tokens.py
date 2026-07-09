from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from urllib.parse import urlencode

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import utcnow
from app.models.user import User
from app.models.user_password_token import UserPasswordToken


USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP = "initial_password_setup"
USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET = "password_reset"

USER_PASSWORD_TOKEN_PURPOSES = frozenset(
    {
        USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET,
    }
)

DEFAULT_USER_PASSWORD_TOKEN_EXPIRES_DELTA = timedelta(days=7)


@dataclass(frozen=True)
class CreatedUserPasswordToken:
    """Created DB token record and raw token value that can be sent to the user once."""

    record: UserPasswordToken
    raw_token: str


def generate_raw_password_token() -> str:
    """Generate a URL-safe high-entropy token for email links."""

    return token_urlsafe(48)


def hash_password_token(raw_token: str) -> str:
    """Return deterministic SHA-256 token hash for database lookup.

    The raw token is intentionally not stored in the database.
    """

    normalized_token = raw_token.strip()

    if not normalized_token:
        raise ValueError("Password token must not be empty.")

    return sha256(normalized_token.encode("utf-8")).hexdigest()


def normalize_user_password_token_purpose(purpose: str) -> str:
    normalized_purpose = purpose.strip().lower()

    if normalized_purpose not in USER_PASSWORD_TOKEN_PURPOSES:
        allowed = ", ".join(sorted(USER_PASSWORD_TOKEN_PURPOSES))
        raise ValueError(f"Unsupported password token purpose: {purpose}. Allowed values: {allowed}")

    return normalized_purpose


def build_password_setup_url(
    frontend_base_url: str,
    raw_token: str,
    *,
    path: str = "/set-password",
) -> str:
    """Build frontend URL that lets a user set or reset their password."""

    normalized_base_url = frontend_base_url.strip().rstrip("/")
    normalized_path = "/" + path.strip("/")

    if not normalized_base_url:
        raise ValueError("Frontend base URL must not be empty.")

    return f"{normalized_base_url}{normalized_path}?{urlencode({'token': raw_token})}"


def is_user_password_token_record_active(
    record: UserPasswordToken,
    *,
    purpose: str,
    now: datetime | None = None,
) -> bool:
    """Check whether a token record can still be used."""

    normalized_purpose = normalize_user_password_token_purpose(purpose)
    current_time = now or utcnow()

    return (
        record.purpose == normalized_purpose
        and record.used_at is None
        and record.expires_at > current_time
    )


async def invalidate_active_user_password_tokens(
    session: AsyncSession,
    *,
    user_id: str,
    purpose: str,
    used_at: datetime | None = None,
) -> None:
    """Invalidate previous unused tokens for the same user and purpose."""

    normalized_purpose = normalize_user_password_token_purpose(purpose)
    current_time = used_at or utcnow()

    await session.execute(
        update(UserPasswordToken)
        .where(
            UserPasswordToken.user_id == user_id,
            UserPasswordToken.purpose == normalized_purpose,
            UserPasswordToken.used_at.is_(None),
        )
        .values(used_at=current_time, updated_at=current_time)
    )


async def create_user_password_token(
    session: AsyncSession,
    *,
    user: User,
    purpose: str = USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
    expires_delta: timedelta = DEFAULT_USER_PASSWORD_TOKEN_EXPIRES_DELTA,
    created_by_user: User | None = None,
    delivery_target_email: str | None = None,
    mark_sent: bool = False,
    invalidate_existing: bool = True,
    now: datetime | None = None,
) -> CreatedUserPasswordToken:
    """Create a new one-time password token.

    The returned raw token must be shown/sent only once. Store only record.token_hash.
    """

    normalized_purpose = normalize_user_password_token_purpose(purpose)
    current_time = now or utcnow()

    if expires_delta.total_seconds() <= 0:
        raise ValueError("Password token expiration delta must be positive.")

    if invalidate_existing:
        await invalidate_active_user_password_tokens(
            session,
            user_id=user.id,
            purpose=normalized_purpose,
            used_at=current_time,
        )

    raw_token = generate_raw_password_token()
    record = UserPasswordToken(
        user_id=user.id,
        token_hash=hash_password_token(raw_token),
        purpose=normalized_purpose,
        expires_at=current_time + expires_delta,
        used_at=None,
        sent_at=current_time if mark_sent else None,
        delivery_target_email=delivery_target_email or user.email,
        created_by_user_id=created_by_user.id if created_by_user else None,
    )

    session.add(record)
    await session.flush()

    return CreatedUserPasswordToken(record=record, raw_token=raw_token)


async def get_valid_user_password_token(
    session: AsyncSession,
    *,
    raw_token: str,
    purpose: str,
    now: datetime | None = None,
) -> UserPasswordToken | None:
    """Find an unused, non-expired token record by raw token value."""

    normalized_purpose = normalize_user_password_token_purpose(purpose)
    current_time = now or utcnow()
    token_hash = hash_password_token(raw_token)

    result = await session.execute(
        select(UserPasswordToken).where(
            UserPasswordToken.token_hash == token_hash,
            UserPasswordToken.purpose == normalized_purpose,
            UserPasswordToken.used_at.is_(None),
            UserPasswordToken.expires_at > current_time,
        )
    )

    return result.scalar_one_or_none()


async def mark_user_password_token_used(
    session: AsyncSession,
    *,
    record: UserPasswordToken,
    used_at: datetime | None = None,
) -> UserPasswordToken:
    current_time = used_at or utcnow()

    record.used_at = current_time
    record.updated_at = current_time

    await session.flush()

    return record
