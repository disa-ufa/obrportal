from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr
import smtplib

from app.core.config import Settings, settings


EMAIL_DELIVERY_STATUS_SKIPPED = "skipped"
EMAIL_DELIVERY_STATUS_SENT = "sent"
EMAIL_DELIVERY_STATUS_FAILED = "failed"


@dataclass(frozen=True)
class EmailDeliveryResult:
    status: str
    recipient: str
    subject: str
    detail: str = ""
    error: str | None = None

    @property
    def sent(self) -> bool:
        return self.status == EMAIL_DELIVERY_STATUS_SENT


def normalize_email_header_value(value: str | None) -> str:
    return (value or "").strip()


def is_email_delivery_configured(email_settings: Settings = settings) -> bool:
    return bool(
        email_settings.email_delivery_enabled
        and normalize_email_header_value(email_settings.smtp_host)
        and normalize_email_header_value(email_settings.email_from_address)
    )


def build_email_from_header(email_settings: Settings = settings) -> str:
    from_address = normalize_email_header_value(email_settings.email_from_address)
    from_name = normalize_email_header_value(email_settings.email_from_name)

    if from_name:
        return formataddr((from_name, from_address))

    return from_address


def build_password_setup_email_subject(
    *,
    app_name: str | None = None,
) -> str:
    safe_app_name = normalize_email_header_value(app_name) or settings.app_name
    return f"{safe_app_name}: account invitation"


def build_password_setup_email_body(
    *,
    user_email: str,
    setup_url: str,
    expires_at: datetime | None = None,
    app_name: str | None = None,
) -> str:
    safe_app_name = normalize_email_header_value(app_name) or settings.app_name
    lines = [
        "Hello,",
        "",
        f"An administrator created an invitation for your {safe_app_name} account.",
        f"Account: {user_email}",
        "",
        "Open this link to set your password:",
        setup_url,
        "",
    ]

    if expires_at is not None:
        lines.extend(
            [
                "The link is valid until:",
                expires_at.isoformat(),
                "",
            ]
        )

    lines.extend(
        [
            "If you did not expect this message, ignore it.",
            "",
            f"-- {safe_app_name}",
        ]
    )

    return "\n".join(lines)


def build_password_setup_email_message(
    *,
    recipient: str,
    setup_url: str,
    user_email: str | None = None,
    expires_at: datetime | None = None,
    app_name: str | None = None,
    email_settings: Settings = settings,
) -> EmailMessage:
    normalized_recipient = normalize_email_header_value(recipient)
    if not normalized_recipient:
        raise ValueError("Recipient email is required.")

    subject = build_password_setup_email_subject(app_name=app_name)
    body = build_password_setup_email_body(
        user_email=user_email or normalized_recipient,
        setup_url=setup_url,
        expires_at=expires_at,
        app_name=app_name,
    )

    message = EmailMessage()
    message["From"] = build_email_from_header(email_settings)
    message["To"] = normalized_recipient
    message["Subject"] = subject
    message.set_content(body)

    return message


def send_email_message(
    message: EmailMessage,
    *,
    email_settings: Settings = settings,
) -> EmailDeliveryResult:
    recipient = normalize_email_header_value(message.get("To"))
    subject = normalize_email_header_value(message.get("Subject"))

    if not recipient:
        return EmailDeliveryResult(
            status=EMAIL_DELIVERY_STATUS_FAILED,
            recipient=recipient,
            subject=subject,
            detail="Recipient email is missing.",
            error="missing_recipient",
        )

    if not is_email_delivery_configured(email_settings):
        return EmailDeliveryResult(
            status=EMAIL_DELIVERY_STATUS_SKIPPED,
            recipient=recipient,
            subject=subject,
            detail="Email delivery is disabled or SMTP settings are incomplete.",
        )

    smtp_factory = smtplib.SMTP_SSL if email_settings.smtp_use_ssl else smtplib.SMTP

    try:
        with smtp_factory(
            email_settings.smtp_host,
            email_settings.smtp_port,
            timeout=email_settings.smtp_timeout_seconds,
        ) as smtp:
            smtp.ehlo()

            if email_settings.smtp_use_tls and not email_settings.smtp_use_ssl:
                smtp.starttls()
                smtp.ehlo()

            if email_settings.smtp_auth_username:
                smtp.login(email_settings.smtp_auth_username, email_settings.smtp_auth_value)

            smtp.send_message(message)

    except Exception as exc:
        return EmailDeliveryResult(
            status=EMAIL_DELIVERY_STATUS_FAILED,
            recipient=recipient,
            subject=subject,
            detail="Email delivery failed.",
            error=exc.__class__.__name__,
        )

    return EmailDeliveryResult(
        status=EMAIL_DELIVERY_STATUS_SENT,
        recipient=recipient,
        subject=subject,
        detail="Email sent.",
    )


def send_password_setup_email(
    *,
    recipient: str,
    setup_url: str,
    user_email: str | None = None,
    expires_at: datetime | None = None,
    app_name: str | None = None,
    email_settings: Settings = settings,
) -> EmailDeliveryResult:
    message = build_password_setup_email_message(
        recipient=recipient,
        setup_url=setup_url,
        user_email=user_email,
        expires_at=expires_at,
        app_name=app_name,
        email_settings=email_settings,
    )

    return send_email_message(message, email_settings=email_settings)


def build_course_assignment_email_subject(
    *,
    app_name: str | None = None,
) -> str:
    safe_app_name = (
        normalize_email_header_value(app_name)
        or settings.app_name
    )

    return (
        f"{safe_app_name}: "
        "new course assigned"
    )


def build_course_assignment_email_body(
    *,
    user_email: str,
    course_title: str,
    portal_url: str,
    app_name: str | None = None,
) -> str:
    safe_app_name = (
        normalize_email_header_value(app_name)
        or settings.app_name
    )
    safe_course_title = (
        normalize_email_header_value(
            course_title
        )
        or "Assigned course"
    )

    return "\n".join(
        [
            "Hello,",
            "",
            (
                "A new course has been assigned "
                f"to your {safe_app_name} account."
            ),
            f"Account: {user_email}",
            f"Course: {safe_course_title}",
            "",
            "Open the learning portal:",
            portal_url,
            "",
            f"-- {safe_app_name}",
        ]
    )


def build_course_assignment_email_message(
    *,
    recipient: str,
    course_title: str,
    portal_url: str,
    user_email: str | None = None,
    app_name: str | None = None,
    email_settings: Settings = settings,
) -> EmailMessage:
    normalized_recipient = (
        normalize_email_header_value(recipient)
    )

    if not normalized_recipient:
        raise ValueError(
            "Recipient email is required."
        )

    message = EmailMessage()
    message["From"] = build_email_from_header(
        email_settings
    )
    message["To"] = normalized_recipient
    message["Subject"] = (
        build_course_assignment_email_subject(
            app_name=app_name
        )
    )
    message.set_content(
        build_course_assignment_email_body(
            user_email=(
                user_email
                or normalized_recipient
            ),
            course_title=course_title,
            portal_url=portal_url,
            app_name=app_name,
        )
    )

    return message


def send_course_assignment_email(
    *,
    recipient: str,
    course_title: str,
    portal_url: str,
    user_email: str | None = None,
    app_name: str | None = None,
    email_settings: Settings = settings,
) -> EmailDeliveryResult:
    message = (
        build_course_assignment_email_message(
            recipient=recipient,
            user_email=user_email,
            course_title=course_title,
            portal_url=portal_url,
            app_name=app_name,
            email_settings=email_settings,
        )
    )

    return send_email_message(
        message,
        email_settings=email_settings,
    )
