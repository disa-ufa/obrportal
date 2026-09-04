from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.compliance_registry_contract import (
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


def _evaluate_frdo_readiness(
    *,
    enrollment: Any,
    course: Any,
    learner: Any,
    learner_profile: Any,
    document: Any,
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

        if not _text_present(sex):
            _append_issue(
                issues,
                code="learner_profile.sex_missing",
                field="learner_profile.sex",
                message="Learner sex is missing.",
            )
        elif str(sex) not in FRDO_ALLOWED_SEX_VALUES:
            _append_issue(
                issues,
                code="learner_profile.sex_invalid",
                field="learner_profile.sex",
                message=(
                    "Learner sex has an unsupported value."
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
            len(citizenship) != 3
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
            and str(document_enrollment_id)
            != str(enrollment_id)
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

    return RegistryReadinessResult(
        registry=REGISTRY_FRDO,
        is_ready=len(issues) == 0,
        issues=tuple(issues),
    )


def _evaluate_mintrud_readiness(
    *,
    enrollment: Any,
    course: Any,
    learner: Any,
    learner_profile: Any,
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

    # The current domain model intentionally does not
    # contain employer, job/profession, workplace, or other
    # employment context. Until the official Mintrud export
    # contract is modeled explicitly, the system must not
    # claim that an obligation is data-ready.
    _append_issue(
        issues,
        code="mintrud.employment_context_not_modeled",
        field=None,
        message=(
            "Mintrud employment/training context is not "
            "modeled yet and requires explicit schema support."
        ),
    )

    return RegistryReadinessResult(
        registry=REGISTRY_MINTRUD,
        is_ready=False,
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
        )

    if registry == REGISTRY_MINTRUD:
        return _evaluate_mintrud_readiness(
            enrollment=enrollment,
            course=course,
            learner=learner,
            learner_profile=learner_profile,
        )

    raise ValueError(
        "Unsupported registry: "
        + str(registry)
    )
