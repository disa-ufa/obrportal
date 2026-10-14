"""Opt-in lock ordering primitive for *future* registry new-action boundaries.

NOT WIRED into approval, attempts, batch creation or production. A lockset
does not authorize submission: caller must separately validate permissions,
readiness, fresh canonical applicability, approvals and historical policy.
Source writers do not yet participate in these fences; therefore this module
alone CANNOT guarantee commit-time freshness. Do not activate a global gate.

Caller owns a READ COMMITTED transaction and must NOT have pre-acquired later
row/advisory locks. The protocol is:

    source fences (sorted) -> decision keys (writer-compatible, sorted)
    -> obligation rows (sorted individually, refreshed).

A future coordinated rollout must make ALL source writers and other mutation
paths share source fences and the same global acquisition order.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import RegistryObligation

_REGISTRIES = frozenset({"frdo", "mintrud"})
_SOURCE_KINDS = frozenset({
    "actor", "course", "enrollment", "learner", "organization",
})


class RegistryActionLockError(ValueError):
    """Transaction precondition or discovered registry scope has changed."""


@dataclass(frozen=True)
class RegistrySourceFence:
    kind: str
    resource_id: str


@dataclass(frozen=True)
class RegistryObligationTarget:
    obligation_id: str
    enrollment_id: str
    registry: str


def _canonical_uuid(value: str) -> str:
    try:
        normalized = str(UUID(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise RegistryActionLockError("registry.lockset_invalid_uuid") from exc
    if not isinstance(value, str) or value != normalized:
        raise RegistryActionLockError("registry.lockset_noncanonical_uuid")
    return normalized


def normalize_registry_lockset(
    *,
    source_fences: tuple[RegistrySourceFence, ...],
    obligation_targets: tuple[RegistryObligationTarget, ...],
) -> tuple[tuple[str, ...], tuple[str, ...], tuple[RegistryObligationTarget, ...]]:
    """Validate and sort all keys BEFORE any lock is taken."""
    if not source_fences or not obligation_targets:
        raise RegistryActionLockError("registry.lockset_empty")

    source_keys: set[str] = set()
    enrollment_fences: set[str] = set()
    for source in source_fences:
        if not isinstance(source, RegistrySourceFence) or source.kind not in _SOURCE_KINDS:
            raise RegistryActionLockError("registry.lockset_invalid_source")
        resource_id = _canonical_uuid(source.resource_id)
        source_keys.add("registry-source:v1:" + source.kind + ":" + resource_id)
        if source.kind == "enrollment":
            enrollment_fences.add(resource_id)

    ids: set[str] = set()
    pairs: set[tuple[str, str]] = set()
    targets: list[RegistryObligationTarget] = []
    for target in obligation_targets:
        if not isinstance(target, RegistryObligationTarget):
            raise RegistryActionLockError("registry.lockset_invalid_target")
        obligation_id = _canonical_uuid(target.obligation_id)
        enrollment_id = _canonical_uuid(target.enrollment_id)
        if target.registry not in _REGISTRIES:
            raise RegistryActionLockError("registry.lockset_invalid_registry")
        if obligation_id in ids or (enrollment_id, target.registry) in pairs:
            raise RegistryActionLockError("registry.lockset_duplicate_target")
        if enrollment_id not in enrollment_fences:
            raise RegistryActionLockError("registry.lockset_missing_enrollment_fence")
        ids.add(obligation_id)
        pairs.add((enrollment_id, target.registry))
        targets.append(target)

    decision_keys = tuple(sorted(
        "registry-applicability:" + enrollment_id + ":" + registry
        for enrollment_id, registry in pairs
    ))
    return (
        tuple(sorted(source_keys)),
        decision_keys,
        tuple(sorted(targets, key=lambda target: target.obligation_id)),
    )


async def acquire_registry_new_action_lockset(
    *,
    session: AsyncSession,
    source_fences: tuple[RegistrySourceFence, ...],
    obligation_targets: tuple[RegistryObligationTarget, ...],
) -> tuple[RegistryObligation, ...]:
    """Acquire deterministically ordered locks without writing or committing.

    The returned rows are locked and refreshed but NOT approved for any action.
    All other source writers must adopt compatible fences BEFORE enabling it in
    mutation paths. Because missing source/context rows cannot be row-locked,
    enrollment fence keys are mandatory for all targets.
    """
    if not session.in_transaction():
        raise RegistryActionLockError("registry.lockset_transaction_required")

    sources, decision_keys, targets = normalize_registry_lockset(
        source_fences=source_fences,
        obligation_targets=obligation_targets,
    )
    level = str(
        (await session.execute(text("SHOW transaction_isolation"))).scalar_one()
    ).strip().lower().replace("_", " ")
    if level != "read committed":
        raise RegistryActionLockError("registry.lockset_requires_read_committed")

    # Stable order; each SELECT acquires one transaction-scoped lock.
    # Decision keys deliberately match the generic writer's existing keys.
    for key in sources + decision_keys:
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": key},
        )

    locked: list[RegistryObligation] = []
    for target in targets:
        obligation = await session.scalar(
            select(RegistryObligation)
            .where(RegistryObligation.id == target.obligation_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if obligation is None:
            raise RegistryActionLockError("registry.lockset_obligation_missing")
        if (
            obligation.enrollment_id != target.enrollment_id
            or obligation.registry != target.registry
        ):
            raise RegistryActionLockError("registry.lockset_scope_changed")
        locked.append(obligation)
    return tuple(locked)
