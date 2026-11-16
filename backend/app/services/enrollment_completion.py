from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.enrollment_employment_details import EnrollmentEmploymentDetails
from app.models.learner_profile import LearnerProfile
from app.models.registry_obligation import RegistryObligation
from app.models.user import User
from app.schemas.account import AccountCompletionReadinessResponse
from app.services.compliance_registry_obligations import (
    ensure_registry_obligations_for_completed_enrollment,
)
from app.services.completion_documents import (
    ensure_completion_document_for_enrollment,
)
from app.services.enrollment_completion_readiness import evaluate_enrollment_completion_readiness
from app.services.registry_action_lockset import (
    RegistryActionLockError,
    RegistrySourceFence,
    acquire_registry_source_write_fences,
)


@dataclass(frozen=True)
class EnrollmentCompletionResult:
    document: DocumentRecord | None
    obligations: dict[str, RegistryObligation]
    was_already_completed: bool
    started_at_was_set: bool
    completed_at_was_set: bool


async def get_completion_readiness(
    session: AsyncSession,
    enrollment: Enrollment,
) -> AccountCompletionReadinessResponse:
    with session.no_autoflush:
        source = (await session.execute(
            select(Course, User, LearnerProfile, EnrollmentEmploymentDetails)
            .select_from(User)
            .join(Course, Course.id == enrollment.course_id)
            .outerjoin(LearnerProfile, LearnerProfile.user_id == User.id)
            .outerjoin(EnrollmentEmploymentDetails, EnrollmentEmploymentDetails.enrollment_id == enrollment.id)
            .where(User.id == enrollment.user_id)
            .execution_options(populate_existing=True)
        )).one_or_none()
    if source is None:
        raise HTTPException(409, {"code": "completion.source_unavailable", "reason": "administrator_action"})
    course, user, profile, employer = source
    return evaluate_enrollment_completion_readiness(enrollment, course, user, profile, employer=employer)


def completion_can_proceed(readiness: AccountCompletionReadinessResponse) -> bool:
    return (
        readiness.is_ready is True and readiness.status == "ready"
        and not readiness.missing_fields and not readiness.invalid_fields
        and not readiness.policy_unresolved and not readiness.requires_administrator_action
    )


def completion_block_details(readiness: AccountCompletionReadinessResponse) -> dict:
    course_policy_unresolved = readiness.policy_unresolved and any(
        issue.field.startswith("course.")
        for issue in (*readiness.missing_fields, *readiness.invalid_fields)
    )
    if course_policy_unresolved:
        reason = "policy_unresolved"
    elif readiness.requires_administrator_action:
        reason = "administrator_action"
    else:
        reason = "learner_profile"
    return {"code": "completion.profile_incomplete", "reason": reason, **readiness.model_dump()}


async def prepare_new_enrollment_completions(
    session: AsyncSession,
    enrollments: Sequence[Enrollment],
    *,
    group: bool = False,
) -> None:
    """Fence parents before adding enrollments and precheck the entire batch."""
    if not enrollments:
        return
    fences = {
        RegistrySourceFence(kind, key)
        for enrollment in enrollments
        for kind, key in (
            ("learner", enrollment.user_id),
            ("course", enrollment.course_id),
            ("organization", enrollment.organization_id),
        )
        if key is not None
    }
    try:
        await acquire_registry_source_write_fences(session=session, source_fences=tuple(fences))
    except RegistryActionLockError as exc:
        raise HTTPException(409, {"code": "completion.source_changed"}) from exc
    failures = []
    for enrollment in enrollments:
        readiness = await get_completion_readiness(session, enrollment)
        if not completion_can_proceed(readiness):
            detail = completion_block_details(readiness)
            if not group:
                raise HTTPException(409, detail)
            failures.append({"user_id": enrollment.user_id, "course_id": enrollment.course_id, **detail})
    if failures:
        raise HTTPException(409, {"code": "completion.profile_incomplete", "blocked_enrollments": failures})


async def _existing_completion(enrollment: Enrollment, session: AsyncSession) -> EnrollmentCompletionResult:
    with session.no_autoflush:
        persisted = await session.scalar(select(Enrollment.status).where(Enrollment.id == enrollment.id))
        if persisted != "completed":
            raise HTTPException(409, {"code": "completion.unpersisted_completed_status"})
        document = await session.scalar(select(DocumentRecord).where(DocumentRecord.enrollment_id == enrollment.id))
        obligations = (await session.scalars(select(RegistryObligation).where(
            RegistryObligation.enrollment_id == enrollment.id,
        ))).all()
    return EnrollmentCompletionResult(document, {row.registry: row for row in obligations}, True, False, False)


async def ensure_enrollment_completed(
    *,
    enrollment: Enrollment,
    session: AsyncSession,
    completed_at: datetime | None = None,
) -> EnrollmentCompletionResult:
    # All mutation callers hold the canonical source fences through commit.
    if enrollment.status == "completed":
        return await _existing_completion(enrollment, session)

    readiness = await get_completion_readiness(session, enrollment)
    if not completion_can_proceed(readiness):
        raise HTTPException(409, completion_block_details(readiness))

    effective_completed_at = (
        enrollment.completed_at
        or completed_at
        or datetime.now(timezone.utc)
    )

    started_at_was_set = False
    completed_at_was_set = False

    if enrollment.started_at is None:
        enrollment.started_at = effective_completed_at
        started_at_was_set = True

    if enrollment.completed_at is None:
        enrollment.completed_at = effective_completed_at
        completed_at_was_set = True

    enrollment.status = "completed"

    # Flush the enrollment transition first so all downstream
    # services operate on a stable completed enrollment.
    #
    # Transaction ownership remains with the caller.
    await session.flush()

    document = (
        await ensure_completion_document_for_enrollment(
            enrollment,
            session,
        )
    )

    obligations = (
        await ensure_registry_obligations_for_completed_enrollment(
            enrollment=enrollment,
            session=session,
            document=document,
        )
    )

    return EnrollmentCompletionResult(
        document=document,
        obligations=obligations,
        was_already_completed=False,
        started_at_was_set=started_at_was_set,
        completed_at_was_set=completed_at_was_set,
    )
