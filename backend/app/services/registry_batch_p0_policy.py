"""Release 1.0 P0: pure batch applicability policy.

NOT an authorization boundary.
Consumed by the transaction-scoped batch creation boundary.
The caller must first establish a coordinated, fresh,
transaction-scoped C -> S -> D -> O lock protocol.

This component performs no SQL, filesystem writes or commits.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.services.registry_applicability_export_guard import (
    ApplicabilityGrant,
    RegistryApplicabilityGateError,
    validate_registry_applicability_gate,
)


@dataclass(frozen=True)
class BatchApplicabilityInput:
    obligation: object
    decision: object | None
    current: object


def require_current_registry_batch_applicability(
    *,
    registry: str,
    entries: Sequence[BatchApplicabilityInput],
) -> tuple[ApplicabilityGrant, ...]:
    """Fail closed for the complete batch; return no partial grants.

    Only evaluates already acquired transaction-local evidence.
    Does not guarantee the freshness or lock ownership of inputs.
    """

    if registry not in {"frdo", "mintrud"}:
        raise RegistryApplicabilityGateError(
            "registry.batch_unsupported_registry"
        )

    if not entries:
        raise RegistryApplicabilityGateError(
            "registry.batch_empty"
        )

    seen: set[str] = set()
    grants: list[ApplicabilityGrant] = []

    for entry in entries:
        if not isinstance(entry, BatchApplicabilityInput):
            raise RegistryApplicabilityGateError(
                "registry.batch_invalid_evidence"
            )

        obligation = entry.obligation
        decision = entry.decision
        current = entry.current

        if (
            obligation is None
            or current is None
            or not hasattr(current, "evaluation")
            or not hasattr(current, "fingerprint")
        ):
            raise RegistryApplicabilityGateError(
                "registry.batch_incomplete_evidence"
            )

        if getattr(obligation, "registry", None) != registry:
            raise RegistryApplicabilityGateError(
                "registry.batch_mixed_registry"
            )

        obligation_id = str(
            getattr(obligation, "id", "") or ""
        )

        if not obligation_id:
            raise RegistryApplicabilityGateError(
                "registry.batch_missing_obligation_id"
            )

        if obligation_id in seen:
            raise RegistryApplicabilityGateError(
                "registry.batch_duplicate_obligation"
            )

        seen.add(obligation_id)

        # Current automatic rules must still require reporting.
        # Manual overrides need a separately reviewed authority
        # and historical reconciliation policy.
        if (
            getattr(current.evaluation, "status", None)
            != "required"
        ):
            raise RegistryApplicabilityGateError(
                "registry.current_rule_not_required"
            )

        if (
            decision is not None
            and getattr(decision, "source", None) == "manual"
        ):
            raise RegistryApplicabilityGateError(
                "registry.manual_authority_not_reviewed"
            )

        grant = validate_registry_applicability_gate(
            obligation=obligation,
            applicability=decision,
            expected_input_fingerprint=current.fingerprint,
        )

        # A matching digest must not hide inconsistent rule provenance.
        if (getattr(decision, "rule_code", None) != getattr(current.evaluation, "rule_code", None)
                or getattr(decision, "rule_version", None) != getattr(current.evaluation, "rule_version", None)):
            raise RegistryApplicabilityGateError("registry.applicability_rule_mismatch")
        grants.append(grant)

    return tuple(grants)