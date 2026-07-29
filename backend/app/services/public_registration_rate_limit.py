from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import hmac
from typing import Protocol

PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL = "email"
PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_CLIENT = "client"
PUBLIC_REGISTRATION_RATE_LIMIT_SCOPES = frozenset(
    {
        PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_EMAIL,
        PUBLIC_REGISTRATION_RATE_LIMIT_SCOPE_CLIENT,
    }
)
PUBLIC_REGISTRATION_RATE_LIMIT_KEY_PREFIX = (
    "obrportal:public-registration:rate-limit"
)

PUBLIC_REGISTRATION_RATE_LIMIT_LUA = """
local count = redis.call("INCR", KEYS[1])
if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {count, ttl}
""".strip()


class AsyncRateLimitRedisClient(Protocol):
    async def eval(
        self,
        script: str,
        numkeys: int,
        *keys_and_args: object,
    ) -> object:
        """Execute an atomic Redis script."""


@dataclass(frozen=True)
class PublicRegistrationRateLimitDecision:
    allowed: bool
    count: int
    limit: int
    remaining: int
    retry_after_seconds: int


def normalize_public_registration_rate_limit_scope(
    scope: str,
) -> str:
    normalized_scope = scope.strip().lower()

    if normalized_scope not in PUBLIC_REGISTRATION_RATE_LIMIT_SCOPES:
        allowed = ", ".join(
            sorted(PUBLIC_REGISTRATION_RATE_LIMIT_SCOPES)
        )
        raise ValueError(
            "Unsupported public registration rate-limit scope: "
            f"{scope}. Allowed values: {allowed}"
        )

    return normalized_scope


def normalize_public_registration_rate_limit_identifier(
    identifier: str,
) -> str:
    normalized_identifier = identifier.strip().casefold()

    if not normalized_identifier:
        raise ValueError(
            "Public registration rate-limit identifier "
            "must not be empty."
        )

    return normalized_identifier


def build_public_registration_rate_limit_key(
    *,
    scope: str,
    identifier: str,
    secret_key: str,
    prefix: str = PUBLIC_REGISTRATION_RATE_LIMIT_KEY_PREFIX,
) -> str:
    normalized_scope = (
        normalize_public_registration_rate_limit_scope(scope)
    )
    normalized_identifier = (
        normalize_public_registration_rate_limit_identifier(
            identifier
        )
    )
    normalized_secret = secret_key.strip()
    normalized_prefix = prefix.strip().strip(":")

    if not normalized_secret:
        raise ValueError(
            "Public registration rate-limit secret key "
            "must not be empty."
        )

    if not normalized_prefix:
        raise ValueError(
            "Public registration rate-limit key prefix "
            "must not be empty."
        )

    digest = hmac.new(
        normalized_secret.encode("utf-8"),
        (
            f"{normalized_scope}:{normalized_identifier}"
        ).encode("utf-8"),
        sha256,
    ).hexdigest()

    return (
        f"{normalized_prefix}:{normalized_scope}:{digest}"
    )


def _parse_rate_limit_script_result(
    result: object,
) -> tuple[int, int]:
    if (
        not isinstance(result, (list, tuple))
        or len(result) != 2
    ):
        raise RuntimeError(
            "Unexpected Redis rate-limit response."
        )

    try:
        count = int(result[0])
        ttl_seconds = int(result[1])
    except (TypeError, ValueError) as error:
        raise RuntimeError(
            "Unexpected Redis rate-limit response."
        ) from error

    if count < 1:
        raise RuntimeError(
            "Unexpected Redis rate-limit counter."
        )

    return count, ttl_seconds


async def consume_public_registration_rate_limit(
    redis_client: AsyncRateLimitRedisClient,
    *,
    scope: str,
    identifier: str,
    limit: int,
    window_seconds: int,
    secret_key: str,
) -> PublicRegistrationRateLimitDecision:
    if limit <= 0:
        raise ValueError(
            "Public registration rate-limit limit "
            "must be positive."
        )

    if window_seconds <= 0:
        raise ValueError(
            "Public registration rate-limit window "
            "must be positive."
        )

    redis_key = build_public_registration_rate_limit_key(
        scope=scope,
        identifier=identifier,
        secret_key=secret_key,
    )

    result = await redis_client.eval(
        PUBLIC_REGISTRATION_RATE_LIMIT_LUA,
        1,
        redis_key,
        window_seconds,
    )
    count, ttl_seconds = _parse_rate_limit_script_result(
        result
    )
    allowed = count <= limit

    return PublicRegistrationRateLimitDecision(
        allowed=allowed,
        count=count,
        limit=limit,
        remaining=max(limit - count, 0),
        retry_after_seconds=(
            0
            if allowed
            else max(ttl_seconds, 1)
        ),
    )
