from __future__ import annotations

from app.core.config import Settings
from app.services.email_delivery import (
    EMAIL_DELIVERY_STATUS_SKIPPED,
    build_course_assignment_email_message,
    send_course_assignment_email,
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


def test_course_assignment_message_contains_context() -> None:
    course_title = (
        "\u041e\u043a\u0430\u0437\u0430\u043d\u0438\u0435 "
        "\u043f\u0435\u0440\u0432\u043e\u0439 "
        "\u043f\u043e\u043c\u043e\u0449\u0438 "
        "\u043f\u043e\u0441\u0442\u0440\u0430"
        "\u0434\u0430\u0432\u0448\u0438\u043c"
    )

    message = (
        build_course_assignment_email_message(
            recipient="learner@example.test",
            user_email="learner@example.test",
            course_title=course_title,
            portal_url=(
                "https://portal.example.test"
            ),
            email_settings=build_settings(),
        )
    )

    assert (
        message["To"]
        == "learner@example.test"
    )
    assert (
        message["Subject"]
        == (
            "ObrPortal: "
            "\u0432\u0430\u043c "
            "\u043d\u0430\u0437\u043d\u0430"
            "\u0447\u0435\u043d "
            "\u043d\u043e\u0432\u044b\u0439 "
            "\u043a\u0443\u0440\u0441"
        )
    )

    body = message.get_content()

    assert (
        "\u0417\u0434\u0440\u0430\u0432"
        "\u0441\u0442\u0432\u0443\u0439\u0442\u0435!"
        in body
    )
    assert (
        "\u0432\u0430\u043c "
        "\u043d\u0430\u0437\u043d\u0430"
        "\u0447\u0435\u043d "
        "\u043d\u043e\u0432\u044b\u0439 "
        "\u043a\u0443\u0440\u0441"
        in body
    )
    assert (
        "\u041b\u043e\u0433\u0438\u043d: "
        "learner@example.test"
        in body
    )
    assert (
        "\u041a\u0443\u0440\u0441: "
        + course_title
        in body
    )
    assert (
        "https://portal.example.test"
        in body
    )


def test_course_assignment_email_skips_when_disabled() -> None:
    result = send_course_assignment_email(
        recipient="learner@example.test",
        course_title="First aid",
        portal_url=(
            "https://portal.example.test"
        ),
        email_settings=build_settings(
            email_delivery_enabled=False
        ),
    )

    assert (
        result.status
        == EMAIL_DELIVERY_STATUS_SKIPPED
    )
    assert result.sent is False
