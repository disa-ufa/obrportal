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
from app.services.frdo_po_portal_mapping import (
    FrdoPoPortalMappingError,
    normalize_frdo_po_classifier_value,
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


def _append_frdo_po_classifier_issue(
    issues: list[RegistryReadinessIssue],
    *,
    classifier: str,
    value: object | None,
    field: str,
    code: str,
) -> None:
    if not _text_present(value):
        return

    try:
        normalize_frdo_po_classifier_value(
            classifier,
            value,
        )
    except FrdoPoPortalMappingError:
        _append_issue(
            issues,
            code=code,
            field=field,
            message=(
                "Value is not supported by the pinned "
                "FRDO PO classifier."
            ),
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



FRDO_PO_DOCUMENT_TYPE_TRAINING_REFERENCE = (
    "\u0421\u043f\u0440\u0430\u0432\u043a\u0430 "
    "\u043e\u0431 "
    "\u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438"
)


def _frdo_po_context_classifier_value(
    context: Any,
    attribute: str,
    classifier: str,
) -> str | None:
    if context is None:
        return None

    value = getattr(
        context,
        attribute,
        None,
    )

    if not _text_present(
        value
    ):
        return None

    try:
        return normalize_frdo_po_classifier_value(
            classifier,
            value,
        )
    except FrdoPoPortalMappingError:
        return None


def _frdo_po_allows_blank_document_identifier(
    program_type: str,
    context: Any,
) -> bool:
    if (
        program_type
        not in FRDO_PO_PROGRAM_TYPES
    ):
        return False

    return (
        _frdo_po_context_classifier_value(
            context,
            "po_document_type",
            "document_type",
        )
        == FRDO_PO_DOCUMENT_TYPE_TRAINING_REFERENCE
    )


FRDO_PO_DOCUMENT_TYPE_ART_CERTIFICATE = (
    "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
    "\u043e\u0431 "
    "\u043e\u0441\u0432\u043e\u0435\u043d\u0438\u0438 "
    "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0445 "
    "\u043f\u0440\u0435\u0434\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 "
    "\u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c "
    "\u0432 "
    "\u043e\u0431\u043b\u0430\u0441\u0442\u0438 "
    "\u0438\u0441\u043a\u0443\u0441\u0441\u0442\u0432"
)


def _frdo_po_is_cyrillic_letter(
    char: str,
) -> bool:
    return (
        "\u0400" <= char <= "\u052f"
        or "\u2de0" <= char <= "\u2dff"
        or "\ua640" <= char <= "\ua69f"
    )


def _frdo_po_is_latin_letter(
    char: str,
) -> bool:
    return (
        "A" <= char <= "Z"
        or "a" <= char <= "z"
    )


def _frdo_po_text_chars_valid(
    value: object | None,
    *,
    extra_chars: str,
    allow_cyrillic: bool = True,
    allow_latin: bool = True,
    allow_digits: bool = True,
) -> bool:
    candidate = str(
        value
        or ""
    )

    if not candidate:
        return False

    for char in candidate:
        if (
            allow_cyrillic
            and _frdo_po_is_cyrillic_letter(
                char
            )
        ):
            continue

        if (
            allow_latin
            and _frdo_po_is_latin_letter(
                char
            )
        ):
            continue

        if (
            allow_digits
            and "0" <= char <= "9"
        ):
            continue

        if char in extra_chars:
            continue

        return False

    return True


def _frdo_po_person_name_is_valid(
    value: object | None,
) -> bool:
    candidate = str(
        value
        or ""
    )

    if not candidate:
        return False

    if candidate.startswith(
        (
            " ",
            "-",
        )
    ):
        return False

    if candidate.endswith(
        (
            " ",
            "-",
        )
    ):
        return False

    if re.search(
        r"[ -]{2,}",
        candidate,
    ):
        return False

    return _frdo_po_text_chars_valid(
        candidate,
        extra_chars=".-()' ",
        allow_cyrillic=True,
        allow_latin=False,
        allow_digits=False,
    )


def _frdo_po_snapshot_issue_date_is_valid(
    value: object | None,
) -> bool:
    if isinstance(
        value,
        datetime,
    ):
        return True

    if isinstance(
        value,
        date,
    ):
        return True

    candidate = str(
        value
        or ""
    ).strip()

    if not candidate:
        return False

    for date_format in (
        "%Y-%m-%d",
        "%d.%m.%Y",
    ):
        try:
            datetime.strptime(
                candidate,
                date_format,
            )
            return True
        except ValueError:
            pass

    return False


def _append_frdo_po_original_snapshot_exact_issues(
    issues: list[RegistryReadinessIssue],
    snapshot: object | None,
) -> None:
    if not isinstance(
        snapshot,
        dict,
    ):
        return

    base_field = (
        "frdo_context."
        "original_document_snapshot_json"
    )

    document_type = snapshot.get(
        "document_type"
    )

    _append_frdo_po_classifier_issue(
        issues,
        classifier="document_type",
        value=document_type,
        field=(
            base_field
            + ".document_type"
        ),
        code=(
            "frdo.original_document."
            "document_type_unsupported"
        ),
    )

    document_series = snapshot.get(
        "document_series"
    )

    if _text_present(
        document_series
    ):
        series_text = str(
            document_series
        )

        if len(
            series_text
        ) > 20:
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    "document_series_too_long"
                ),
                field=(
                    base_field
                    + ".document_series"
                ),
                message=(
                    "Original document series "
                    "must not exceed 20 characters."
                ),
            )

        elif not _frdo_po_text_chars_valid(
            series_text,
            extra_chars=".-/ ",
        ):
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    "document_series_invalid"
                ),
                field=(
                    base_field
                    + ".document_series"
                ),
                message=(
                    "Original document series "
                    "contains unsupported characters."
                ),
            )

    document_number = snapshot.get(
        "document_number"
    )

    if _text_present(
        document_number
    ):
        number_text = str(
            document_number
        )

        if len(
            number_text
        ) > 20:
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    "document_number_too_long"
                ),
                field=(
                    base_field
                    + ".document_number"
                ),
                message=(
                    "Original document number "
                    "must not exceed 20 characters."
                ),
            )

        elif not (
            number_text.isascii()
            and number_text.isdigit()
        ):
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    "document_number_invalid"
                ),
                field=(
                    base_field
                    + ".document_number"
                ),
                message=(
                    "Original document number "
                    "must contain ASCII digits only."
                ),
            )

    registration_number = snapshot.get(
        "registration_number"
    )

    if _text_present(
        registration_number
    ):
        registration_text = str(
            registration_number
        )

        if len(
            registration_text
        ) > 20:
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    "registration_number_too_long"
                ),
                field=(
                    base_field
                    + ".registration_number"
                ),
                message=(
                    "Original registration number "
                    "must not exceed 20 characters."
                ),
            )

        elif not _frdo_po_text_chars_valid(
            registration_text,
            extra_chars="./ -()_",
        ):
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    "registration_number_invalid"
                ),
                field=(
                    base_field
                    + ".registration_number"
                ),
                message=(
                    "Original registration number "
                    "contains unsupported characters."
                ),
            )

    issue_date = snapshot.get(
        "issue_date"
    )

    if (
        _text_present(
            issue_date
        )
        and not _frdo_po_snapshot_issue_date_is_valid(
            issue_date
        )
    ):
        _append_issue(
            issues,
            code=(
                "frdo.original_document."
                "issue_date_invalid"
            ),
            field=(
                base_field
                + ".issue_date"
            ),
            message=(
                "Original document issue date "
                "must be a valid date."
            ),
        )

    for attribute in (
        "recipient_last_name",
        "recipient_first_name",
        "recipient_middle_name",
    ):
        value = snapshot.get(
            attribute
        )

        if not _text_present(
            value
        ):
            continue

        value_text = str(
            value
        )

        if len(
            value_text
        ) > 50:
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    + attribute
                    + "_too_long"
                ),
                field=(
                    base_field
                    + "."
                    + attribute
                ),
                message=(
                    "Original recipient name field "
                    "must not exceed 50 characters."
                ),
            )

        elif not _frdo_po_person_name_is_valid(
            value_text
        ):
            _append_issue(
                issues,
                code=(
                    "frdo.original_document."
                    + attribute
                    + "_invalid"
                ),
                field=(
                    base_field
                    + "."
                    + attribute
                ),
                message=(
                    "Original recipient name field "
                    "contains unsupported characters."
                ),
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

    program_type = _frdo_program_type(course)

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
            if (
                program_type
                not in FRDO_PO_PROGRAM_TYPES
            ):
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

        document_number = getattr(
            document,
            "document_number",
            None,
        )

        if (
            not _text_present(
                document_number
            )
            and not _frdo_po_allows_blank_document_identifier(
                program_type,
                frdo_context,
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
        document_series = getattr(
            document,
            "document_series",
            None,
        )

        if (
            not _text_present(
                document_series
            )
            and not _frdo_po_allows_blank_document_identifier(
                program_type,
                frdo_context,
            )
        ):
            _append_issue(
                issues,
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

    if (
        program_type in FRDO_PO_PROGRAM_TYPES
        and issued_date is not None
        and issued_date
        >= date(
            2021,
            1,
            1,
        )
        and learner_profile is not None
        and not _text_present(
            getattr(
                learner_profile,
                "citizenship_country_code",
                None,
            )
        )
    ):
        _append_issue(
            issues,
            code=(
                "frdo.po."
                "citizenship_country_code_missing"
            ),
            field=(
                "learner_profile."
                "citizenship_country_code"
            ),
            message=(
                "Citizenship is required for "
                "FRDO PO documents issued in 2021 or later."
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
        _append_missing_text_issue(
            issues,
            source=frdo_context,
            attribute="po_document_type",
            code="frdo.po.document_type_missing",
            field="frdo_context.po_document_type",
            message=(
                "Required FRDO PO field is missing."
            ),
        )

        po_document_type = (
            _frdo_po_context_classifier_value(
                frdo_context,
                "po_document_type",
                "document_type",
            )
        )

        if (
            po_document_type
            == FRDO_PO_DOCUMENT_TYPE_ART_CERTIFICATE
        ):
            if _text_present(
                getattr(
                    frdo_context,
                    "po_program_type",
                    None,
                )
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po."
                        "program_type_must_be_blank_"
                        "for_art_certificate"
                    ),
                    field=(
                        "frdo_context."
                        "po_program_type"
                    ),
                    message=(
                        "Professional training program type "
                        "must be blank for the art certificate."
                    ),
                )

            if _text_present(
                getattr(
                    frdo_context,
                    "po_profession",
                    None,
                )
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po."
                        "profession_must_be_blank_"
                        "for_art_certificate"
                    ),
                    field=(
                        "frdo_context."
                        "po_profession"
                    ),
                    message=(
                        "Profession must be blank "
                        "for the art certificate."
                    ),
                )

        else:
            _append_missing_text_issue(
                issues,
                source=frdo_context,
                attribute="po_profession",
                code="frdo.po.profession_missing",
                field="frdo_context.po_profession",
                message=(
                    "Required FRDO PO field is missing."
                ),
            )

        if document is not None:
            series_value = getattr(
                document,
                "document_series",
                None,
            )

            if _text_present(
                series_value
            ):
                series_text = str(
                    series_value
                )

                if len(
                    series_text
                ) > 20:
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            "document_series_too_long"
                        ),
                        field=(
                            "document.document_series"
                        ),
                        message=(
                            "FRDO PO document series "
                            "must not exceed 20 characters."
                        ),
                    )

                elif not _frdo_po_text_chars_valid(
                    series_text,
                    extra_chars=".-/ ",
                ):
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            "document_series_invalid"
                        ),
                        field=(
                            "document.document_series"
                        ),
                        message=(
                            "FRDO PO document series "
                            "contains unsupported characters."
                        ),
                    )

            number_value = getattr(
                document,
                "document_number",
                None,
            )

            if _text_present(
                number_value
            ):
                number_text = str(
                    number_value
                )

                if len(
                    number_text
                ) > 40:
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            "document_number_too_long"
                        ),
                        field=(
                            "document.document_number"
                        ),
                        message=(
                            "FRDO PO document number "
                            "must not exceed 40 characters."
                        ),
                    )

                elif not _frdo_po_text_chars_valid(
                    number_text,
                    extra_chars=".-/ ",
                ):
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            "document_number_invalid"
                        ),
                        field=(
                            "document.document_number"
                        ),
                        message=(
                            "FRDO PO document number "
                            "contains unsupported characters."
                        ),
                    )

            registration_value = getattr(
                document,
                "registration_number",
                None,
            )

            if _text_present(
                registration_value
            ):
                registration_text = str(
                    registration_value
                )

                if len(
                    registration_text
                ) > 30:
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            "registration_number_too_long"
                        ),
                        field=(
                            "document."
                            "registration_number"
                        ),
                        message=(
                            "FRDO PO registration number "
                            "must not exceed 30 characters."
                        ),
                    )

                elif not _frdo_po_text_chars_valid(
                    registration_text,
                    extra_chars=".\u2116-/ ()_",
                ):
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            "registration_number_invalid"
                        ),
                        field=(
                            "document."
                            "registration_number"
                        ),
                        message=(
                            "FRDO PO registration number "
                            "contains unsupported characters."
                        ),
                    )

        course_title = getattr(
            course,
            "title",
            None,
        )

        if _text_present(
            course_title
        ):
            title_text = str(
                course_title
            )

            if len(
                title_text
            ) > 255:
                _append_issue(
                    issues,
                    code=(
                        "frdo.po."
                        "program_name_too_long"
                    ),
                    field="course.title",
                    message=(
                        "FRDO PO program name "
                        "must not exceed 255 characters."
                    ),
                )

            elif not _frdo_po_text_chars_valid(
                title_text,
                extra_chars=(
                    "().,:/- "
                    "\u00ab\u00bb"
                    "\"?\u2116&+#_;"
                ),
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po."
                        "program_name_invalid"
                    ),
                    field="course.title",
                    message=(
                        "FRDO PO program name "
                        "contains unsupported characters."
                    ),
                )

        start_date = _frdo_date_value(
            getattr(
                enrollment,
                "started_at",
                None,
            )
        )

        end_date = _frdo_date_value(
            getattr(
                enrollment,
                "completed_at",
                None,
            )
        )

        current_year = date.today().year

        document_status_value = (
            _frdo_po_context_classifier_value(
                frdo_context,
                "document_status",
                "document_status",
            )
        )

        if start_date is not None:
            minimum_start_year = None

            if (
                document_status_value
                == "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b"
            ):
                minimum_start_year = 1978

            elif (
                document_status_value
                == "\u0414\u0443\u0431\u043b\u0438\u043a\u0430\u0442"
            ):
                minimum_start_year = 1955

            if (
                minimum_start_year is not None
                and start_date.year
                < minimum_start_year
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po."
                        "start_year_before_minimum"
                    ),
                    field="enrollment.started_at",
                    message=(
                        "FRDO PO training start year "
                        "is earlier than allowed "
                        "for the document status."
                    ),
                )

            if (
                start_date.year
                > current_year
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po.start_year_future"
                    ),
                    field="enrollment.started_at",
                    message=(
                        "FRDO PO training start year "
                        "cannot be in the future."
                    ),
                )

        if end_date is not None:
            if (
                end_date.year
                > current_year
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po.end_year_future"
                    ),
                    field="enrollment.completed_at",
                    message=(
                        "FRDO PO training end year "
                        "cannot be in the future."
                    ),
                )

            if (
                start_date is not None
                and end_date.year
                < start_date.year
            ):
                _append_issue(
                    issues,
                    code=(
                        "frdo.po."
                        "end_year_before_start"
                    ),
                    field="enrollment.completed_at",
                    message=(
                        "FRDO PO training end year "
                        "cannot be earlier "
                        "than start year."
                    ),
                )

        if learner_profile is not None:
            for attribute in (
                "last_name",
                "first_name",
                "middle_name",
            ):
                value = getattr(
                    learner_profile,
                    attribute,
                    None,
                )

                if not _text_present(
                    value
                ):
                    continue

                value_text = str(
                    value
                )

                if len(
                    value_text
                ) > 50:
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            + attribute
                            + "_too_long"
                        ),
                        field=(
                            "learner_profile."
                            + attribute
                        ),
                        message=(
                            "FRDO PO recipient name "
                            "must not exceed "
                            "50 characters."
                        ),
                    )

                elif not _frdo_po_person_name_is_valid(
                    value_text
                ):
                    _append_issue(
                        issues,
                        code=(
                            "frdo.po."
                            + attribute
                            + "_invalid"
                        ),
                        field=(
                            "learner_profile."
                            + attribute
                        ),
                        message=(
                            "FRDO PO recipient name "
                            "contains unsupported "
                            "characters."
                        ),
                    )

        for attribute, classifier, code in (
            (
                "document_status",
                "document_status",
                "frdo.document_status_unsupported",
            ),
            (
                "loss_confirmation",
                "loss_confirmation",
                "frdo.loss_confirmation_unsupported",
            ),
            (
                "exchange_confirmation",
                "exchange_confirmation",
                "frdo.exchange_confirmation_unsupported",
            ),
            (
                "destruction_confirmation",
                "destruction_confirmation",
                "frdo.destruction_confirmation_unsupported",
            ),
            (
                "po_document_type",
                "document_type",
                "frdo.po.document_type_unsupported",
            ),
            (
                "po_program_type",
                "po_program_type",
                "frdo.po.program_type_unsupported",
            ),
            (
                "po_profession",
                "po_profession",
                "frdo.po.profession_unsupported",
            ),
            (
                "po_qualification",
                "po_qualification",
                "frdo.po.qualification_unsupported",
            ),
        ):
            _append_frdo_po_classifier_issue(
                issues,
                classifier=classifier,
                value=getattr(
                    frdo_context,
                    attribute,
                    None,
                ),
                field=(
                    "frdo_context."
                    + attribute
                ),
                code=code,
            )

        if learner_profile is not None:
            _append_frdo_po_classifier_issue(
                issues,
                classifier="sex",
                value=getattr(
                    learner_profile,
                    "sex",
                    None,
                ),
                field="learner_profile.sex",
                code="learner_profile.sex_unsupported",
            )

            _append_frdo_po_classifier_issue(
                issues,
                classifier="citizenship_country_code",
                value=getattr(
                    learner_profile,
                    "citizenship_country_code",
                    None,
                ),
                field=(
                    "learner_profile."
                    "citizenship_country_code"
                ),
                code=(
                    "learner_profile."
                    "citizenship_country_code_unsupported"
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
            for attribute, classifier, code in (
                (
                    "study_form",
                    "study_form",
                    "frdo.study_form_unsupported",
                ),
                (
                    "funding_source",
                    "funding_source",
                    "frdo.funding_source_unsupported",
                ),
                (
                    "education_delivery_form",
                    "education_delivery_form",
                    (
                        "frdo."
                        "education_delivery_form_unsupported"
                    ),
                ),
            ):
                _append_frdo_po_classifier_issue(
                    issues,
                    classifier=classifier,
                    value=getattr(
                        frdo_context,
                        attribute,
                        None,
                    ),
                    field=(
                        "frdo_context."
                        + attribute
                    ),
                    code=code,
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

        if (
            program_type
            in FRDO_PO_PROGRAM_TYPES
        ):
            _append_frdo_po_original_snapshot_exact_issues(
                issues,
                getattr(
                    frdo_context,
                    "original_document_snapshot_json",
                    None,
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
