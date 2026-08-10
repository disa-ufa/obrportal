from app.core.config import Settings
from app.schemas.auth import PublicRegistrationStatusResponse


def test_public_registration_flag_defaults_disabled() -> None:
    field = Settings.model_fields["public_registration_enabled"]

    assert field.default is False


def test_public_registration_flag_accepts_primary_alias(
    monkeypatch,
) -> None:
    monkeypatch.delenv(
        "PUBLIC_REGISTRATION_ENABLED",
        raising=False,
    )
    monkeypatch.delenv(
        "OBRPORTAL_PUBLIC_REGISTRATION_ENABLED",
        raising=False,
    )

    configured = Settings(
        _env_file=None,
        PUBLIC_REGISTRATION_ENABLED=True,
    )

    assert configured.public_registration_enabled is True


def test_public_registration_flag_accepts_prefixed_alias(
    monkeypatch,
) -> None:
    monkeypatch.delenv(
        "PUBLIC_REGISTRATION_ENABLED",
        raising=False,
    )
    monkeypatch.delenv(
        "OBRPORTAL_PUBLIC_REGISTRATION_ENABLED",
        raising=False,
    )

    configured = Settings(
        _env_file=None,
        OBRPORTAL_PUBLIC_REGISTRATION_ENABLED=True,
    )

    assert configured.public_registration_enabled is True


def test_public_registration_status_response_exposes_only_flag() -> None:
    response = PublicRegistrationStatusResponse(enabled=False)

    assert response.model_dump() == {"enabled": False}