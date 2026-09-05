from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_readiness import (
    evaluate_registry_readiness,
)


def completed_enrollment(
    *,
    enrollment_id: str = "enrollment-1",
):
    return SimpleNamespace(
        id=enrollment_id,
        status="completed",
        completed_at=datetime.now(
            timezone.utc
        ),
    )


def course():
    return SimpleNamespace(
        title="???????????? ???????? ????",
    )


def learner():
    return SimpleNamespace(
        id="learner-1",
        full_name="?????? ???? ????????",
    )


def profile(**overrides):
    values = {
        "last_name": "??????",
        "first_name": "????",
        "middle_name": "????????",
        "birth_date": date(
            1990,
            1,
            2,
        ),
        "sex": "male",
        "citizenship_country_code": "643",
        "snils": None,
    }

    values.update(overrides)

    return SimpleNamespace(
        **values
    )


def document(
    *,
    enrollment_id: str = "enrollment-1",
    status: str = "draft",
    revoked_at=None,
):
    return SimpleNamespace(
        enrollment_id=enrollment_id,
        document_number="AUTO-TEST-001",
        document_type="?????????????",
        title="????????",
        status=status,
        revoked_at=revoked_at,
        storage_path="documents/test.pdf",
    )


def mintrud_context(**overrides):
    values = {
        "reporting_scenario": (
            "external_training_provider"
        ),
        "profession_or_position": "engineer",
        "employer_name": "Employer LLC",
        "employer_inn": "0274000000",
        "knowledge_check_result": "satisfactory",
        "knowledge_check_date": date(
            2026,
            9,
            5,
        ),
        "protocol_number": "OT-2026-001",
    }

    values.update(overrides)

    return SimpleNamespace(
        **values
    )


def test_frdo_is_ready_with_minimum_supported_data() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils=None,
        ),
        document=document(
            status="draft",
        ),
        organization=None,
    )

    assert result.is_ready is True
    assert result.issues == ()
    assert result.error_codes == ()
    assert result.as_error_payload() == []


def test_frdo_does_not_require_snils_when_absent() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils=None,
        ),
        document=document(),
    )

    assert result.is_ready is True
    assert (
        "learner_profile.snils_missing"
        not in result.error_codes
    )


def test_frdo_document_publication_status_is_separate() -> None:
    draft = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(),
        document=document(
            status="draft",
        ),
    )

    available = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(),
        document=document(
            status="available",
        ),
    )

    assert draft.is_ready is True
    assert available.is_ready is True


def test_frdo_missing_profile_blocks_readiness() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=None,
        document=document(),
    )

    assert result.is_ready is False
    assert (
        "learner_profile.missing"
        in result.error_codes
    )


@pytest.mark.parametrize(
    ("overrides", "expected_code"),
    [
        (
            {"last_name": None},
            "learner_profile.last_name_missing",
        ),
        (
            {"first_name": "   "},
            "learner_profile.first_name_missing",
        ),
        (
            {"birth_date": None},
            "learner_profile.birth_date_missing",
        ),
        (
            {"sex": None},
            "learner_profile.sex_missing",
        ),
        (
            {"sex": "unknown"},
            "learner_profile.sex_invalid",
        ),
        (
            {"citizenship_country_code": None},
            (
                "learner_profile."
                "citizenship_country_code_missing"
            ),
        ),
        (
            {"citizenship_country_code": "RUS"},
            (
                "learner_profile."
                "citizenship_country_code_invalid"
            ),
        ),
        (
            {"citizenship_country_code": "64"},
            (
                "learner_profile."
                "citizenship_country_code_invalid"
            ),
        ),
    ],
)
def test_frdo_identity_gaps_are_explicit(
    overrides,
    expected_code,
) -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            **overrides
        ),
        document=document(),
    )

    assert result.is_ready is False
    assert expected_code in result.error_codes


def test_frdo_rejects_document_from_other_enrollment() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(),
        document=document(
            enrollment_id="different-enrollment",
        ),
    )

    assert result.is_ready is False
    assert (
        "document.enrollment_mismatch"
        in result.error_codes
    )


def test_frdo_revoked_document_blocks_readiness() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(),
        document=document(
            revoked_at=datetime.now(
                timezone.utc
            ),
        ),
    )

    assert result.is_ready is False
    assert "document.revoked" in result.error_codes


def test_incomplete_enrollment_blocks_frdo_readiness() -> None:
    enrollment = completed_enrollment()
    enrollment.status = "active"
    enrollment.completed_at = None

    result = evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=enrollment,
        course=course(),
        learner=learner(),
        learner_profile=profile(),
        document=document(),
    )

    assert result.is_ready is False
    assert (
        "enrollment.not_completed"
        in result.error_codes
    )
    assert (
        "enrollment.completed_at_missing"
        in result.error_codes
    )


def test_mintrud_external_provider_is_ready_with_complete_data() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils="112-233-445 95",
        ),
        mintrud_context=mintrud_context(),
    )

    assert result.is_ready is True
    assert result.error_codes == ()


def test_mintrud_employer_self_training_does_not_require_employer_fields() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils="112-233-445 95",
        ),
        mintrud_context=mintrud_context(
            reporting_scenario=(
                "employer_self_training"
            ),
            employer_name=None,
            employer_inn=None,
        ),
    )

    assert result.is_ready is True
    assert result.error_codes == ()


def test_mintrud_missing_context_blocks_readiness() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils="112-233-445 95",
        ),
        mintrud_context=None,
    )

    assert result.is_ready is False
    assert (
        "mintrud.context_missing"
        in result.error_codes
    )


def test_mintrud_missing_profile_is_reported_with_complete_context() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=None,
        mintrud_context=mintrud_context(),
    )

    assert result.is_ready is False

    assert (
        "learner_profile.missing"
        in result.error_codes
    )

    assert (
        "mintrud.context_missing"
        not in result.error_codes
    )


@pytest.mark.parametrize(
    ("profile_overrides", "expected_code"),
    [
        (
            {"last_name": None},
            "learner_profile.last_name_missing",
        ),
        (
            {"first_name": None},
            "learner_profile.first_name_missing",
        ),
        (
            {"snils": None},
            "learner_profile.snils_missing",
        ),
    ],
)
def test_mintrud_identity_gaps_are_explicit(
    profile_overrides,
    expected_code,
) -> None:
    values = {
        "snils": "112-233-445 95",
    }

    values.update(
        profile_overrides
    )

    learner_profile = profile(
        **values
    )

    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=learner_profile,
        mintrud_context=mintrud_context(),
    )

    assert result.is_ready is False

    assert (
        expected_code
        in result.error_codes
    )


@pytest.mark.parametrize(
    ("context_overrides", "expected_code"),
    [
        (
            {
                "reporting_scenario": None,
            },
            "mintrud.reporting_scenario_missing",
        ),
        (
            {
                "reporting_scenario": "unknown",
            },
            "mintrud.reporting_scenario_invalid",
        ),
        (
            {
                "profession_or_position": None,
            },
            (
                "mintrud."
                "profession_or_position_missing"
            ),
        ),
        (
            {
                "knowledge_check_result": None,
            },
            (
                "mintrud."
                "knowledge_check_result_missing"
            ),
        ),
        (
            {
                "knowledge_check_result": "passed",
            },
            (
                "mintrud."
                "knowledge_check_result_invalid"
            ),
        ),
        (
            {
                "knowledge_check_date": None,
            },
            (
                "mintrud."
                "knowledge_check_date_missing"
            ),
        ),
        (
            {
                "protocol_number": None,
            },
            "mintrud.protocol_number_missing",
        ),
    ],
)
def test_mintrud_context_gaps_are_explicit(
    context_overrides,
    expected_code,
) -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils="112-233-445 95",
        ),
        mintrud_context=mintrud_context(
            **context_overrides
        ),
    )

    assert result.is_ready is False

    assert (
        expected_code
        in result.error_codes
    )


@pytest.mark.parametrize(
    ("context_overrides", "expected_code"),
    [
        (
            {
                "employer_name": None,
            },
            "mintrud.employer_name_missing",
        ),
        (
            {
                "employer_inn": None,
            },
            "mintrud.employer_inn_missing",
        ),
    ],
)
def test_mintrud_external_provider_requires_sending_employer(
    context_overrides,
    expected_code,
) -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils="112-233-445 95",
        ),
        mintrud_context=mintrud_context(
            **context_overrides
        ),
    )

    assert result.is_ready is False

    assert (
        expected_code
        in result.error_codes
    )


def test_organization_is_not_inferred_as_mintrud_employer() -> None:
    result = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=completed_enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(
            snils="112-233-445 95",
        ),
        organization=SimpleNamespace(
            name="Learning organization",
            inn="0274999999",
        ),
        mintrud_context=mintrud_context(
            employer_name=None,
            employer_inn=None,
        ),
    )

    assert result.is_ready is False

    assert (
        "mintrud.employer_name_missing"
        in result.error_codes
    )

    assert (
        "mintrud.employer_inn_missing"
        in result.error_codes
    )



def test_unknown_registry_is_rejected() -> None:
    with pytest.raises(
        ValueError,
        match="Unsupported registry",
    ):
        evaluate_registry_readiness(
            registry="unknown",
            enrollment=completed_enrollment(),
            course=course(),
            learner=learner(),
            learner_profile=profile(),
            document=document(),
        )
