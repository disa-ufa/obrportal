from __future__ import annotations

from app.core.config import Settings
from app.services.email_delivery import (
    EMAIL_DELIVERY_STATUS_SKIPPED,
    build_course_assignment_email_message,
    send_course_assignment_email,
)


def build_settings(
    **overrides: object,
) -> Settings:
    values = {
        "email_delivery_enabled": False,
        "email_from_address": (
            "no-reply@example.test"
        ),
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

    return Settings(
        _env_file=None,
        **values,
    )


def test_course_assignment_message_contains_context() -> None:
    message = (
        build_course_assignment_email_message(
            recipient="learner@example.test",
            user_email="learner@example.test",
            course_title="First aid",
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
        == "ObrPortal: new course assigned"
    )

    body = message.get_content()

    assert "learner@example.test" in body
    assert "First aid" in body
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
