"""Opt-in lock ordering primitive for *future* registry new-action boundaries.

NOT WIRED into approval, attempts, batch creation or production. A lockset
does not authorize submission: caller must separately validate permissions,
readiness, fresh canonical applicability, approvals and historical policy.
Source writers do not yet participate in these fences in production. The
separate opt-in source-writer helper below only coordinates participating callers
and CANNOT guarantee commit-time freshness. Do not activate a global gate.

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


def normalize_registry_source_fences(
    *,
    source_fences: tuple[RegistrySourceFence, ...],
) -> tuple[str, ...]:
    """One canonical namespace/order for future readers AND source writers."""
    if not source_fences:
        raise RegistryActionLockError("registry.lockset_empty")
    source_keys: set[str] = set()
    for source in source_fences:
        if not isinstance(source, RegistrySourceFence) or source.kind not in _SOURCE_KINDS:
            raise RegistryActionLockError("registry.lockset_invalid_source")
        resource_id = _canonical_uuid(source.resource_id)
        source_keys.add("registry-source:v1:" + source.kind + ":" + resource_id)
    return tuple(sorted(source_keys))


def normalize_registry_lockset(
    *,
    source_fences: tuple[RegistrySourceFence, ...],
    obligation_targets: tuple[RegistryObligationTarget, ...],
) -> tuple[tuple[str, ...], tuple[str, ...], tuple[RegistryObligationTarget, ...]]:
    """Validate and sort all keys BEFORE any lock is taken."""
    if not source_fences or not obligation_targets:
        raise RegistryActionLockError("registry.lockset_empty")
    source_keys = normalize_registry_source_fences(source_fences=source_fences)
    enrollment_fences = {
        source.resource_id for source in source_fences
        if source.kind == "enrollment"
    }

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
        source_keys,
        decision_keys,
        tuple(sorted(targets, key=lambda target: target.obligation_id)),
    )


async def _assert_read_committed(session: AsyncSession) -> None:
    level = str(
        (await session.execute(text("SHOW transaction_isolation"))).scalar_one()
    ).strip().lower().replace("_", " ")
    if level != "read committed":
        raise RegistryActionLockError("registry.lockset_requires_read_committed")


async def _acquire_advisory_keys(
    *, session: AsyncSession, keys: tuple[str, ...],
) -> None:
    # One SELECT per key: IN/ORDER BY does not enforce lock order.
    for key in keys:
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": key},
        )


async def acquire_registry_source_write_fences(
    *, session: AsyncSession, source_fences: tuple[RegistrySourceFence, ...],
) -> tuple[str, ...]:
    """Dormant cooperating source-writer primitive; never grants eligibility.

    Call before ANY source or obligation row locks or writes. Caller owns a
    READ COMMITTED transaction and its commit/rollback. Inserting a child must
    fence its parent, including when the child does not yet exist.

    Do NOT partially wire into production: other source/approval/batch paths
    currently take conflicting lock orders. The protocol must be reviewed and
    adopted consistently across all writers before new-action API activation.
    """
    if not session.in_transaction():
        raise RegistryActionLockError("registry.lockset_transaction_required")
    keys = normalize_registry_source_fences(source_fences=source_fences)
    await _assert_read_committed(session)
    await _acquire_advisory_keys(session=session, keys=keys)
    return keys


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
    await _assert_read_committed(session)

    # Source keys precede writer-compatible decision keys, then row locks.
    await _acquire_advisory_keys(session=session, keys=sources + decision_keys)

    return await _lock_registry_obligations(session=session, targets=targets)


async def _lock_registry_obligations(
    *, session: AsyncSession, targets: tuple[RegistryObligationTarget, ...],
) -> tuple[RegistryObligation, ...]:
    """Shared last phase; callers must already hold source/decision fences."""

    locked: list[RegistryObligation] = []
    for target in sorted(targets, key=lambda item: item.obligation_id):
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
