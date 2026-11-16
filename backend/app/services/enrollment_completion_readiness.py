"""Evaluate pre-completion data without touching documents or registry records."""
from dataclasses import dataclass
from datetime import date
import re

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.user import User
from app.schemas.account import AccountCompletionReadinessResponse, CompletionReadinessIssue
from app.services.compliance_registry_rules import (
    DECISION_REQUIRED,
    DECISION_UNDETERMINED,
    evaluate_course_registry_requirements,
)
from app.services.learner_profile_fields import (
    is_valid_learner_email,
    is_valid_learner_phone,
    is_valid_learner_snils,
    normalize_learner_email,
    normalize_learner_name,
    normalize_learner_phone,
    normalize_learner_snils,
)


@dataclass(frozen=True)
class EnrollmentEmployerData:
    """M2 input for the same enrollment, resolved before a registry obligation exists."""

    enrollment_id: str
    profession_or_position: str | None = None
    employer_name: str | None = None
    employer_inn: str | None = None


def evaluate_enrollment_completion_readiness(
    enrollment: Enrollment,
    course: Course,
    user: User,
    profile: LearnerProfile | None,
    *,
    employer: EnrollmentEmployerData | None = None,
) -> AccountCompletionReadinessResponse:
    missing = []
    invalid = []
    unresolved = False

    def issue(target, field, kind, message, owner="learner"):
        target.append(CompletionReadinessIssue(
            code=f"completion.{field}.{kind}", field=field, message=message, resolvable_by=owner,
        ))

    def result(status):
        return AccountCompletionReadinessResponse(
            is_ready=status == "ready", status=status, missing_fields=missing, invalid_fields=invalid,
            requires_administrator_action=any(item.resolvable_by == "administrator" for item in missing + invalid),
            policy_unresolved=unresolved,
        )

    if enrollment.course_id != course.id or enrollment.user_id != user.id or (
        profile is not None and profile.user_id != user.id
    ):
        issue(invalid, "enrollment", "source_mismatch", "Не удалось сверить источники данных зачисления.", "administrator")
        return result("incomplete")
    if enrollment.status == "completed":
        return result("already_completed")

    try:
        rules = evaluate_course_registry_requirements(
            regulatory_program_type=course.regulatory_program_type,
            frdo_requirement_mode=course.frdo_requirement_mode,
            mintrud_requirement_mode=course.mintrud_requirement_mode,
        )
    except ValueError:
        unresolved = True
        issue(invalid, "course.registry_policy", "unresolved", "Требования реестров курса требуют проверки.", "administrator")
        rules = {}
    for registry, rule in rules.items():
        if rule.decision == DECISION_UNDETERMINED:
            unresolved = True
            issue(missing, f"course.{registry}_requirement_mode", "unresolved",
                  "Администратору нужно определить применимость реестра.", "administrator")

    for key, message in (("last_name", "Укажите фамилию."), ("first_name", "Укажите имя.")):
        if not normalize_learner_name(getattr(profile, key, None)):
            issue(missing, f"learner_profile.{key}", "missing", message)

    frdo = "frdo" in rules and rules["frdo"].decision == DECISION_REQUIRED
    mintrud = "mintrud" in rules and rules["mintrud"].decision == DECISION_REQUIRED
    vocational_frdo = frdo and course.regulatory_program_type == "vocational_training"
    birth_date = getattr(profile, "birth_date", None)
    sex = normalize_learner_name(getattr(profile, "sex", None))
    citizenship = normalize_learner_name(getattr(profile, "citizenship_country_code", None))
    if birth_date is None and frdo:
        issue(missing, "learner_profile.birth_date", "missing", "Укажите дату рождения.")
    elif birth_date is not None and birth_date > date.today():
        issue(invalid, "learner_profile.birth_date", "invalid", "Дата рождения не может быть в будущем.")
    if not sex and frdo:
        issue(missing, "learner_profile.sex", "missing", "Укажите пол.")
    elif sex and sex not in {"male", "female"}:
        issue(invalid, "learner_profile.sex", "invalid", "Проверьте значение поля «Пол».")
    if not citizenship and vocational_frdo:
        issue(missing, "learner_profile.citizenship_country_code", "missing", "Укажите гражданство.")
    elif citizenship and not re.fullmatch(r"[0-9]{3}", citizenship):
        issue(invalid, "learner_profile.citizenship_country_code", "invalid", "Проверьте код гражданства.")

    snils = normalize_learner_name(getattr(profile, "snils", None))
    if not snils and (mintrud or (vocational_frdo and citizenship == "643")):
        issue(missing, "learner_profile.snils", "missing", "Укажите СНИЛС.")
    elif snils:
        normalized = normalize_learner_snils(snils)
        if not re.fullmatch(r"[0-9 -]+", snils) or not normalized or not is_valid_learner_snils(normalized):
            issue(invalid, "learner_profile.snils", "invalid", "Проверьте формат и контрольное число СНИЛС.")

    for key, normalize, validate, message in (
        ("email", normalize_learner_email, is_valid_learner_email, "Проверьте адрес электронной почты."),
        ("phone", normalize_learner_phone, is_valid_learner_phone, "Проверьте номер телефона."),
    ):
        supplied = normalize_learner_name(getattr(profile, key, None))
        if supplied:
            normalized = normalize(supplied)
            if not normalized or not validate(normalized) or (key == "phone" and not re.fullmatch(r"[0-9+()\s-]+", supplied)):
                issue(invalid, f"learner_profile.{key}", "invalid", message)

    if mintrud:
        if employer is None:
            issue(missing, "employer", "source_unavailable",
                  "Сведения о работодателе до завершения обучения ещё недоступны.", "administrator")
        elif employer.enrollment_id != enrollment.id:
            issue(invalid, "employer", "source_mismatch", "Источник работодателя относится к другому зачислению.", "administrator")
        else:
            for key, message in (
                ("profession_or_position", "Укажите профессию или должность."),
                ("employer_name", "Укажите наименование работодателя."),
                ("employer_inn", "Укажите ИНН работодателя."),
            ):
                if not normalize_learner_name(getattr(employer, key)):
                    issue(missing, f"employer.{key}", "missing", message)
            inn = normalize_learner_name(employer.employer_inn)
            if inn and not re.fullmatch(r"(?:[0-9]{10}|[0-9]{12})", inn):
                issue(invalid, "employer.employer_inn", "invalid", "Проверьте формат ИНН работодателя.")

    if unresolved:
        return result("policy_unresolved")
    return result("incomplete" if missing or invalid else "ready")
