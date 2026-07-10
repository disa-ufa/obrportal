from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import Settings
from app.services import email_delivery
from app.services.email_delivery import (
    EMAIL_DELIVERY_STATUS_FAILED,
    EMAIL_DELIVERY_STATUS_SENT,
    EMAIL_DELIVERY_STATUS_SKIPPED,
    build_password_setup_email_message,
    send_email_message,
    send_password_setup_email,
)


def build_settings(**overrides: object) -> Settings:
    values = {
        "email_delivery_enabled": False,
        "email_from_address": "no-reply@example.test",
        "email_from_name": "ObrPortal",
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_auth_username": "",
        "smtp_auth_value": "",
        "smtp_use_tls": True,
        "smtp_use_ssl": False,
        "smtp_timeout_seconds": 10.0,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_build_password_setup_email_message_contains_invitation_context() -> None:
    expires_at = datetime(2026, 7, 20, 12, 0, tzinfo=timezone.utc)
    message = build_password_setup_email_message(
        recipient="learner@example.test",
        user_email="learner@example.test",
        setup_url="https://portal.example.test/set-password?code=abc",
        expires_at=expires_at,
        email_settings=build_settings(),
    )

    assert message["To"] == "learner@example.test"
    assert message["From"] == "ObrPortal <no-reply@example.test>"
    assert message["Subject"] == "ObrPortal: account invitation"

    body = message.get_content()
    assert "learner@example.test" in body
    assert "https://portal.example.test/set-password?code=abc" in body
    assert "2026-07-20T12:00:00+00:00" in body


def test_send_password_setup_email_skips_when_delivery_disabled() -> None:
    result = send_password_setup_email(
        recipient="learner@example.test",
        user_email="learner@example.test",
        setup_url="https://portal.example.test/set-password?code=abc",
        email_settings=build_settings(email_delivery_enabled=False),
    )

    assert result.status == EMAIL_DELIVERY_STATUS_SKIPPED
    assert result.sent is False
    assert result.recipient == "learner@example.test"


def test_send_email_message_returns_failed_for_missing_recipient() -> None:
    message = build_password_setup_email_message(
        recipient="learner@example.test",
        setup_url="https://portal.example.test/set-password?code=abc",
        email_settings=build_settings(),
    )
    del message["To"]

    result = send_email_message(message, email_settings=build_settings(email_delivery_enabled=True))

    assert result.status == EMAIL_DELIVERY_STATUS_FAILED
    assert result.error == "missing_recipient"


def test_send_password_setup_email_sends_via_smtp(monkeypatch) -> None:
    class FakeSMTP:
        created: list["FakeSMTP"] = []

        def __init__(self, host: str, port: int, timeout: float) -> None:
            self.host = host
            self.port = port
            self.timeout = timeout
            self.started_tls = False
            self.sent_messages = []
            FakeSMTP.created.append(self)

        def __enter__(self) -> "FakeSMTP":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

        def ehlo(self) -> None:
            return None

        def starttls(self) -> None:
            self.started_tls = True

        def send_message(self, message) -> None:
            self.sent_messages.append(message)

    monkeypatch.setattr(email_delivery.smtplib, "SMTP", FakeSMTP)

    result = send_password_setup_email(
        recipient="learner@example.test",
        setup_url="https://portal.example.test/set-password?code=abc",
        email_settings=build_settings(
            email_delivery_enabled=True,
            smtp_host="smtp.example.test",
            smtp_port=2525,
            smtp_use_tls=True,
            smtp_use_ssl=False,
        ),
    )

    assert result.status == EMAIL_DELIVERY_STATUS_SENT
    assert result.sent is True

    assert len(FakeSMTP.created) == 1
    smtp = FakeSMTP.created[0]
    assert smtp.host == "smtp.example.test"
    assert smtp.port == 2525
    assert smtp.started_tls is True
    assert len(smtp.sent_messages) == 1
    assert smtp.sent_messages[0]["To"] == "learner@example.test"
