"""Operator confirmation of the current automatic decision for a fresh obligation."""

from fastapi import HTTPException
from sqlalchemy import or_, select

from app.models.audit_event import AuditEvent
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.user import User
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_applicability_writer import (
    PROTECTED_LIFECYCLE_STATUSES,
    persist_registry_applicability,
)

CONFIRMABLE = {"required", "not_required"}
PROTECTED_FIELDS = (
    "approved_at", "approved_by_user_id", "approval_snapshot_json", "approval_fingerprint",
    "approval_event_id", "approval_invalidated_at", "approval_invalidation_reason",
    "submitted_at", "accepted_at", "external_id",
)


def conflict(code, message):
    return HTTPException(409, {"code": "registry.applicability_" + code, "message": message})


async def get_target(session, registry, obligation_id):
    obligation = await session.scalar(select(RegistryObligation).where(
        RegistryObligation.id == obligation_id, RegistryObligation.registry == registry,
    ))
    if obligation is None:
        raise HTTPException(404, "Реестровое обязательство не найдено.")
    return obligation


async def inspect_automatic_applicability(session, obligation, *, can_write):
    registry = obligation.registry
    current = await load_current_registry_applicability_inputs(session=session, obligation=obligation)
    evaluation = current.evaluation
    saved = await session.scalar(select(RegistryApplicabilityRecord).where(
        RegistryApplicabilityRecord.enrollment_id == obligation.enrollment_id,
        RegistryApplicabilityRecord.registry == registry,
    ))
    has_history = await session.scalar(select(or_(
        select(RegistrySubmissionAttempt.id).where(
            RegistrySubmissionAttempt.obligation_id == obligation.id,
        ).exists(),
        select(RegistrySubmissionBatchItem.id).where(
            RegistrySubmissionBatchItem.obligation_id == obligation.id,
        ).exists(),
    )))
    protected = (
        has_history or obligation.status in PROTECTED_LIFECYCLE_STATUSES
        or any(getattr(obligation, field) is not None for field in PROTECTED_FIELDS)
    )
    matches = saved is not None and (
        saved.source, saved.decision, saved.rule_code, saved.rule_version, saved.input_fingerprint,
    ) == ("auto", evaluation.status, evaluation.rule_code, evaluation.rule_version, current.fingerprint)
    blocked = None
    if protected:
        blocked = "protected_history"
    elif saved is not None and saved.source != "auto":
        blocked = "protected_decision"
    elif evaluation.status not in CONFIRMABLE:
        blocked = "needs_review"
    elif not can_write:
        blocked = "permission_required"
    elif matches:
        blocked = "already_current"

    confirmed_by = None
    if saved is not None and saved.source == "auto":
        confirmed_by = await session.scalar(
            select(User.full_name).join(AuditEvent, AuditEvent.actor_user_id == User.id).where(
                AuditEvent.action == f"admin.{registry}_applicability_confirmed",
                AuditEvent.entity_type == "registry_obligation",
                AuditEvent.entity_id == obligation.id,
                AuditEvent.payload["decision_version"].as_integer() == saved.decision_version,
            ).order_by(AuditEvent.created_at.desc()).limit(1)
        )
    view = {
        "obligation_id": obligation.id,
        "registry": registry,
        "calculated_decision": evaluation.status,
        "rule_code": evaluation.rule_code,
        "rule_version": evaluation.rule_version,
        "rule_reason": evaluation.reason,
        "input_fingerprint": current.fingerprint,
        "decision_state": "current" if matches else "stale" if saved is not None else "missing",
        "decision_version": saved.decision_version if saved is not None else 0,
        "saved_decision": saved.decision if saved is not None else None,
        "saved_source": saved.source if saved is not None else None,
        "decided_at": saved.decided_at if saved is not None else None,
        "confirmed_by": confirmed_by,
        "protected_history": bool(protected),
        "can_confirm": blocked is None,
        "block_reason": blocked,
    }
    return view, current


async def confirm_automatic_applicability(session, obligation, *, expectation, actor_id):
    view, current = await inspect_automatic_applicability(session, obligation, can_write=True)
    if (current.fingerprint != expectation.expected_input_fingerprint
            or current.evaluation.rule_version != expectation.expected_rule_version):
        raise conflict("changed", "Расчёт изменился. Обновите данные перед подтверждением.")

    reason = view["block_reason"]
    if reason == "already_current":
        return {"saved": False, "decision_version": view["decision_version"]}
    if reason:
        raise conflict(reason, "Подтверждение недоступно. Проверьте состояние и историю обязательства.")
    if view["decision_version"] != expectation.expected_version:
        raise conflict("changed", "Версия решения изменилась. Обновите данные перед подтверждением.")

    record, changed = await persist_registry_applicability(
        session=session, enrollment_id=obligation.enrollment_id,
        evaluation=current.evaluation, input_fingerprint=current.fingerprint,
    )
    if changed:
        session.add(AuditEvent(
            actor_user_id=actor_id, action=f"admin.{obligation.registry}_applicability_confirmed",
            entity_type="registry_obligation", entity_id=obligation.id,
            payload={
                "registry": obligation.registry, "source": "auto",
                "decision": record.decision, "decision_version": record.decision_version,
                "previous_decision": view["saved_decision"], "previous_version": view["decision_version"],
                "rule_code": record.rule_code, "rule_version": record.rule_version,
                "input_fingerprint": record.input_fingerprint,
            },
        ))
    return {"saved": changed, "decision_version": record.decision_version}
