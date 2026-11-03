"""Read-only preliminary routing of historical registry obligations.

This is NOT an approval/export gate. It never changes obligation
statuses, persists decisions or authorizes registry operations.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.registry_applicability_reconciliation_cli import (
    recommend_handling,
)
from app.services.registry_applicability import (
    evaluate_course_registry_applicability,
)

FINAL_HISTORY_STATUSES = frozenset({
    "submitted",
    "accepted",
    "rejected",
    "correction_required",
})


@dataclass(frozen=True)
class RegistryQueueTriage:
    scope: str
    reason: str
    current_decision: str | None
    preview_only: bool = True


def classify_legacy_registry_queue(
    *,
    registry: str,
    status: str,
    legacy_rule_code: str,
    legacy_rule_version: str,
    program_type: str,
    frdo_mode: str,
    mintrud_mode: str,
    existing_decision: str = "",
    existing_source: str = "",
    protected_evidence: bool = False,
) -> RegistryQueueTriage:
    """Classify historical rows conservatively without granting actions."""

    if registry not in {"frdo", "mintrud"}:
        raise ValueError("Unsupported registry")

    try:
        current = evaluate_course_registry_applicability(
            regulatory_program_type=program_type,
            frdo_requirement_mode=frdo_mode,
            mintrud_requirement_mode=mintrud_mode,
        )[registry]

        handling = recommend_handling(
            registry=registry,
            status=status,
            legacy_rule_code=legacy_rule_code,
            legacy_rule_version=legacy_rule_version,
            program_type=program_type,
            frdo_mode=frdo_mode,
            mintrud_mode=mintrud_mode,
            existing_decision=existing_decision,
            existing_source=existing_source,
            protected_evidence=protected_evidence,
        )
    except (ValueError, KeyError, TypeError):
        return RegistryQueueTriage(
            scope="review",
            reason="manual_investigation",
            current_decision=None,
        )

    # Only completed lifecycle records are routed to historical display.
    # Prepared artifacts and older approvals still need supervised review.
    if (
        handling == "preserve_lifecycle_and_evidence"
        and status in FINAL_HISTORY_STATUSES
    ):
        scope = "history"
    else:
        # A legacy obligation, even one currently evaluated as required,
        # is NOT proof of an authorized applicability decision.
        scope = "review"

    return RegistryQueueTriage(
        scope=scope,
        reason=handling,
        current_decision=current.status,
    )