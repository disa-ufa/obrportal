from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

import app.schemas.auth as auth_schemas
import app.services.public_registration as public_registration
import app.services.public_registration_rate_limit as rate_limit

from app.core.config import Settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models.learner_profile import LearnerProfile
from app.models.role import Role, UserRole
from app.models.user import User
from app.models.user_password_token import UserPasswordToken
from app.services.user_password_tokens import (
    create_user_password_token,
)


def unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:16]}@example.com"


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
        description="Resend contract test role.",
    )
    session.add(role)
    await session.flush()
    return role


async def count_rows(
    session,
    model,
    *criteria,
) -> int:
    statement = select(func.count()).select_from(model)

    if criteria:
        statement = statement.where(*criteria)

    result = await session.execute(statement)
    return int(result.scalar_one())


def test_resend_request_schema_is_email_only() -> None:
    schema = getattr(
        auth_schemas,
        "PublicRegistrationResendRequest",
        None,
    )

    assert schema is not None, (
        "PublicRegistrationResendRequest must be implemented"
    )

    request = schema(
        email="learner@example.com",
    )

    assert request.email == "learner@example.com"

    with pytest.raises(ValidationError):
        schema(
            email="learner@example.com",
            password="dummy-password-fixture",
        )


def test_resend_rate_limit_config_contract() -> None:
    fields = Settings.model_fields

    expected = {
        "public_registration_resend_rate_limit_window_seconds": 900,
        "public_registration_resend_rate_limit_email_max_attempts": 3,
        "public_registration_resend_rate_limit_client_max_attempts": 20,
    }

    for field_name, default in expected.items():
        assert field_name in fields, (
            f"Missing Settings field: {field_name}"
        )
        assert fields[field_name].default == default

    configured = Settings(
        _env_file=None,
        PUBLIC_REGISTRATION_RESEND_RATE_LIMIT_WINDOW_SECONDS=60,
        PUBLIC_REGISTRATION_RESEND_RATE_LIMIT_EMAIL_MAX_ATTEMPTS=2,
        PUBLIC_REGISTRATION_RESEND_RATE_LIMIT_CLIENT_MAX_ATTEMPTS=7,
    )

    assert (
        configured.public_registration_resend_rate_limit_window_seconds
        == 60
    )
    assert (
        configured.public_registration_resend_rate_limit_email_max_attempts
        == 2
    )
    assert (
        configured.public_registration_resend_rate_limit_client_max_attempts
        == 7
    )


class FakeRedisClient:
    def __init__(self, result: object) -> None:
        self.result = result
        self.calls: list[
            tuple[str, int, tuple[object, ...]]
        ] = []

    async def eval(
        self,
        script: str,
        numkeys: int,
        *keys_and_args: object,
    ) -> object:
        self.calls.append(
            (script, numkeys, keys_and_args)
        )
        return self.result


def test_resend_rate_limit_has_separate_namespace() -> None:
    prefix = getattr(
        rate_limit,
        "PUBLIC_REGISTRATION_RESEND_RATE_LIMIT_KEY_PREFIX",
        None,
    )
    consume = getattr(
        rate_limit,
        "consume_public_registration_resend_rate_limit",
        None,
    )

    assert prefix == (
        "obrportal:public-registration:resend-rate-limit"
    )

    assert callable(consume), (
        "consume_public_registration_resend_rate_limit must exist"
    )

    redis_client = FakeRedisClient([1, 300])

    decision = asyncio.run(
        consume(
            redis_client,
            scope=(
                rate_limit
                .PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL
            ),
            identifier="private@example.com",
            limit=3,
            window_seconds=900,
            secret_key="test-secret",
        )
    )

    assert decision.allowed is True
    assert len(redis_client.calls) == 1

    _, _, arguments = redis_client.calls[0]
    redis_key = str(arguments[0])

    assert prefix in redis_key
    assert "private@example.com" not in redis_key


def test_prepare_resend_rotates_setup_token() -> None:
    prepare_resend = getattr(
        public_registration,
        "prepare_public_registration_resend",
        None,
    )

    assert callable(prepare_resend), (
        "prepare_public_registration_resend must exist"
    )

    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            role = await ensure_learner_role(session)

            email = unique_email("public_resend")

            user = User(
                email=email,
                phone=None,
                full_name="Resend Learner",
                hashed_password=get_password_hash(
                    "InitialPassword123!"
                ),
                is_active=False,
                is_email_verified=False,
                mfa_enabled=False,
            )
            session.add(user)
            await session.flush()

            profile = LearnerProfile(
                user_id=user.id,
                last_name="Resend",
                first_name="Learner",
                middle_name=None,
                phone=None,
                email=email,
                source="public_registration",
                personal_data_basis="public_registration",
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
                delivery_target_email=email,
            )

            result = await prepare_resend(
                session,
                email=email.upper(),
            )

            assert result.user is user
            assert result.created_token is not None

            assert old_token.record.used_at is not None

            assert (
                result.created_token.record.token_hash
                != old_token.record.token_hash
            )

            active_tokens = await count_rows(
                session,
                UserPasswordToken,
                UserPasswordToken.user_id == user.id,
                (
                    UserPasswordToken.purpose
                    == "initial_password_setup"
                ),
                UserPasswordToken.used_at.is_(None),
            )

            assert active_tokens == 1

            await session.rollback()

    run_database_scenario(scenario)


def test_prepare_resend_does_not_touch_active_user() -> None:
    prepare_resend = getattr(
        public_registration,
        "prepare_public_registration_resend",
        None,
    )

    assert callable(prepare_resend), (
        "prepare_public_registration_resend must exist"
    )

    async def scenario() -> None:
        async with AsyncSessionLocal() as session:
            email = unique_email(
                "public_resend_active"
            )

            user = User(
                email=email,
                phone=None,
                full_name="Active Learner",
                hashed_password=get_password_hash(
                    "ActivePassword123!"
                ),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )
            session.add(user)
            await session.flush()

            result = await prepare_resend(
                session,
                email=email,
            )

            assert result.user is None
            assert result.created_token is None

            token_count = await count_rows(
                session,
                UserPasswordToken,
                UserPasswordToken.user_id == user.id,
            )

            assert token_count == 0

            await session.rollback()

    run_database_scenario(scenario)


def test_resend_endpoint_contract_is_neutral_202() -> None:
    from pathlib import Path

    auth_source = Path(
        "app/api/v1/auth.py"
    ).read_text(encoding="utf-8")

    required = [
        '"/resend-registration"',
        "PublicRegistrationResendRequest",
        "consume_public_registration_resend_rate_limit",
        "HTTP_202_ACCEPTED",
        "public_registration.resend_requested",
        "public_registration.rate_limited",
        "PUBLIC_REGISTRATION_ACCEPTED_MESSAGE",
    ]

    missing = [
        marker
        for marker in required
        if marker not in auth_source
    ]

    assert not missing, (
        "Missing resend endpoint markers: "
        + ", ".join(missing)
    )
