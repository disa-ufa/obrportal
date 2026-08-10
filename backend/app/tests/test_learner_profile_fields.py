from app.services.learner_profile_fields import (
    is_valid_learner_email,
    is_valid_learner_phone,
    is_valid_learner_snils,
    normalize_learner_email,
    normalize_learner_name,
    normalize_learner_phone,
    normalize_learner_snils,
)


def test_learner_identity_normalizers() -> None:
    assert normalize_learner_name("  Иван   Иванов  ") == "Иван Иванов"
    assert normalize_learner_name("   ") is None

    assert (
        normalize_learner_email(" USER@EXAMPLE.COM ")
        == "user@example.com"
    )
    assert normalize_learner_email("  ") is None

    assert (
        normalize_learner_phone("8 (999) 111-22-33")
        == "+79991112233"
    )
    assert (
        normalize_learner_phone("+49 151 12345678")
        == "+4915112345678"
    )

    assert (
        normalize_learner_snils("12345678901")
        == "123-456-789 01"
    )
    assert normalize_learner_snils("   ") is None


def test_learner_identity_format_validators() -> None:
    assert is_valid_learner_email("user@example.com")
    assert not is_valid_learner_email("not-an-email")

    assert is_valid_learner_phone("+79991112233")
    assert is_valid_learner_phone("9991112233")
    assert not is_valid_learner_phone("abc")

    # Official algorithm example: the control number is 95.
    assert is_valid_learner_snils("112-233-445 95")
    assert not is_valid_learner_snils("112-233-445 94")

    # Historical numbers at or below 001-001-998 do not
    # require control-number verification.
    assert is_valid_learner_snils("001-001-998 00")

    assert not is_valid_learner_snils("123-456-789 01")
    assert not is_valid_learner_snils("123")
