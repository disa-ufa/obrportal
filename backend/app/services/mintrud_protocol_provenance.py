"""Read-only audit provenance for protocol-derived Mintrud context fields.

Only a committed guarded-sync audit event establishes the origin of these
fields. Equal manually entered values are not evidence of synchronization.
"""
from __future__ import annotations

from collections.abc import Mapping

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocolMember

SYNC_ACTION = "admin.mintrud_protocol_registry_fields_synced"
SYNC_FIELDS = frozenset({"protocol_number", "knowledge_check_date", "knowledge_check_result"})


def _event_for_obligation(event: AuditEvent, obligation_id: str) -> bool:
    payload = event.payload
    if not isinstance(payload, Mapping):
        return False
    changed = payload.get("changed_obligation_ids")
    return (
        isinstance(changed, list)
        and str(obligation_id) in changed
        and payload.get("source_sha256") is not None
        and set(payload.get("fields") or ()) >= SYNC_FIELDS
    )


async def mintrud_protocol_sync_evidence(
    session: AsyncSession,
    *,
    obligation_id: str,
    protocol_id: str | None = None,
) -> dict | None:
    """Find a committed sync event for this exact obligation and protocol.

    Events are scoped by protocol ID in the database and by obligation ID in
    their recorded payload. Never treat a matching field value as proof.
    """
    if protocol_id is None:
        ids = sorted(set((await session.scalars(
            select(MintrudKnowledgeProtocolMember.protocol_id)
            .where(MintrudKnowledgeProtocolMember.obligation_id == obligation_id)
        )).all()))
    else:
        ids = [protocol_id]
    if not ids:
        return None
    events = (await session.scalars(
        select(AuditEvent).where(
            AuditEvent.action == SYNC_ACTION,
            AuditEvent.entity_type == "mintrud_knowledge_protocol",
            AuditEvent.entity_id.in_([str(item) for item in ids]),
        ).order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
    )).all()
    for event in events:
        if _event_for_obligation(event, str(obligation_id)):
            return {
                "protocol_id": str(event.entity_id),
                "source_sha256": str(event.payload["source_sha256"]),
                "synced_at": event.created_at.isoformat() if event.created_at else None,
            }
    return None


async def has_mintrud_protocol_sync_evidence(session: AsyncSession, obligation_id: str) -> bool:
    """Used under the obligation row lock by manual context PATCH."""
    return await mintrud_protocol_sync_evidence(session, obligation_id=str(obligation_id)) is not None
