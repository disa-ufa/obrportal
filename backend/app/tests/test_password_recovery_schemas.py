import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    ForgotPasswordAcceptedResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
)


def test_forgot_password_request_accepts_email() -> None:
    payload = ForgotPasswordRequest(email="learner@example.com")
    assert str(payload.email) == "learner@example.com"


def test_forgot_password_response_requires_accepted_status() -> None:
    response = ForgotPasswordAcceptedResponse(
        status="accepted",
        message="Request accepted.",
    )
    assert response.status == "accepted"

    with pytest.raises(ValidationError):
        ForgotPasswordAcceptedResponse(
            status="ok",
            message="Request accepted.",
        )


def test_reset_password_request_validates_lengths() -> None:
    payload = ResetPasswordRequest(
        token="a" * 32,
        password="new-password-test-123!",
    )
    assert len(payload.token) == 32

    with pytest.raises(ValidationError):
        ResetPasswordRequest(
            token="short",
            password="new-password-test-123!",
        )


def test_reset_password_response_contains_no_identity() -> None:
    payload = ResetPasswordResponse().model_dump()
    assert payload == {"status": "ok"}
    assert "user_id" not in payload
    assert "email" not in payload
