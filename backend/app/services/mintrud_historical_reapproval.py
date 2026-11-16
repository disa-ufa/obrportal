"""Document-bound reapproval of one legacy Mintrud obligation."""
from datetime import date
from types import SimpleNamespace
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from sqlalchemy import select

from app.models.audit_event import AuditEvent
from app.models.base import utcnow
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_applicability import RegistryApplicabilityEvent, RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.user import User
from app.services.compliance_registry_approval import (
    apply_registry_approval,
    build_registry_approval_snapshot,
    fingerprint_registry_approval_snapshot,
)
from app.services.compliance_registry_readiness import evaluate_registry_readiness
from app.services.mintrud_learn_programs import load_course_mintrud_learn_programs
from app.services.mintrud_local_workflow import read_review
from app.services.mintrud_protocol_export_preview import _xml_input_issues
from app.services.mintrud_reporting_organization import resolve_mintrud_reporting_organization
from app.services.registry_action_scope import discover_registry_action_scope
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_batch_transaction import KEY


AUTHORIZED = "admin.mintrud_new_check_authorized"
REVIEWED = "admin.mintrud_historical_reapproval_reviewed"
APPLIED = "admin.mintrud_historical_reapproval_applied"
ORIGINAL = "admin.mintrud_obligation_approved"
LOCAL_ZONE = ZoneInfo("Asia/Yekaterinburg")
PROTOCOL_FIELDS = ("protocol_number", "knowledge_check_date", "knowledge_check_result")
CONTEXT_FIELDS = (*PROTOCOL_FIELDS, "reporting_scenario", "profession_or_position", "employer_name", "employer_inn")
EXPORT_ACTIONS = (
    "admin.mintrud_portal_artifact_prepared",
    "admin.mintrud_registry_export_prepared",
    "admin.mintrud_submission_batch_prepared",
)
DocumentRef = Annotated[str, Field(min_length=3, max_length=128, pattern=r"^[^\x00-\x1f\x7f]+$")]
Fingerprint = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class NewCheckAuthorization(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    operation_id: UUID
    authorization_reference: DocumentRef
    signed_original_unavailable: Literal[True]


class ReapprovalEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    operation_id: UUID
    mode: Literal["historical_protocol", "new_check"]
    protocol_reference: DocumentRef
    protocol_number: Annotated[str, Field(min_length=1, max_length=128)]
    protocol_date: date
    signed_on: date
    knowledge_check_date: date
    knowledge_check_result: Literal["satisfactory", "unsatisfactory"]
    knowledge_check_at: AwareDatetime | None = None
    commission_order_reference: DocumentRef
    commission_order_date: date
    authority_reference: DocumentRef
    program_uuid: UUID
    reporter_name: Annotated[str, Field(min_length=1, max_length=512)]
    reporter_inn: Annotated[str, Field(pattern=r"^[0-9]{10}$")]
    originals_and_participant_checked: Literal[True]


class ReapprovalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step: Literal["preview", "review", "apply"]
    evidence: ReapprovalEvidence
    expected_plan: Fingerprint | None = None


def denied(code):
    raise HTTPException(409, {"code": "mintrud.historical_reapproval." + code})


async def lock_obligation(session, obligation_id, actor_id):
    fence = session.info[KEY]
    fence.require_session(session, "exclusive")
    candidate = await session.get(RegistryObligation, obligation_id)
    if candidate is None or candidate.registry != "mintrud":
        raise HTTPException(404, "Mintrud obligation not found")
    scope_args = dict(session=session, registry="mintrud", actor_id=actor_id, obligation_ids=(obligation_id,))
    scope = await discover_registry_action_scope(**scope_args)
    (obligation,) = await fence.action_lockset(source_fences=scope.source_fences, obligation_targets=scope.targets)
    if scope != await discover_registry_action_scope(**scope_args):
        denied("scope_changed")
    return obligation


async def operation_events(session, obligation_id, operation_id):
    events = (await session.scalars(select(AuditEvent).where(
        AuditEvent.entity_type == "registry_obligation",
        AuditEvent.entity_id == obligation_id,
        AuditEvent.action.in_((AUTHORIZED, REVIEWED, APPLIED)),
        AuditEvent.payload["operation_id"].as_string() == str(operation_id),
    ))).all()
    by_action = {item.action: item for item in events}
    if len(by_action) != len(events):
        denied("audit_conflict")
    return by_action


def add_event(session, obligation_id, actor_id, action, payload):
    event = AuditEvent(actor_user_id=actor_id, action=action, entity_type="registry_obligation",
                       entity_id=obligation_id, payload=payload)
    session.add(event)
    return event


async def require_legacy_without_export(session, obligation):
    if (
        obligation.status not in {"approved", "needs_approval"}
        or not obligation.approved_at or not obligation.approved_by_user_id
        or any(value is not None for value in (
            obligation.approval_event_id, obligation.approval_snapshot_json, obligation.approval_fingerprint,
            obligation.submitted_at, obligation.accepted_at, obligation.external_id, obligation.last_error,
        ))
    ):
        denied("legacy_state_required")
    for model in (RegistrySubmissionAttempt, RegistrySubmissionBatchItem):
        if await session.scalar(select(model.id).where(model.obligation_id == obligation.id).limit(1)):
            denied("export_history_present")
    audit = (await session.scalars(select(AuditEvent).where(
        AuditEvent.entity_type == "registry_obligation",
        AuditEvent.entity_id == obligation.id,
        AuditEvent.action.in_((ORIGINAL, *EXPORT_ACTIONS)),
    ))).all()
    if any(item.action in EXPORT_ACTIONS for item in audit):
        denied("export_history_present")
    if len(audit) != 1 or audit[0].actor_user_id != obligation.approved_by_user_id:
        denied("original_audit_unverified")
    decision_exists = await session.scalar(select(RegistryApplicabilityRecord.id).where(
        RegistryApplicabilityRecord.enrollment_id == obligation.enrollment_id,
        RegistryApplicabilityRecord.registry == "mintrud",
    ))
    if decision_exists is not None:
        denied("decision_already_exists")
    return audit[0]


def validate_document_dates(evidence, obligation, enrollment, before, authorized, now):
    today = now.astimezone(LOCAL_ZONE).date()
    approval_date = obligation.approved_at.astimezone(LOCAL_ZONE).date()
    completed_at = enrollment.completed_at
    if (
        completed_at is None
        or not evidence.commission_order_date <= evidence.knowledge_check_date <= evidence.protocol_date <= evidence.signed_on <= today
        or evidence.knowledge_check_date < completed_at.astimezone(LOCAL_ZONE).date()
    ):
        denied("document_dates_invalid")
    proposed = tuple(getattr(evidence, name) for name in PROTOCOL_FIELDS)
    if evidence.mode == "historical_protocol":
        if authorized or evidence.knowledge_check_at or proposed != before or evidence.signed_on > approval_date:
            denied("historical_document_mismatch")
        return
    check_at = evidence.knowledge_check_at
    if (
        not authorized or not check_at
        or not max(authorized.created_at, completed_at, obligation.approved_at) < check_at <= now
        or check_at.astimezone(LOCAL_ZONE).date() != evidence.knowledge_check_date
        or evidence.protocol_number == before[0]
    ):
        denied("new_check_after_authorization_required")


async def build_plan(session, obligation, evidence, document_hashes, authorized):
    original = await require_legacy_without_export(session, obligation)
    enrollment = await session.get(Enrollment, obligation.enrollment_id)
    course = await session.get(Course, enrollment.course_id)
    learner = await session.get(User, enrollment.user_id)
    profile = await session.scalar(select(LearnerProfile).where(LearnerProfile.user_id == learner.id))
    context = await session.scalar(select(MintrudRegistryContext).where(
        MintrudRegistryContext.obligation_id == obligation.id,
    ))
    if context is None:
        denied("registry_context_missing")
    original_fields = tuple(getattr(context, name) for name in PROTOCOL_FIELDS)
    validate_document_dates(evidence, obligation, enrollment, original_fields, authorized, utcnow())
    reporter = resolve_mintrud_reporting_organization()
    if (reporter.name, reporter.inn) != (evidence.reporter_name, evidence.reporter_inn):
        denied("reporting_organization_changed")
    programs = await load_course_mintrud_learn_programs(session, course_id=course.id, active_only=True)
    if len(programs) != 1 or programs[0].id != str(evidence.program_uuid) or programs[0].schema_version != "1.0.9":
        denied("course_program_changed")
    current = await load_current_registry_applicability_inputs(session=session, obligation=obligation)
    rule = current.evaluation
    if rule.status != "required" or not (rule.rule_code and rule.rule_version and rule.reason.strip()):
        denied("required_rule_unverified")
    fields = {name: getattr(context, name) for name in CONTEXT_FIELDS}
    fields.update({name: getattr(evidence, name) for name in PROTOCOL_FIELDS})
    source = dict(registry="mintrud", enrollment=enrollment, course=course, learner_profile=profile,
                  mintrud_context=SimpleNamespace(**fields), mintrud_learn_programs=programs,
                  mintrud_reporting_organization=reporter)
    snapshot = build_registry_approval_snapshot(**source)
    readiness = evaluate_registry_readiness(**source, learner=learner)
    if not readiness.is_ready or _xml_input_issues(snapshot):
        denied("xml_inputs_not_ready")
    before = {
        "approval_audit_id": original.id,
        "approval_actor": obligation.approved_by_user_id,
        "approved_at": obligation.approved_at.isoformat(),
        "status": obligation.status,
        "invalidated_at": obligation.approval_invalidated_at,
        "invalidation_reason": obligation.approval_invalidation_reason,
        "protocol": dict(zip(PROTOCOL_FIELDS, original_fields)),
    }
    facts = {
        "evidence": evidence.model_dump(mode="json"),
        "document_sha256": document_hashes,
        "new_check_authorization_id": authorized.id if authorized else None,
        "new_check_authorization": authorized.payload if authorized else None,
        "before_digest": fingerprint_registry_approval_snapshot(before),
        "approval_fingerprint": fingerprint_registry_approval_snapshot(snapshot),
        "applicability_fingerprint": current.fingerprint,
        "rule_version": rule.rule_version,
        "rule_code": rule.rule_code,
        "course_id": course.id,
        "obligation_id": obligation.id,
    }
    return facts, before, snapshot, context, current


async def apply_plan(session, obligation, evidence, plan, actor_id, review):
    facts, before, snapshot, context, current = plan
    now = utcnow()
    for name in PROTOCOL_FIELDS:
        setattr(context, name, getattr(evidence, name))
    properties = dict(
        enrollment_id=obligation.enrollment_id, registry="mintrud", decision="required", source="auto",
        rule_code=current.evaluation.rule_code, rule_version=current.evaluation.rule_version,
        reason=current.evaluation.reason, input_fingerprint=current.fingerprint,
        decided_at=now, decision_version=1,
    )
    decision = RegistryApplicabilityRecord(**properties, evaluated_at=now)
    session.add(decision)
    await session.flush()
    session.add(RegistryApplicabilityEvent(**properties, applicability_id=decision.id, created_at=now))
    approval = apply_registry_approval(obligation, current_snapshot=snapshot, approved_by_user_id=actor_id, approved_at=now)
    result = {
        "operation_id": str(evidence.operation_id),
        "approval_event_id": obligation.approval_event_id,
        "approval_fingerprint": approval.fingerprint,
        "applicability_fingerprint": current.fingerprint,
        "decision": "required",
    }
    add_event(session, obligation.id, actor_id, APPLIED, {
        **result,
        "before": {**before, "protocol": {key: str(value) if value is not None else None
                                          for key, value in before["protocol"].items()},
                   "invalidated_at": before["invalidated_at"].isoformat() if before["invalidated_at"] else None},
        "review_audit_id": review.id,
        "decision_id": decision.id,
        "plan_fingerprint": fingerprint_registry_approval_snapshot(facts),
    })
    await session.flush()
    ready, _, _ = await read_review(session, obligation.id, general_export=True)
    if not (ready["batch_eligible"] and ready["approval_current"] and ready["decision_state"] == "current"):
        denied("postwrite_readiness_failed")
    return result
