"""Local Mintrud review. Reads never persist; confirmation uses the existing writer."""
from sqlalchemy import select, text
from fastapi import HTTPException
from app.core.config import settings
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.user import User
from app.models.learner_profile import LearnerProfile
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.mintrud_learn_program import MintrudLearnProgram, CourseMintrudLearnProgram
from app.models.audit_event import AuditEvent
from app.services.registry_applicability_db_inputs import load_current_registry_applicability_inputs
from app.services.registry_applicability_writer import persist_registry_applicability, PROTECTED_LIFECYCLE_STATUSES
from app.services.registry_batch_p0_policy import BatchApplicabilityInput, require_current_registry_batch_applicability
from app.services.compliance_registry_approval import build_registry_approval_snapshot, evaluate_registry_approval
from app.services.compliance_registry_readiness import evaluate_registry_readiness
from app.services.mintrud_reporting_organization import resolve_mintrud_reporting_organization
from app.services.mintrud_protocol_export_preview import _xml_input_issues
from app.services.registry_batch_transaction import KEY
from app.services.registry_batch_replay import require_unexported_approval_events

DB='obrportal_m4p9_workspace_20261111'
HOST='obr-m4p9-20261111-pg'
ROLE='obrportal_m4p9_login'

def deny(code, message):
    raise HTTPException(409, {'code':code,'message':message})

async def require_local_workspace(session):
    url=session.get_bind().engine.url
    if (settings.environment!='local' or settings.production_exports_enabled or
        url.drivername!='postgresql+asyncpg' or url.host!=HOST or url.port!=5432 or
        url.database!=DB or url.username!=ROLE or url.query):
        deny('mintrud.workspace_unverified','Локальная рабочая база не подтверждена.')
    row=(await session.execute(text("SELECT current_database(), current_user, rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
    if tuple(row)!=(DB,ROLE,False):
        deny('mintrud.workspace_unverified','Локальная рабочая база или ограниченная роль не подтверждена.')

PROTECTED_FIELDS=('approved_at','approved_by_user_id','approval_snapshot_json','approval_fingerprint','approval_event_id','approval_invalidated_at','submitted_at','accepted_at','external_id')

def review_policy(obligation, decision, current, has_history):
    protected=(has_history or obligation.status in PROTECTED_LIFECYCLE_STATUSES or
               any(getattr(obligation,k,None) is not None for k in PROTECTED_FIELDS))
    current_match=bool(decision and decision.input_fingerprint==current.fingerprint and
                       decision.rule_code==current.evaluation.rule_code and decision.rule_version==current.evaluation.rule_version and
                       decision.decision==current.evaluation.status and decision.source=='auto')
    reason=('Сохранённое решение актуально.' if current_match else
            'Есть утверждение или история. Нужна отдельная сверка; повторное утверждение запрещено.' if protected else
            'Ручное или историческое решение нельзя заменять автоматическим.' if decision and decision.source!='auto' else
            'Правило требует отдельного рассмотрения; автоматическое решение не сохраняется.' if current.evaluation.status=='needs_review' else
            'Решение устарело. Проверьте расчёт перед сохранением.' if decision else
            'Решение отсутствует. Проверьте расчёт перед сохранением.')
    return dict(decision_state='current' if current_match else 'stale' if decision else 'missing',
                decision_version=decision.decision_version if decision else 0,
                calculated_decision=current.evaluation.status, rule_code=current.evaluation.rule_code,
                rule_version=current.evaluation.rule_version, rule_reason=current.evaluation.reason,
                input_fingerprint=current.fingerprint, protected_history=bool(protected),
                can_save=not protected and not current_match and (decision is None or decision.source=='auto') and current.evaluation.status in ('required','not_required'),
                message=reason)

async def read_review(session, obligation_id):
    ob=await session.scalar(select(RegistryObligation).where(RegistryObligation.id==obligation_id,RegistryObligation.registry=='mintrud').execution_options(populate_existing=True))
    if ob is None: raise HTTPException(404,'Запись Минтруда не найдена.')
    dec=await session.scalar(select(RegistryApplicabilityRecord).where(RegistryApplicabilityRecord.enrollment_id==ob.enrollment_id,RegistryApplicabilityRecord.registry=='mintrud').execution_options(populate_existing=True))
    cur=await load_current_registry_applicability_inputs(session=session,obligation=ob)
    items=(await session.scalars(select(RegistrySubmissionBatchItem).where(RegistrySubmissionBatchItem.obligation_id==ob.id))).all()
    attempt=await session.scalar(select(RegistrySubmissionAttempt.id).where(RegistrySubmissionAttempt.obligation_id==ob.id).limit(1))
    result=review_policy(ob,dec,cur,bool(items) or attempt is not None)
    enrollment=await session.get(Enrollment,ob.enrollment_id)
    course=await session.get(Course,enrollment.course_id)
    learner=await session.get(User,enrollment.user_id)
    profile=await session.scalar(select(LearnerProfile).where(LearnerProfile.user_id==enrollment.user_id))
    context=await session.scalar(select(MintrudRegistryContext).where(MintrudRegistryContext.obligation_id==ob.id))
    programs=tuple((await session.scalars(select(MintrudLearnProgram).join(CourseMintrudLearnProgram,CourseMintrudLearnProgram.mintrud_learn_program_id==MintrudLearnProgram.id).where(CourseMintrudLearnProgram.course_id==course.id,MintrudLearnProgram.is_active.is_(True),MintrudLearnProgram.schema_version=='1.0.9'))).all())
    args=dict(registry='mintrud',enrollment=enrollment,course=course,learner_profile=profile,mintrud_context=context,mintrud_learn_programs=programs,mintrud_reporting_organization=resolve_mintrud_reporting_organization())
    readiness=evaluate_registry_readiness(**args,learner=learner)
    snapshot=build_registry_approval_snapshot(**args)
    issues=readiness.as_error_payload()+_xml_input_issues(snapshot)
    approval=evaluate_registry_approval(ob,current_snapshot=snapshot)
    try:
        require_current_registry_batch_applicability(registry='mintrud',entries=[BatchApplicabilityInput(ob,dec,cur)])
        gate=True
    except ValueError: gate=False
    exported=bool(items) or attempt is not None or bool(ob.submitted_at or ob.accepted_at or ob.external_id) or ob.status in ('exported','submitted','accepted','rejected','correction_required')
    replay_ok=False
    if ob.status=='approved' and not exported:
        try:
            await require_unexported_approval_events(session,obligations=[ob],error_type=ValueError)
            replay_ok=True
        except ValueError: pass
    result.update(obligation_id=str(ob.id),issues=issues,approval_current=approval.is_current,
                  historical_export=exported,data_eligible=(ob.status=='approved' and approval.is_current and not exported and readiness.is_ready and not issues and replay_ok),batch_eligible=gate and ob.status=='approved' and approval.is_current and not exported and readiness.is_ready and not issues and replay_ok,
                  read_only=True,not_authorization_for_export=True)
    return result,ob,cur

async def confirm_review(session, obligation_id, expected_version, expected_fingerprint, actor_id):
    # The request dependency acquired exclusive C before authentication or any SQL.
    fence=session.info.get(KEY)
    if fence is None: deny('mintrud.transaction_required','Повторите операцию в новой транзакции.')
    fence.require_session(session,'exclusive')
    await require_local_workspace(session)
    result,ob,cur=await read_review(session,obligation_id)
    if result['decision_version']!=expected_version or cur.fingerprint!=expected_fingerprint:
        deny('mintrud.review_changed','Данные изменились. Повторите предварительную проверку.')
    if not result['can_save']:
        deny('mintrud.review_blocked',result['message'])
    record,changed=await persist_registry_applicability(session=session,enrollment_id=ob.enrollment_id,evaluation=cur.evaluation,source='auto',input_fingerprint=cur.fingerprint)
    if changed:
        session.add(AuditEvent(actor_user_id=actor_id,action='admin.mintrud_applicability_confirmed',entity_type='registry_obligation',entity_id=str(ob.id),payload={'decision':record.decision,'decision_version':record.decision_version,'source':'auto','rule_code':cur.evaluation.rule_code,'rule_version':cur.evaluation.rule_version}))
    return {'saved':changed,'decision':record.decision,'decision_version':record.decision_version}
