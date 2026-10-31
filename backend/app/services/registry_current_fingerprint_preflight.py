"""Dormant, lock-scoped applicability fingerprint preflight.

Not an approval/export permission. The caller must own a fresh READ COMMITTED
transaction; source writers must eventually share all the same source fences.
RBAC, readiness, approval and historic continuation are NOT checked here.
Never wire this directly into production mutation routes.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_action_scope import acquire_discovered_registry_action_scope
from app.services.registry_applicability_db_inputs import (
    CurrentRegistryApplicabilityInputs,
    load_current_registry_applicability_inputs,
)
from app.services.registry_applicability_export_guard import (
    RegistryApplicabilityGateError,
    require_registry_applicability_for_submission,
)


@dataclass(frozen=True)
class RegistryFingerprintPreflight:
    """Diagnostic evidence, NOT reusable authorization for any future write."""
    registry: str
    obligation_id: str
    decision_version: int
    current_fingerprint: str
    inputs: CurrentRegistryApplicabilityInputs


async def preflight_current_registry_fingerprint(
    *, session: AsyncSession, actor_id: str, registry: str, obligation_id: str,
) -> RegistryFingerprintPreflight:
    """Compare current canonical DB data with the persisted decision under locks.

    This is deliberately limited to one obligation; no batch partial grant is
    possible. All callers MUST roll back on any failure. A successful result
    must not be used as a token to authorize an API or an external submission.
    """
    locked, scope = await acquire_discovered_registry_action_scope(
        session=session,
        actor_id=actor_id,
        registry=registry,
        obligation_ids=(obligation_id,),
    )
    if len(locked) != 1 or len(scope.targets) != 1:
        raise RegistryActionLockError("registry.fingerprint_scope_invalid")
    obligation = locked[0]
    try:
        current = await load_current_registry_applicability_inputs(
            session=session, obligation=obligation,
        )
    except (ValueError, TypeError) as exc:
        raise RegistryApplicabilityGateError("registry.current_inputs_invalid") from exc

    # A new-action preflight cannot infer 'required' from an existing legacy
    # obligation. Current automatic evaluation must agree with the persisted
    # required decision; reviewed manual required decisions may differ but
    # still require provenance and the exact current canonical fingerprint.
    grant = await require_registry_applicability_for_submission(
        session=session, obligation=obligation,
        expected_input_fingerprint=current.fingerprint,
    )
    if current.evaluation.status != "required":
        # A manual decision is deliberately NOT treated as automatically
        # equivalent to the rules, even when its current fingerprint matches:
        # the eventual boundary must establish manual override authority.
        raise RegistryApplicabilityGateError("registry.current_rule_not_required")
    return RegistryFingerprintPreflight(
        registry=registry,
        obligation_id=obligation_id,
        decision_version=grant.decision_version,
        current_fingerprint=current.fingerprint,
        inputs=current,
    )
