"""Administrative two-person documentary review and one atomic reapproval."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.signed_scan_upload_limit import SignedScanUploadLimitRoute
from app.api.v1.auth import get_current_user, oauth2_scheme
from app.api.v1.rbac import get_user_permission_codes
from app.db.session import get_db
from app.models.user import User
from app.services.compliance_registry_approval import fingerprint_registry_approval_snapshot
from app.services.mintrud_historical_reapproval import (
    APPLIED,
    AUTHORIZED,
    REVIEWED,
    NewCheckAuthorization,
    ReapprovalRequest,
    add_event,
    apply_plan,
    build_plan,
    denied,
    lock_obligation,
    operation_events,
    require_legacy_without_export,
)
from app.services.mintrud_protocol_scans import MAX_SIGNED_SCAN_BYTES, scan_digest, validate_signed_scan
from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_batch_transaction import get_registry_batch_db


class EvidenceUploadLimitRoute(SignedScanUploadLimitRoute):
    upload_suffix = "/historical-reapproval"


router = APIRouter(prefix="/admin/mintrud/obligations", tags=["admin"], route_class=EvidenceUploadLimitRoute)
REVIEW_PERMISSIONS = {"mintrud.read", "mintrud.write"}
APPROVAL_PERMISSIONS = {"mintrud.read", "mintrud.approve", "mintrud.applicability.confirm"}
RECEIPT_FIELDS = ("operation_id", "approval_event_id", "approval_fingerprint", "applicability_fingerprint", "decision")


async def authenticated(token, session, *, step):
    user = await get_current_user(token=token, session=session)
    permissions = await get_user_permission_codes(user, session)
    required = {"review": (REVIEW_PERMISSIONS,), "apply": (APPROVAL_PERMISSIONS,)}.get(
        step, (REVIEW_PERMISSIONS, APPROVAL_PERMISSIONS)
    )
    if not any(access <= permissions for access in required):
        raise HTTPException(403, "Historical Mintrud reapproval is not authorized")
    return str(user.id)


async def locked_target(session, obligation_id, actor_id):
    try:
        return await lock_obligation(session, obligation_id, actor_id)
    except RegistryActionLockError:
        denied("scope_changed")


async def commit_operation(session, operation_id):
    try:
        await session.commit()
    except SQLAlchemyError as exc:
        raise HTTPException(503, {
            "code": "mintrud.historical_reapproval.commit_unconfirmed",
            "operation_id": str(operation_id),
            "next_action": "read_receipt",
        }) from exc


def receipt(event):
    return {key: event.payload[key] for key in RECEIPT_FIELDS}


@router.post("/{obligation_id}/historical-reapproval/new-check-authorization")
async def authorize_new_check(
    obligation_id: UUID,
    body: NewCheckAuthorization,
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_registry_batch_db),
):
    actor_id = await authenticated(token, session, step="review")
    target = await locked_target(session, str(obligation_id), actor_id)
    events = await operation_events(session, target.id, body.operation_id)
    payload = body.model_dump(mode="json")
    event = events.get(AUTHORIZED)
    if event:
        if event.actor_user_id != actor_id or event.payload != payload:
            denied("operation_id_conflict")
    else:
        if events:
            denied("operation_id_conflict")
        await require_legacy_without_export(session, target)
        event = add_event(session, target.id, actor_id, AUTHORIZED, payload)
        await session.flush()
        await commit_operation(session, body.operation_id)
    return {"operation_id": str(body.operation_id), "authorized_at": event.created_at}


async def verified_document(upload):
    data = await upload.read(MAX_SIGNED_SCAN_BYTES + 1)
    validate_signed_scan(upload.filename, upload.content_type, data)
    return scan_digest(data)


@router.post("/{obligation_id}/historical-reapproval")
async def reapprove_historical(
    obligation_id: UUID,
    payload: Annotated[str, Form()],
    protocol: Annotated[UploadFile, File()],
    commission_order: Annotated[UploadFile, File()],
    authority: Annotated[UploadFile, File()],
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_registry_batch_db),
):
    try:
        body = ReapprovalRequest.model_validate_json(payload)
    except ValidationError:
        raise HTTPException(422, "Invalid historical reapproval request") from None
    actor_id = await authenticated(token, session, step=body.step)
    hashes = {
        "protocol": await verified_document(protocol),
        "commission_order": await verified_document(commission_order),
        "authority": await verified_document(authority),
    }
    target = await locked_target(session, str(obligation_id), actor_id)
    evidence = body.evidence
    events = await operation_events(session, target.id, evidence.operation_id)
    request_fingerprint = fingerprint_registry_approval_snapshot({
        "evidence": evidence.model_dump(mode="json"), "document_sha256": hashes,
    })
    applied = events.get(APPLIED)
    review = events.get(REVIEWED)
    if applied:
        if (body.step == "apply" and applied.actor_user_id == actor_id and review
                and review.payload["request_fingerprint"] == request_fingerprint
                and applied.payload["plan_fingerprint"] == body.expected_plan):
            return {"state": "applied", **receipt(applied)}
        denied("operation_id_conflict")

    plan = await build_plan(session, target, evidence, hashes, events.get(AUTHORIZED))
    facts, before, *_ = plan
    plan_fingerprint = fingerprint_registry_approval_snapshot(facts)
    if body.step == "preview":
        return {
            "state": "preview", "operation_id": str(evidence.operation_id), "plan_fingerprint": plan_fingerprint,
            "original_approval_audit_id": before["approval_audit_id"], "decision": "required",
            "rule_version": facts["rule_version"], "applicability_fingerprint": facts["applicability_fingerprint"],
        }
    if plan_fingerprint != body.expected_plan:
        denied("plan_changed")

    if body.step == "review":
        if review:
            if review.actor_user_id != actor_id or review.payload["plan_fingerprint"] != plan_fingerprint:
                denied("operation_id_conflict")
        else:
            add_event(session, target.id, actor_id, REVIEWED, {
                "operation_id": str(evidence.operation_id),
                "plan_fingerprint": plan_fingerprint,
                "request_fingerprint": request_fingerprint,
                **facts,
            })
            await session.flush()
            await commit_operation(session, evidence.operation_id)
        return {"state": "reviewed", "operation_id": str(evidence.operation_id), "plan_fingerprint": plan_fingerprint}

    if not review or review.payload["plan_fingerprint"] != plan_fingerprint:
        denied("document_review_required")
    if review.actor_user_id in {None, actor_id}:
        raise HTTPException(403, "Review and approval require different administrators")
    reviewer = await session.get(User, review.actor_user_id)
    authorization = events.get(AUTHORIZED)
    if reviewer is None or not reviewer.is_active or not REVIEW_PERMISSIONS <= await get_user_permission_codes(reviewer, session):
        denied("reviewer_no_longer_authorized")
    if authorization and authorization.actor_user_id == actor_id:
        raise HTTPException(403, "New knowledge check authorization and approval require different administrators")
    try:
        result = await apply_plan(session, target, evidence, plan, actor_id, review)
    except IntegrityError:
        denied("write_conflict")
    await commit_operation(session, evidence.operation_id)
    return {"state": "applied", **result}


@router.get("/{obligation_id}/historical-reapproval/{operation_id}")
async def historical_reapproval_receipt(
    obligation_id: UUID,
    operation_id: UUID,
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
):
    await authenticated(token, session, step="preview")
    events = await operation_events(session, str(obligation_id), operation_id)
    if APPLIED in events:
        return {"state": "applied", **receipt(events[APPLIED])}
    if REVIEWED in events:
        return {"state": "reviewed", "operation_id": str(operation_id)}
    if AUTHORIZED in events:
        return {"state": "new_check_authorized", "operation_id": str(operation_id),
                "authorized_at": events[AUTHORIZED].created_at}
    return {"state": "absent", "operation_id": str(operation_id)}
