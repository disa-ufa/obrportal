import pytest

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_rules import (
    DECISION_NOT_REQUIRED,
    DECISION_REQUIRED,
    DECISION_UNDETERMINED,
    RULE_VERSION,
    evaluate_course_registry_requirements,
    evaluate_frdo_requirement,
    evaluate_mintrud_requirement,
)


@pytest.mark.parametrize(
    "program_type",
    [
        "dpo_advanced_training",
        "dpo_professional_retraining",
        "vocational_training",
    ],
)
def test_frdo_auto_requires_professional_programs(
    program_type: str,
) -> None:
    result = evaluate_frdo_requirement(
        regulatory_program_type=program_type,
        requirement_mode="auto",
    )

    assert result.registry == REGISTRY_FRDO
    assert result.decision == DECISION_REQUIRED
    assert result.required is True
    assert result.rule_version == RULE_VERSION
    assert result.rule_code == (
        "frdo.auto.professional_program"
    )


@pytest.mark.parametrize(
    "program_type",
    [
        "unspecified",
        "general_education",
        "additional_general_education",
        "occupational_safety_training",
        "other",
    ],
)
def test_frdo_auto_keeps_ambiguous_programs_for_review(
    program_type: str,
) -> None:
    result = evaluate_frdo_requirement(
        regulatory_program_type=program_type,
        requirement_mode="auto",
    )

    assert result.decision == DECISION_UNDETERMINED
    assert result.required is None
    assert result.rule_code == "frdo.auto.manual_review"


def test_mintrud_auto_requires_occupational_safety() -> None:
    result = evaluate_mintrud_requirement(
        regulatory_program_type=(
            "occupational_safety_training"
        ),
        requirement_mode="auto",
    )

    assert result.registry == REGISTRY_MINTRUD
    assert result.decision == DECISION_REQUIRED
    assert result.required is True
    assert result.rule_code == (
        "mintrud.auto.occupational_safety_training"
    )


def test_mintrud_auto_requires_classification_when_unspecified() -> None:
    result = evaluate_mintrud_requirement(
        regulatory_program_type="unspecified",
        requirement_mode="auto",
    )

    assert result.decision == DECISION_UNDETERMINED
    assert result.required is None
    assert result.rule_code == (
        "mintrud.auto.classification_required"
    )


@pytest.mark.parametrize(
    "program_type",
    [
        "general_education",
        "additional_general_education",
        "dpo_advanced_training",
        "dpo_professional_retraining",
        "vocational_training",
        "other",
    ],
)
def test_mintrud_auto_excludes_non_occupational_safety(
    program_type: str,
) -> None:
    result = evaluate_mintrud_requirement(
        regulatory_program_type=program_type,
        requirement_mode="auto",
    )

    assert result.decision == DECISION_NOT_REQUIRED
    assert result.required is False
    assert result.rule_code == (
        "mintrud.auto.non_occupational_safety"
    )


@pytest.mark.parametrize(
    ("mode", "expected"),
    [
        ("required", DECISION_REQUIRED),
        ("not_required", DECISION_NOT_REQUIRED),
    ],
)
def test_explicit_frdo_override_wins(
    mode: str,
    expected: str,
) -> None:
    result = evaluate_frdo_requirement(
        regulatory_program_type="other",
        requirement_mode=mode,
    )

    assert result.decision == expected


@pytest.mark.parametrize(
    ("mode", "expected"),
    [
        ("required", DECISION_REQUIRED),
        ("not_required", DECISION_NOT_REQUIRED),
    ],
)
def test_explicit_mintrud_override_wins(
    mode: str,
    expected: str,
) -> None:
    result = evaluate_mintrud_requirement(
        regulatory_program_type=(
            "occupational_safety_training"
        ),
        requirement_mode=mode,
    )

    assert result.decision == expected


def test_course_evaluation_returns_both_registries() -> None:
    result = evaluate_course_registry_requirements(
        regulatory_program_type=(
            "occupational_safety_training"
        ),
        frdo_requirement_mode="auto",
        mintrud_requirement_mode="auto",
    )

    assert set(result) == {
        REGISTRY_FRDO,
        REGISTRY_MINTRUD,
    }

    assert (
        result[REGISTRY_FRDO].decision
        == DECISION_UNDETERMINED
    )

    assert (
        result[REGISTRY_MINTRUD].decision
        == DECISION_REQUIRED
    )


@pytest.mark.parametrize(
    "mode",
    [
        "",
        "sometimes",
        "unknown",
    ],
)
def test_rules_reject_unknown_requirement_mode(
    mode: str,
) -> None:
    with pytest.raises(ValueError):
        evaluate_frdo_requirement(
            regulatory_program_type="other",
            requirement_mode=mode,
        )
