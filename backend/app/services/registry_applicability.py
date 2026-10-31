"""Registry applicability contract, separate from submission workflow.

This module intentionally performs no database writes and preserves the
existing legacy decision engine. A needs_review decision does not permit
approval or export. Future persistence/API work will enforce that invariant.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.services.compliance_registry_contract import (
    APPLICABILITY_NEEDS_REVIEW,
    APPLICABILITY_NOT_REQUIRED,
    APPLICABILITY_REQUIRED,
    APPLICABILITY_STATUSES,
    REGISTRY_CODES,
)
from app.services.compliance_registry_rules import (
    DECISION_NOT_REQUIRED,
    DECISION_REQUIRED,
    DECISION_UNDETERMINED,
    RegistryRequirementDecision,
    evaluate_course_registry_requirements,
)

_LEGACY_DECISION_MAP = {
    DECISION_REQUIRED: APPLICABILITY_REQUIRED,
    DECISION_NOT_REQUIRED: APPLICABILITY_NOT_REQUIRED,
    DECISION_UNDETERMINED: APPLICABILITY_NEEDS_REVIEW,
}


@dataclass(frozen=True)
class RegistryApplicability:
    registry: str
    status: str
    rule_code: str
    rule_version: str
    reason: str

    def __post_init__(self) -> None:
        if self.registry not in REGISTRY_CODES:
            raise ValueError("Unsupported registry: " + self.registry)
        if self.status not in APPLICABILITY_STATUSES:
            raise ValueError("Unsupported registry applicability: " + self.status)

    @property
    def allows_submission(self) -> bool:
        return self.status == APPLICABILITY_REQUIRED


def from_requirement_decision(
    decision: RegistryRequirementDecision,
) -> RegistryApplicability:
    try:
        status = _LEGACY_DECISION_MAP[decision.decision]
    except KeyError as exc:
        raise ValueError(
            "Unsupported registry requirement decision: " + str(decision.decision)
        ) from exc

    return RegistryApplicability(
        registry=decision.registry,
        status=status,
        rule_code=decision.rule_code,
        rule_version=decision.rule_version,
        reason=decision.reason,
    )


def evaluate_course_registry_applicability(
    *,
    regulatory_program_type: str,
    frdo_requirement_mode: str,
    mintrud_requirement_mode: str,
) -> dict[str, RegistryApplicability]:
    """Pure evaluation; no obligation is created or reclassified here."""
    decisions = evaluate_course_registry_requirements(
        regulatory_program_type=regulatory_program_type,
        frdo_requirement_mode=frdo_requirement_mode,
        mintrud_requirement_mode=mintrud_requirement_mode,
    )
    return {
        registry: from_requirement_decision(decision)
        for registry, decision in decisions.items()
    }
