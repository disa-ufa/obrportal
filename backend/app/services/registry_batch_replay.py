"""Fail-closed guard for batch export of individual approval events.

The caller must acquire row locks on all obligations in a deterministic order,
validate each approval, then call this guard in the SAME transaction before
creating an artifact. These checks are complemented by the P1 unique index.
"""
from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import RegistrySubmissionBatchItem


def _current_event_id(obligation: RegistryObligation, *, error_type: type[Exception]) -> str:
    raw = getattr(obligation, "approval_event_id", None)
    if not isinstance(raw, str):
        raise error_type(
            "Registry approval event identity is absent; "
            "legacy approval requires a separate review before export: " + str(obligation.id)
        )
    try:
        parsed = UUID(raw)
    except (TypeError, ValueError, AttributeError) as exc:
        raise error_type("Invalid registry approval event identity: " + str(obligation.id)) from exc
    if parsed.version != 4 or str(parsed) != raw:
        raise error_type("Noncanonical registry approval event identity: " + str(obligation.id))
    return raw


async def require_unexported_approval_events(
    session: AsyncSession,
    *,
    obligations: Sequence[RegistryObligation],
    error_type: type[Exception],
) -> list[str]:
    """Return frozen IDs in request order; reject any uncertain historical export.

    This is intentionally conservative for legacy rows: absent event IDs in
    prior batch items must not be interpreted as a fresh approval. Operators
    must explicitly reconcile such history before the obligation can export.
    """
    if not obligations:
        raise error_type("Empty registry batch selection")
    events_by_obligation = {
        str(o.id): _current_event_id(o, error_type=error_type)
        for o in obligations
    }
    if len(events_by_obligation) != len(obligations):
        raise error_type("Duplicate registry obligation in batch selection")

    result = await session.execute(
        select(RegistrySubmissionBatchItem).where(
            RegistrySubmissionBatchItem.obligation_id.in_(list(events_by_obligation))
        )
    )
    for item in result.scalars().all():
        obligation_id = str(item.obligation_id)
        # A batch created before event identifiers were recorded might refer
        # to the currently approved event. It cannot be silently skipped.
        event = getattr(item, "approval_event_id", None)
        if event is None:
            raise error_type(
                "Registry batch has unverifiable legacy export history; "
                "manual reconciliation is required for obligation " + obligation_id
            )
        if event == events_by_obligation[obligation_id]:
            raise error_type(
                "Registry approval event already has an export batch "
                + str(item.batch_id) + "; no new batch or artifact created"
            )

    return [events_by_obligation[str(o.id)] for o in obligations]
