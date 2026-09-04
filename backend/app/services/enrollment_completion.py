from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_obligations import (
    ensure_registry_obligations_for_completed_enrollment,
)
from app.services.completion_documents import (
    ensure_completion_document_for_enrollment,
)


@dataclass(frozen=True)
class EnrollmentCompletionResult:
    document: DocumentRecord
    obligations: dict[str, RegistryObligation]
    was_already_completed: bool
    started_at_was_set: bool
    completed_at_was_set: bool


async def ensure_enrollment_completed(
    *,
    enrollment: Enrollment,
    session: AsyncSession,
    completed_at: datetime | None = None,
) -> EnrollmentCompletionResult:
    was_already_completed = (
        enrollment.status == "completed"
    )

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
        was_already_completed=was_already_completed,
        started_at_was_set=started_at_was_set,
        completed_at_was_set=completed_at_was_set,
    )
