"""Rules and persistence helpers for the pre-completion employment form."""
import re
from typing import Literal

from sqlalchemy import exists, or_, select

from app.models.enrollment_employment_details import EnrollmentEmploymentDetails
from app.models.mintrud_registry_context import (
    MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING,
    MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER,
)
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.services.compliance_registry_rules import (
    DECISION_NOT_REQUIRED, DECISION_REQUIRED, evaluate_mintrud_requirement,
)
from app.services.registry_applicability_writer import PROTECTED_LIFECYCLE_STATUSES


EmploymentRequirement = Literal["not_required", "administrator_action", "position_only", "employer_required"]
EmploymentScenario = Literal["external_training_provider", "employer_self_training"]
EMPLOYMENT_FIELDS = ("profession_or_position", "employer_name", "employer_inn")


def is_valid_russian_inn(value: str) -> bool:
    if not re.fullmatch(r"(?:[0-9]{10}|[0-9]{12})", value) or not value.strip("0"):
        return False
    digits = tuple(map(int, value))

    def check(weights):
        return sum(digit * weight for digit, weight in zip(digits, weights)) % 11 % 10

    if len(digits) == 10:
        return digits[9] == check((2, 4, 10, 3, 5, 9, 4, 6, 8))
    return digits[10] == check((7, 2, 4, 10, 3, 5, 9, 4, 6, 8)) and digits[11] == check(
        (3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8)
    )


def employment_requirement(decision, scenario) -> EmploymentRequirement:
    if decision == DECISION_NOT_REQUIRED:
        return "not_required"
    if decision == DECISION_REQUIRED:
        if scenario == MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING:
            return "position_only"
        if scenario == MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER:
            return "employer_required"
    return "administrator_action"


def course_employment_requirement(course, details) -> EmploymentRequirement:
    try:
        rule = evaluate_mintrud_requirement(
            regulatory_program_type=course.regulatory_program_type,
            requirement_mode=course.mintrud_requirement_mode,
        )
    except ValueError:
        return "administrator_action"
    return employment_requirement(rule.decision, getattr(details, "reporting_scenario", None))


async def get_employment_details(session, enrollment_id):
    return await session.scalar(select(EnrollmentEmploymentDetails).where(
        EnrollmentEmploymentDetails.enrollment_id == enrollment_id,
    ))


async def employment_is_editable(session, enrollment) -> bool:
    if enrollment.status == "completed" or enrollment.completed_at is not None:
        return False
    protected = select(RegistryObligation.id).where(
        RegistryObligation.enrollment_id == enrollment.id,
        or_(
            RegistryObligation.status.in_(PROTECTED_LIFECYCLE_STATUSES),
            RegistryObligation.approval_event_id.is_not(None),
            RegistryObligation.approved_at.is_not(None),
            RegistryObligation.approved_by_user_id.is_not(None),
            RegistryObligation.approval_fingerprint.is_not(None),
            RegistryObligation.approval_snapshot_json.is_not(None),
            RegistryObligation.approval_invalidated_at.is_not(None),
            RegistryObligation.submitted_at.is_not(None),
            RegistryObligation.accepted_at.is_not(None),
            RegistryObligation.external_id.is_not(None),
            exists().where(RegistrySubmissionAttempt.obligation_id == RegistryObligation.id),
            exists().where(RegistrySubmissionBatchItem.obligation_id == RegistryObligation.id),
        ),
    )
    return not await session.scalar(select(exists(protected)))
