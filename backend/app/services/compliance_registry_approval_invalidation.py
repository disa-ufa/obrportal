from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_approval import (
    APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED,
    APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
    APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED,
    APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED,
    FRDO_EXTENDED_APPROVAL_LEARNER_PROFILE_FIELDS,
    approval_registries_for_learner_profile_fields,
    invalidate_registry_approval,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


@dataclass(frozen=True)
class RegistryApprovalInvalidation:
    obligation_id: str
    registry: str
    reason: str


# STAGE_11B_3B_CONTEXTUAL_FRDO_INVALIDATION
FRDO_EXTENDED_APPROVAL_PROGRAM_TYPES = frozenset(
    {
        PROGRAM_TYPE_VOCATIONAL_TRAINING,
    }
)


def _learner_profile_change_scope(
    changed_fields: object,
) -> tuple[
    tuple[str, ...],
    bool,
]:
    fields = {
        str(field)
        for field in (
            changed_fields
            or ()
        )
    }

    registries = (
        approval_registries_for_learner_profile_fields(
            fields
        )
    )

    include_extended_frdo = bool(
        fields.intersection(
            FRDO_EXTENDED_APPROVAL_LEARNER_PROFILE_FIELDS
        )
    )

    return (
        registries,
        include_extended_frdo,
    )


def _learner_profile_registry_condition(
    *,
    registries: tuple[str, ...],
    include_extended_frdo: bool,
):
    conditions = []

    if registries:
        conditions.append(
            RegistryObligation.registry.in_(
                registries
            )
        )

    if include_extended_frdo:
        conditions.append(
            and_(
                RegistryObligation.registry
                == REGISTRY_FRDO,
                Course.regulatory_program_type.in_(
                    tuple(
                        FRDO_EXTENDED_APPROVAL_PROGRAM_TYPES
                    )
                ),
            )
        )

    if not conditions:
        return None

    if len(conditions) == 1:
        return conditions[0]

    return or_(
        *conditions
    )


def _apply_invalidation_rows(
    obligations: object,
    *,
    reason: str,
    invalidated_at: datetime,
) -> tuple[RegistryApprovalInvalidation, ...]:
    invalidations: list[
        RegistryApprovalInvalidation
    ] = []

    for obligation in obligations:
        changed = invalidate_registry_approval(
            obligation,
            reason=reason,
            invalidated_at=invalidated_at,
        )

        if not changed:
            continue

        invalidations.append(
            RegistryApprovalInvalidation(
                obligation_id=str(
                    obligation.id
                ),
                registry=str(
                    obligation.registry
                ),
                reason=reason,
            )
        )

    return tuple(
        invalidations
    )


async def invalidate_registry_approvals_for_learner_profile(
    session: AsyncSession,
    *,
    user_id: str,
    changed_fields: object,
    invalidated_at: datetime,
) -> tuple[RegistryApprovalInvalidation, ...]:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        changed_fields
    )

    registry_condition = (
        _learner_profile_registry_condition(
            registries=registries,
            include_extended_frdo=(
                include_extended_frdo
            ),
        )
    )

    if registry_condition is None:
        return ()

    result = await session.execute(
        select(
            RegistryObligation
        )
        .join(
            Enrollment,
            Enrollment.id
            == RegistryObligation.enrollment_id,
        )
        .join(
            Course,
            Course.id
            == Enrollment.course_id,
        )
        .where(
            Enrollment.user_id
            == str(user_id),
            registry_condition,
            RegistryObligation.status
            == OBLIGATION_STATUS_APPROVED,
        )
        .order_by(
            RegistryObligation.id
        )
        .with_for_update()
    )

    return _apply_invalidation_rows(
        result.scalars().all(),
        reason=(
            APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED
        ),
        invalidated_at=invalidated_at,
    )


async def invalidate_registry_approvals_for_course(
    session: AsyncSession,
    *,
    course_id: str,
    invalidated_at: datetime,
) -> tuple[RegistryApprovalInvalidation, ...]:
    result = await session.execute(
        select(
            RegistryObligation
        )
        .join(
            Enrollment,
            Enrollment.id
            == RegistryObligation.enrollment_id,
        )
        .where(
            Enrollment.course_id
            == str(course_id),
            RegistryObligation.registry.in_(
                (
                    REGISTRY_FRDO,
                    REGISTRY_MINTRUD,
                )
            ),
            RegistryObligation.status
            == OBLIGATION_STATUS_APPROVED,
        )
        .order_by(
            RegistryObligation.id
        )
        .with_for_update()
    )

    return _apply_invalidation_rows(
        result.scalars().all(),
        reason=(
            APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED
        ),
        invalidated_at=invalidated_at,
    )


async def invalidate_mintrud_registry_approvals_for_course(
    session: AsyncSession,
    *,
    course_id: str,
    invalidated_at: datetime,
) -> tuple[RegistryApprovalInvalidation, ...]:
    result = await session.execute(
        select(RegistryObligation)
        .join(
            Enrollment,
            Enrollment.id
            == RegistryObligation.enrollment_id,
        )
        .where(
            Enrollment.course_id == str(course_id),
            RegistryObligation.registry == REGISTRY_MINTRUD,
            RegistryObligation.status
            == OBLIGATION_STATUS_APPROVED,
        )
        .order_by(RegistryObligation.id)
        .with_for_update()
    )

    return _apply_invalidation_rows(
        result.scalars().all(),
        reason=APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED,
        invalidated_at=invalidated_at,
    )


async def invalidate_registry_approval_for_document(
    session: AsyncSession,
    *,
    document_id: str,
    invalidated_at: datetime,
) -> tuple[RegistryApprovalInvalidation, ...]:
    result = await session.execute(
        select(
            RegistryObligation
        )
        .where(
            RegistryObligation.registry
            == REGISTRY_FRDO,
            RegistryObligation.document_id
            == str(document_id),
            RegistryObligation.status
            == OBLIGATION_STATUS_APPROVED,
        )
        .order_by(
            RegistryObligation.id
        )
        .with_for_update()
    )

    return _apply_invalidation_rows(
        result.scalars().all(),
        reason=(
            APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED
        ),
        invalidated_at=invalidated_at,
    )

async def lock_registry_approvals_for_learner_profile(
    session: AsyncSession,
    *,
    user_id: str,
    changed_fields: object,
) -> tuple[str, ...]:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        changed_fields
    )

    registry_condition = (
        _learner_profile_registry_condition(
            registries=registries,
            include_extended_frdo=(
                include_extended_frdo
            ),
        )
    )

    if registry_condition is None:
        return ()

    with session.no_autoflush:
        result = await session.execute(
            select(
                RegistryObligation
            )
            .join(
                Enrollment,
                Enrollment.id
                == RegistryObligation.enrollment_id,
            )
            .join(
                Course,
                Course.id
                == Enrollment.course_id,
            )
            .where(
                Enrollment.user_id
                == str(user_id),
                registry_condition,
                RegistryObligation.status
                == OBLIGATION_STATUS_APPROVED,
            )
            .order_by(
                RegistryObligation.id
            )
            .with_for_update(
                of=RegistryObligation
            )
        )

    return tuple(
        str(
            obligation.id
        )
        for obligation
        in result.scalars().all()
    )


async def lock_registry_approvals_for_course(
    session: AsyncSession,
    *,
    course_id: str,
) -> tuple[str, ...]:
    with session.no_autoflush:
        result = await session.execute(
            select(
                RegistryObligation
            )
            .join(
                Enrollment,
                Enrollment.id
                == RegistryObligation.enrollment_id,
            )
            .where(
                Enrollment.course_id
                == str(course_id),
                RegistryObligation.registry.in_(
                    (
                        REGISTRY_FRDO,
                        REGISTRY_MINTRUD,
                    )
                ),
                RegistryObligation.status
                == OBLIGATION_STATUS_APPROVED,
            )
            .order_by(
                RegistryObligation.id
            )
            .with_for_update(
                of=RegistryObligation
            )
        )

    return tuple(
        str(
            obligation.id
        )
        for obligation
        in result.scalars().all()
    )


async def lock_mintrud_registry_approvals_for_course(
    session: AsyncSession,
    *,
    course_id: str,
) -> tuple[str, ...]:
    with session.no_autoflush:
        result = await session.execute(
            select(RegistryObligation)
            .join(
                Enrollment,
                Enrollment.id
                == RegistryObligation.enrollment_id,
            )
            .where(
                Enrollment.course_id == str(course_id),
                RegistryObligation.registry == REGISTRY_MINTRUD,
                RegistryObligation.status
                == OBLIGATION_STATUS_APPROVED,
            )
            .order_by(RegistryObligation.id)
            .with_for_update(of=RegistryObligation)
        )

    return tuple(
        str(obligation.id)
        for obligation in result.scalars().all()
    )


async def lock_registry_approval_for_document(
    session: AsyncSession,
    *,
    document_id: str,
) -> tuple[str, ...]:
    with session.no_autoflush:
        result = await session.execute(
            select(
                RegistryObligation
            )
            .where(
                RegistryObligation.registry
                == REGISTRY_FRDO,
                RegistryObligation.document_id
                == str(document_id),
                RegistryObligation.status
                == OBLIGATION_STATUS_APPROVED,
            )
            .order_by(
                RegistryObligation.id
            )
            .with_for_update(
                of=RegistryObligation
            )
        )

    return tuple(
        str(
            obligation.id
        )
        for obligation
        in result.scalars().all()
    )
