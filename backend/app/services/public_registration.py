from __future__ import annotations

from dataclasses import dataclass
import re


PUBLIC_REGISTRATION_ACCEPTED_STATUS = "accepted"
PUBLIC_REGISTRATION_ACCEPTED_MESSAGE = (
    "Если указанный адрес может быть использован для регистрации, "
    "на него будет отправлено письмо с дальнейшими инструкциями."
)
PUBLIC_REGISTRATION_LEARNER_ROLE_CODE = "learner_fl"
PUBLIC_REGISTRATION_PROFILE_SOURCE = "public_registration"
PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS = "public_registration"

_PHONE_SEPARATORS = re.compile(r"[\s()\-]+")


@dataclass(frozen=True)
class NormalizedPublicRegistrationData:
    last_name: str
    first_name: str
    middle_name: str | None
    email: str
    phone: str | None

    @property
    def full_name(self) -> str:
        return " ".join(
            part
            for part in (
                self.last_name,
                self.first_name,
                self.middle_name,
            )
            if part
        )


def normalize_public_registration_email(value: str) -> str:
    return value.strip().lower()


def normalize_public_registration_name(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = " ".join(value.split())
    return normalized or None


def normalize_required_public_registration_name(
    value: str,
    *,
    field_name: str,
) -> str:
    normalized = normalize_public_registration_name(value)

    if normalized is None:
        raise ValueError(f"{field_name} must not be blank.")

    return normalized


def normalize_public_registration_phone(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    compact = _PHONE_SEPARATORS.sub("", value.strip())

    if not compact:
        return None

    digits = re.sub(r"\D", "", compact)

    if len(digits) == 11 and digits[0] in {"7", "8"}:
        return f"+7{digits[1:]}"

    if compact.startswith("+") and digits:
        return f"+{digits}"

    return compact


def normalize_public_registration_data(
    *,
    last_name: str,
    first_name: str,
    middle_name: str | None,
    email: str,
    phone: str | None,
) -> NormalizedPublicRegistrationData:
    return NormalizedPublicRegistrationData(
        last_name=normalize_required_public_registration_name(
            last_name,
            field_name="last_name",
        ),
        first_name=normalize_required_public_registration_name(
            first_name,
            field_name="first_name",
        ),
        middle_name=normalize_public_registration_name(
            middle_name
        ),
        email=normalize_public_registration_email(email),
        phone=normalize_public_registration_phone(phone),
    )