from datetime import timedelta

import pytest

from app.models.base import utcnow
from app.models.user_password_token import UserPasswordToken
from app.services.user_password_tokens import (
    USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
    USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET,
    build_password_setup_url,
    generate_raw_password_token,
    hash_password_token,
    is_user_password_token_record_active,
    normalize_user_password_token_purpose,
)


def test_generate_raw_password_token_is_url_safe_and_unique() -> None:
    first = generate_raw_password_token()
    second = generate_raw_password_token()

    assert first
    assert second
    assert first != second
    assert len(first) >= 48
    assert " " not in first


def test_hash_password_token_is_deterministic_and_does_not_expose_raw_value() -> None:
    raw_token = "token-for-user-link"

    first_hash = hash_password_token(raw_token)
    second_hash = hash_password_token(raw_token)

    assert first_hash == second_hash
    assert first_hash != raw_token
    assert len(first_hash) == 64


def test_hash_password_token_rejects_blank_values() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        hash_password_token("   ")


def test_normalize_user_password_token_purpose_accepts_known_values() -> None:
    assert (
        normalize_user_password_token_purpose(" INITIAL_PASSWORD_SETUP ".lower())
        == USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP
    )
    assert (
        normalize_user_password_token_purpose(USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET)
        == USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET
    )


def test_normalize_user_password_token_purpose_rejects_unknown_values() -> None:
    with pytest.raises(ValueError, match="Unsupported password token purpose"):
        normalize_user_password_token_purpose("email_confirmation")


def test_build_password_setup_url_encodes_token_and_normalizes_slashes() -> None:
    url = build_password_setup_url(
        "https://portal.example.test/",
        "raw token/with spaces",
        path="/set-password/",
    )

    assert url == "https://portal.example.test/set-password?token=raw+token%2Fwith+spaces"


def test_build_password_setup_url_rejects_blank_base_url() -> None:
    with pytest.raises(ValueError, match="Frontend base URL"):
        build_password_setup_url("   ", "token")


def test_is_user_password_token_record_active_accepts_unused_non_expired_token() -> None:
    now = utcnow()
    record = UserPasswordToken(
        user_id="user-id",
        token_hash="hash",
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        expires_at=now + timedelta(hours=1),
        used_at=None,
    )

    assert is_user_password_token_record_active(
        record,
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        now=now,
    )


def test_is_user_password_token_record_active_rejects_used_token() -> None:
    now = utcnow()
    record = UserPasswordToken(
        user_id="user-id",
        token_hash="hash",
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        expires_at=now + timedelta(hours=1),
        used_at=now,
    )

    assert not is_user_password_token_record_active(
        record,
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        now=now,
    )


def test_is_user_password_token_record_active_rejects_expired_token() -> None:
    now = utcnow()
    record = UserPasswordToken(
        user_id="user-id",
        token_hash="hash",
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        expires_at=now - timedelta(seconds=1),
        used_at=None,
    )

    assert not is_user_password_token_record_active(
        record,
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        now=now,
    )


def test_is_user_password_token_record_active_rejects_wrong_purpose() -> None:
    now = utcnow()
    record = UserPasswordToken(
        user_id="user-id",
        token_hash="hash",
        purpose=USER_PASSWORD_TOKEN_PURPOSE_PASSWORD_RESET,
        expires_at=now + timedelta(hours=1),
        used_at=None,
    )

    assert not is_user_password_token_record_active(
        record,
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
        now=now,
    )
