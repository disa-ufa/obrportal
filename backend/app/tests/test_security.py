from __future__ import annotations

from datetime import timedelta

from jose import jwt

from app.core.config import settings
from app.core.security import (
    ALGORITHM,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    password = "Security123Local!"

    hashed_password = get_password_hash(password)

    assert hashed_password
    assert hashed_password != password
    assert verify_password(password, hashed_password)
    assert not verify_password("wrong-password", hashed_password)


def test_access_token_roundtrip_contains_expected_claims() -> None:
    subject = "user-123"

    encoded_jwt = create_access_token(
        subject,
        expires_delta=timedelta(minutes=5),
    )

    payload = decode_access_token(encoded_jwt)

    assert payload is not None
    assert payload["sub"] == subject
    assert payload["type"] == "access"
    assert "exp" in payload


def test_decode_access_token_rejects_invalid_token() -> None:
    assert decode_access_token("not-a-jwt-token") is None


def test_decode_access_token_rejects_non_access_token() -> None:
    refresh_jwt = jwt.encode(
        {
            "sub": "user-123",
            "type": "refresh",
        },
        settings.secret_key,
        algorithm=ALGORITHM,
    )

    assert decode_access_token(refresh_jwt) is None


def test_decode_access_token_rejects_expired_token() -> None:
    expired_jwt = create_access_token(
        "expired-user",
        expires_delta=timedelta(seconds=-1),
    )

    assert decode_access_token(expired_jwt) is None
