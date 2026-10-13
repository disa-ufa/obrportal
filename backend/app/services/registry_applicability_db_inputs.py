"""Build canonical registry applicability inputs from authoritative DB rows.

This module is read-only, has no API callers, and makes NO registry eligibility
decision of its own. It is for a future transaction-scoped gate, NOT a way to
authorize export merely because a fingerprint can be calculated.

The caller must read/lock the obligation and verify permissions, readiness and
approval separately. During rollout, historical entries without reconciled
applicability must remain blocked from any newly gated export path.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.mintrud_learn_program import (
    CourseMintrudLearnProgram,
    MintrudLearnProgram,
)
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_contract import REGISTRY_CODES, REGISTRY_FRDO, REGISTRY_MINTRUD
from app.services.registry_applicability import (
    RegistryApplicability,
    evaluate_course_registry_applicability,
)
from app.services.registry_applicability_fingerprint import (
    RegistryApplicabilityInputs,
    fingerprint_applicability_inputs,
)


@dataclass(frozen=True)
class CurrentRegistryApplicabilityInputs:
    inputs: RegistryApplicabilityInputs
    evaluation: RegistryApplicability
    fingerprint: str


async def load_current_registry_applicability_inputs(
    *,
    session: AsyncSession,
    obligation: RegistryObligation,
) -> CurrentRegistryApplicabilityInputs:
    """Load a deterministic snapshot using only ORM SELECTs.

    The caller owns the transaction. No automatic fallback from the existence
    of a legacy obligation to 'required' is permitted.
    """
    if obligation.registry not in REGISTRY_CODES:
        raise ValueError("Unsupported registry")

    pair = (
        await session.execute(
            select(Enrollment, Course)
            .join(Course, Course.id == Enrollment.course_id)
            .where(Enrollment.id == obligation.enrollment_id)
        )
    ).one_or_none()
    if pair is None:
        raise ValueError("Obligation enrollment or course not found")

    enrollment, course = pair
    doc = (
        await session.execute(
            select(DocumentRecord)
            .where(DocumentRecord.enrollment_id == enrollment.id)
        )
    ).scalar_one_or_none()

    if obligation.document_id is not None and (
        doc is None or doc.id != obligation.document_id
    ):
        raise ValueError("Obligation document does not match enrollment")

    if doc is not None and (
        doc.course_id is not None and doc.course_id != course.id
    ):
        raise ValueError("Enrollment document has a different course")

    context = None
    program_codes: tuple[str, ...] = ()
    if obligation.registry == REGISTRY_MINTRUD:
        context = (
            await session.execute(
                select(MintrudRegistryContext)
                .where(MintrudRegistryContext.obligation_id == obligation.id)
            )
        ).scalar_one_or_none()

        program_rows = (
            await session.execute(
                select(MintrudLearnProgram.schema_version, MintrudLearnProgram.code)
                .join(
                    CourseMintrudLearnProgram,
                    CourseMintrudLearnProgram.mintrud_learn_program_id
                    == MintrudLearnProgram.id,
                )
                .where(CourseMintrudLearnProgram.course_id == course.id)
                .order_by(
                    MintrudLearnProgram.schema_version,
                    MintrudLearnProgram.code,
                )
            )
        ).all()
        # Include catalog schema version so a scheme change invalidates the
        # old fingerprint, even when the textual code has not changed.
        program_codes = tuple(
            f"{schema_version}:{code}"
            for schema_version, code in program_rows
        )

    evaluation = evaluate_course_registry_applicability(
        regulatory_program_type=course.regulatory_program_type,
        frdo_requirement_mode=course.frdo_requirement_mode,
        mintrud_requirement_mode=course.mintrud_requirement_mode,
    )[obligation.registry]

    issued_at = doc.issued_at if doc is not None else None
    if issued_at is None and enrollment.completed_at is not None:
        issued_at = enrollment.completed_at.date()

    inputs = RegistryApplicabilityInputs(
        registry=obligation.registry,
        enrollment_id=enrollment.id,
        course_id=course.id,
        regulatory_program_type=course.regulatory_program_type,
        requirement_mode=(
            course.frdo_requirement_mode
            if obligation.registry == REGISTRY_FRDO
            else course.mintrud_requirement_mode
        ),
        rule_code=evaluation.rule_code,
        rule_version=evaluation.rule_version,
        course_document_type=course.document_type,
        issued_document_type=(doc.document_type if doc is not None else None),
        organization_id=enrollment.organization_id,
        reporting_scenario=(
            context.reporting_scenario if context is not None else None
        ),
        effective_date=issued_at,
        mintrud_program_codes=program_codes,
        employer_name=(context.employer_name if context is not None else None),
        employer_inn=(context.employer_inn if context is not None else None),
    )
    return CurrentRegistryApplicabilityInputs(
        inputs=inputs,
        evaluation=evaluation,
        fingerprint=fingerprint_applicability_inputs(inputs),
    )
