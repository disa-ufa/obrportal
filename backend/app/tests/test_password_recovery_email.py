from datetime import datetime, timezone

import pytest

from app.services.email_delivery import (
    build_password_reset_email_body,
    build_password_reset_email_message,
    build_password_reset_email_subject,
)


def test_password_reset_email_subject_has_recovery_context() -> None:
    subject = build_password_reset_email_subject(app_name="ОбрПортал")
    assert "ОбрПортал" in subject
    assert "восстановление пароля" in subject


def test_password_reset_email_body_contains_reset_context() -> None:
    body = build_password_reset_email_body(
        user_email="learner@example.test",
        reset_url="https://portal.example.test/reset-password?token=secret",
        expires_at=datetime(2026, 7, 30, 12, 0, tzinfo=timezone.utc),
        app_name="ОбрПортал",
    )
    assert "learner@example.test" in body
    assert "/reset-password?token=secret" in body
    assert "восстановление пароля" in body
    assert "проигнорируйте" in body


def test_password_reset_email_message_rejects_blank_recipient() -> None:
    with pytest.raises(ValueError, match="Recipient email is required"):
        build_password_reset_email_message(
            recipient=" ",
            reset_url="https://portal.example.test/reset-password?token=secret",
        )
