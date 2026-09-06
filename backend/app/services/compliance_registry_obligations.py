from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_rules import (
    DECISION_NOT_REQUIRED,
    DECISION_REQUIRED,
    DECISION_UNDETERMINED,
    RegistryRequirementDecision,
    evaluate_course_registry_requirements,
)


DECISION_TO_INITIAL_OBLIGATION_STATUS = {
    DECISION_REQUIRED: "pending_data",
    DECISION_NOT_REQUIRED: "not_required",
    DECISION_UNDETERMINED: "needs_approval",
}


def initial_obligation_status_for_decision(
    decision: RegistryRequirementDecision,
) -> str:
    try:
        return DECISION_TO_INITIAL_OBLIGATION_STATUS[
            decision.decision
        ]
    except KeyError as exc:
        raise ValueError(
            "Unsupported registry requirement decision: "
            + str(decision.decision)
        ) from exc


async def ensure_registry_obligations_for_completed_enrollment(
    *,
    enrollment: Enrollment,
    session: AsyncSession,
    document: DocumentRecord | None = None,
) -> dict[str, RegistryObligation]:
    if (
        enrollment.status != "completed"
        or enrollment.completed_at is None
    ):
        raise ValueError(
            "Registry obligations require completed enrollment"
        )

    if document is not None:
        document_enrollment_id = getattr(
            document,
            "enrollment_id",
            None,
        )

        if (
            document_enrollment_id is None
            or str(document_enrollment_id)
            != str(enrollment.id)
        ):
            raise ValueError(
                "Completion document does not belong "
                "to enrollment"
            )

    course_result = await session.execute(
        select(Course).where(
            Course.id == enrollment.course_id
        )
    )
    course = course_result.scalar_one_or_none()

    if course is None:
        raise ValueError(
            "Course for enrollment was not found"
        )

    decisions = evaluate_course_registry_requirements(
        regulatory_program_type=course.regulatory_program_type,
        frdo_requirement_mode=course.frdo_requirement_mode,
        mintrud_requirement_mode=course.mintrud_requirement_mode,
    )

    existing_result = await session.execute(
        select(RegistryObligation).where(
            RegistryObligation.enrollment_id
            == enrollment.id
        )
    )

    existing_by_registry = {
        obligation.registry: obligation
        for obligation
        in existing_result.scalars().all()
    }

    document_id = (
        document.id
        if document is not None
        else None
    )

    obligations: dict[
        str,
        RegistryObligation,
    ] = {}

    for registry in (
        REGISTRY_FRDO,
        REGISTRY_MINTRUD,
    ):
        decision = decisions[registry]
        existing = existing_by_registry.get(
            registry
        )

        if existing is None:
            obligation = RegistryObligation(
                registry=registry,
                enrollment_id=enrollment.id,
                document_id=document_id,
                status=(
                    initial_obligation_status_for_decision(
                        decision
                    )
                ),
                rule_code=decision.rule_code,
                rule_version=decision.rule_version,
                requirement_reason=decision.reason,
                readiness_errors=[],
            )
            session.add(obligation)
            obligations[registry] = obligation
            continue

        # Existing obligations are lifecycle records.
        # Completion synchronization must never reset an
        # approved/exported/submitted/accepted/correction
        # state or silently replace its original rule snapshot.
        #
        # The only safe enrichment here is attaching the
        # completion document when an older obligation does
        # not have it yet.
        if (
            existing.document_id is None
            and document_id is not None
        ):
            existing.document_id = document_id

        obligations[registry] = existing

    await session.flush()

    return obligations
