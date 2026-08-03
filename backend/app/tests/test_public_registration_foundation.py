from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    PublicRegistrationAcceptedResponse,
    PublicRegistrationRequest,
)
from app.services.public_registration import (
    PUBLIC_REGISTRATION_ACCEPTED_MESSAGE,
    PUBLIC_REGISTRATION_ACCEPTED_STATUS,
    PUBLIC_REGISTRATION_LEARNER_ROLE_CODE,
    PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS,
    PUBLIC_REGISTRATION_PROFILE_SOURCE,
    normalize_public_registration_data,
    normalize_public_registration_email,
    normalize_public_registration_name,
    normalize_public_registration_phone,
)


def valid_request_payload() -> dict:
    return {
        "last_name": "Иванов",
        "first_name": "Иван",
        "middle_name": "Иванович",
        "email": "ivanov@example.com",
        "phone": "+79990000000",
        "personal_data_consent": True,
        "terms_accepted": True,
    }


def test_public_registration_request_accepts_target_fields() -> None:
    request = PublicRegistrationRequest(
        **valid_request_payload()
    )

    assert request.last_name == "Иванов"
    assert request.first_name == "Иван"
    assert request.middle_name == "Иванович"
    assert request.email == "ivanov@example.com"
    assert request.phone == "+79990000000"
    assert request.personal_data_consent is True
    assert request.terms_accepted is True


def test_public_registration_request_rejects_password_field() -> None:
    payload = valid_request_payload()
    payload["password"] = "MustNotBeAccepted123!"

    with pytest.raises(ValidationError):
        PublicRegistrationRequest(**payload)


@pytest.mark.parametrize(
    "field_name",
    [
        "personal_data_consent",
        "terms_accepted",
    ],
)
def test_public_registration_request_requires_true_consent(
    field_name: str,
) -> None:
    payload = valid_request_payload()
    payload[field_name] = False

    with pytest.raises(ValidationError):
        PublicRegistrationRequest(**payload)


def test_public_registration_accepted_response_is_neutral() -> None:
    response = PublicRegistrationAcceptedResponse(
        status=PUBLIC_REGISTRATION_ACCEPTED_STATUS,
        message=PUBLIC_REGISTRATION_ACCEPTED_MESSAGE,
    )

    assert response.status == "accepted"
    assert "указанный адрес" in response.message
    assert "существует" not in response.message.lower()


def test_public_registration_constants_match_contract() -> None:
    assert PUBLIC_REGISTRATION_LEARNER_ROLE_CODE == "learner_fl"
    assert (
        PUBLIC_REGISTRATION_PROFILE_SOURCE
        == "public_registration"
    )
    assert (
        PUBLIC_REGISTRATION_PERSONAL_DATA_BASIS
        == "public_registration"
    )


def test_public_registration_normalizes_identity_data() -> None:
    data = normalize_public_registration_data(
        last_name="  Иванов  ",
        first_name=" Иван ",
        middle_name="  Иванович ",
        email="  USER@Example.COM ",
        phone="8 (999) 000-00-00",
    )

    assert data.last_name == "Иванов"
    assert data.first_name == "Иван"
    assert data.middle_name == "Иванович"
    assert data.full_name == "Иванов Иван Иванович"
    assert data.email == "user@example.com"
    assert data.phone == "+79990000000"


def test_public_registration_normalizes_optional_values() -> None:
    assert normalize_public_registration_name("   ") is None
    assert normalize_public_registration_name(None) is None
    assert normalize_public_registration_phone("   ") is None
    assert normalize_public_registration_phone(None) is None


def test_public_registration_email_normalization_is_stable() -> None:
    assert (
        normalize_public_registration_email(
            "  Learner@MAIL.RU "
        )
        == "learner@mail.ru"
    )


def test_public_registration_rejects_blank_required_name() -> None:
    with pytest.raises(
        ValueError,
        match="last_name must not be blank",
    ):
        normalize_public_registration_data(
            last_name="   ",
            first_name="Иван",
            middle_name=None,
            email="ivan@example.com",
            phone=None,
        )