from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def read_source(relative_path: str) -> str:
    return (
        BACKEND_ROOT / relative_path
    ).read_text(
        encoding="utf-8-sig"
    )


AUTH_SOURCE = read_source(
    "app/api/v1/auth.py"
)

CONFIG_SOURCE = read_source(
    "app/core/config.py"
)

RATE_LIMIT_SOURCE = read_source(
    "app/services/public_registration_rate_limit.py"
)


def set_password_source() -> str:
    start_marker = "async def set_password("
    end_marker = '@router.post("/login"'

    assert start_marker in AUTH_SOURCE
    assert end_marker in AUTH_SOURCE

    start = AUTH_SOURCE.index(start_marker)
    end = AUTH_SOURCE.index(
        end_marker,
        start,
    )

    return AUTH_SOURCE[start:end]


def test_password_setup_rate_limit_settings_contract():
    assert (
        "password_setup_rate_limit_window_seconds"
        ": int = Field("
        in CONFIG_SOURCE
    )

    assert (
        "PASSWORD_SETUP_RATE_LIMIT_WINDOW_SECONDS"
        in CONFIG_SOURCE
    )

    assert (
        "password_setup_rate_limit_client_max_attempts"
        ": int = Field("
        in CONFIG_SOURCE
    )

    assert (
        "PASSWORD_SETUP_RATE_LIMIT_CLIENT_MAX_ATTEMPTS"
        in CONFIG_SOURCE
    )


def test_password_setup_has_dedicated_redis_limiter():
    assert (
        "PASSWORD_SETUP_RATE_LIMIT_KEY_PREFIX = ("
        in RATE_LIMIT_SOURCE
    )

    assert (
        '"obrportal:password-setup:rate-limit"'
        in RATE_LIMIT_SOURCE
    )

    assert (
        "async def consume_password_setup_rate_limit("
        in RATE_LIMIT_SOURCE
    )


def test_set_password_uses_redis_validation_limit():
    source = set_password_source()
    compact_source = "".join(source.split())

    assert (
        "redis_client:Redis=Depends(get_redis_client)"
        in compact_source
    )

    assert (
        "consume_password_setup_rate_limit("
        in compact_source
    )

    assert (
        "settings.password_setup_rate_limit_window_seconds"
        in compact_source
    )

    assert (
        "settings.password_setup_rate_limit_client_max_attempts"
        in compact_source
    )


def test_password_setup_rate_limit_is_publicly_neutral():
    source = set_password_source()

    assert (
        'action="public_registration.rate_limited"'
        in source
    )

    assert (
        '"flow": "password_setup"'
        in source
    )

    assert "HTTP_429_TOO_MANY_REQUESTS" not in source

    assert (
        "Invalid or expired password setup token"
        in source
    )


def test_public_registration_completion_is_token_origin_scoped():
    source = set_password_source()

    completed_marker = (
        'action="public_registration.completed"'
    )

    assert completed_marker in source

    # /set-password is also used by admin/import invitations.
    # Completion must therefore be tied to evidence that the
    # exact setup token originated from public registration,
    # rather than to the learner profile's historical source.
    assert "AuditEvent" in source

    assert (
        '"public_registration.email_sent"'
        in source
    )

    assert (
        '"public_registration.email_failed"'
        in source
    )

    assert (
        "AuditEvent.entity_id == token_record.id"
        in source
    )

    success_index = source.index(
        'action="password_setup_success"'
    )

    completed_index = source.index(
        completed_marker
    )

    assert completed_index > success_index

    # Never put the raw setup token in completion audit data.
    completion_slice = source[
        completed_index:
        completed_index + 1200
    ]

    assert "raw_token" not in completion_slice
    assert "payload.token" not in completion_slice
    assert '"token":' not in completion_slice
    assert "'token':" not in completion_slice


def test_existing_password_setup_success_contract_is_preserved():
    source = set_password_source()

    assert (
        "user.hashed_password = "
        "get_password_hash(payload.password)"
        in source
    )

    assert "user.is_active = True" in source
    assert "user.is_email_verified = True" in source

    assert (
        "mark_user_password_token_used("
        in source
    )

    assert (
        'action="password_setup_success"'
        in source
    )

    assert "create_access_token(" not in source

    assert (
        "return SetPasswordResponse("
        in source
    )
