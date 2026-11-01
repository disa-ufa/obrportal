"""Shared C/S/D/O machinery for batch policy and read-only diagnostics.

The diagnostic wrapper requires a fresh session and returns only a count.
Live batch creation reuses the scoped checker under its exclusive-C request
owner, retaining the same transaction through artifact persistence and COMMIT.
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_applicability import RegistryApplicabilityRecord
from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_action_scope import discover_registry_action_scope
from app.services.registry_catalog_policy_fence import (
    begin_registry_catalog_policy_fence,
)
from app.services.registry_applicability_db_inputs import (
    load_current_registry_applicability_inputs,
)
from app.services.registry_applicability_export_guard import (
    RegistryApplicabilityGateError,
)
from app.services.registry_batch_p0_policy import (
    BatchApplicabilityInput,
    require_current_registry_batch_applicability,
)


def _canonical_id(value: str) -> str:
    if not isinstance(value, str):
        raise RegistryActionLockError("registry.batch_invalid_uuid")

    try:
        normalized = str(UUID(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise RegistryActionLockError(
            "registry.batch_invalid_uuid"
        ) from exc

    if normalized != value:
        raise RegistryActionLockError(
            "registry.batch_noncanonical_uuid"
        )

    return normalized


def _validate_request(
    registry: str,
    actor_id: str,
    obligation_ids: Sequence[str],
) -> tuple[str, tuple[str, ...]]:
    if registry not in {"frdo", "mintrud"}:
        raise RegistryActionLockError(
            "registry.batch_invalid_registry"
        )

    actor = _canonical_id(actor_id)

    if isinstance(obligation_ids, (str, bytes)):
        raise RegistryActionLockError(
            "registry.batch_invalid_selection"
        )

    ids = tuple(_canonical_id(item) for item in obligation_ids)

    if not ids:
        raise RegistryActionLockError(
            "registry.batch_empty_selection"
        )

    if len(ids) != len(set(ids)):
        raise RegistryActionLockError(
            "registry.batch_duplicate_target"
        )

    return actor, tuple(sorted(ids))


async def inspect_registry_batch_p0_scope(
    *,
    session: AsyncSession,
    registry: str,
    actor_id: str,
    obligation_ids: Sequence[str],
) -> int:
    """Inspect all obligations within one caller-owned transaction.

    This performs no commits or artifact writes.
    The returned count is diagnostic only, NOT an export grant.
    The caller must roll back, including on successful inspection.
    """

    actor, ids = _validate_request(
        registry, actor_id, obligation_ids
    )

    # MUST be first DB/lock operation on this fresh session.
    fence = await begin_registry_catalog_policy_fence(
        session=session,
        mode="shared",
    )

    return await require_registry_batch_p0_scope(
        session=session, fence=fence, registry=registry, actor_id=actor,
        obligation_ids=ids,
    )


async def require_registry_batch_p0_scope(
    *, session, fence, registry, actor_id, obligation_ids,
) -> int:
    """Validate under caller-owned C/S/D/O, retained through batch COMMIT.

    The diagnostic wrapper uses shared C. The production batch boundary requires
    exclusive C to exclude every coordinated factory source writer.
    """
    actor, ids = _validate_request(registry, actor_id, obligation_ids)
    fence.require_session(session, "shared")

    before = await discover_registry_action_scope(
        session=session,
        actor_id=actor,
        registry=registry,
        obligation_ids=ids,
    )

    locked = await fence.action_lockset(
        source_fences=before.source_fences,
        obligation_targets=before.targets,
    )

    after = await discover_registry_action_scope(
        session=session,
        actor_id=actor,
        registry=registry,
        obligation_ids=ids,
    )

    if before != after:
        raise RegistryActionLockError(
            "registry.batch_scope_changed_during_lock"
        )

    if (
        len(locked) != len(ids)
        or {str(item.id) for item in locked} != set(ids)
    ):
        raise RegistryActionLockError(
            "registry.batch_locked_scope_mismatch"
        )

    by_id = {str(item.id): item for item in locked}
    entries: list[BatchApplicabilityInput] = []

    for obligation_id in ids:
        obligation = by_id[obligation_id]

        if obligation.registry != registry:
            raise RegistryActionLockError(
                "registry.batch_locked_registry_mismatch"
            )

        current = await load_current_registry_applicability_inputs(
            session=session,
            obligation=obligation,
        )

        # Decision advisory key D was acquired before obligation O.
        # Read a refreshed row. No late decision row lock is added
        # in this diagnostic, since legacy writers are not coordinated.
        decision = await session.scalar(
            select(RegistryApplicabilityRecord)
            .where(
                RegistryApplicabilityRecord.enrollment_id
                == obligation.enrollment_id,
                RegistryApplicabilityRecord.registry
                == registry,
            )
            .execution_options(populate_existing=True)
        )

        entries.append(
            BatchApplicabilityInput(
                obligation=obligation,
                decision=decision,
                current=current,
            )
        )

    grants = require_current_registry_batch_applicability(
        registry=registry,
        entries=entries,
    )

    if len(grants) != len(ids):
        raise RegistryApplicabilityGateError(
            "registry.batch_incomplete_grants"
        )

    # Evidence is consumed in this transaction; no transferable grant escapes.
    return len(grants)