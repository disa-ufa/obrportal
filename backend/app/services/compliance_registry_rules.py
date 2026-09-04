from __future__ import annotations

from dataclasses import dataclass

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
    REQUIREMENT_MODE_AUTO,
    REQUIREMENT_MODE_NOT_REQUIRED,
    REQUIREMENT_MODE_REQUIRED,
)


RULE_VERSION = "2026-09-04-v1"

DECISION_REQUIRED = "required"
DECISION_NOT_REQUIRED = "not_required"
DECISION_UNDETERMINED = "undetermined"

DECISIONS = {
    DECISION_REQUIRED,
    DECISION_NOT_REQUIRED,
    DECISION_UNDETERMINED,
}


@dataclass(frozen=True)
class RegistryRequirementDecision:
    registry: str
    decision: str
    rule_code: str
    rule_version: str
    reason: str

    @property
    def required(self) -> bool | None:
        if self.decision == DECISION_REQUIRED:
            return True

        if self.decision == DECISION_NOT_REQUIRED:
            return False

        return None


def _explicit_requirement_decision(
    *,
    registry: str,
    requirement_mode: str,
) -> RegistryRequirementDecision | None:
    if requirement_mode == REQUIREMENT_MODE_REQUIRED:
        return RegistryRequirementDecision(
            registry=registry,
            decision=DECISION_REQUIRED,
            rule_code=f"{registry}.override.required",
            rule_version=RULE_VERSION,
            reason=(
                "Registry reporting was explicitly marked "
                "as required for this course."
            ),
        )

    if requirement_mode == REQUIREMENT_MODE_NOT_REQUIRED:
        return RegistryRequirementDecision(
            registry=registry,
            decision=DECISION_NOT_REQUIRED,
            rule_code=f"{registry}.override.not_required",
            rule_version=RULE_VERSION,
            reason=(
                "Registry reporting was explicitly marked "
                "as not required for this course."
            ),
        )

    if requirement_mode != REQUIREMENT_MODE_AUTO:
        raise ValueError(
            "Unsupported registry requirement mode: "
            + requirement_mode
        )

    return None


def evaluate_frdo_requirement(
    *,
    regulatory_program_type: str,
    requirement_mode: str,
) -> RegistryRequirementDecision:
    explicit = _explicit_requirement_decision(
        registry=REGISTRY_FRDO,
        requirement_mode=requirement_mode,
    )

    if explicit is not None:
        return explicit

    if regulatory_program_type in {
        "dpo_advanced_training",
        "dpo_professional_retraining",
        "vocational_training",
    }:
        return RegistryRequirementDecision(
            registry=REGISTRY_FRDO,
            decision=DECISION_REQUIRED,
            rule_code=(
                "frdo.auto.professional_program"
            ),
            rule_version=RULE_VERSION,
            reason=(
                "The course is classified as a professional "
                "education or vocational training program "
                "covered by the current FRDO auto rule."
            ),
        )

    return RegistryRequirementDecision(
        registry=REGISTRY_FRDO,
        decision=DECISION_UNDETERMINED,
        rule_code="frdo.auto.manual_review",
        rule_version=RULE_VERSION,
        reason=(
            "The course classification alone is not sufficient "
            "for an automatic FRDO requirement decision."
        ),
    )


def evaluate_mintrud_requirement(
    *,
    regulatory_program_type: str,
    requirement_mode: str,
) -> RegistryRequirementDecision:
    explicit = _explicit_requirement_decision(
        registry=REGISTRY_MINTRUD,
        requirement_mode=requirement_mode,
    )

    if explicit is not None:
        return explicit

    if regulatory_program_type == "occupational_safety_training":
        return RegistryRequirementDecision(
            registry=REGISTRY_MINTRUD,
            decision=DECISION_REQUIRED,
            rule_code=(
                "mintrud.auto.occupational_safety_training"
            ),
            rule_version=RULE_VERSION,
            reason=(
                "The course is classified as occupational "
                "safety training."
            ),
        )

    if regulatory_program_type == "unspecified":
        return RegistryRequirementDecision(
            registry=REGISTRY_MINTRUD,
            decision=DECISION_UNDETERMINED,
            rule_code="mintrud.auto.classification_required",
            rule_version=RULE_VERSION,
            reason=(
                "The regulatory program type must be classified "
                "before Mintrud reporting can be determined."
            ),
        )

    return RegistryRequirementDecision(
        registry=REGISTRY_MINTRUD,
        decision=DECISION_NOT_REQUIRED,
        rule_code="mintrud.auto.non_occupational_safety",
        rule_version=RULE_VERSION,
        reason=(
            "The course is not classified as occupational "
            "safety training."
        ),
    )


def evaluate_course_registry_requirements(
    *,
    regulatory_program_type: str,
    frdo_requirement_mode: str,
    mintrud_requirement_mode: str,
) -> dict[str, RegistryRequirementDecision]:
    return {
        REGISTRY_FRDO: evaluate_frdo_requirement(
            regulatory_program_type=regulatory_program_type,
            requirement_mode=frdo_requirement_mode,
        ),
        REGISTRY_MINTRUD: evaluate_mintrud_requirement(
            regulatory_program_type=regulatory_program_type,
            requirement_mode=mintrud_requirement_mode,
        ),
    }
