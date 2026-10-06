from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import re
from typing import Any

from app.mintrud_learn_program_catalog import (
    MINTRUD_LEARN_PROGRAM_IDS_V109,
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
)
from app.models.mintrud_registry_context import (
    MINTRUD_KNOWLEDGE_CHECK_RESULTS,
    MINTRUD_REPORTING_SCENARIOS,
    MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER,
)

from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_DPO_ADVANCED_TRAINING,
    PROGRAM_TYPE_DPO_PROFESSIONAL_RETRAINING,
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


FRDO_ALLOWED_SEX_VALUES = frozenset(
    {
        "male",
        "female",
    }
)


@dataclass(frozen=True)
class RegistryReadinessIssue:
    code: str
    field: str | None
    message: str


@dataclass(frozen=True)
class RegistryReadinessResult:
    registry: str
    is_ready: bool
    issues: tuple[RegistryReadinessIssue, ...]

    @property
    def error_codes(self) -> tuple[str, ...]:
        return tuple(
            issue.code
            for issue in self.issues
        )

    def as_error_payload(self) -> list[dict[str, str | None]]:
        return [
            {
                "code": issue.code,
                "field": issue.field,
                "message": issue.message,
            }
            for issue in self.issues
        ]


def _text_present(value: object | None) -> bool:
    return bool(
        str(value or "").strip()
    )


def _append_issue(
    issues: list[RegistryReadinessIssue],
    *,
    code: str,
    field: str | None,
    message: str,
) -> None:
    issues.append(
        RegistryReadinessIssue(
            code=code,
            field=field,
            message=message,
        )
    )


def _evaluate_completion_context(
    *,
    enrollment: Any,
    course: Any,
    learner: Any,
) -> list[RegistryReadinessIssue]:
    issues: list[
        RegistryReadinessIssue
    ] = []

    if enrollment is None:
        _append_issue(
            issues,
            code="enrollment.missing",
            field="enrollment",
            message="Enrollment is missing.",
        )
        return issues

    if getattr(
        enrollment,
        "status",
        None,
    ) != "completed":
        _append_issue(
            issues,
            code="enrollment.not_completed",
            field="enrollment.status",
            message=(
                "Enrollment must be completed "
                "before registry preparation."
            ),
        )

    if getattr(
        enrollment,
        "completed_at",
        None,
    ) is None:
        _append_issue(
            issues,
            code="enrollment.completed_at_missing",
            field="enrollment.completed_at",
            message=(
                "Completion timestamp is missing."
            ),
        )

    if course is None:
        _append_issue(
            issues,
            code="course.missing",
            field="course",
            message="Course is missing.",
        )
    elif not _text_present(
        getattr(
            course,
            "title",
            None,
        )
    ):
        _append_issue(
            issues,
            code="course.title_missing",
            field="course.title",
            message="Course title is missing.",
        )

    if learner is None:
        _append_issue(
            issues,
            code="learner.missing",
            field="learner",
            message="Learner account is missing.",
        )

    return issues


# STAGE_11B_3F_FRDO_PROVENANCE_GUARD
FRDO_PO_PROGRAM_TYPES = frozenset(
    {
        PROGRAM_TYPE_VOCATIONAL_TRAINING,
    }
)

FRDO_DPO_PROGRAM_TYPES = frozenset(
    {
        PROGRAM_TYPE_DPO_ADVANCED_TRAINING,
        PROGRAM_TYPE_DPO_PROFESSIONAL_RETRAINING,
    }
)


def _frdo_program_type(
    course: Any,
) -> str:
    return str(
        getattr(
            course,
            "regulatory_program_type",
            "",
        )
        or ""
    ).strip()


def _frdo_date_value(
    value: object | None,
) -> date | None:
    if isinstance(
        value,
        datetime,
    ):
        return value.date()

    if isinstance(
        value,
        date,
    ):
        return value

    return None


def _frdo_snils_is_valid(
    value: object | None,
) -> bool:
    candidate = str(
        value
        or ""
    ).strip()

    if not re.fullmatch(
        r"\d{3}-\d{3}-\d{3} \d{2}",
        candidate,
    ):
        return False

    digits = re.sub(
        r"\D",
        "",
        candidate,
    )

    if len(digits) != 11:
        return False

    body = digits[:9]
    expected = int(
        digits[9:]
    )

    checksum_sum = sum(
        int(digit) * weight
        for digit, weight
        in zip(
            body,
            range(
                9,
                0,
                -1,
            ),
        )
    )

    if checksum_sum < 100:
        actual = checksum_sum
    elif checksum_sum in {
        100,
        101,
    }:
        actual = 0
    else:
        actual = (
            checksum_sum
            % 101
        )

        if actual == 100:
            actual = 0

    return actual == expected


def _append_missing_text_issue(
    issues: list[RegistryReadinessIssue],
    *,
    source: object | None,
    attribute: str,
    code: str,
    field: str,
    message: str,
) -> None:
    if not _text_present(
        getattr(
            source,
            attribute,
            None,
        )
    ):
        _append_issue(
            issues,
            code=code,
            field=field,
            message=message,
        )


def _append_snapshot_field_issues(
    issues: list[RegistryReadinessIssue],
    *,
    snapshot: object | None,
    snapshot_code: str,
    snapshot_field: str,
    required_fields: tuple[str, ...],
) -> None:
    if not isinstance(
        snapshot,
        dict,
    ):
        _append_issue(
            issues,
            code=snapshot_code,
            field=snapshot_field,
            message=(
                "Required FRDO snapshot "
                "is missing."
            ),
        )
        return

    for field_name in required_fields:
        if not _text_present(
            snapshot.get(
                field_name
            )
        ):
            _append_issue(
                issues,
                code=(
                    snapshot_code
                    + "."
                    + field_name
                    + "_missing"
                ),
                field=(
                    snapshot_field
                    + "."
                    + field_name
                ),
                message=(
                    "Required FRDO snapshot "
                    "field is missing."
                ),
            )


def _evaluate_frdo_readiness(
    *,
    enrollment: Any,
    course: Any,
    learner: Any,
    learner_profile: Any,
    document: Any,
    frdo_context: Any,
) -> RegistryReadinessResult:
    issues = _evaluate_completion_context(
        enrollment=enrollment,
        course=course,
        learner=learner,
    )

    if learner_profile is None:
        _append_issue(
            issues,
            code="learner_profile.missing",
            field="learner_profile",
            message=(
                "Learner regulatory profile is missing."
            ),
        )
    else:
        if not _text_present(
            getattr(
                learner_profile,
                "last_name",
                None,
            )
        ):
            _append_issue(
                issues,
                code="learner_profile.last_name_missing",
                field="learner_profile.last_name",
                message="Learner last name is missing.",
            )

        if not _text_present(
            getattr(
                learner_profile,
                "first_name",
                None,
            )
        ):
            _append_issue(
                issues,
                code="learner_profile.first_name_missing",
                field="learner_profile.first_name",
                message="Learner first name is missing.",
            )

        if getattr(
            learner_profile,
            "birth_date",
            None,
        ) is None:
            _append_issue(
                issues,
                code="learner_profile.birth_date_missing",
                field="learner_profile.birth_date",
                message="Learner birth date is missing.",
            )

        sex = getattr(
            learner_profile,
            "sex",
            None,
        )

        if not _text_present(
            sex
        ):
            _append_issue(
                issues,
                code="learner_profile.sex_missing",
                field="learner_profile.sex",
                message="Learner sex is missing.",
            )
        elif (
            str(
                sex
            )
            not in FRDO_ALLOWED_SEX_VALUES
        ):
            _append_issue(
                issues,
                code="learner_profile.sex_invalid",
                field="learner_profile.sex",
                message=(
                    "Learner sex has "
                    "an unsupported value."
                ),
            )

        citizenship = str(
            getattr(
                learner_profile,
                "citizenship_country_code",
                "",
            )
            or ""
        ).strip()

        if not citizenship:
            _append_issue(
                issues,
                code=(
                    "learner_profile."
                    "citizenship_country_code_missing"
                ),
                field=(
                    "learner_profile."
                    "citizenship_country_code"
                ),
                message=(
                    "Learner citizenship country code "
                    "is missing."
                ),
            )
        elif (
            len(
                citizenship
            )
            != 3
            or not citizenship.isdigit()
        ):
            _append_issue(
                issues,
                code=(
                    "learner_profile."
                    "citizenship_country_code_invalid"
                ),
                field=(
                    "learner_profile."
                    "citizenship_country_code"
                ),
                message=(
                    "Learner citizenship country code "
                    "must be a three-digit OKSM code."
                ),
            )

    if document is None:
        _append_issue(
            issues,
            code="document.missing",
            field="document",
            message=(
                "Completion document is missing."
            ),
        )
    else:
        enrollment_id = getattr(
            enrollment,
            "id",
            None,
        )

        document_enrollment_id = getattr(
            document,
            "enrollment_id",
            None,
        )

        if (
            enrollment_id is not None
            and document_enrollment_id is not None
            and str(
                document_enrollment_id
            )
            != str(
                enrollment_id
            )
        ):
            _append_issue(
                issues,
                code="document.enrollment_mismatch",
                field="document.enrollment_id",
                message=(
                    "Completion document belongs "
                    "to another enrollment."
                ),
            )

        if not _text_present(
            getattr(
                document,
                "document_number",
                None,
            )
        ):
            _append_issue(
                issues,
                code="document.number_missing",
                field="document.document_number",
                message=(
                    "Completion document number is missing."
                ),
            )

        if not _text_present(
            getattr(
                document,
                "document_type",
                None,
            )
        ):
            _append_issue(
                issues,
                code="document.type_missing",
                field="document.document_type",
                message=(
                    "Completion document type is missing."
                ),
            )

        if getattr(
            document,
            "revoked_at",
            None,
        ) is not None:
            _append_issue(
                issues,
                code="document.revoked",
                field="document.revoked_at",
                message=(
                    "Revoked completion document "
                    "cannot be prepared for registry export."
                ),
            )

    program_type = _frdo_program_type(
        course
    )

    if (
        program_type
        in FRDO_DPO_PROGRAM_TYPES
    ):
        _append_issue(
            issues,
            code=(
                "frdo.dpo."
                "production_contract_unconfirmed"
            ),
            field=(
                "course."
                "regulatory_program_type"
            ),
            message=(
                "Current production DPO FRDO "
                "contract is not confirmed."
            ),
        )

        return RegistryReadinessResult(
            registry=REGISTRY_FRDO,
            is_ready=False,
            issues=tuple(
                issues
            ),
        )

    if (
        program_type
        not in FRDO_PO_PROGRAM_TYPES
    ):
        return RegistryReadinessResult(
            registry=REGISTRY_FRDO,
            is_ready=len(
                issues
            )
            == 0,
            issues=tuple(
                issues
            ),
        )

    if getattr(
        enrollment,
        "started_at",
        None,
    ) is None:
        _append_issue(
            issues,
            code="enrollment.started_at_missing",
            field="enrollment.started_at",
            message=(
                "Training start timestamp "
                "is required for FRDO."
            ),
        )

    hours = getattr(
        course,
        "hours",
        None,
    )

    try:
        hours_value = int(
            hours
        )
    except (
        TypeError,
        ValueError,
    ):
        hours_value = None

    if hours_value is None:
        _append_issue(
            issues,
            code="course.hours_missing",
            field="course.hours",
            message=(
                "Training duration in hours "
                "is required for FRDO."
            ),
        )
    elif hours_value <= 0:
        _append_issue(
            issues,
            code="course.hours_invalid",
            field="course.hours",
            message=(
                "Training duration must "
                "be positive."
            ),
        )
    elif (
        program_type
        in FRDO_PO_PROGRAM_TYPES
        and hours_value < 6
    ):
        _append_issue(
            issues,
            code="frdo.po.hours_below_minimum",
            field="course.hours",
            message=(
                "Professional training duration "
                "must be at least 6 hours."
            ),
        )

    if learner_profile is not None:
        _append_missing_text_issue(
            issues,
            source=learner_profile,
            attribute="middle_name",
            code=(
                "learner_profile."
                "middle_name_missing"
            ),
            field=(
                "learner_profile."
                "middle_name"
            ),
            message=(
                "Learner middle name or "
                "official no-patronymic marker "
                "is required for FRDO."
            ),
        )

    issued_date = None

    if document is not None:
        _append_missing_text_issue(
            issues,
            source=document,
            attribute="document_series",
            code="document.series_missing",
            field="document.document_series",
            message=(
                "Completion document series "
                "or official no-series marker "
                "is required for FRDO."
            ),
        )

        issued_date = _frdo_date_value(
            getattr(
                document,
                "issued_at",
                None,
            )
        )

        if issued_date is None:
            _append_issue(
                issues,
                code="document.issued_at_missing",
                field="document.issued_at",
                message=(
                    "Completion document legal "
                    "issue date is required."
                ),
            )

        _append_missing_text_issue(
            issues,
            source=document,
            attribute="registration_number",
            code=(
                "document."
                "registration_number_missing"
            ),
            field=(
                "document."
                "registration_number"
            ),
            message=(
                "Completion document registration "
                "number is required."
            ),
        )

    snils_required = (
        learner_profile is not None
        and issued_date is not None
        and str(
            getattr(
                learner_profile,
                "citizenship_country_code",
                "",
            )
            or ""
        ).strip()
        == "643"
        and issued_date
        >= date(
            2021,
            1,
            1,
        )
    )

    snils = (
        getattr(
            learner_profile,
            "snils",
            None,
        )
        if learner_profile is not None
        else None
    )

    if (
        snils_required
        and not _text_present(
            snils
        )
    ):
        _append_issue(
            issues,
            code="learner_profile.snils_missing",
            field="learner_profile.snils",
            message=(
                "SNILS is required for this "
                "FRDO document."
            ),
        )
    elif (
        _text_present(
            snils
        )
        and not _frdo_snils_is_valid(
            snils
        )
    ):
        _append_issue(
            issues,
            code="learner_profile.snils_invalid",
            field="learner_profile.snils",
            message=(
                "SNILS format or checksum "
                "is invalid."
            ),
        )

    if frdo_context is None:
        _append_issue(
            issues,
            code="frdo.context_missing",
            field="frdo_context",
            message=(
                "FRDO reporting context is missing."
            ),
        )

        return RegistryReadinessResult(
            registry=REGISTRY_FRDO,
            is_ready=False,
            issues=tuple(
                issues
            ),
        )

    shared_required = (
        (
            "document_status",
            "frdo.document_status_missing",
        ),
        (
            "loss_confirmation",
            "frdo.loss_confirmation_missing",
        ),
        (
            "exchange_confirmation",
            "frdo.exchange_confirmation_missing",
        ),
        (
            "destruction_confirmation",
            "frdo.destruction_confirmation_missing",
        ),
    )

    for attribute, code in shared_required:
        _append_missing_text_issue(
            issues,
            source=frdo_context,
            attribute=attribute,
            code=code,
            field=(
                "frdo_context."
                + attribute
            ),
            message=(
                "Required FRDO context "
                "field is missing."
            ),
        )

    if (
        issued_date is not None
        and issued_date
        >= date(
            2021,
            1,
            1,
        )
    ):
        for attribute, code in (
            (
                "study_form",
                "frdo.study_form_missing",
            ),
            (
                "funding_source",
                "frdo.funding_source_missing",
            ),
            (
                "education_delivery_form",
                (
                    "frdo."
                    "education_delivery_form_missing"
                ),
            ),
        ):
            _append_missing_text_issue(
                issues,
                source=frdo_context,
                attribute=attribute,
                code=code,
                field=(
                    "frdo_context."
                    + attribute
                ),
                message=(
                    "Required FRDO context "
                    "field is missing."
                ),
            )

    if (
        program_type
        in FRDO_PO_PROGRAM_TYPES
    ):
        for attribute, code in (
            (
                "po_program_type",
                (
                    "frdo.po."
                    "program_type_missing"
                ),
            ),
            (
                "po_profession",
                (
                    "frdo.po."
                    "profession_missing"
                ),
            ),
        ):
            _append_missing_text_issue(
                issues,
                source=frdo_context,
                attribute=attribute,
                code=code,
                field=(
                    "frdo_context."
                    + attribute
                ),
                message=(
                    "Required FRDO PO "
                    "field is missing."
                ),
            )

    document_status = str(
        getattr(
            frdo_context,
            "document_status",
            "",
        )
        or ""
    ).strip().casefold()

    if document_status in {
        "duplicate",
        "\u0434\u0443\u0431\u043b\u0438\u043a\u0430\u0442",
    }:
        _append_snapshot_field_issues(
            issues,
            snapshot=getattr(
                frdo_context,
                "original_document_snapshot_json",
                None,
            ),
            snapshot_code=(
                "frdo.original_document"
            ),
            snapshot_field=(
                "frdo_context."
                "original_document_snapshot_json"
            ),
            required_fields=(
                "document_type",
                "document_series",
                "document_number",
                "registration_number",
                "issue_date",
                "recipient_last_name",
                "recipient_first_name",
                "recipient_middle_name",
            ),
        )

    return RegistryReadinessResult(
        registry=REGISTRY_FRDO,
        is_ready=len(
            issues
        )
        == 0,
        issues=tuple(
            issues
        ),
    )


def _has_current_active_mintrud_learn_program(
    programs: Any,
) -> bool:
    if programs is None:
        return False

    try:
        candidates = tuple(
            programs
        )
    except TypeError:
        return False

    for program in candidates:
        if program is None:
            continue

        schema_version = str(
            getattr(
                program,
                "schema_version",
                "",
            )
            or ""
        )

        if (
            schema_version
            != MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
        ):
            continue

        if (
            getattr(
                program,
                "is_active",
                False,
            )
            is not True
        ):
            continue

        learn_program_id = getattr(
            program,
            "learn_program_id",
            None,
        )

        try:
            if (
                int(learn_program_id)
                in MINTRUD_LEARN_PROGRAM_IDS_V109
            ):
                return True
        except (
            TypeError,
            ValueError,
        ):
            continue

    return False


def _evaluate_mintrud_readiness(
    *,
    enrollment: Any,
    course: Any,
    learner: Any,
    learner_profile: Any,
    mintrud_context: Any,
    mintrud_learn_programs: Any,
    mintrud_reporting_organization: Any,
) -> RegistryReadinessResult:
    issues = _evaluate_completion_context(
        enrollment=enrollment,
        course=course,
        learner=learner,
    )

    if not _has_current_active_mintrud_learn_program(
        mintrud_learn_programs
    ):
        _append_issue(
            issues,
            code="mintrud.learn_program_missing",
            field="course.mintrud_learn_programs",
            message=(
                "At least one active Mintrud learn program "
                "for schema version 1.0.9 must be assigned "
                "to the course."
            ),
        )

    if not _text_present(
        getattr(
            mintrud_reporting_organization,
            "name",
            None,
        )
    ):
        _append_issue(
            issues,
            code=(
                "mintrud."
                "reporting_organization_name_missing"
            ),
            field=(
                "mintrud_reporting_organization.name"
            ),
            message=(
                "Mintrud reporting organization name "
                "is missing."
            ),
        )

    if not _text_present(
        getattr(
            mintrud_reporting_organization,
            "inn",
            None,
        )
    ):
        _append_issue(
            issues,
            code=(
                "mintrud."
                "reporting_organization_inn_missing"
            ),
            field=(
                "mintrud_reporting_organization.inn"
            ),
            message=(
                "Mintrud reporting organization INN "
                "is missing."
            ),
        )

    if learner_profile is None:
        _append_issue(
            issues,
            code="learner_profile.missing",
            field="learner_profile",
            message=(
                "Learner regulatory profile is missing."
            ),
        )
    else:
        if not _text_present(
            getattr(
                learner_profile,
                "last_name",
                None,
            )
        ):
            _append_issue(
                issues,
                code="learner_profile.last_name_missing",
                field="learner_profile.last_name",
                message="Learner last name is missing.",
            )

        if not _text_present(
            getattr(
                learner_profile,
                "first_name",
                None,
            )
        ):
            _append_issue(
                issues,
                code="learner_profile.first_name_missing",
                field="learner_profile.first_name",
                message="Learner first name is missing.",
            )

        if not _text_present(
            getattr(
                learner_profile,
                "snils",
                None,
            )
        ):
            _append_issue(
                issues,
                code="learner_profile.snils_missing",
                field="learner_profile.snils",
                message=(
                    "Learner SNILS is required "
                    "for the Mintrud registry."
                ),
            )

    if mintrud_context is None:
        _append_issue(
            issues,
            code="mintrud.context_missing",
            field="mintrud_context",
            message=(
                "Mintrud reporting context is missing."
            ),
        )

        return RegistryReadinessResult(
            registry=REGISTRY_MINTRUD,
            is_ready=False,
            issues=tuple(issues),
        )

    reporting_scenario = getattr(
        mintrud_context,
        "reporting_scenario",
        None,
    )

    if not _text_present(
        reporting_scenario
    ):
        _append_issue(
            issues,
            code="mintrud.reporting_scenario_missing",
            field=(
                "mintrud_context."
                "reporting_scenario"
            ),
            message=(
                "Mintrud reporting scenario is missing."
            ),
        )
    elif (
        str(reporting_scenario)
        not in MINTRUD_REPORTING_SCENARIOS
    ):
        _append_issue(
            issues,
            code="mintrud.reporting_scenario_invalid",
            field=(
                "mintrud_context."
                "reporting_scenario"
            ),
            message=(
                "Mintrud reporting scenario "
                "has an unsupported value."
            ),
        )

    if not _text_present(
        getattr(
            mintrud_context,
            "profession_or_position",
            None,
        )
    ):
        _append_issue(
            issues,
            code=(
                "mintrud."
                "profession_or_position_missing"
            ),
            field=(
                "mintrud_context."
                "profession_or_position"
            ),
            message=(
                "Worker profession or position "
                "is missing."
            ),
        )

    knowledge_check_result = getattr(
        mintrud_context,
        "knowledge_check_result",
        None,
    )

    if not _text_present(
        knowledge_check_result
    ):
        _append_issue(
            issues,
            code=(
                "mintrud."
                "knowledge_check_result_missing"
            ),
            field=(
                "mintrud_context."
                "knowledge_check_result"
            ),
            message=(
                "Knowledge check result is missing."
            ),
        )
    elif (
        str(knowledge_check_result)
        not in MINTRUD_KNOWLEDGE_CHECK_RESULTS
    ):
        _append_issue(
            issues,
            code=(
                "mintrud."
                "knowledge_check_result_invalid"
            ),
            field=(
                "mintrud_context."
                "knowledge_check_result"
            ),
            message=(
                "Knowledge check result "
                "has an unsupported value."
            ),
        )

    if getattr(
        mintrud_context,
        "knowledge_check_date",
        None,
    ) is None:
        _append_issue(
            issues,
            code=(
                "mintrud."
                "knowledge_check_date_missing"
            ),
            field=(
                "mintrud_context."
                "knowledge_check_date"
            ),
            message=(
                "Knowledge check date is missing."
            ),
        )

    if not _text_present(
        getattr(
            mintrud_context,
            "protocol_number",
            None,
        )
    ):
        _append_issue(
            issues,
            code="mintrud.protocol_number_missing",
            field=(
                "mintrud_context."
                "protocol_number"
            ),
            message=(
                "Knowledge check protocol "
                "number is missing."
            ),
        )

    if (
        reporting_scenario
        == MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER
    ):
        if not _text_present(
            getattr(
                mintrud_context,
                "employer_name",
                None,
            )
        ):
            _append_issue(
                issues,
                code="mintrud.employer_name_missing",
                field=(
                    "mintrud_context."
                    "employer_name"
                ),
                message=(
                    "Sending employer name is required "
                    "for external training."
                ),
            )

        if not _text_present(
            getattr(
                mintrud_context,
                "employer_inn",
                None,
            )
        ):
            _append_issue(
                issues,
                code="mintrud.employer_inn_missing",
                field=(
                    "mintrud_context."
                    "employer_inn"
                ),
                message=(
                    "Sending employer INN is required "
                    "for external training."
                ),
            )

    return RegistryReadinessResult(
        registry=REGISTRY_MINTRUD,
        is_ready=len(issues) == 0,
        issues=tuple(issues),
    )


def evaluate_registry_readiness(
    *,
    registry: str,
    enrollment: Any,
    course: Any,
    learner: Any,
    learner_profile: Any = None,
    document: Any = None,
    organization: Any = None,
    frdo_context: Any = None,
    mintrud_context: Any = None,
    mintrud_learn_programs: Any = None,
    mintrud_reporting_organization: Any = None,
) -> RegistryReadinessResult:
    # organization is accepted now because it is part of
    # registry preparation context, but it is deliberately
    # not treated as the learner's employer or as a mandatory
    # reporting organization. Those meanings must not be
    # inferred from Enrollment.organization_id.
    _ = organization

    if registry == REGISTRY_FRDO:
        return _evaluate_frdo_readiness(
            enrollment=enrollment,
            course=course,
            learner=learner,
            learner_profile=learner_profile,
            document=document,
            frdo_context=frdo_context,
        )

    if registry == REGISTRY_MINTRUD:
        return _evaluate_mintrud_readiness(
            enrollment=enrollment,
            course=course,
            learner=learner,
            learner_profile=learner_profile,
            mintrud_context=mintrud_context,
            mintrud_learn_programs=(
                mintrud_learn_programs
            ),
            mintrud_reporting_organization=(
                mintrud_reporting_organization
            ),
        )

    raise ValueError(
        "Unsupported registry: "
        + str(registry)
    )
