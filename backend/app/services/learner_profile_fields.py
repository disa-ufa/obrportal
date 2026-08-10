from __future__ import annotations

import re

from email_validator import EmailNotValidError, validate_email


_PHONE_SEPARATORS = re.compile(r"[\s()\-]+")
_SNILS_PATTERN = re.compile(r"\d{3}-\d{3}-\d{3} \d{2}")
_PHONE_PATTERN = re.compile(r"\+?\d{10,15}")


def normalize_learner_name(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = " ".join(value.split())
    return normalized or None


def normalize_learner_email(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip().lower()
    return normalized or None


def is_valid_learner_email(value: str) -> bool:
    try:
        validate_email(
            value,
            check_deliverability=False,
        )
    except EmailNotValidError:
        return False

    return True


def normalize_learner_phone(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    compact = _PHONE_SEPARATORS.sub(
        "",
        value.strip(),
    )

    if not compact:
        return None

    digits = re.sub(r"\D", "", compact)

    if len(digits) == 11 and digits[0] in {"7", "8"}:
        return f"+7{digits[1:]}"

    if compact.startswith("+") and digits:
        return f"+{digits}"

    return compact


def is_valid_learner_phone(value: str) -> bool:
    return _PHONE_PATTERN.fullmatch(value) is not None


def normalize_learner_snils(
    value: object | None,
) -> str | None:
    if value is None:
        return None

    text = " ".join(str(value).split())
    digits = re.sub(r"\D+", "", text)

    if not digits:
        return None

    if len(digits) == 11:
        return (
            f"{digits[0:3]}-"
            f"{digits[3:6]}-"
            f"{digits[6:9]} "
            f"{digits[9:11]}"
        )

    return text or None


def is_valid_learner_snils(value: str) -> bool:
    if _SNILS_PATTERN.fullmatch(value) is None:
        return False

    digits = re.sub(r"\D", "", value)
    number_digits = digits[:9]
    control_number = int(digits[9:11])

    # For historical SNILS values up to and including
    # 001-001-998, the control number is not checked.
    if int(number_digits) <= 1_001_998:
        return True

    weighted_sum = sum(
        int(digit) * weight
        for digit, weight in zip(
            number_digits,
            range(9, 0, -1),
        )
    )
    remainder = weighted_sum % 101
    expected_control = 0 if remainder == 100 else remainder

    return control_number == expected_control
