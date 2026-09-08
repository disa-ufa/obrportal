from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_obligation import RegistryObligation
from app.services.completion_documents import load_completion_document_context
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    OBLIGATION_STATUS_PENDING_DATA,
    OBLIGATION_STATUS_READY,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_readiness import (
    RegistryReadinessResult,
    evaluate_registry_readiness,
)


LEARNER_PROFILE_READINESS_FIELDS = frozenset(
    {
        "last_name",
        "first_name",
        "birth_date",
        "sex",
        "citizenship_country_code",
        "snils",
    }
)


READINESS_REFRESHABLE_STATUSES = frozenset(
    {
        OBLIGATION_STATUS_PENDING_DATA,
        OBLIGATION_STATUS_READY,
        OBLIGATION_STATUS_NEEDS_APPROVAL,
    }
)


@dataclass(frozen=True)
class RegistryReadinessRefresh:
    obligation_id: str
    registry: str
    before_status: str
    after_status: str
    before_errors: tuple[dict[str, Any], ...]
    after_errors: tuple[dict[str, Any], ...]
    is_ready: bool


def apply_registry_readiness_result(
    obligation: Any,
    readiness: RegistryReadinessResult,
) -> RegistryReadinessRefresh:
    before_status = str(
        getattr(
            obligation,
            "status",
            "",
        )
        or ""
    )

    if before_status not in READINESS_REFRESHABLE_STATUSES:
        raise ValueError(
            "Registry obligation lifecycle does not allow "
            "automatic readiness refresh: "
            + before_status
        )

    before_errors = tuple(
        dict(item)
        for item in (
            getattr(
                obligation,
                "readiness_errors",
                None,
            )
            or []
        )
    )

    after_error_list = readiness.as_error_payload()

    obligation.readiness_errors = after_error_list

    if before_status in {
        OBLIGATION_STATUS_PENDING_DATA,
        OBLIGATION_STATUS_READY,
    }:
        obligation.status = (
            OBLIGATION_STATUS_READY
            if readiness.is_ready
            else OBLIGATION_STATUS_PENDING_DATA
        )

    after_status = str(
        getattr(
            obligation,
            "status",
            "",
        )
        or ""
    )

    after_errors = tuple(
        dict(item)
        for item in after_error_list
    )

    return RegistryReadinessRefresh(
        obligation_id=str(
            getattr(
                obligation,
                "id",
                "",
            )
            or ""
        ),
        registry=str(
            getattr(
                obligation,
                "registry",
                "",
            )
            or ""
        ),
        before_status=before_status,
        after_status=after_status,
        before_errors=before_errors,
        after_errors=after_errors,
        is_ready=readiness.is_ready,
    )


async def refresh_registry_readiness_for_user(
    session: AsyncSession,
    *,
    user_id: str,
) -> tuple[RegistryReadinessRefresh, ...]:
    result = await session.execute(
        select(
            RegistryObligation,
            Enrollment,
        )
        .join(
            Enrollment,
            Enrollment.id
            == RegistryObligation.enrollment_id,
        )
        .where(
            Enrollment.user_id == str(user_id),
            RegistryObligation.registry.in_(
                (
                    REGISTRY_FRDO,
                    REGISTRY_MINTRUD,
                )
            ),
            RegistryObligation.status.in_(
                tuple(
                    READINESS_REFRESHABLE_STATUSES
                )
            ),
        )
        .order_by(
            RegistryObligation.id
        )
        .with_for_update()
    )

    rows = result.all()

    refreshes: list[
        RegistryReadinessRefresh
    ] = []

    for obligation, enrollment in rows:
        (
            course,
            learner,
            learner_profile,
            organization,
        ) = await load_completion_document_context(
            enrollment,
            session,
        )

        document = None
        mintrud_context = None

        if obligation.registry == REGISTRY_FRDO:
            if obligation.document_id:
                document = await session.get(
                    DocumentRecord,
                    str(
                        obligation.document_id
                    ),
                )

            readiness = evaluate_registry_readiness(
                registry=REGISTRY_FRDO,
                enrollment=enrollment,
                course=course,
                learner=learner,
                learner_profile=learner_profile,
                document=document,
                organization=organization,
            )

        elif obligation.registry == REGISTRY_MINTRUD:
            context_result = await session.execute(
                select(
                    MintrudRegistryContext
                ).where(
                    MintrudRegistryContext.obligation_id
                    == obligation.id
                )
            )

            mintrud_context = (
                context_result.scalar_one_or_none()
            )

            readiness = evaluate_registry_readiness(
                registry=REGISTRY_MINTRUD,
                enrollment=enrollment,
                course=course,
                learner=learner,
                learner_profile=learner_profile,
                organization=organization,
                mintrud_context=mintrud_context,
            )

        else:
            continue

        refreshes.append(
            apply_registry_readiness_result(
                obligation,
                readiness,
            )
        )

    if refreshes:
        await session.flush()

    return tuple(refreshes)
