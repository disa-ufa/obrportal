"""Draft-only Mintrud protocol grouping. Deliberately no signing/export transitions."""
from __future__ import annotations

from datetime import date, datetime, timezone
from hashlib import sha256
import json
from typing import Literal
from uuid import UUID
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, inspect as sa_inspect, select
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import require_permission
from app.core.config import settings
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.base import utcnow
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol, MintrudKnowledgeProtocolMember
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation
from app.models.user import User
from app.api.v1.mintrud_protocol_preview import router as preview_router
from app.services.mintrud_protocol_reconciliation import reconcile_mintrud_protocol
from app.services.mintrud_protocol_sync import build_mintrud_sync_plan, apply_mintrud_protocol_sync
from app.services.mintrud_protocol_provenance import mintrud_protocol_sync_evidence

router = APIRouter(prefix="/mintrud/protocol-drafts", tags=["mintrud-protocol-drafts"] )
router.include_router(preview_router)


class ProtocolDraftMemberResult(BaseModel):
    enrollment_id: str = Field(min_length=1, max_length=36)
    knowledge_check_date: date | None = None
    knowledge_check_result: str | None = None


class ProtocolDraftUpdate(BaseModel):
    """Complete replacement of a *draft*; requires the last-read revision."""
    expected_updated_at: datetime
    protocol_number: str = Field(min_length=1, max_length=128)
    protocol_date: date
    enrollment_ids: list[str] = Field(min_length=1, max_length=100)
    commission_order_number: str | None = Field(default=None, max_length=128)
    commission_order_date: date | None = None
    commission_chair: str | None = Field(default=None, max_length=255)
    commission_members: list[str] = Field(default_factory=list, max_length=15)
    notes: str | None = Field(default=None, max_length=2000)
    participant_results: list[ProtocolDraftMemberResult] = Field(default_factory=list, max_length=100)


class ProtocolDraftCreate(BaseModel):
    course_id: str = Field(min_length=1, max_length=36)
    protocol_number: str = Field(min_length=1, max_length=128)
    protocol_date: date
    enrollment_ids: list[str] = Field(min_length=1, max_length=100)
    commission_order_number: str | None = Field(default=None, max_length=128)
    commission_order_date: date | None = None
    commission_chair: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    result = value.strip()
    if any(ord(ch) < 32 for ch in result):
        raise HTTPException(status_code=422, detail="Control characters are not allowed")
    return result or None


def _serialize(protocol: MintrudKnowledgeProtocol, members: list[dict]) -> dict:
    return {
        "id": str(protocol.id),
        "course_id": str(protocol.course_id),
        "protocol_number": protocol.protocol_number,
        "protocol_date": protocol.protocol_date,
        "status": protocol.status,
        "recorded_at": protocol.recorded_at,
        "recorded_by_user_id": protocol.recorded_by_user_id,
        "recorded_snapshot_sha256": protocol.recorded_snapshot_sha256,
        "commission_order_number": protocol.commission_order_number,
        "commission_order_date": protocol.commission_order_date,
        "commission_chair": protocol.commission_chair,
        "notes": protocol.notes,
        "commission_members": protocol.commission_members_json or [],
        "updated_at": protocol.updated_at,
        "created_at": protocol.created_at,
        "participant_count": len(members),
        "participants": members,
    }


async def _detail(session: AsyncSession, protocol_id: str) -> dict:
    protocol = await session.scalar(
        select(MintrudKnowledgeProtocol).where(MintrudKnowledgeProtocol.id == protocol_id)
    )
    if protocol is None:
        raise HTTPException(status_code=404, detail="Protocol draft not found")
    rows = await session.execute(
        select(
            MintrudKnowledgeProtocolMember.enrollment_id,
            MintrudKnowledgeProtocolMember.obligation_id,
            Enrollment.user_id,
            User.full_name,
            MintrudKnowledgeProtocolMember.knowledge_check_date,
            MintrudKnowledgeProtocolMember.knowledge_check_result,
        )
        .join(Enrollment, Enrollment.id == MintrudKnowledgeProtocolMember.enrollment_id)
        .join(User, User.id == Enrollment.user_id)
        .where(MintrudKnowledgeProtocolMember.protocol_id == protocol_id)
        .order_by(User.full_name, MintrudKnowledgeProtocolMember.enrollment_id)
    )
    members = [
        {
            "enrollment_id": str(r.enrollment_id),
            "obligation_id": str(r.obligation_id),
            "user_id": str(r.user_id),
            "learner_name": r.full_name,
            "knowledge_check_date": r.knowledge_check_date,
            "knowledge_check_result": r.knowledge_check_result,
        }
        for r in rows
    ]
    return _serialize(protocol, members)


@router.get("", response_model=list[dict])
async def list_protocol_drafts(
    course_id: str | None = Query(default=None, max_length=36),
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = select(MintrudKnowledgeProtocol).order_by(
        MintrudKnowledgeProtocol.created_at.desc(), MintrudKnowledgeProtocol.id
    ).limit(100)
    if course_id:
        query = query.where(MintrudKnowledgeProtocol.course_id == course_id)
    try:
        rows = (await session.scalars(query)).all()
        return [await _detail(session, str(row.id)) for row in rows]
    except ProgrammingError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Protocol draft schema is not installed") from exc


@router.get("/by-obligation/{obligation_id}", response_model=dict)
async def linked_protocols_for_obligation(
    obligation_id: str,
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Read-only protocol membership for one Mintrud obligation.

    Never infer that a draft is a confirmed commission check. The canonical
    reconciliation verifies recorded snapshots and protected registry history.
    This endpoint never writes Mintrud context, approval, or export state.
    """
    target = await session.scalar(
        select(RegistryObligation.id).where(
            RegistryObligation.id == obligation_id,
            RegistryObligation.registry == "mintrud",
        )
    )
    if target is None:
        raise HTTPException(status_code=404, detail="Mintrud obligation not found")

    records = (await session.scalars(
        select(MintrudKnowledgeProtocol)
        .join(
            MintrudKnowledgeProtocolMember,
            MintrudKnowledgeProtocolMember.protocol_id == MintrudKnowledgeProtocol.id,
        )
        .where(MintrudKnowledgeProtocolMember.obligation_id == obligation_id)
        .order_by(
            MintrudKnowledgeProtocol.protocol_date.desc(),
            MintrudKnowledgeProtocol.created_at.desc(),
            MintrudKnowledgeProtocol.id,
        )
        .limit(101)
    )).all()
    if len(records) > 100:
        raise HTTPException(status_code=409, detail="Too many linked protocols; manual review required")

    linked = []
    for protocol in records:
        # Reuse the same authoritative, read-only comparison as P3.3C.
        # It validates recorded snapshot SHA256 and protected export history.
        review = await reconcile_mintrud_protocol(session, str(protocol.id))
        member = next(
            (row for row in review["members"]
             if row["obligation_id"] == str(obligation_id)),
            None,
        )
        if member is None:
            raise HTTPException(status_code=409, detail="Protocol membership changed during review")
        evidence = await mintrud_protocol_sync_evidence(
            session, obligation_id=str(obligation_id), protocol_id=str(protocol.id)
        )
        matching_values = all(
            member["fields"][key]["source"] is not None
            and str(member["fields"][key]["source"])
            == str(member["fields"][key]["existing"])
            for key in ("protocol_number", "knowledge_check_date", "knowledge_check_result")
        )
        applied = bool(
            evidence
            and protocol.status == "recorded"
            and review["recorded_snapshot_verified"]
            and matching_values
            and evidence["source_sha256"] == protocol.recorded_snapshot_sha256
        )
        linked.append({
            "sync_provenance": {
                "ever_synced": bool(evidence),
                "applied": applied,
                "synced_at": evidence["synced_at"] if evidence else None,
            },
            "id": str(protocol.id),
            "course_id": str(protocol.course_id),
            "protocol_number": protocol.protocol_number,
            "protocol_date": protocol.protocol_date,
            "status": protocol.status,
            "recorded_snapshot_verified": review["recorded_snapshot_verified"],
            "fields": member["fields"],
            "verdict": member["verdict"],
            "history_reasons": member["history_reasons"],
            "conflict_fields": member["conflict_fields"],
            "structural_issues": member["structural_issues"],
        })
    return {
        "obligation_id": str(obligation_id),
        "protocols": linked,
        "read_only": True,
        "does_not_authorize_registry_sync_or_export": True,
    }


@router.get("/{protocol_id}", response_model=dict)
async def get_protocol_draft(
    protocol_id: str,
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await _detail(session, protocol_id)


@router.get("/{protocol_id}/print-preview", response_model=dict)
async def get_protocol_draft_print_preview(
    protocol_id: str,
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Read-only draft snapshot for browser printing; never constitutes a signed protocol."""
    draft = await _detail(session, protocol_id)
    if draft["status"] != "draft":
        raise HTTPException(status_code=409, detail="Only draft preview is supported")
    course = await session.scalar(select(Course).where(Course.id == draft["course_id"]))
    if course is None:
        raise HTTPException(status_code=404, detail="Protocol program not found")

    # Work-place fields are copied only from already-recorded sources.
    # Enrollment.organization_id is not assumed to be the worker's employer.
    rows = await session.execute(
        select(
            MintrudKnowledgeProtocolMember.enrollment_id,
            MintrudRegistryContext.profession_or_position,
            MintrudRegistryContext.employer_name,
        )
        .outerjoin(
            MintrudRegistryContext,
            MintrudRegistryContext.obligation_id == MintrudKnowledgeProtocolMember.obligation_id,
        )
        .where(MintrudKnowledgeProtocolMember.protocol_id == protocol_id)
    )
    context_by_id = {
        str(r.enrollment_id): {
            "profession_or_position": r.profession_or_position,
            "workplace": r.employer_name,
        }
        for r in rows
    }
    for member in draft["participants"]:
        member.update(context_by_id.get(member["enrollment_id"], {
            "profession_or_position": None, "workplace": None,
        }))
        # A registry record number cannot be inferred from a submission attempt.
        member["registry_record_number"] = None

    return {
        **draft,
        "document_kind": "DRAFT_PREVIEW_ONLY",
        "program_title": course.title,
        "program_hours": course.hours,
        "training_provider_name": settings.document_org_name or None,
        "legal_status": "NOT_SIGNED_NOT_APPROVED_NOT_EXPORTED",
    }


@router.post("", status_code=status.HTTP_201_CREATED, response_model=dict)
async def create_protocol_draft(
    payload: ProtocolDraftCreate,
    request: Request,
    current_user: User = Depends(require_permission("mintrud.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Write only a *draft*. No propagation to MintrudRegistryContext or exports."""
    course_id = payload.course_id.strip()
    number = _clean(payload.protocol_number)
    ids = sorted({item.strip() for item in payload.enrollment_ids})
    if not number or len(ids) != len(payload.enrollment_ids) or any(not item or len(item) > 36 for item in ids):
        raise HTTPException(status_code=422, detail="Invalid protocol number or duplicate/invalid enrollments")

    try:
        course = await session.scalar(select(Course).where(Course.id == course_id))
        if course is None or course.mintrud_requirement_mode == "not_required":
            raise HTTPException(status_code=422, detail="Course is not eligible for Mintrud protocol preparation")

        # Enrollment locks serialize competing draft creation involving the same learners.
        enrollments = (await session.scalars(
            select(Enrollment).where(Enrollment.id.in_(ids)).order_by(Enrollment.id).with_for_update()
        )).all()
        if len(enrollments) != len(ids) or any(
            str(enrollment.course_id) != course_id
            or enrollment.status != "completed"
            or enrollment.completed_at is None
            for enrollment in enrollments
        ):
            raise HTTPException(status_code=422, detail="All selected enrollments must be completed in the selected course")

        obligations = (await session.scalars(
            select(RegistryObligation).where(
                RegistryObligation.enrollment_id.in_(ids),
                RegistryObligation.registry == "mintrud"
            )
        )).all()
        by_enrollment = {str(item.enrollment_id): item for item in obligations}
        if len(by_enrollment) != len(ids):
            raise HTTPException(status_code=422, detail="A selected enrollment has no Mintrud obligation")

        negative_decisions = await session.scalar(
            select(func.count(RegistryApplicabilityRecord.id)).where(
                RegistryApplicabilityRecord.enrollment_id.in_(ids),
                RegistryApplicabilityRecord.registry == "mintrud",
                RegistryApplicabilityRecord.decision == "not_required",
            )
        )
        if negative_decisions:
            raise HTTPException(status_code=422, detail="Some selected enrollments do not require Mintrud reporting")

        # P2 is draft-only. Prevent accidental overlapping drafts for the same enrollment.
        overlaps = await session.scalar(
            select(func.count(MintrudKnowledgeProtocolMember.id)).where(
                MintrudKnowledgeProtocolMember.enrollment_id.in_(ids)
            )
        )
        if overlaps:
            raise HTTPException(status_code=409, detail="One or more enrollments already belong to a protocol draft")

        protocol = MintrudKnowledgeProtocol(
            id=str(uuid4()), course_id=course_id,
            protocol_number=number, protocol_date=payload.protocol_date,
            status="draft", commission_order_number=_clean(payload.commission_order_number),
            commission_order_date=payload.commission_order_date,
            commission_chair=_clean(payload.commission_chair), notes=_clean(payload.notes),
            commission_members_json=[], created_by_user_id=str(sa_inspect(current_user).identity[0]),
        )
        session.add(protocol)
        await session.flush()
        for enrollment_id in ids:
            session.add(MintrudKnowledgeProtocolMember(
                id=str(uuid4()), protocol_id=str(protocol.id),
                enrollment_id=enrollment_id,
                obligation_id=str(by_enrollment[enrollment_id].id),
                knowledge_check_date=None, knowledge_check_result=None,
            ))

        session.add(AuditEvent(
            actor_user_id=sa_inspect(current_user).identity[0],
            action="admin.mintrud_protocol_draft_created",
            entity_type="mintrud_knowledge_protocol",
            entity_id=str(protocol.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            payload={"course_id": course_id, "participant_count": len(ids), "status": "draft"},
        ))
        await session.commit()
        return await _detail(session, str(protocol.id))
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Duplicate protocol draft or invalid reference") from exc
    except ProgrammingError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Protocol draft schema is not installed") from exc
    except Exception:
        await session.rollback()
        raise


@router.put("/{protocol_id}", response_model=dict)
async def update_protocol_draft(
    protocol_id: str,
    payload: ProtocolDraftUpdate,
    request: Request,
    current_user: User = Depends(require_permission("mintrud.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Edit an unsigned draft only. Never approve or propagate to any registry."""
    number = _clean(payload.protocol_number)
    ids = sorted({item.strip() for item in payload.enrollment_ids})
    if not number or len(ids) != len(payload.enrollment_ids) or any(not x or len(x) > 36 for x in ids):
        raise HTTPException(status_code=422, detail="Invalid number or duplicate/invalid participants")
    names = [_clean(x) for x in payload.commission_members]
    if any(not x or len(x) > 255 for x in names) or len(set(names)) != len(names):
        raise HTTPException(status_code=422, detail="Commission members must be distinct nonempty names")
    updates = {p.enrollment_id: p for p in payload.participant_results}
    if len(updates) != len(payload.participant_results) or set(updates) != set(ids):
        raise HTTPException(status_code=422, detail="Participant results must specify each selected enrollment once")
    for item in updates.values():
        if item.knowledge_check_result not in (None, "satisfactory", "unsatisfactory"):
            raise HTTPException(status_code=422, detail="Unsupported commission result")
        if (item.knowledge_check_date is None) != (item.knowledge_check_result is None):
            raise HTTPException(status_code=422, detail="Result and commission date must both be set or both be empty")

    try:
        protocol = await session.scalar(
            select(MintrudKnowledgeProtocol)
            .where(MintrudKnowledgeProtocol.id == protocol_id)
            .with_for_update()
        )
        if protocol is None:
            raise HTTPException(status_code=404, detail="Protocol draft not found")
        if protocol.status != "draft":
            raise HTTPException(status_code=409, detail="Only unsigned drafts can be edited")
        if protocol.updated_at != payload.expected_updated_at:
            raise HTTPException(status_code=409, detail="Protocol draft changed elsewhere; refresh before editing")

        enrollments = (await session.scalars(
            select(Enrollment).where(Enrollment.id.in_(ids))
            .order_by(Enrollment.id).with_for_update()
        )).all()
        if len(enrollments) != len(ids) or any(
            str(e.course_id) != str(protocol.course_id)
            or e.status != "completed" or e.completed_at is None
            for e in enrollments
        ):
            raise HTTPException(status_code=422, detail="Selected participants must have completed this course")

        obligations = (await session.scalars(select(RegistryObligation).where(
            RegistryObligation.enrollment_id.in_(ids),
            RegistryObligation.registry == "mintrud",
        ))).all()
        by_enrollment = {str(o.enrollment_id): o for o in obligations}
        if len(by_enrollment) != len(ids):
            raise HTTPException(status_code=422, detail="Mintrud obligation missing for selected participant")
        excluded = await session.scalar(select(func.count(RegistryApplicabilityRecord.id)).where(
            RegistryApplicabilityRecord.enrollment_id.in_(ids),
            RegistryApplicabilityRecord.registry == "mintrud",
            RegistryApplicabilityRecord.decision == "not_required",
        ))
        if excluded:
            raise HTTPException(status_code=422, detail="Some participants are excluded from Mintrud")

        members = (await session.scalars(
            select(MintrudKnowledgeProtocolMember)
            .where(MintrudKnowledgeProtocolMember.protocol_id == protocol_id)
            .with_for_update()
        )).all()
        old = {str(m.enrollment_id): m for m in members}
        before_metadata = {
            "protocol_number": protocol.protocol_number,
            "protocol_date": protocol.protocol_date.isoformat(),
            "commission_order_number": protocol.commission_order_number,
            "commission_order_date": protocol.commission_order_date.isoformat() if protocol.commission_order_date else None,
            "commission_chair": protocol.commission_chair,
            "commission_members": protocol.commission_members_json or [],
            "notes": protocol.notes,
        }
        member_diffs = []
        for enrollment_id in sorted(set(old) | set(ids)):
            before = old.get(enrollment_id)
            after = updates.get(enrollment_id)
            old_result = before.knowledge_check_result if before else None
            old_date = before.knowledge_check_date.isoformat() if before and before.knowledge_check_date else None
            new_result = after.knowledge_check_result if after else None
            new_date = after.knowledge_check_date.isoformat() if after and after.knowledge_check_date else None
            if not before or not after or old_result != new_result or old_date != new_date:
                member_diffs.append({
                    "enrollment_id": enrollment_id,
                    "old_result": old_result, "old_date": old_date,
                    "new_result": new_result, "new_date": new_date,
                    "added": before is None, "removed": after is None,
                })
        additions = set(ids) - set(old)
        removals = set(old) - set(ids)
        if additions:
            overlaps = await session.scalar(select(func.count(MintrudKnowledgeProtocolMember.id)).where(
                MintrudKnowledgeProtocolMember.enrollment_id.in_(additions),
            ))
            if overlaps:
                raise HTTPException(status_code=409, detail="A participant is already in another protocol draft")

        for enrollment_id in sorted(removals):
            await session.delete(old[enrollment_id])
        changed_results = 0
        for enrollment_id in ids:
            item = updates[enrollment_id]
            if enrollment_id in old:
                member = old[enrollment_id]
                if (member.knowledge_check_date != item.knowledge_check_date
                    or member.knowledge_check_result != item.knowledge_check_result):
                    changed_results += 1
                member.knowledge_check_date = item.knowledge_check_date
                member.knowledge_check_result = item.knowledge_check_result
            else:
                session.add(MintrudKnowledgeProtocolMember(
                    id=str(uuid4()), protocol_id=protocol_id,
                    enrollment_id=enrollment_id,
                    obligation_id=str(by_enrollment[enrollment_id].id),
                    knowledge_check_date=item.knowledge_check_date,
                    knowledge_check_result=item.knowledge_check_result,
                ))
                if item.knowledge_check_result is not None:
                    changed_results += 1

        protocol.protocol_number = number
        protocol.protocol_date = payload.protocol_date
        protocol.commission_order_number = _clean(payload.commission_order_number)
        protocol.commission_order_date = payload.commission_order_date
        protocol.commission_chair = _clean(payload.commission_chair)
        protocol.commission_members_json = names
        protocol.notes = _clean(payload.notes)
        protocol.updated_at = utcnow()

        session.add(AuditEvent(
            actor_user_id=sa_inspect(current_user).identity[0],
            action="admin.mintrud_protocol_draft_updated",
            entity_type="mintrud_knowledge_protocol", entity_id=protocol_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            payload={
                "status": "draft", "participant_count": len(ids),
                "added_enrollment_ids": sorted(additions),
                "removed_enrollment_ids": sorted(removals),
                "manual_results_changed": changed_results,
                "commission_members_count": len(names),
                "metadata_before": before_metadata,
                "metadata_after": {
                    "protocol_number": number,
                    "protocol_date": payload.protocol_date.isoformat(),
                    "commission_order_number": protocol.commission_order_number,
                    "commission_order_date": payload.commission_order_date.isoformat() if payload.commission_order_date else None,
                    "commission_chair": protocol.commission_chair,
                    "commission_members": names,
                    "notes": protocol.notes,
                },
                "participant_changes": member_diffs,
                "registry_export": False,
            },
        ))
        await session.commit()
        return await _detail(session, protocol_id)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Conflicting protocol number, participant or reference") from exc
    except ProgrammingError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Protocol draft schema unavailable") from exc
    except Exception:
        await session.rollback()
        raise


class ProtocolRecordConfirmation(BaseModel):
    """Must be submitted by an authorised administrator after the real commission check."""
    expected_updated_at: datetime
    confirmation_id: UUID
    confirmed_actual_check: Literal[True]


async def _recording_report(session: AsyncSession, protocol: MintrudKnowledgeProtocol) -> dict:
    """Authoritative completeness check; snapshots are read only, never derived from a quiz."""
    course = await session.scalar(select(Course).where(Course.id == protocol.course_id))
    rows = (await session.execute(
        select(
            MintrudKnowledgeProtocolMember.id,
            MintrudKnowledgeProtocolMember.enrollment_id,
            MintrudKnowledgeProtocolMember.obligation_id,
            MintrudKnowledgeProtocolMember.knowledge_check_date,
            MintrudKnowledgeProtocolMember.knowledge_check_result,
            Enrollment.course_id,
            Enrollment.status,
            Enrollment.completed_at,
            Enrollment.user_id,
            User.full_name,
            RegistryObligation.id.label("registry_obligation_id"),
            RegistryObligation.registry,
            RegistryObligation.approved_at.label("existing_approved_at"),
            RegistryObligation.submitted_at.label("existing_submitted_at"),
            RegistryObligation.approval_snapshot_json.label("existing_approval_snapshot"),
            MintrudRegistryContext.profession_or_position,
            MintrudRegistryContext.employer_name,
            MintrudRegistryContext.protocol_number.label("manual_protocol_number"),
            MintrudRegistryContext.knowledge_check_date.label("manual_check_date"),
            MintrudRegistryContext.knowledge_check_result.label("manual_check_result"),
        )
        .join(Enrollment, Enrollment.id == MintrudKnowledgeProtocolMember.enrollment_id)
        .join(User, User.id == Enrollment.user_id)
        .join(RegistryObligation, RegistryObligation.id == MintrudKnowledgeProtocolMember.obligation_id)
        .outerjoin(MintrudRegistryContext, MintrudRegistryContext.obligation_id == RegistryObligation.id)
        .where(MintrudKnowledgeProtocolMember.protocol_id == protocol.id)
        .order_by(MintrudKnowledgeProtocolMember.enrollment_id)
    )).all()
    issues = []
    def add(code: str, message: str) -> None:
        issues.append({"code": code, "message": message})
    def filled(value) -> bool:
        return isinstance(value, str) and bool(value.strip())

    if protocol.status != "draft":
        add("status", "Проверка и фиксация доступны только для черновика.")
    if not filled(protocol.protocol_number):
        add("protocol_number", "Укажите номер протокола.")
    if not isinstance(protocol.protocol_date, date):
        add("protocol_date", "Укажите дату протокола.")
    elif protocol.protocol_date > date.today():
        add("protocol_future", "Дата протокола не может быть в будущем.")
    if not filled(settings.document_org_name):
        add("training_provider", "Укажите обучающую организацию.")
    if not filled(protocol.commission_order_number):
        add("order_number", "Укажите номер приказа о комиссии.")
    if not protocol.commission_order_date:
        add("order_date", "Укажите дату приказа о комиссии.")
    elif protocol.protocol_date and protocol.commission_order_date > protocol.protocol_date:
        add("order_date_after", "Дата приказа позже даты протокола.")
    if not filled(protocol.commission_chair):
        add("chair", "Укажите председателя комиссии.")
    persons = [protocol.commission_chair, *(protocol.commission_members_json or [])]
    names = [x.strip().casefold() for x in persons if filled(x)]
    if len(names) < 3 or len(set(names)) != len(names):
        add("commission_size", "Требуются минимум три разных члена комиссии, включая председателя.")
    if course is None or not filled(course.title):
        add("course", "Программа обучения не найдена.")
    if course is not None and (course.hours is None or course.hours <= 0):
        add("hours", "Не указана положительная продолжительность программы.")
    if course is not None and course.mintrud_requirement_mode == "not_required":
        add("course_ineligible", "Для курса отключена применимость Минтруда.")
    if not (1 <= len(rows) <= 100):
        add("members", "Укажите от одного до ста участников.")

    member_ids = [str(r.enrollment_id) for r in rows]
    if len(set(member_ids)) != len(rows):
        add("duplicate_members", "Участник включён повторно.")
    negative = 0
    if member_ids:
        negative = await session.scalar(select(func.count(RegistryApplicabilityRecord.id)).where(
            RegistryApplicabilityRecord.enrollment_id.in_(member_ids),
            RegistryApplicabilityRecord.registry == "mintrud",
            RegistryApplicabilityRecord.decision == "not_required",
        )) or 0
    if negative:
        add("not_required", "Есть участники без обязанности передачи в Минтруд.")

    participants = []
    for row in rows:
        enrollment_id = str(row.enrollment_id)
        label = (row.full_name or "").strip() or "Слушатель"
        if not filled(row.full_name):
            add("name:" + enrollment_id, f"{label}: отсутствует Ф.И.О.")
        if row.status != "completed" or row.completed_at is None:
            add("completion:" + enrollment_id, f"{label}: обучение ещё не завершено.")
        if str(row.course_id) != str(protocol.course_id):
            add("course_mismatch:" + enrollment_id, f"{label}: другой курс.")
        if row.registry != "mintrud" or str(row.registry_obligation_id) != str(row.obligation_id):
            add("obligation:" + enrollment_id, f"{label}: некорректное обязательство Минтруда.")
        if (row.existing_approved_at is not None or row.existing_submitted_at is not None
                or row.existing_approval_snapshot is not None):
            add("legacy_approval:" + enrollment_id, f"{label}: имеются прежние утверждения или отправки Минтруда; требуется отдельная сверка до фиксации.")
        if filled(row.manual_protocol_number) and row.manual_protocol_number.strip() != protocol.protocol_number.strip():
            add("legacy_number:" + enrollment_id, f"{label}: ручной номер протокола в данных Минтруда не совпадает с проектом.")
        if row.manual_check_date is not None and row.manual_check_date != row.knowledge_check_date:
            add("legacy_date:" + enrollment_id, f"{label}: ранее введённая дата проверки Минтруда отличается от протокола.")
        if filled(row.manual_check_result) and row.manual_check_result != row.knowledge_check_result:
            add("legacy_result:" + enrollment_id, f"{label}: ранее введённый результат Минтруда отличается от протокола.")
        if not filled(row.profession_or_position):
            add("position:" + enrollment_id, f"{label}: не указана должность / профессия.")
        if not filled(row.employer_name):
            add("workplace:" + enrollment_id, f"{label}: не указано место работы.")
        if row.knowledge_check_result not in ("satisfactory", "unsatisfactory"):
            add("result:" + enrollment_id, f"{label}: отсутствует результат комиссии.")
        if not row.knowledge_check_date:
            add("date:" + enrollment_id, f"{label}: отсутствует дата проверки.")
        else:
            if protocol.protocol_date and row.knowledge_check_date > protocol.protocol_date:
                add("later_than_protocol:" + enrollment_id, f"{label}: дата проверки позже даты протокола.")
            if row.knowledge_check_date > date.today():
                add("future_check:" + enrollment_id, f"{label}: дата проверки в будущем.")
            if row.completed_at and row.knowledge_check_date < row.completed_at.date():
                add("check_before_completion:" + enrollment_id, f"{label}: проверка раньше завершения обучения.")
        participants.append({
            "enrollment_id": enrollment_id, "obligation_id": str(row.obligation_id),
            "user_id": str(row.user_id), "learner_name": row.full_name,
            "profession_or_position": row.profession_or_position,
            "workplace": row.employer_name,
            "knowledge_check_date": row.knowledge_check_date.isoformat() if row.knowledge_check_date else None,
            "knowledge_check_result": row.knowledge_check_result,
        })
    snapshot = {
        "kind": "ADMINISTRATIVELY_RECORDED_COMMISSION_CHECK_NOT_SIGNED_NOT_EXPORTED",
        "protocol_id": str(protocol.id),
        "course_id": str(protocol.course_id),
        "protocol_number": protocol.protocol_number,
        "protocol_date": protocol.protocol_date.isoformat() if protocol.protocol_date else None,
        "training_provider_name": settings.document_org_name,
        "program_title": course.title if course else None,
        "program_hours": course.hours if course else None,
        "commission_order_number": protocol.commission_order_number,
        "commission_order_date": protocol.commission_order_date.isoformat() if protocol.commission_order_date else None,
        "commission_chair": protocol.commission_chair,
        "commission_members": protocol.commission_members_json or [],
        "participants": participants,
    }
    return {
        "fieldsComplete": not issues,
        "issues": issues,
        "advisories": [
            "Электронная фиксация не заменяет подписи членов комиссии и работников.",
            "Результаты онлайн-тестов не считаются решением комиссии.",
            "Сведения в ЕИСОТ этим действием не отправляются.",
        ],
        "snapshot": snapshot,
    }


@router.get("/{protocol_id}/recording-readiness", response_model=dict)
async def get_protocol_recording_readiness(
    protocol_id: str,
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Read-only server validation; no implicit confirmation or approval."""
    protocol = await session.scalar(
        select(MintrudKnowledgeProtocol).where(MintrudKnowledgeProtocol.id == protocol_id)
    )
    if protocol is None:
        raise HTTPException(status_code=404, detail="Protocol draft not found")
    report = await _recording_report(session, protocol)
    return {key: value for key, value in report.items() if key != "snapshot"}


@router.get("/{protocol_id}/registry-reconciliation", response_model=dict)
async def get_protocol_registry_reconciliation(
    protocol_id: str,
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """P3.3C preview: read sources and history, NEVER synchronize records."""
    return await build_mintrud_sync_plan(session, protocol_id)


class ProtocolRegistrySyncRequest(BaseModel):
    """An explicit selection and acknowledgement tied to the last read-only plan."""
    request_id: UUID
    expected_plan_token: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    obligation_ids: list[str] = Field(min_length=1, max_length=100)
    confirmed_sync: Literal[True]


@router.post("/{protocol_id}/registry-sync", response_model=dict)
async def sync_recorded_protocol_to_mintrud(
    protocol_id: str,
    payload: ProtocolRegistrySyncRequest,
    request: Request,
    current_user: User = Depends(require_permission("mintrud.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """P3.3D: fill-only, no approval or XML, never update protected history."""
    actor_id = str(sa_inspect(current_user).identity[0])
    try:
        return await apply_mintrud_protocol_sync(
            session,
            protocol_id=protocol_id,
            actor_user_id=actor_id,
            request_id=payload.request_id,
            expected_plan_token=payload.expected_plan_token,
            obligation_ids=payload.obligation_ids,
            request_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception:
        await session.rollback()
        raise


@router.post("/{protocol_id}/record-check", response_model=dict)
async def record_protocol_commission_check(
    protocol_id: str,
    payload: ProtocolRecordConfirmation,
    request: Request,
    current_user: User = Depends(require_permission("mintrud.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Record a human-declared commission check, not signing and not EISOT export."""
    request_id = str(payload.confirmation_id)
    actor_id = str(sa_inspect(current_user).identity[0])
    try:
        # Row lock serializes simultaneous confirmations and editor updates.
        protocol = await session.scalar(
            select(MintrudKnowledgeProtocol)
            .where(MintrudKnowledgeProtocol.id == protocol_id).with_for_update()
        )
        if protocol is None:
            raise HTTPException(status_code=404, detail="Protocol draft not found")
        if protocol.status == "recorded":
            if protocol.recording_request_id == request_id:
                return await _detail(session, protocol_id)
            raise HTTPException(status_code=409, detail="Protocol already recorded; corrections require a separate procedure")
        if protocol.status != "draft":
            raise HTTPException(status_code=409, detail="Unknown protocol state")
        if protocol.updated_at != payload.expected_updated_at:
            raise HTTPException(status_code=409, detail="Protocol draft changed; refresh before recording")
        report = await _recording_report(session, protocol)
        if not report["fieldsComplete"]:
            raise HTTPException(status_code=422, detail={"reason": "NOT_READY", "issues": report["issues"]})
        snapshot = report["snapshot"]
        canonical = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        digest = sha256(canonical.encode("utf-8")).hexdigest()
        protocol.status = "recorded"
        protocol.recorded_at = utcnow()
        protocol.recorded_by_user_id = actor_id
        protocol.recording_request_id = request_id
        protocol.recorded_snapshot = snapshot
        protocol.recorded_snapshot_sha256 = digest
        protocol.updated_at = utcnow()
        session.add(AuditEvent(
            actor_user_id=actor_id, action="admin.mintrud_protocol_commission_recorded",
            entity_type="mintrud_knowledge_protocol", entity_id=protocol_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            payload={
                "status": "recorded", "recording_request_id": request_id,
                "snapshot_sha256": digest, "participant_count": len(snapshot["participants"]),
                "signed": False, "registry_export": False,
            },
        ))
        await session.commit()
        return await _detail(session, protocol_id)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Recording conflicts with an existing confirmation") from exc
    except ProgrammingError as exc:
        await session.rollback()
        raise HTTPException(status_code=503, detail="Protocol recording migration is not installed") from exc
    except Exception:
        await session.rollback()
        raise
