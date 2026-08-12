from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import traceback

from app.core.config import Settings
from app.services import email_delivery
from app.services.email_delivery import (
    EMAIL_DELIVERY_STATUS_FAILED,
    EMAIL_DELIVERY_STATUS_SENT,
    EMAIL_DELIVERY_STATUS_SKIPPED,
    build_password_setup_email_message,
    build_public_registration_email_message,
    send_email_message,
    send_password_setup_email,
    send_public_registration_email,
)


def build_settings(**overrides: object) -> Settings:
    """Build email settings isolated from Docker process environment."""

    alias_by_field = {
        "email_delivery_enabled": (
            "EMAIL_DELIVERY_ENABLED"
        ),
        "email_from_address": (
            "EMAIL_FROM_ADDRESS"
        ),
        "email_from_name": (
            "EMAIL_FROM_NAME"
        ),
        "smtp_host": "SMTP_HOST",
        "smtp_port": "SMTP_PORT",
        "smtp_auth_username": (
            "SMTP_USERNAME"
        ),
        "smtp_auth_value": (
            "SMTP_PASSWORD"
        ),
        "smtp_use_tls": "SMTP_USE_TLS",
        "smtp_use_ssl": "SMTP_USE_SSL",
        "smtp_timeout_seconds": (
            "SMTP_TIMEOUT_SECONDS"
        ),
    }

    values: dict[str, object] = {
        "EMAIL_DELIVERY_ENABLED": False,
        "EMAIL_FROM_ADDRESS": (
            "no-reply@example.test"
        ),
        "EMAIL_FROM_NAME": "ObrPortal",
        "SMTP_HOST": "",
        "SMTP_PORT": 587,
        "SMTP_USERNAME": "",
        "SMTP_PASSWORD": "",
        "SMTP_USE_TLS": True,
        "SMTP_USE_SSL": False,
        "SMTP_TIMEOUT_SECONDS": 10.0,
    }

    for field_name, value in overrides.items():
        alias = alias_by_field.get(field_name)

        if alias is None:
            raise KeyError(
                "Unsupported test email setting: "
                f"{field_name}"
            )

        values[alias] = value

    return Settings(
        _env_file=None,
        **values,
    )


def test_build_password_setup_email_message_contains_invitation_context() -> None:
    expires_at = datetime(
        2026,
        7,
        20,
        12,
        0,
        tzinfo=timezone.utc,
    )
    course_title = (
        "\u041e\u043a\u0430\u0437\u0430\u043d\u0438\u0435 "
        "\u043f\u0435\u0440\u0432\u043e\u0439 "
        "\u043f\u043e\u043c\u043e\u0449\u0438 "
        "\u043f\u043e\u0441\u0442\u0440\u0430"
        "\u0434\u0430\u0432\u0448\u0438\u043c"
    )

    message = build_password_setup_email_message(
        recipient="learner@example.test",
        user_email="learner@example.test",
        setup_url=(
            "https://portal.example.test/"
            "set-password?code=abc"
        ),
        expires_at=expires_at,
        course_title=course_title,
        email_settings=build_settings(),
    )

    assert message["To"] == (
        "learner@example.test"
    )
    assert message["From"] == (
        "ObrPortal <no-reply@example.test>"
    )
    assert message["Subject"] == (
        "ObrPortal: "
        "\u043f\u0440\u0438\u0433\u043b\u0430"
        "\u0448\u0435\u043d\u0438\u0435 "
        "\u0432 \u043e\u0431\u0440\u0430\u0437"
        "\u043e\u0432\u0430\u0442\u0435\u043b"
        "\u044c\u043d\u044b\u0439 "
        "\u043f\u043e\u0440\u0442\u0430\u043b"
    )

    body = message.get_content()

    assert (
        "\u0417\u0434\u0440\u0430\u0432"
        "\u0441\u0442\u0432\u0443\u0439\u0442\u0435!"
        in body
    )
    assert (
        "\u0414\u043b\u044f \u0432\u0430\u0441 "
        "\u0441\u043e\u0437\u0434\u0430\u043d\u0430 "
        "\u0443\u0447\u0451\u0442\u043d\u0430\u044f "
        "\u0437\u0430\u043f\u0438\u0441\u044c"
        in body
    )
    assert (
        "\u041b\u043e\u0433\u0438\u043d: "
        "learner@example.test"
        in body
    )
    assert (
        "\u0412\u0430\u043c "
        "\u043d\u0430\u0437\u043d\u0430"
        "\u0447\u0435\u043d "
        "\u043a\u0443\u0440\u0441:"
        in body
    )
    assert course_title in body
    assert (
        "https://portal.example.test/"
        "set-password?code=abc"
        in body
    )
    assert (
        "20.07.2026 12:00 (UTC)"
        in body
    )


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




def test_build_public_registration_email_message_contains_self_service_context() -> None:
    expires_at = datetime(
        2026,
        7,
        28,
        18,
        0,
        tzinfo=timezone.utc,
    )

    message = build_public_registration_email_message(
        recipient="public@example.test",
        setup_url=(
            "https://portal.example.test/"
            "set-password?token=registration"
        ),
        expires_at=expires_at,
        email_settings=build_settings(),
    )

    assert message["To"] == "public@example.test"
    assert message["Subject"] == (
        "ObrPortal: "
        "\u0437\u0430\u0432\u0435\u0440\u0448"
        "\u0435\u043d\u0438\u0435 "
        "\u0440\u0435\u0433\u0438\u0441\u0442"
        "\u0440\u0430\u0446\u0438\u0438"
    )

    body = message.get_content()

    assert (
        "\u0441\u0430\u043c\u043e\u0441\u0442"
        "\u043e\u044f\u0442\u0435\u043b\u044c"
        "\u043d\u0443\u044e "
        "\u0440\u0435\u0433\u0438\u0441\u0442"
        "\u0440\u0430\u0446\u0438\u044e"
        in body
    )
    assert (
        "\u043f\u043e\u0434\u0442\u0432\u0435"
        "\u0440\u0434\u0438\u0442\u044c "
        "\u0430\u0434\u0440\u0435\u0441 "
        "\u044d\u043b\u0435\u043a\u0442\u0440"
        "\u043e\u043d\u043d\u043e\u0439 "
        "\u043f\u043e\u0447\u0442\u044b"
        in body
    )
    assert "public@example.test" in body
    assert (
        "https://portal.example.test/"
        "set-password?token=registration"
        in body
    )
    assert "28.07.2026 18:00 (UTC)" in body
    assert (
        "\u043d\u0435 "
        "\u043e\u0442\u043f\u0440\u0430\u0432"
        "\u043b\u044f\u043b\u0438 "
        "\u0437\u0430\u044f\u0432\u043a\u0443"
        in body
    )


def test_send_public_registration_email_skips_when_delivery_disabled() -> None:
    result = send_public_registration_email(
        recipient="public@example.test",
        setup_url=(
            "https://portal.example.test/"
            "set-password?token=registration"
        ),
        email_settings=build_settings(
            email_delivery_enabled=False
        ),
    )

    assert result.status == EMAIL_DELIVERY_STATUS_SKIPPED
    assert result.sent is False
    assert result.recipient == "public@example.test"


def test_public_registration_email_rejects_blank_recipient() -> None:
    try:
        build_public_registration_email_message(
            recipient="   ",
            setup_url=(
                "https://portal.example.test/"
                "set-password?token=registration"
            ),
            email_settings=build_settings(),
        )
    except ValueError as error:
        assert str(error) == "Recipient email is required."
    else:
        raise AssertionError(
            "Expected blank recipient to be rejected."
        )

def test_email_sources_have_no_corrupted_question_mark_runs() -> None:
    backend_root = (
        Path(__file__).resolve().parents[2]
    )

    source_paths = (
        (
            backend_root
            / "app"
            / "services"
            / "email_delivery.py"
        ),
        (
            backend_root
            / "app"
            / "api"
            / "v1"
            / "admin.py"
        ),
    )

    for source_path in source_paths:
        source = source_path.read_text(
            encoding="utf-8"
        )

        assert "?" * 3 not in source, source_path


def test_smtp_auth_secret_is_redacted_and_unwrapped_only_for_login(
    monkeypatch,
) -> None:
    dummy_secret = "dummy-smtp-secret-fixture"

    email_settings = build_settings(
        email_delivery_enabled=True,
        smtp_host="smtp.example.test",
        smtp_port=2525,
        smtp_auth_username="mailer@example.test",
        smtp_auth_value=dummy_secret,
        smtp_use_tls=False,
        smtp_use_ssl=False,
    )

    # The application can explicitly retrieve the credential when
    # it actually needs to authenticate.
    assert (
        email_settings.smtp_auth_value.get_secret_value()
        == dummy_secret
    )

    # Generic representations must never expose the credential.
    assert dummy_secret not in repr(email_settings)
    assert dummy_secret not in str(email_settings)
    assert (
        dummy_secret
        not in email_settings.model_dump_json()
    )

    dumped = email_settings.model_dump()

    assert (
        dumped["smtp_auth_value"].get_secret_value()
        == dummy_secret
    )

    try:
        raise RuntimeError(email_settings)
    except RuntimeError:
        exception_trace = traceback.format_exc()

    assert dummy_secret not in exception_trace

    class FakeSMTP:
        captured_login: tuple[str, str] | None = None

        def __init__(
            self,
            host: str,
            port: int,
            timeout: float,
        ) -> None:
            self.host = host
            self.port = port
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return None

        def ehlo(self) -> None:
            return None

        def login(
            self,
            username: str,
            password: str,
        ) -> None:
            FakeSMTP.captured_login = (
                username,
                password,
            )

        def send_message(self, message) -> None:
            return None

    monkeypatch.setattr(
        email_delivery.smtplib,
        "SMTP",
        FakeSMTP,
    )

    message = build_password_setup_email_message(
        recipient="learner@example.test",
        setup_url=(
            "https://portal.example.test/"
            "set-password?code=dummy"
        ),
        email_settings=email_settings,
    )

    result = send_email_message(
        message,
        email_settings=email_settings,
    )

    assert result.status == EMAIL_DELIVERY_STATUS_SENT

    # Plain text exists only at the explicit SMTP authentication
    # boundary and is not retained by Settings representations.
    assert FakeSMTP.captured_login == (
        "mailer@example.test",
        dummy_secret,
    )
