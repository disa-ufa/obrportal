import asyncio

import pytest
from fastapi import HTTPException
from redis.exceptions import RedisError
from starlette.requests import Request

from app.api.v1.auth import forgot_password
from app.core.config import Settings, settings
from app.schemas.auth import ForgotPasswordRequest
from app.services.public_registration_rate_limit import (
    PASSWORD_RECOVERY_RATE_LIMIT_KEY_PREFIX,
    PUBLIC_REGISTRATION_RATE_LIMIT_KEY_PREFIX,
    PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
    build_public_registration_rate_limit_key,
    consume_password_recovery_rate_limit,
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


class FailingRedisClient:
    async def eval(
        self,
        script: str,
        numkeys: int,
        *keys_and_args: object,
    ) -> object:
        raise RedisError("redis unavailable")


def build_request(
    *,
    forwarded_for: str | None = None,
) -> Request:
    headers: list[tuple[bytes, bytes]] = []

    if forwarded_for is not None:
        headers.append(
            (
                b"x-forwarded-for",
                forwarded_for.encode("ascii"),
            )
        )

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/forgot-password",
            "headers": headers,
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
            "query_string": b"",
        }
    )


def clear_password_recovery_env(monkeypatch) -> None:
    for name in (
        "PASSWORD_RECOVERY_RATE_LIMIT_WINDOW_SECONDS",
        "OBRPORTAL_PASSWORD_RECOVERY_RATE_LIMIT_WINDOW_SECONDS",
        "PASSWORD_RECOVERY_RATE_LIMIT_EMAIL_MAX_ATTEMPTS",
        "OBRPORTAL_PASSWORD_RECOVERY_RATE_LIMIT_EMAIL_MAX_ATTEMPTS",
        "PASSWORD_RECOVERY_RATE_LIMIT_CLIENT_MAX_ATTEMPTS",
        "OBRPORTAL_PASSWORD_RECOVERY_RATE_LIMIT_CLIENT_MAX_ATTEMPTS",
    ):
        monkeypatch.delenv(name, raising=False)


def test_password_recovery_rate_limit_config_defaults(
    monkeypatch,
) -> None:
    clear_password_recovery_env(monkeypatch)

    configured = Settings(_env_file=None)

    assert (
        configured
        .password_recovery_rate_limit_window_seconds
        == 900
    )
    assert (
        configured
        .password_recovery_rate_limit_email_max_attempts
        == 3
    )
    assert (
        configured
        .password_recovery_rate_limit_client_max_attempts
        == 20
    )


def test_password_recovery_rate_limit_config_aliases(
    monkeypatch,
) -> None:
    clear_password_recovery_env(monkeypatch)
    monkeypatch.setenv(
        "PASSWORD_RECOVERY_RATE_LIMIT_WINDOW_SECONDS",
        "321",
    )
    monkeypatch.setenv(
        "OBRPORTAL_PASSWORD_RECOVERY_RATE_LIMIT_EMAIL_MAX_ATTEMPTS",
        "7",
    )
    monkeypatch.setenv(
        "PASSWORD_RECOVERY_RATE_LIMIT_CLIENT_MAX_ATTEMPTS",
        "19",
    )

    configured = Settings(_env_file=None)

    assert (
        configured
        .password_recovery_rate_limit_window_seconds
        == 321
    )
    assert (
        configured
        .password_recovery_rate_limit_email_max_attempts
        == 7
    )
    assert (
        configured
        .password_recovery_rate_limit_client_max_attempts
        == 19
    )


def test_password_recovery_key_namespace_is_separate() -> None:
    registration_key = (
        build_public_registration_rate_limit_key(
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
            identifier="person@example.com",
            secret_key="secret",
            prefix=PUBLIC_REGISTRATION_RATE_LIMIT_KEY_PREFIX,
        )
    )
    recovery_key = (
        build_public_registration_rate_limit_key(
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
            identifier="person@example.com",
            secret_key="secret",
            prefix=PASSWORD_RECOVERY_RATE_LIMIT_KEY_PREFIX,
        )
    )

    assert registration_key != recovery_key
    assert registration_key.startswith(
        PUBLIC_REGISTRATION_RATE_LIMIT_KEY_PREFIX
    )
    assert recovery_key.startswith(
        PASSWORD_RECOVERY_RATE_LIMIT_KEY_PREFIX
    )
    assert "person@example.com" not in recovery_key


def test_password_recovery_consumer_uses_dedicated_prefix() -> None:
    redis_client = FakeRedisClient([1, 300])

    decision = asyncio.run(
        consume_password_recovery_rate_limit(
            redis_client,
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
            identifier="person@example.com",
            limit=3,
            window_seconds=900,
            secret_key="secret",
        )
    )

    assert decision.allowed is True
    assert len(redis_client.calls) == 1

    _, numkeys, arguments = redis_client.calls[0]
    redis_key = str(arguments[0])

    assert numkeys == 1
    assert redis_key.startswith(
        PASSWORD_RECOVERY_RATE_LIMIT_KEY_PREFIX
    )
    assert arguments[1] == 900


def test_forgot_password_fails_closed_when_redis_fails(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "password_recovery_rate_limit_email_max_attempts",
        3,
    )
    monkeypatch.setattr(
        settings,
        "password_recovery_rate_limit_client_max_attempts",
        20,
    )
    monkeypatch.setattr(
        settings,
        "password_recovery_rate_limit_window_seconds",
        900,
    )

    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            forgot_password(
                ForgotPasswordRequest(
                    email="person@example.com"
                ),
                build_request(
                    forwarded_for="203.0.113.50"
                ),
                session=object(),
                redis_client=FailingRedisClient(),
            )
        )

    assert captured.value.status_code == 503
    assert captured.value.detail == (
        "Password recovery is temporarily unavailable."
    )
