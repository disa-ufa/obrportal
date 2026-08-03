import asyncio
import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.user_password_token import (
    UserPasswordToken,
)
from app.services.user_password_tokens import (
    USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
    USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET,
    create_user_password_token,
)


BASE_URL = os.getenv(
    "TEST_BASE_URL",
    "http://127.0.0.1:8000",
).rstrip("/")

NEUTRAL_MESSAGE = (
    "Если учетная запись существует, инструкции "
    "по восстановлению пароля отправлены "
    "на указанный адрес."
)

INVALID_RESET_DETAIL = (
    "Недействительная или просроченная "
    "ссылка восстановления пароля."
)


def request_json(
    method: str,
    path: str,
    body: dict | None = None,
) -> tuple[int, dict | None]:
    headers = {"Accept": "application/json"}
    data = None

    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    request = Request(
        f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(
            request,
            timeout=15,
        ) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def create_user_with_token(
    *,
    email: str,
    is_active: bool,
    is_email_verified: bool,
    purpose: str | None = None,
) -> dict:
    async def _create() -> dict:
        engine = create_async_engine(
            str(settings.database_url)
        )
        session_factory = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        async with session_factory() as session:
            user = User(
                email=email,
                phone=None,
                full_name=(
                    "Password recovery test user"
                ),
                hashed_password=get_password_hash(
                    "OldPassword123!"
                ),
                is_active=is_active,
                is_email_verified=(
                    is_email_verified
                ),
                mfa_enabled=False,
            )
            session.add(user)
            await session.flush()

            raw_token = None

            if purpose is not None:
                created = (
                    await create_user_password_token(
                        session,
                        user=user,
                        purpose=purpose,
                        delivery_target_email=email,
                    )
                )
                raw_token = created.raw_token

            await session.commit()

        await engine.dispose()

        return {
            "email": email,
            "raw_token": raw_token,
        }

    return asyncio.run(_create())


def get_reset_token_states(
    email: str,
) -> list[dict]:
    async def _get() -> list[dict]:
        engine = create_async_engine(
            str(settings.database_url)
        )
        session_factory = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        async with session_factory() as session:
            result = await session.execute(
                select(UserPasswordToken)
                .join(
                    User,
                    User.id
                    == UserPasswordToken.user_id,
                )
                .where(
                    User.email == email,
                    UserPasswordToken.purpose
                    == (
                        USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET
                    ),
                )
            )
            records = result.scalars().all()
            states = [
                {
                    "used": (
                        record.used_at is not None
                    ),
                    "sent": (
                        record.sent_at is not None
                    ),
                }
                for record in records
            ]

        await engine.dispose()
        return states

    return asyncio.run(_get())


def test_forgot_password_unknown_email_is_neutral() -> None:
    email = (
        f"forgot-unknown-{uuid4().hex}"
        "@example.com"
    )

    status, payload = request_json(
        "POST",
        "/api/v1/auth/forgot-password",
        {"email": email},
    )

    assert status == 202
    assert payload == {
        "status": "accepted",
        "message": NEUTRAL_MESSAGE,
    }
    assert get_reset_token_states(email) == []


def test_forgot_password_inactive_user_is_neutral() -> None:
    email = (
        f"forgot-inactive-{uuid4().hex}"
        "@example.com"
    )
    create_user_with_token(
        email=email,
        is_active=False,
        is_email_verified=False,
    )

    status, payload = request_json(
        "POST",
        "/api/v1/auth/forgot-password",
        {"email": email},
    )

    assert status == 202
    assert payload == {
        "status": "accepted",
        "message": NEUTRAL_MESSAGE,
    }
    assert get_reset_token_states(email) == []


def test_forgot_password_active_user_creates_token() -> None:
    email = (
        f"forgot-active-{uuid4().hex}"
        "@example.com"
    )
    create_user_with_token(
        email=email,
        is_active=True,
        is_email_verified=True,
    )

    status, payload = request_json(
        "POST",
        "/api/v1/auth/forgot-password",
        {"email": email.upper()},
    )

    assert status == 202
    assert payload == {
        "status": "accepted",
        "message": NEUTRAL_MESSAGE,
    }
    assert "token" not in payload
    assert "user_id" not in payload
    assert "email" not in payload

    states = get_reset_token_states(email)

    assert states == [
        {
            "used": False,
            "sent": False,
        }
    ]


def test_forgot_password_rotates_previous_token() -> None:
    email = (
        f"forgot-rotate-{uuid4().hex}"
        "@example.com"
    )
    create_user_with_token(
        email=email,
        is_active=True,
        is_email_verified=True,
    )

    first_status, _ = request_json(
        "POST",
        "/api/v1/auth/forgot-password",
        {"email": email},
    )
    second_status, _ = request_json(
        "POST",
        "/api/v1/auth/forgot-password",
        {"email": email},
    )

    assert first_status == 202
    assert second_status == 202

    states = get_reset_token_states(email)

    assert len(states) == 2
    assert sum(
        state["used"]
        for state in states
    ) == 1
    assert sum(
        not state["used"]
        for state in states
    ) == 1


def test_reset_password_changes_active_user_password() -> None:
    email = (
        f"reset-valid-{uuid4().hex}"
        "@example.com"
    )
    created = create_user_with_token(
        email=email,
        is_active=True,
        is_email_verified=True,
        purpose=(
            USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET
        ),
    )

    status, payload = request_json(
        "POST",
        "/api/v1/auth/reset-password",
        {
            "token": created["raw_token"],
            "password": "NewPassword123!",
        },
    )

    assert status == 200
    assert payload == {"status": "ok"}
    assert "user_id" not in payload
    assert "email" not in payload

    old_status, _ = request_json(
        "POST",
        "/api/v1/auth/login",
        {
            "email": email,
            "password": "OldPassword123!",
        },
    )
    new_status, new_payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {
            "email": email,
            "password": "NewPassword123!",
        },
    )

    assert old_status == 401
    assert new_status == 200
    assert isinstance(new_payload, dict)
    assert new_payload["access_token"]


def test_reset_password_token_is_single_use() -> None:
    email = (
        f"reset-single-use-{uuid4().hex}"
        "@example.com"
    )
    created = create_user_with_token(
        email=email,
        is_active=True,
        is_email_verified=True,
        purpose=(
            USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET
        ),
    )

    first_status, _ = request_json(
        "POST",
        "/api/v1/auth/reset-password",
        {
            "token": created["raw_token"],
            "password": "NewPassword123!",
        },
    )
    second_status, second_payload = request_json(
        "POST",
        "/api/v1/auth/reset-password",
        {
            "token": created["raw_token"],
            "password": "AnotherPassword123!",
        },
    )

    assert first_status == 200
    assert second_status == 400
    assert second_payload == {
        "detail": INVALID_RESET_DETAIL
    }


def test_reset_password_rejects_initial_setup_token() -> None:
    email = (
        f"reset-wrong-purpose-{uuid4().hex}"
        "@example.com"
    )
    created = create_user_with_token(
        email=email,
        is_active=True,
        is_email_verified=True,
        purpose=(
            USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP
        ),
    )

    status, payload = request_json(
        "POST",
        "/api/v1/auth/reset-password",
        {
            "token": created["raw_token"],
            "password": "NewPassword123!",
        },
    )

    assert status == 400
    assert payload == {
        "detail": INVALID_RESET_DETAIL
    }


def test_reset_password_rejects_inactive_user() -> None:
    email = (
        f"reset-inactive-{uuid4().hex}"
        "@example.com"
    )
    created = create_user_with_token(
        email=email,
        is_active=False,
        is_email_verified=False,
        purpose=(
            USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET
        ),
    )

    status, payload = request_json(
        "POST",
        "/api/v1/auth/reset-password",
        {
            "token": created["raw_token"],
            "password": "NewPassword123!",
        },
    )

    assert status == 400
    assert payload == {
        "detail": INVALID_RESET_DETAIL
    }


def test_reset_password_rejects_invalid_token() -> None:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/reset-password",
        {
            "token": (
                "invalid-password-reset-token-"
                "1234567890"
            ),
            "password": "NewPassword123!",
        },
    )

    assert status == 400
    assert payload == {
        "detail": INVALID_RESET_DETAIL
    }
