import pytest

from app.services.compliance_registry_contract import (
    APPLICABILITY_NEEDS_REVIEW,
    APPLICABILITY_NOT_REQUIRED,
    APPLICABILITY_REQUIRED,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_rules import RegistryRequirementDecision
from app.services.registry_applicability import (
    RegistryApplicability,
    evaluate_course_registry_applicability,
    from_requirement_decision,
)


def test_occupational_safety_does_not_silently_exclude_frdo():
    result = evaluate_course_registry_applicability(
        regulatory_program_type="occupational_safety_training",
        frdo_requirement_mode="auto",
        mintrud_requirement_mode="auto",
    )
    assert result[REGISTRY_FRDO].status == APPLICABILITY_NEEDS_REVIEW
    assert not result[REGISTRY_FRDO].allows_submission
    assert result[REGISTRY_MINTRUD].status == APPLICABILITY_REQUIRED
    assert result[REGISTRY_MINTRUD].allows_submission


def test_explicit_exclusion_cannot_be_submitted():
    result = evaluate_course_registry_applicability(
        regulatory_program_type="occupational_safety_training",
        frdo_requirement_mode="not_required",
        mintrud_requirement_mode="auto",
    )
    assert result[REGISTRY_FRDO].status == APPLICABILITY_NOT_REQUIRED
    assert not result[REGISTRY_FRDO].allows_submission


def test_professional_training_is_frdo_required():
    result = evaluate_course_registry_applicability(
        regulatory_program_type="dpo_advanced_training",
        frdo_requirement_mode="auto",
        mintrud_requirement_mode="auto",
    )
    assert result[REGISTRY_FRDO].allows_submission
    assert not result[REGISTRY_MINTRUD].allows_submission


@pytest.mark.parametrize("registry", ["", "other"])
def test_invalid_registry_rejected(registry):
    with pytest.raises(ValueError, match="Unsupported registry"):
        RegistryApplicability(registry, APPLICABILITY_REQUIRED, "rule", "v1", "reason")


@pytest.mark.parametrize("decision", ["", "invalid"])
def test_invalid_legacy_decision_rejected(decision):
    with pytest.raises(ValueError, match="Unsupported registry requirement decision"):
        from_requirement_decision(
            RegistryRequirementDecision(REGISTRY_FRDO, decision, "rule", "v1", "reason")
        )
