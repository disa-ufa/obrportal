from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.services.compliance_registry_approval import (
    APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED,
    APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
    APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED,
    approval_registries_for_learner_profile_fields,
    invalidate_registry_approval,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


@dataclass(frozen=True)
class RegistryApprovalInvalidation:
    obligation_id: str
    registry: str
    reason: str


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
    registries = (
        approval_registries_for_learner_profile_fields(
            changed_fields
        )
    )

    if not registries:
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
        .where(
            Enrollment.user_id
            == str(user_id),
            RegistryObligation.registry.in_(
                registries
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
    registries = (
        approval_registries_for_learner_profile_fields(
            changed_fields
        )
    )

    if not registries:
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
            .where(
                Enrollment.user_id
                == str(user_id),
                RegistryObligation.registry.in_(
                    registries
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
