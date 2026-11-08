"""Read-only protocol composition and export diagnostics. No persistence or XML creation."""
from __future__ import annotations

from collections import Counter
from copy import deepcopy
from datetime import date, datetime, timezone
from hashlib import sha256
import json
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol, MintrudKnowledgeProtocolMember
from app.models.mintrud_learn_program import CourseMintrudLearnProgram, MintrudLearnProgram
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatch, RegistrySubmissionBatchItem
from app.models.user import User
from app.services.compliance_registry_approval import build_registry_approval_snapshot, evaluate_registry_approval
from app.services.compliance_registry_readiness import evaluate_registry_readiness
from app.services.mintrud_eisot_xml import _required_date_text, _required_text, _require_programs, _learn_program_id, _is_passed_bit
from app.services.mintrud_employer import resolve_mintrud_employer_from_approval_snapshot
from app.services.mintrud_protocol_reconciliation import _verified_recorded_participants
from app.services.mintrud_reporting_organization import resolve_mintrud_reporting_organization
from app.services.registry_applicability import evaluate_course_registry_applicability
from app.services.registry_applicability_db_inputs import CurrentRegistryApplicabilityInputs
from app.services.registry_applicability_fingerprint import RegistryApplicabilityInputs, fingerprint_applicability_inputs
from app.services.registry_batch_p0_policy import BatchApplicabilityInput, require_current_registry_batch_applicability

CATEGORIES = ("ready_for_approval", "approved_current", "needs_data", "applicability_review", "conflict", "already_exported", "protected_history", "not_eligible")
PROTOCOL_FIELDS = ("id", "course_id", "protocol_number", "protocol_date", "status", "commission_order_number", "commission_order_date", "commission_chair", "commission_members_json", "recorded_at", "recorded_by_user_id", "recording_request_id", "recorded_snapshot", "recorded_snapshot_sha256", "updated_at")


def _json_value(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError("Unsupported preview input type")


def input_revision(snapshot: dict) -> str:
    return sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=_json_value, allow_nan=False).encode("utf-8")).hexdigest()


def _plain(row, fields=None):
    if row is None:
        return None
    fields = fields or tuple(column.key for column in row.__table__.columns)
    return {key: deepcopy(getattr(row, key, None)) for key in fields}


def _ns(value):
    return SimpleNamespace(**value) if value is not None else None


def _index(rows, key="id"):
    result = {}
    for row in rows:
        identity = str(row[key])
        if identity in result:
            raise HTTPException(409, "Неоднозначные связи данных. Автоматическая проверка остановлена.")
        result[identity] = row
    return result


def _uuid(value):
    try:
        return isinstance(value, str) and str(UUID(value)) == value
    except (ValueError, TypeError, AttributeError):
        return False


async def load_protocol_inputs(session: AsyncSession, protocol_id: str) -> dict:
    """Anchored on ALL saved member rows; missing joins never silently discard a member."""
    protocol = await session.scalar(select(MintrudKnowledgeProtocol).where(MintrudKnowledgeProtocol.id == protocol_id).execution_options(populate_existing=True))
    if protocol is None:
        raise HTTPException(404, "Протокол не найден.")
    frozen_protocol = _plain(protocol, PROTOCOL_FIELDS)

    async def rows(model, *conditions, statement=None):
        query = statement if statement is not None else select(model).where(*conditions)
        values = (await session.scalars(query.order_by(model.id).execution_options(populate_existing=True))).all()
        return [_plain(value) for value in values]

    members = await rows(MintrudKnowledgeProtocolMember, MintrudKnowledgeProtocolMember.protocol_id == protocol_id)
    if len(members) > 100:
        raise HTTPException(409, "Состав превышает поддерживаемые 100 участников. Частичная готовность не рассчитывается.")
    enrollment_ids = [m["enrollment_id"] for m in members]
    obligation_ids = [m["obligation_id"] for m in members]
    enrollments = await rows(Enrollment, Enrollment.id.in_(enrollment_ids))
    user_ids = [r["user_id"] for r in enrollments]
    courses = await rows(Course, Course.id == frozen_protocol["course_id"])
    users = await rows(User, User.id.in_(user_ids))
    # Authentication secrets and unrelated personal fields are not preview inputs.
    users = [{key: r.get(key) for key in ("id", "full_name", "is_active")} for r in users]
    profiles = await rows(LearnerProfile, LearnerProfile.user_id.in_(user_ids))
    profiles = [{key: r.get(key) for key in ("id", "user_id", "last_name", "first_name", "middle_name", "snils", "updated_at")} for r in profiles]
    obligations = await rows(RegistryObligation, or_(RegistryObligation.id.in_(obligation_ids), and_(RegistryObligation.enrollment_id.in_(enrollment_ids), RegistryObligation.registry == "mintrud")))
    contexts = await rows(MintrudRegistryContext, MintrudRegistryContext.obligation_id.in_(obligation_ids))
    decisions = await rows(RegistryApplicabilityRecord, RegistryApplicabilityRecord.enrollment_id.in_(enrollment_ids), RegistryApplicabilityRecord.registry == "mintrud")
    documents = await rows(DocumentRecord, DocumentRecord.enrollment_id.in_(enrollment_ids))
    programs = await rows(MintrudLearnProgram, statement=select(MintrudLearnProgram).join(CourseMintrudLearnProgram, CourseMintrudLearnProgram.mintrud_learn_program_id == MintrudLearnProgram.id).where(CourseMintrudLearnProgram.course_id == frozen_protocol["course_id"]))
    attempts = await rows(RegistrySubmissionAttempt, RegistrySubmissionAttempt.obligation_id.in_(obligation_ids))
    items = await rows(RegistrySubmissionBatchItem, RegistrySubmissionBatchItem.obligation_id.in_(obligation_ids))
    batches = await rows(RegistrySubmissionBatch, RegistrySubmissionBatch.id.in_([r["batch_id"] for r in items]))
    provider = resolve_mintrud_reporting_organization()
    return {"protocol": frozen_protocol, "members": members, "courses": courses, "enrollments": enrollments, "users": users, "profiles": profiles, "obligations": obligations, "contexts": contexts, "decisions": decisions, "documents": documents, "programs": programs, "attempts": attempts, "items": items, "batches": batches, "provider": {"name": provider.name, "inn": provider.inn}}


async def read_stable_protocol_inputs(session: AsyncSession, protocol_id: str) -> tuple[dict, str]:
    # SQLAlchemy must not autoflush unrelated pending state during a GET.
    with session.no_autoflush:
        first = await load_protocol_inputs(session, protocol_id)
        revision = input_revision(first)
        second = await load_protocol_inputs(session, protocol_id)
        if input_revision(second) != revision:
            raise HTTPException(409, "Данные изменились во время чтения. Повторите проверку полного протокола.")
    return first, revision


def _protocol_view(snapshot):
    p = snapshot["protocol"]
    course = snapshot["courses"][0] if len(snapshot["courses"]) == 1 else None
    return {key: p.get(key) for key in ("id", "course_id", "protocol_number", "protocol_date", "status", "updated_at")} | {"course_title": course.get("title") if course else None, "participant_count": len(snapshot["members"])}


def composition(snapshot: dict, revision: str) -> dict:
    enrollments = _index(snapshot["enrollments"])
    users = _index(snapshot["users"])
    obligations = _index(snapshot["obligations"])
    contexts = _index(snapshot["contexts"], "obligation_id")
    members = []
    for person in snapshot["members"]:
        enrollment = enrollments.get(str(person["enrollment_id"]))
        user = users.get(str(enrollment["user_id"])) if enrollment else None
        obligation = obligations.get(str(person["obligation_id"]))
        context = contexts.get(str(person["obligation_id"]))
        items = [i for i in snapshot["items"] if i["obligation_id"] == person["obligation_id"]]
        attempts = [i for i in snapshot["attempts"] if i["obligation_id"] == person["obligation_id"]]
        members.append({"member_id": person["id"], "enrollment_id": person["enrollment_id"], "obligation_id": person["obligation_id"], "user_id": user["id"] if user else None, "learner_name": user.get("full_name") if user else "Участник не найден", "knowledge_check_date": person["knowledge_check_date"], "knowledge_check_result": person["knowledge_check_result"], "registry_status": obligation.get("status") if obligation else None, "mintrud_context": {key: context.get(key) if context else None for key in ("reporting_scenario", "profession_or_position", "employer_name", "employer_inn", "protocol_number", "knowledge_check_date", "knowledge_check_result")}, "history": {"attempt_count": len(attempts), "batch_item_count": len(items), "batch_ids": sorted({i["batch_id"] for i in items})}})
    return {"protocol": _protocol_view(snapshot), "members": members, "participant_count": len(members), "complete": True, "input_revision": revision, "read_only": True, "checked_at": None, "not_authorization_for_export": True}


def _current_applicability(snapshot, member, enrollment, course, context, obligation):
    evaluation = evaluate_course_registry_applicability(regulatory_program_type=course["regulatory_program_type"], frdo_requirement_mode=course["frdo_requirement_mode"], mintrud_requirement_mode=course["mintrud_requirement_mode"])["mintrud"]
    documents = [d for d in snapshot["documents"] if d["enrollment_id"] == enrollment["id"]]
    if len(documents) > 1:
        raise ValueError("Неоднозначный документ обучения.")
    document = documents[0] if documents else None
    if obligation.get("document_id") and (not document or document["id"] != obligation["document_id"]):
        raise ValueError("Документ обязательства не соответствует обучению.")
    if document and document.get("course_id") not in (None, course["id"]):
        raise ValueError("Документ другого курса.")
    effective_date = document.get("issued_at") if document else None
    if effective_date is None and enrollment.get("completed_at"):
        effective_date = enrollment["completed_at"].date()
    inputs = RegistryApplicabilityInputs(registry="mintrud", enrollment_id=enrollment["id"], course_id=course["id"], regulatory_program_type=course["regulatory_program_type"], requirement_mode=course["mintrud_requirement_mode"], rule_code=evaluation.rule_code, rule_version=evaluation.rule_version, course_document_type=course.get("document_type"), issued_document_type=document.get("document_type") if document else None, organization_id=enrollment.get("organization_id"), reporting_scenario=context.get("reporting_scenario") if context else None, effective_date=effective_date, mintrud_program_codes=tuple(sorted(f"{p['schema_version']}:{p['code']}" for p in snapshot["programs"])), employer_name=context.get("employer_name") if context else None, employer_inn=context.get("employer_inn") if context else None)
    current = CurrentRegistryApplicabilityInputs(inputs=inputs, evaluation=evaluation, fingerprint=fingerprint_applicability_inputs(inputs))
    decisions = [d for d in snapshot["decisions"] if d["enrollment_id"] == member["enrollment_id"]]
    if len(decisions) > 1:
        raise ValueError("Неоднозначное решение применимости.")
    decision = decisions[0] if decisions else None
    require_current_registry_batch_applicability(registry="mintrud", entries=[BatchApplicabilityInput(_ns(obligation), _ns(decision), current)])
    return current


def _xml_input_issues(snapshot):
    """Reuse serializer's PURE field validators; never instantiate an XML element."""
    try:
        for group, keys in (("learner_profile", ("last_name", "first_name", "snils")), ("mintrud_context", ("profession_or_position", "protocol_number")), ("mintrud_reporting_organization", ("name", "inn"))):
            for key in keys:
                _required_text(snapshot[group].get(key), field=f"{group}.{key}")
        _required_date_text(snapshot["mintrud_context"].get("knowledge_check_date"), field="mintrud_context.knowledge_check_date")
        _is_passed_bit(snapshot["mintrud_context"].get("knowledge_check_result"))
        resolve_mintrud_employer_from_approval_snapshot(snapshot)
        programs = _require_programs(snapshot["mintrud_learn_programs"])
        ids = []
        for index, program in enumerate(programs):
            if program.get("schema_version") != "1.0.9":
                raise ValueError("Неверная версия классификатора Минтруда.")
            ids.append(_learn_program_id(program.get("learn_program_id"), index=index))
            _required_text(program.get("title"), field="mintrud_learn_program.title")
        if len(set(ids)) != len(ids):
            raise ValueError("Повтор программы обучения в классификаторе.")
        if len(ids) > 5000:
            raise ValueError("Превышен предел записей XML.")
        def check(value):
            if isinstance(value, str) and any(not (c in "\t\n\r" or 0x20 <= ord(c) <= 0xD7FF or 0xE000 <= ord(c) <= 0xFFFD or 0x10000 <= ord(c) <= 0x10FFFF) for c in value):
                raise ValueError("Недопустимый символ XML в реквизитах.")
            if isinstance(value, dict):
                for item in value.values(): check(item)
            if isinstance(value, (tuple, list)):
                for item in value: check(item)
        check(snapshot)
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        detail = str(exc)
        target = "profile" if "learner_profile" in detail else "context"
        fields = {"learner_profile.last_name": "фамилия", "learner_profile.first_name": "имя", "learner_profile.snils": "СНИЛС", "mintrud_context.profession_or_position": "профессия или должность", "mintrud_context.protocol_number": "номер протокола", "mintrud_context.knowledge_check_date": "дата проверки знаний", "mintrud_context.knowledge_check_result": "результат комиссии", "mintrud_reporting_organization.name": "наименование организации-подателя", "mintrud_reporting_organization.inn": "ИНН организации-подателя"}
        field = next((label for key, label in fields.items() if key in detail), None)
        message = "Проверьте данные для XML: " + field + "." if field else (detail if any("А" <= c <= "я" for c in detail) else "Проверьте обязательные программы Минтруда, реквизиты работодателя и допустимые значения XML.")
        return [{"code": "xml.inputs_invalid", "message": message, "target": target}]
    return []


def evaluate_protocol_preview(snapshot: dict, revision: str) -> dict:
    result = composition(snapshot, revision)
    protocol = snapshot["protocol"]
    if not isinstance(protocol.get("protocol_number"), str) or not protocol["protocol_number"].strip() or not isinstance(protocol.get("protocol_date"), date) or protocol["protocol_date"] > date.today():
        raise HTTPException(409, "Номер или дата протокола не подтверждены.")
    people = _verified_recorded_participants(_ns(protocol))
    if people is not None and set(people) != {str(m["enrollment_id"]) for m in snapshot["members"]}:
        raise HTTPException(409, "Состав зафиксированного протокола изменился.")
    if not snapshot["members"]:
        raise HTTPException(409, "Протокол не содержит участников. Проверка не выполнена.")
    courses = _index(snapshot["courses"])
    course = courses.get(str(protocol["course_id"]))
    if people is not None:
        commission = protocol.get("commission_members_json")
        if not isinstance(commission, list) or len(commission) < 3 or any(not isinstance(name, str) or not name.strip() for name in commission) or len(set(commission)) != len(commission) or protocol.get("commission_chair") not in commission or not protocol.get("commission_order_number") or not isinstance(protocol.get("commission_order_date"), date) or protocol["commission_order_date"] > protocol["protocol_date"]:
            raise HTTPException(409, "Реквизиты комиссии не подтверждены.")
        frozen = protocol["recorded_snapshot"]
        expected = {"commission_order_number": protocol["commission_order_number"], "commission_order_date": protocol["commission_order_date"].isoformat() if protocol["commission_order_date"] else None, "commission_chair": protocol["commission_chair"], "commission_members": protocol["commission_members_json"] or [], "training_provider_name": snapshot["provider"]["name"], "program_title": course.get("title") if course else None, "program_hours": course.get("hours") if course else None}
        if any(frozen.get(key) != value for key, value in expected.items()) or frozen.get("kind") != "ADMINISTRATIVELY_RECORDED_COMMISSION_CHECK_NOT_SIGNED_NOT_EXPORTED" or not all(protocol.get(key) for key in ("recorded_at", "recorded_by_user_id", "recording_request_id")):
            raise HTTPException(409, "Реквизиты зафиксированного протокола изменились или не подтверждены.")
    enrollments = _index(snapshot["enrollments"]); users = _index(snapshot["users"])
    profiles = _index(snapshot["profiles"], "user_id"); obligations = _index(snapshot["obligations"]); contexts = _index(snapshot["contexts"], "obligation_id"); batches = _index(snapshot["batches"])
    duplicate_members = Counter(m["enrollment_id"] for m in snapshot["members"])
    approval_fields = ("approved_at", "approved_by_user_id", "approval_snapshot_json", "approval_fingerprint", "approval_event_id", "approval_invalidated_at")
    for member, output in zip(snapshot["members"], result["members"]):
        issues = []
        def add_issue(code, message, target="context"):
            issues.append({"code": code, "message": message, "target": target})
        enrollment = enrollments.get(str(member["enrollment_id"])); obligation = obligations.get(str(member["obligation_id"])); context = contexts.get(str(member["obligation_id"]))
        user = users.get(str(enrollment["user_id"])) if enrollment else None
        profile = profiles.get(str(enrollment["user_id"])) if enrollment else None
        category = None
        if not all(_uuid(str(member.get(key))) for key in ("id", "protocol_id", "enrollment_id", "obligation_id")) or member["protocol_id"] != protocol["id"] or duplicate_members[member["enrollment_id"]] != 1:
            add_issue("links.member_invalid", "Некорректная или повторная связь участника."); category = "conflict"
        if not enrollment or not obligation or not user or not course or (obligation and (obligation["registry"] != "mintrud" or obligation["enrollment_id"] != member["enrollment_id"])) or (enrollment and enrollment["course_id"] != protocol["course_id"]):
            add_issue("links.source_missing_or_mismatched", "Обучение, участник или обязательство Минтруда отсутствует либо относится к другой записи."); category = "conflict"
        confirmed = people.get(str(member["enrollment_id"])) if people is not None else None
        if confirmed is not None and (str(confirmed["obligation_id"]) != str(member["obligation_id"]) or str(confirmed.get("user_id")) != str(enrollment["user_id"] if enrollment else None) or confirmed.get("knowledge_check_date") != (member["knowledge_check_date"].isoformat() if member["knowledge_check_date"] else None) or confirmed.get("knowledge_check_result") != member["knowledge_check_result"]):
            add_issue("recorded.member_changed", "Связи или результат комиссии расходятся с сохранённым снимком."); category = "conflict"
        items = [i for i in snapshot["items"] if i["obligation_id"] == member["obligation_id"]]
        attempts = [i for i in snapshot["attempts"] if i["obligation_id"] == member["obligation_id"]]
        if any(i["batch_id"] not in batches or batches[i["batch_id"]]["registry"] != "mintrud" for i in items):
            add_issue("history.invalid_batch", "История партии имеет неподтверждённую связь."); category = category or "conflict"
        if obligation and items and obligation.get("approval_event_id") and any(i.get("approval_event_id") == obligation["approval_event_id"] for i in items):
            add_issue("history.approval_already_exported", "Текущее событие утверждения уже включено в партию."); category = category or "already_exported"
        elif obligation and (items or attempts or obligation.get("submitted_at") or obligation.get("accepted_at") or obligation.get("external_id") or obligation["status"] in ("exported", "submitted", "accepted", "rejected", "correction_required")):
            add_issue("history.protected", "Есть история утверждения, выгрузки или отправки. Требуется отдельная сверка."); category = category or "protected_history"
        if enrollment and course and obligation:
            decision = next((d for d in snapshot["decisions"] if d["enrollment_id"] == member["enrollment_id"]), None)
            if course.get("mintrud_requirement_mode") == "not_required" or (decision and decision["decision"] == "not_required"):
                add_issue("applicability.not_required", "Передача в Минтруд не требуется."); category = category or "not_eligible"
            else:
                try: _current_applicability(snapshot, member, enrollment, course, context, obligation)
                except (ValueError, TypeError, KeyError, AttributeError) as exc:
                    add_issue("applicability.unverified", "Применимость не подтверждена актуальными данными: " + str(exc)); category = category or "applicability_review"
        if people is None:
            add_issue("commission.not_recorded", "Решение комиссии ещё не зафиксировано. Онлайн-тест не заменяет решение комиссии."); category = category or "not_eligible"
        if enrollment and (enrollment.get("status") != "completed" or not enrollment.get("completed_at")):
            add_issue("enrollment.not_completed", "Обучение не завершено."); category = category or "not_eligible"
        if confirmed is not None and enrollment:
            check_date = member.get("knowledge_check_date")
            completed = enrollment.get("completed_at")
            if not isinstance(check_date, date) or check_date > protocol["protocol_date"] or (completed and check_date < completed.date()):
                add_issue("commission.invalid_date", "Дата комиссии не соответствует дате протокола или завершению обучения."); category = category or "conflict"
        if confirmed is not None and context:
            source_fields = {"protocol_number": protocol["protocol_number"], "knowledge_check_date": member["knowledge_check_date"], "knowledge_check_result": member["knowledge_check_result"]}
            different = [key for key, value in source_fields.items() if context.get(key) not in (None, "") and context[key] != value]
            if different:
                add_issue("commission.context_conflict", "Реквизиты Минтруда расходятся с решением комиссии: " + ", ".join(different)); category = category or "conflict"
        if course and enrollment and obligation:
            active_programs = tuple(_ns(p) for p in snapshot["programs"] if p.get("is_active") is True and p.get("schema_version") == "1.0.9")
            readiness = evaluate_registry_readiness(registry="mintrud", enrollment=_ns(enrollment), course=_ns(course), learner=_ns(user), learner_profile=_ns(profile), mintrud_context=_ns(context), mintrud_learn_programs=active_programs, mintrud_reporting_organization=_ns(snapshot["provider"]))
            for issue in readiness.as_error_payload():
                add_issue(issue["code"], issue["message"], "profile" if issue["code"].startswith("learner_profile") else "context")
            approval_snapshot = build_registry_approval_snapshot(registry="mintrud", enrollment=_ns(enrollment), course=_ns(course), learner_profile=_ns(profile), mintrud_context=_ns(context), mintrud_learn_programs=active_programs, mintrud_reporting_organization=_ns(snapshot["provider"]))
            xml_issues = _xml_input_issues(approval_snapshot);issues.extend(xml_issues)
            if obligation["status"] == "approved":
                event = obligation.get("approval_event_id")
                valid_event = _uuid(event) and UUID(event).version == 4
                if not valid_event or not obligation.get("approved_at") or not obligation.get("approved_by_user_id"):
                    add_issue("approval.legacy_unverified", "Событие прежнего утверждения не подтверждено."); category = category or "protected_history"
                else:
                    validation = evaluate_registry_approval(_ns(obligation), current_snapshot=approval_snapshot)
                    if not validation.is_current:
                        add_issue("approval.stale", "Утверждение устарело или повреждено: " + validation.reason); category = category or "conflict"
            elif any(obligation.get(key) is not None for key in approval_fields):
                add_issue("approval.protected_history", "Имеется прежнее утверждение; нужна отдельная сверка."); category = category or "protected_history"
            if not readiness.is_ready or xml_issues: category = category or "needs_data"
            if obligation["status"] not in ("pending_data", "ready", "needs_approval", "approved"):
                add_issue("registry.status_not_eligible", "Текущий статус записи не допускает следующую стадию."); category = category or "not_eligible"
            if category is None: category = "approved_current" if obligation["status"] == "approved" else "ready_for_approval"
        output.update(category=category or "conflict", issues=issues, approval_current=category == "approved_current")
    counts = {key: 0 for key in CATEGORIES}
    counts.update(Counter(row["category"] for row in result["members"]))
    result.update(checked_at=datetime.now(timezone.utc), protocol_status=protocol["status"], recorded_snapshot_verified=people is not None, counts=counts, summary={"total":len(result["members"]), "ready_for_approval":counts["ready_for_approval"], "approved_current":counts["approved_current"], "needs_data":counts["needs_data"], "blocked":sum(counts[key] for key in ("applicability_review", "conflict", "protected_history", "not_eligible")), "already_exported":counts["already_exported"]}, notice="Проверка отражает момент GET. recorded не является электронной подписью. Право утверждения, XML или отправки не предоставляется.")
    return result


async def preview_protocol_export(session: AsyncSession, protocol_id: str) -> dict:
    snapshot, revision = await read_stable_protocol_inputs(session, protocol_id)
    try:
        return evaluate_protocol_preview(snapshot, revision)
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        raise HTTPException(409, "Достоверность входных данных не подтверждена. Требуется сверка.") from exc
