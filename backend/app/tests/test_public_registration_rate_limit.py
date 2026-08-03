import asyncio

import pytest

from app.core.config import Settings
from app.services.public_registration_rate_limit import (
    PUBLIC_REGISTRATION_RATE_LIMIT_LUA,
    PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_CLIENT,
    PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
    build_public_registration_rate_limit_key,
    consume_public_registration_rate_limit,
    normalize_public_registration_rate_limit_scope,
    resolve_public_registration_client_identifier,
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


def test_public_registration_rate_limit_config_defaults() -> None:
    fields = Settings.model_fields

    assert (
        fields[
            "public_registration_rate_limit_window_seconds"
        ].default
        == 900
    )
    assert (
        fields[
            "public_registration_rate_limit_email_max_attempts"
        ].default
        == 3
    )
    assert (
        fields[
            "public_registration_rate_limit_client_max_attempts"
        ].default
        == 20
    )


def test_public_registration_rate_limit_config_aliases() -> None:
    configured = Settings(
        _env_file=None,
        PUBLIC_REGISTRATION_RATE_LIMIT_WINDOW_SECONDS=60,
        PUBLIC_REGISTRATION_RATE_LIMIT_EMAIL_MAX_ATTEMPTS=2,
        PUBLIC_REGISTRATION_RATE_LIMIT_CLIENT_MAX_ATTEMPTS=8,
    )

    assert (
        configured.public_registration_rate_limit_window_seconds
        == 60
    )
    assert (
        configured.public_registration_rate_limit_email_max_attempts
        == 2
    )
    assert (
        configured.public_registration_rate_limit_client_max_attempts
        == 8
    )


def test_rate_limit_key_normalizes_email_identifier() -> None:
    first = build_public_registration_rate_limit_key(
        scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
        identifier="  User@Example.Test ",
        secret_key="test-secret",
    )
    second = build_public_registration_rate_limit_key(
        scope=" EMAIL ",
        identifier="user@example.test",
        secret_key="test-secret",
    )

    assert first == second


def test_rate_limit_key_does_not_expose_identifier() -> None:
    key = build_public_registration_rate_limit_key(
        scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
        identifier="private@example.test",
        secret_key="test-secret",
    )
    other_secret_key = (
        build_public_registration_rate_limit_key(
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
            identifier="private@example.test",
            secret_key="other-test-secret",
        )
    )

    assert "private@example.test" not in key
    assert key != other_secret_key


def test_rate_limit_key_separates_scopes() -> None:
    email_key = build_public_registration_rate_limit_key(
        scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
        identifier="shared-value",
        secret_key="test-secret",
    )
    client_key = build_public_registration_rate_limit_key(
        scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_CLIENT,
        identifier="shared-value",
        secret_key="test-secret",
    )

    assert email_key != client_key


def test_rate_limit_validation_rejects_unknown_scope() -> None:
    with pytest.raises(
        ValueError,
        match="Unsupported public registration",
    ):
        normalize_public_registration_rate_limit_scope(
            "unknown"
        )

    with pytest.raises(
        ValueError,
        match="secret key",
    ):
        build_public_registration_rate_limit_key(
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
            identifier="user@example.test",
            secret_key="   ",
        )


def test_consume_rate_limit_allows_with_remaining_capacity() -> None:
    redis_client = FakeRedisClient([2, 500])

    decision = asyncio.run(
        consume_public_registration_rate_limit(
            redis_client,
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
            identifier="user@example.test",
            limit=3,
            window_seconds=900,
            secret_key="test-secret",
        )
    )

    assert decision.allowed is True
    assert decision.count == 2
    assert decision.remaining == 1
    assert decision.retry_after_seconds == 0


def test_consume_rate_limit_blocks_and_returns_retry_after() -> None:
    redis_client = FakeRedisClient([4, 120])

    decision = asyncio.run(
        consume_public_registration_rate_limit(
            redis_client,
            scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_CLIENT,
            identifier="203.0.113.10",
            limit=3,
            window_seconds=900,
            secret_key="test-secret",
        )
    )

    assert decision.allowed is False
    assert decision.count == 4
    assert decision.remaining == 0
    assert decision.retry_after_seconds == 120

    assert len(redis_client.calls) == 1
    script, numkeys, arguments = redis_client.calls[0]

    assert script == PUBLIC_REGISTRATION_RATE_LIMIT_LUA
    assert numkeys == 1
    assert arguments[1] == 900
    assert "203.0.113.10" not in str(arguments[0])


def test_consume_rate_limit_rejects_malformed_redis_response() -> None:
    redis_client = FakeRedisClient(["invalid"])

    with pytest.raises(
        RuntimeError,
        match="Unexpected Redis rate-limit response",
    ):
        asyncio.run(
            consume_public_registration_rate_limit(
                redis_client,
                scope=PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
                identifier="user@example.test",
                limit=3,
                window_seconds=900,
                secret_key="test-secret",
            )
        )


def test_client_identifier_trusts_forwarded_for_from_private_peer() -> None:
    identifier = resolve_public_registration_client_identifier(
        peer_host="172.18.0.5",
        forwarded_for="203.0.113.25, 172.18.0.2",
    )

    assert identifier == "203.0.113.25"


def test_client_identifier_ignores_forwarded_for_from_public_peer() -> None:
    identifier = resolve_public_registration_client_identifier(
        peer_host="8.8.8.8",
        forwarded_for="203.0.113.25",
    )

    assert identifier == "8.8.8.8"


def test_client_identifier_falls_back_when_forwarded_for_invalid() -> None:
    identifier = resolve_public_registration_client_identifier(
        peer_host="127.0.0.1",
        forwarded_for="not-an-ip",
    )

    assert identifier == "127.0.0.1"
