"""Fail-closed policy contract for future registry new-action integration.

Pure validation only. It does not read or lock database rows, write data,
authorize an API operation or guarantee transactional freshness.

Do not wire into live approval/export before coordinated source-writer
locking, historical reconciliation and transaction boundaries are ready.
"""

from __future__ import annotations

from hmac import compare_digest

from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_contract import APPLICABILITY_REQUIRED
from app.services.registry_applicability_db_inputs import (
    CurrentRegistryApplicabilityInputs,
)
from app.services.registry_applicability_export_guard import (
    ApplicabilityGrant,
    RegistryApplicabilityGateError,
    validate_registry_applicability_gate,
)
from app.services.registry_applicability_fingerprint import (
    fingerprint_applicability_inputs,
)


def validate_registry_new_action_policy(
    *,
    obligation: RegistryObligation,
    applicability: RegistryApplicabilityRecord | None,
    current: CurrentRegistryApplicabilityInputs,
) -> ApplicabilityGrant:
    """Validate an already acquired authoritative snapshot.

    A successful result is only one precondition. The caller must separately
    enforce permissions, readiness, lifecycle, approval validity and locks.
    """

    if (
        current.evaluation.registry != obligation.registry
        or current.inputs.registry != obligation.registry
        or current.inputs.enrollment_id != obligation.enrollment_id
    ):
        raise RegistryApplicabilityGateError(
            "registry.current_scope_mismatch"
        )

    if current.evaluation.status != APPLICABILITY_REQUIRED:
        raise RegistryApplicabilityGateError(
            "registry.current_applicability_"
            + current.evaluation.status
        )

    if (
        current.inputs.rule_code != current.evaluation.rule_code
        or current.inputs.rule_version != current.evaluation.rule_version
    ):
        raise RegistryApplicabilityGateError(
            "registry.current_rule_mismatch"
        )

    try:
        calculated = fingerprint_applicability_inputs(
            current.inputs
        )
    except (ValueError, TypeError) as exc:
        raise RegistryApplicabilityGateError(
            "registry.current_snapshot_invalid"
        ) from exc

    if (
        not isinstance(current.fingerprint, str)
        or not compare_digest(current.fingerprint, calculated)
    ):
        raise RegistryApplicabilityGateError(
            "registry.current_snapshot_mismatch"
        )

    if (
        applicability is not None
        and applicability.decision == APPLICABILITY_REQUIRED
        and (
            applicability.rule_code != current.evaluation.rule_code
            or applicability.rule_version != current.evaluation.rule_version
        )
    ):
        raise RegistryApplicabilityGateError(
            "registry.stored_rule_stale"
        )

    return validate_registry_applicability_gate(
        obligation=obligation,
        applicability=applicability,
        expected_input_fingerprint=current.fingerprint,
    )