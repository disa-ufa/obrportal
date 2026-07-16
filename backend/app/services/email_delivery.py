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
    safe_app_name = (
        normalize_email_header_value(app_name)
        or settings.app_name
    )

    return (
        f"{safe_app_name}: "
        "\u043f\u0440\u0438\u0433\u043b\u0430"
        "\u0448\u0435\u043d\u0438\u0435 "
        "\u0432 \u043e\u0431\u0440\u0430\u0437"
        "\u043e\u0432\u0430\u0442\u0435\u043b"
        "\u044c\u043d\u044b\u0439 "
        "\u043f\u043e\u0440\u0442\u0430\u043b"
    )




def build_password_setup_email_body(
    *,
    user_email: str,
    setup_url: str,
    expires_at: datetime | None = None,
    course_title: str | None = None,
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
        if course_title
        else ""
    )

    lines = [
        (
            "\u0417\u0434\u0440\u0430\u0432"
            "\u0441\u0442\u0432\u0443\u0439"
            "\u0442\u0435!"
        ),
        "",
        (
            "\u0414\u043b\u044f \u0432\u0430\u0441 "
            "\u0441\u043e\u0437\u0434\u0430\u043d\u0430 "
            "\u0443\u0447\u0451\u0442\u043d\u0430\u044f "
            "\u0437\u0430\u043f\u0438\u0441\u044c "
            "\u0432 \u043e\u0431\u0440\u0430\u0437"
            "\u043e\u0432\u0430\u0442\u0435\u043b"
            "\u044c\u043d\u043e\u043c "
            f"\u043f\u043e\u0440\u0442\u0430\u043b\u0435 "
            f"{safe_app_name}."
        ),
        (
            "\u041b\u043e\u0433\u0438\u043d: "
            f"{user_email}"
        ),
    ]

    if safe_course_title:
        lines.extend(
            [
                "",
                (
                    "\u0412\u0430\u043c "
                    "\u043d\u0430\u0437\u043d\u0430"
                    "\u0447\u0435\u043d "
                    "\u043a\u0443\u0440\u0441:"
                ),
                safe_course_title,
            ]
        )

    lines.extend(
        [
            "",
            (
                "\u0427\u0442\u043e\u0431\u044b "
                "\u0437\u0430\u0432\u0435\u0440\u0448"
                "\u0438\u0442\u044c "
                "\u0440\u0435\u0433\u0438\u0441\u0442"
                "\u0440\u0430\u0446\u0438\u044e "
                "\u0438 \u043d\u0430\u0447\u0430\u0442\u044c "
                "\u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435, "
                "\u0443\u0441\u0442\u0430\u043d\u043e\u0432"
                "\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c."
            ),
            (
                "\u041f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 "
                "\u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435:"
            ),
            setup_url,
            "",
        ]
    )

    if expires_at is not None:
        formatted_expires_at = (
            expires_at.strftime(
                "%d.%m.%Y %H:%M"
            )
        )
        timezone_name = expires_at.tzname()

        if timezone_name:
            formatted_expires_at += (
                f" ({timezone_name})"
            )

        lines.extend(
            [
                (
                    "\u0421\u0441\u044b\u043b\u043a\u0430 "
                    "\u0434\u0435\u0439\u0441\u0442\u0432"
                    "\u0438\u0442\u0435\u043b\u044c\u043d\u0430 "
                    "\u0434\u043e:"
                ),
                formatted_expires_at,
                "",
            ]
        )

    lines.extend(
        [
            (
                "\u0415\u0441\u043b\u0438 \u0432\u044b "
                "\u043d\u0435 \u043e\u0436\u0438\u0434\u0430\u043b\u0438 "
                "\u044d\u0442\u043e \u043f\u0438\u0441\u044c\u043c\u043e, "
                "\u043f\u0440\u043e\u0441\u0442\u043e "
                "\u043f\u0440\u043e\u0438\u0433\u043d\u043e\u0440"
                "\u0438\u0440\u0443\u0439\u0442\u0435 \u0435\u0433\u043e."
            ),
            "",
            (
                "\u0421 \u0443\u0432\u0430\u0436\u0435\u043d\u0438\u0435\u043c, "
                f"\u043a\u043e\u043c\u0430\u043d\u0434\u0430 {safe_app_name}"
            ),
        ]
    )

    return "\n".join(lines)



def build_password_setup_email_message(
    *,
    recipient: str,
    setup_url: str,
    user_email: str | None = None,
    expires_at: datetime | None = None,
    course_title: str | None = None,
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

    subject = build_password_setup_email_subject(
        app_name=app_name
    )
    body = build_password_setup_email_body(
        user_email=(
            user_email
            or normalized_recipient
        ),
        setup_url=setup_url,
        expires_at=expires_at,
        course_title=course_title,
        app_name=app_name,
    )

    message = EmailMessage()
    message["From"] = build_email_from_header(
        email_settings
    )
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
    course_title: str | None = None,
    app_name: str | None = None,
    email_settings: Settings = settings,
) -> EmailDeliveryResult:
    message = build_password_setup_email_message(
        recipient=recipient,
        setup_url=setup_url,
        user_email=user_email,
        expires_at=expires_at,
        course_title=course_title,
        app_name=app_name,
        email_settings=email_settings,
    )

    return send_email_message(
        message,
        email_settings=email_settings,
    )




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
        "\u0432\u0430\u043c "
        "\u043d\u0430\u0437\u043d\u0430"
        "\u0447\u0435\u043d "
        "\u043d\u043e\u0432\u044b\u0439 "
        "\u043a\u0443\u0440\u0441"
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
        or (
            "\u041d\u0430\u0437\u043d\u0430"
            "\u0447\u0435\u043d\u043d\u044b\u0439 "
            "\u043a\u0443\u0440\u0441"
        )
    )

    return "\n".join(
        [
            (
                "\u0417\u0434\u0440\u0430\u0432"
                "\u0441\u0442\u0432\u0443\u0439"
                "\u0442\u0435!"
            ),
            "",
            (
                "\u0412 \u043e\u0431\u0440\u0430"
                "\u0437\u043e\u0432\u0430\u0442"
                "\u0435\u043b\u044c\u043d\u043e\u043c "
                f"\u043f\u043e\u0440\u0442\u0430\u043b\u0435 {safe_app_name} "
                "\u0432\u0430\u043c "
                "\u043d\u0430\u0437\u043d\u0430"
                "\u0447\u0435\u043d "
                "\u043d\u043e\u0432\u044b\u0439 "
                "\u043a\u0443\u0440\u0441."
            ),
            (
                "\u041b\u043e\u0433\u0438\u043d: "
                f"{user_email}"
            ),
            (
                "\u041a\u0443\u0440\u0441: "
                f"{safe_course_title}"
            ),
            "",
            (
                "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 "
                "\u0432 \u043e\u0431\u0440\u0430"
                "\u0437\u043e\u0432\u0430\u0442"
                "\u0435\u043b\u044c\u043d\u044b\u0439 "
                "\u043f\u043e\u0440\u0442\u0430\u043b:"
            ),
            portal_url,
            "",
            (
                "\u0421 \u0443\u0432\u0430\u0436\u0435\u043d\u0438\u0435\u043c, "
                f"\u043a\u043e\u043c\u0430\u043d\u0434\u0430 {safe_app_name}"
            ),
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
