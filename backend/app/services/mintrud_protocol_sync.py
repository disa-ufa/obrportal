"""P3.3D.1 — guarded transfer of recorded protocol results to Mintrud contexts.

Only three fields can be filled. Never approve, invalidate, export, submit, or
change a protocol, enrollment, obligation or historical submission snapshot.
"""
from __future__ import annotations

from hashlib import sha256
from datetime import date
import json
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from app.models.base import utcnow
from app.models.enrollment import Enrollment
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_readiness import evaluate_registry_readiness
from app.services.compliance_registry_contract import REGISTRY_MINTRUD
from app.services.completion_documents import load_completion_document_context
from app.services.mintrud_learn_programs import load_course_mintrud_learn_programs
from app.services.mintrud_reporting_organization import resolve_mintrud_reporting_organization
from app.services.mintrud_protocol_reconciliation import reconcile_mintrud_protocol

SOURCE_FIELDS = ("protocol_number", "knowledge_check_date", "knowledge_check_result")
# A deliberately narrow first release: no automatically updated approved/validated rows.
PERMITTED_OBLIGATION_STATUSES = frozenset({"pending_data"})


def _digest(value: dict) -> str:
    return sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()


def _eligible(member: dict, status: str | None, recorded: bool) -> tuple[bool, str]:
    if not recorded:
        return False, "protocol_not_recorded"
    if status not in PERMITTED_OBLIGATION_STATUSES:
        return False, "registry_status_not_pending_data"
    if member["structural_issues"]:
        return False, "invalid_links_or_applicability"
    if member["history_reasons"]:
        return False, "protected_history"
    if member["conflict_fields"]:
        return False, "manual_conflict"
    if any(member["fields"][key]["source"] is None for key in SOURCE_FIELDS):
        return False, "source_incomplete"
    if member["verdict"] not in ("matches", "missing_target_fields"):
        return False, "blocked_reconciliation_verdict"
    return True, "already_matching" if member["verdict"] == "matches" else "can_fill_empty"


async def build_mintrud_sync_plan(session: AsyncSession, protocol_id: str) -> dict:
    """Read only. Plan hash binds source, current fields and protection signals."""
    comparison = await reconcile_mintrud_protocol(session, protocol_id)
    protocol = await session.scalar(select(MintrudKnowledgeProtocol).where(MintrudKnowledgeProtocol.id == protocol_id))
    ids = sorted(m["obligation_id"] for m in comparison["members"])
    statuses = dict((await session.execute(
        select(RegistryObligation.id, RegistryObligation.status).where(RegistryObligation.id.in_(ids))
    )).all())
    statuses = {str(k): v for k, v in statuses.items()}
    members = []
    for m in comparison["members"]:
        status = statuses.get(m["obligation_id"])
        allowed, reason = _eligible(m, status, comparison["protocol_status"] == "recorded")
        members.append({**m, "registry_status": status, "sync_allowed": allowed, "sync_reason": reason})
    members.sort(key=lambda x: x["obligation_id"])
    token_inputs = {
        "protocol_id": protocol_id,
        "recorded_source_sha256": protocol.recorded_snapshot_sha256 if protocol else None,
        "members": [{
            "enrollment_id": m["enrollment_id"],
            "obligation_id": m["obligation_id"],
            "registry_status": m["registry_status"],
            "verdict": m["verdict"],
            "history_reasons": m["history_reasons"],
            "structural_issues": m["structural_issues"],
            "fields": m["fields"],
        } for m in members],
    }
    return {
        **comparison,
        "members": members,
        "sync_plan_token": _digest(token_inputs),
        "sync_eligible_obligation_ids": [m["obligation_id"] for m in members if m["sync_allowed"] and m["sync_reason"] == "can_fill_empty"],
        "sync_already_matching_ids": [m["obligation_id"] for m in members if m["sync_allowed"] and m["sync_reason"] == "already_matching"],
        "sync_requires_explicit_confirmation": True,
        "sync_changes_only": list(SOURCE_FIELDS),
    }


async def _refresh_mintrud_readiness(
    session: AsyncSession,
    obligation: RegistryObligation,
) -> dict:
    """Run the *existing* Mintrud evaluator for one newly filled context.

    This is the same readiness calculation as the admin validation route,
    but it runs inside the guarded sync transaction; no independent action,
    approval, XML generation or second commit is permitted.
    """
    if obligation.status != "pending_data":
        raise HTTPException(status_code=409, detail="Readiness can only follow a pending-data sync")
    enrollment = await session.scalar(
        select(Enrollment).where(Enrollment.id == obligation.enrollment_id)
    )
    if enrollment is None:
        raise HTTPException(status_code=409, detail="Mintrud obligation enrollment is missing")
    course, learner, learner_profile, organization = (
        await load_completion_document_context(enrollment, session)
    )
    if course is None:
        raise HTTPException(status_code=409, detail="Mintrud obligation course is missing")

    # The preceding PostgreSQL UPSERT wrote the three fields directly. Avoid
    # reusing an earlier ORM instance with a stale context from reconciliation.
    context = await session.scalar(
        select(MintrudRegistryContext)
        .where(MintrudRegistryContext.obligation_id == obligation.id)
        .execution_options(populate_existing=True)
    )
    if context is None:
        raise HTTPException(status_code=409, detail="Synchronized Mintrud context is missing")

    readiness = evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        mintrud_reporting_organization=resolve_mintrud_reporting_organization(),
        enrollment=enrollment,
        course=course,
        learner=learner,
        learner_profile=learner_profile,
        organization=organization,
        mintrud_learn_programs=await load_course_mintrud_learn_programs(
            session, course_id=str(course.id), active_only=True,
        ),
        mintrud_context=context,
    )
    obligation.readiness_errors = readiness.as_error_payload()
    obligation.status = "ready" if readiness.is_ready else "pending_data"
    return {
        "obligation_id": str(obligation.id),
        "is_ready": bool(readiness.is_ready),
        "registry_status": obligation.status,
        "issues": readiness.as_error_payload(),
    }


async def apply_mintrud_protocol_sync(
    session: AsyncSession,
    *,
    protocol_id: str,
    actor_user_id: str,
    request_id: UUID,
    expected_plan_token: str,
    obligation_ids: list[str],
    request_ip: str | None,
    user_agent: str | None,
) -> dict:
    """Single atomic and idempotent *fill-only* transaction.

    All selected rows must be eligible. No partial success if a selected item
    is protected or conflicted. Lock protocol/obligations; conditional PG upsert
    prevents lost updates to the three target fields.
    """
    ids = sorted(set(obligation_ids))
    if not ids or len(ids) != len(obligation_ids) or len(ids) > 100:
        raise HTTPException(status_code=422, detail="Select 1-100 unique obligation IDs")
    request_key = str(request_id)
    protocol = await session.scalar(
        select(MintrudKnowledgeProtocol).where(MintrudKnowledgeProtocol.id == protocol_id).with_for_update()
    )
    if protocol is None:
        raise HTTPException(status_code=404, detail="Protocol not found")
    if protocol.status != "recorded":
        raise HTTPException(status_code=409, detail="Only recorded protocols can synchronize Mintrud data")

    # Idempotency is scoped to protocol and a client-provided UUID. Check under
    # the protocol row lock, before stale-plan validation after a previous write.
    previous = await session.scalar(
        select(AuditEvent).where(
            AuditEvent.action == "admin.mintrud_protocol_registry_fields_synced",
            AuditEvent.entity_type == "mintrud_knowledge_protocol",
            AuditEvent.entity_id == protocol_id,
            AuditEvent.payload["request_id"].as_string() == request_key,
        ).order_by(AuditEvent.created_at.desc()).limit(1)
    )
    if previous is not None:
        info = previous.payload
        if (info.get("obligation_ids") != ids
                or info.get("plan_token") != expected_plan_token
                or info.get("source_sha256") != protocol.recorded_snapshot_sha256):
            raise HTTPException(status_code=409, detail="Idempotency key reused for a different operation")
        return {
            "status": "REPLAY_NO_WRITES", "replayed": True,
            "changed_obligation_ids": info.get("changed_obligation_ids", []),
            "readiness_results": info.get("readiness_results", []),
            "protocol_id": protocol_id,
            "approved": False, "exported": False,
        }

    # Canonical row order; FOR UPDATE also prevents an FK insert into attempts
    # and batch items while this transaction holds the referenced row locks.
    locked = (await session.scalars(
        select(RegistryObligation).where(RegistryObligation.id.in_(ids))
        .order_by(RegistryObligation.id).with_for_update()
    )).all()
    if len(locked) != len(ids):
        raise HTTPException(status_code=409, detail="Target obligation disappeared")
    plan = await build_mintrud_sync_plan(session, protocol_id)
    if plan["sync_plan_token"] != expected_plan_token:
        raise HTTPException(status_code=409, detail="Registry data changed; refresh reconciliation before syncing")
    by_id = {m["obligation_id"]: m for m in plan["members"]}
    if not all(oid in by_id and by_id[oid]["sync_allowed"] for oid in ids):
        raise HTTPException(status_code=409, detail="One or more participants have protected history, conflicting data or missing source")
    if str(protocol.recorded_snapshot_sha256 or "") == "":
        raise HTTPException(status_code=409, detail="Recorded protocol snapshot is missing")

    changed = []
    for oid in ids:
        m = by_id[oid]
        if m["sync_reason"] == "already_matching":
            continue
        fields = m["fields"]
        value_date = date.fromisoformat(fields["knowledge_check_date"]["source"])
        value_result = fields["knowledge_check_result"]["source"]
        number = fields["protocol_number"]["source"]
        # Atomic insertion OR filling NULL values. The conditional WHERE is
        # evaluated by PostgreSQL after acquiring the context row lock. A
        # concurrent manual editor cannot be overwritten with a different value.
        stmt = pg_insert(MintrudRegistryContext).values(
            obligation_id=oid,
            protocol_number=number,
            knowledge_check_date=value_date,
            knowledge_check_result=value_result,
        )
        existing = MintrudRegistryContext.__table__
        conditions = [
            (existing.c.protocol_number.is_(None) | (existing.c.protocol_number == stmt.excluded.protocol_number)),
            (existing.c.knowledge_check_date.is_(None) | (existing.c.knowledge_check_date == stmt.excluded.knowledge_check_date)),
            (existing.c.knowledge_check_result.is_(None) | (existing.c.knowledge_check_result == stmt.excluded.knowledge_check_result)),
        ]
        stmt = stmt.on_conflict_do_update(
            index_elements=[existing.c.obligation_id],
            set_={
                "protocol_number": func.coalesce(existing.c.protocol_number, stmt.excluded.protocol_number),
                "knowledge_check_date": func.coalesce(existing.c.knowledge_check_date, stmt.excluded.knowledge_check_date),
                "knowledge_check_result": func.coalesce(existing.c.knowledge_check_result, stmt.excluded.knowledge_check_result),
                "updated_at": utcnow(),
            },
            where=and_(*conditions),
        ).returning(existing.c.id)
        updated = (await session.execute(stmt)).scalar_one_or_none()
        if updated is None:
            raise HTTPException(status_code=409, detail="Target fields were changed concurrently; no partial sync is permitted")
        changed.append(oid)

    # Re-evaluate only the newly filled obligations. The same transaction
    # records both their validated readiness and the source fields. If any
    # validation raises, the API rolls back every field, status and audit row.
    locked_by_id = {str(item.id): item for item in locked}
    readiness_results = [
        await _refresh_mintrud_readiness(session, locked_by_id[oid])
        for oid in changed
    ]
    if changed:
        session.add(AuditEvent(
            actor_user_id=actor_user_id,
            action="admin.mintrud_protocol_registry_fields_synced",
            entity_type="mintrud_knowledge_protocol",
            entity_id=protocol_id,
            ip_address=request_ip,
            user_agent=user_agent,
            payload={
                "request_id": request_key,
                "plan_token": expected_plan_token,
                "source_sha256": protocol.recorded_snapshot_sha256,
                "obligation_ids": ids,
                "changed_obligation_ids": changed,
                "fields": list(SOURCE_FIELDS),
                "readiness_results": readiness_results,
                "readiness_validation": "same_transaction_existing_evaluator",
                "approved": False,
                "exported": False,
            },
        ))
        await session.commit()
    else:
        # No pending fields; don't invent an audit event for a no-op.
        await session.rollback()
    return {
        "status": "UPDATED" if changed else "ALREADY_MATCHING_NO_WRITES",
        "replayed": False,
        "protocol_id": protocol_id,
        "changed_obligation_ids": changed,
        "unchanged_obligation_ids": [x for x in ids if x not in changed],
        "readiness_results": readiness_results,
        "approved": False,
        "exported": False,
    }
