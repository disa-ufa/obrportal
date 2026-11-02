"""P3.3C: read-only, conservative preview of recorded protocol vs Mintrud history.

This module MUST NOT persist any registry context, invalidate an approval,
create batches, or infer a commission decision from online quiz results.
"""
from __future__ import annotations

from collections import Counter
from hashlib import sha256
import json

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enrollment import Enrollment
from app.models.mintrud_knowledge_protocol import (
    MintrudKnowledgeProtocol,
    MintrudKnowledgeProtocolMember,
)
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.user import User


def _scalar(value):
    """JSON-safe plain value; no SQLAlchemy object is returned to a caller."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def compare_field(source, existing) -> dict:
    """Compare only known source values. Missing source is not an instruction to clear data."""
    source = _scalar(source)
    existing = _scalar(existing)
    if isinstance(source, str):
        source = source.strip() or None
    if isinstance(existing, str):
        existing = existing.strip() or None
    if source is None:
        verdict = "source_missing"
    elif existing is None:
        verdict = "target_empty"
    elif source == existing:
        verdict = "match"
    else:
        verdict = "conflict"
    return {"source": source, "existing": existing, "verdict": verdict}


def _verified_recorded_participants(protocol: MintrudKnowledgeProtocol) -> dict[str, dict] | None:
    if protocol.status == "draft":
        return None
    if protocol.status != "recorded":
        raise HTTPException(status_code=409, detail="Unknown protocol status; registry reconciliation denied")
    snapshot = protocol.recorded_snapshot
    if not isinstance(snapshot, dict) or not protocol.recorded_snapshot_sha256:
        raise HTTPException(status_code=409, detail="Recorded protocol snapshot missing; reconciliation denied")
    digest = sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
    if digest != protocol.recorded_snapshot_sha256:
        raise HTTPException(status_code=409, detail="Recorded protocol snapshot mismatch; reconciliation denied")
    if (str(snapshot.get("protocol_id")) != str(protocol.id)
        or str(snapshot.get("course_id")) != str(protocol.course_id)
        or snapshot.get("protocol_number") != protocol.protocol_number
        or snapshot.get("protocol_date") != protocol.protocol_date.isoformat()):
        raise HTTPException(status_code=409, detail="Recorded protocol metadata diverged; reconciliation denied")
    people = snapshot.get("participants")
    if not isinstance(people, list) or not people:
        raise HTTPException(status_code=409, detail="Recorded protocol has no valid participants")
    result: dict[str, dict] = {}
    for person in people:
        if not isinstance(person, dict) or not person.get("enrollment_id") or not person.get("obligation_id"):
            raise HTTPException(status_code=409, detail="Invalid recorded protocol participant")
        key = str(person["enrollment_id"])
        if key in result:
            raise HTTPException(status_code=409, detail="Duplicate recorded protocol participant")
        if person.get("knowledge_check_result") not in ("satisfactory", "unsatisfactory") or not person.get("knowledge_check_date"):
            raise HTTPException(status_code=409, detail="Incomplete recorded protocol participant")
        result[key] = person
    return result


async def reconcile_mintrud_protocol(session: AsyncSession, protocol_id: str) -> dict:
    """Read-only preview; even a fully matching record is NOT cleared for automatic export."""
    protocol = await session.scalar(
        select(MintrudKnowledgeProtocol).where(MintrudKnowledgeProtocol.id == protocol_id)
    )
    if protocol is None:
        raise HTTPException(status_code=404, detail="Protocol not found")

    recorded_people = _verified_recorded_participants(protocol)
    rows = (await session.execute(
        select(
            MintrudKnowledgeProtocolMember.enrollment_id,
            MintrudKnowledgeProtocolMember.obligation_id,
            MintrudKnowledgeProtocolMember.knowledge_check_date,
            MintrudKnowledgeProtocolMember.knowledge_check_result,
            Enrollment.course_id.label("enrollment_course_id"),
            Enrollment.user_id,
            User.full_name,
            RegistryObligation.id.label("target_id"),
            RegistryObligation.enrollment_id.label("target_enrollment_id"),
            RegistryObligation.registry,
            RegistryObligation.status.label("registry_status"),
            RegistryObligation.approved_at,
            RegistryObligation.approved_by_user_id,
            RegistryObligation.approval_snapshot_json,
            RegistryObligation.approval_fingerprint,
            RegistryObligation.approval_event_id,
            RegistryObligation.approval_invalidated_at,
            RegistryObligation.submitted_at,
            RegistryObligation.accepted_at,
            RegistryObligation.external_id,
            MintrudRegistryContext.protocol_number.label("manual_number"),
            MintrudRegistryContext.knowledge_check_date.label("manual_date"),
            MintrudRegistryContext.knowledge_check_result.label("manual_result"),
        )
        .join(Enrollment, Enrollment.id == MintrudKnowledgeProtocolMember.enrollment_id)
        .join(User, User.id == Enrollment.user_id)
        .outerjoin(RegistryObligation, RegistryObligation.id == MintrudKnowledgeProtocolMember.obligation_id)
        .outerjoin(MintrudRegistryContext, MintrudRegistryContext.obligation_id == RegistryObligation.id)
        .where(MintrudKnowledgeProtocolMember.protocol_id == protocol_id)
        .order_by(User.full_name, MintrudKnowledgeProtocolMember.enrollment_id)
    )).all()
    if not rows:
        raise HTTPException(status_code=409, detail="Protocol has no members")
    member_ids = {str(r.enrollment_id) for r in rows}
    if recorded_people is not None and set(recorded_people) != member_ids:
        raise HTTPException(status_code=409, detail="Recorded member set changed; reconciliation denied")

    obligation_ids = [str(r.obligation_id) for r in rows]
    attempts = dict((await session.execute(
        select(RegistrySubmissionAttempt.obligation_id, func.count(RegistrySubmissionAttempt.id))
        .where(RegistrySubmissionAttempt.obligation_id.in_(obligation_ids))
        .group_by(RegistrySubmissionAttempt.obligation_id)
    )).all())
    batches = dict((await session.execute(
        select(RegistrySubmissionBatchItem.obligation_id, func.count(RegistrySubmissionBatchItem.id))
        .where(RegistrySubmissionBatchItem.obligation_id.in_(obligation_ids))
        .group_by(RegistrySubmissionBatchItem.obligation_id)
    )).all())
    not_required_ids = set((await session.scalars(
        select(RegistryApplicabilityRecord.enrollment_id)
        .where(
            RegistryApplicabilityRecord.enrollment_id.in_(list(member_ids)),
            RegistryApplicabilityRecord.registry == "mintrud",
            RegistryApplicabilityRecord.decision == "not_required",
        )
    )).all())
    not_required_ids = {str(x) for x in not_required_ids}

    output = []
    for row in rows:
        enrollment_id = str(row.enrollment_id)
        obligation_id = str(row.obligation_id)
        person = recorded_people[enrollment_id] if recorded_people is not None else None
        if person is not None and str(person["obligation_id"]) != obligation_id:
            raise HTTPException(status_code=409, detail="Recorded obligation link changed; reconciliation denied")
        # Draft values are explicitly preliminary, never confirmed commission results.
        source_date = person["knowledge_check_date"] if person is not None else _scalar(row.knowledge_check_date)
        source_result = person["knowledge_check_result"] if person is not None else row.knowledge_check_result
        if person is not None and (
            source_date != _scalar(row.knowledge_check_date)
            or source_result != row.knowledge_check_result
        ):
            raise HTTPException(status_code=409, detail="Recorded member results diverged; reconciliation denied")
        fields = {
            "protocol_number": compare_field(protocol.protocol_number, row.manual_number),
            "knowledge_check_date": compare_field(source_date, row.manual_date),
            "knowledge_check_result": compare_field(source_result, row.manual_result),
        }
        history_reasons = []
        for flag, value in (
            ("approval", row.approved_at or row.approved_by_user_id or row.approval_snapshot_json is not None or row.approval_fingerprint or row.approval_event_id or row.approval_invalidated_at),
            ("submitted", row.submitted_at is not None),
            ("accepted", row.accepted_at is not None or row.external_id is not None),
            ("export_attempt", int(attempts.get(obligation_id, 0)) > 0),
            ("batch_item", int(batches.get(obligation_id, 0)) > 0),
        ):
            if value:
                history_reasons.append(flag)
        if row.registry_status in ("approved", "exported", "submitted", "accepted"):
            history_reasons.append("registry_status")
        structural_issues = []
        if row.target_id is None or str(row.target_id) != obligation_id or row.registry != "mintrud":
            structural_issues.append("missing_or_invalid_mintrud_obligation")
        if row.target_enrollment_id is None or str(row.target_enrollment_id) != enrollment_id:
            structural_issues.append("obligation_enrollment_mismatch")
        if str(row.enrollment_course_id) != str(protocol.course_id):
            structural_issues.append("course_mismatch")
        if enrollment_id in not_required_ids:
            structural_issues.append("mintrud_not_required_decision")
        conflicts = [name for name, value in fields.items() if value["verdict"] == "conflict"]
        missing = [name for name, value in fields.items() if value["verdict"] == "target_empty"]
        source_missing = [name for name, value in fields.items() if value["verdict"] == "source_missing"]
        if structural_issues:
            verdict = "blocked_inconsistent_links"
        elif history_reasons:
            verdict = "protected_history"
        elif conflicts:
            verdict = "manual_conflict"
        elif protocol.status != "recorded":
            verdict = "draft_only"
        elif source_missing:
            verdict = "source_incomplete"
        elif missing:
            verdict = "missing_target_fields"
        else:
            verdict = "matches"
        output.append({
            "enrollment_id": enrollment_id,
            "obligation_id": obligation_id,
            "learner_name": row.full_name or "Слушатель",
            "verdict": verdict,
            "history_reasons": sorted(set(history_reasons)),
            "structural_issues": structural_issues,
            "conflict_fields": conflicts,
            "empty_target_fields": missing,
            "fields": fields,
        })
    counts = Counter(row["verdict"] for row in output)
    return {
        "mode": "READ_ONLY_NO_REGISTRY_WRITES",
        "protocol_id": str(protocol.id),
        "protocol_number": protocol.protocol_number,
        "protocol_status": protocol.status,
        "recorded_snapshot_verified": protocol.status == "recorded",
        "participant_count": len(output),
        "counts": dict(sorted(counts.items())),
        "members": output,
        "not_authorization_for_sync_or_export": True,
    }
