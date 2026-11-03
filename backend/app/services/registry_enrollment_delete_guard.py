"""Guard ordinary enrollment deletion against registry-history loss.

Caller owns the transaction. No commit or source changes are made here.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.models.registry_applicability import (
    RegistryApplicabilityRecord,
    RegistryApplicabilityEvent,
)
from app.services.registry_action_lockset import RegistrySourceFence
from app.services.registry_source_write_scope import (
    acquire_discovered_registry_source_write_scope,
)


class RegistryEnrollmentDeleteConflict(ValueError):
    """The enrollment may not be removed by an ordinary delete."""


async def acquire_registry_enrollment_deletion_guard(
    *,
    session: AsyncSession,
    enrollment_id: str,
) -> Enrollment:
    """Take canonical fences, then reject any registry-owned history."""

    if not session.in_transaction():
        raise RegistryEnrollmentDeleteConflict(
            "registry.enrollment_delete_transaction_required"
        )

    try:
        normalized = str(UUID(str(enrollment_id)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise RegistryEnrollmentDeleteConflict(
            "registry.enrollment_delete_invalid_id"
        ) from exc

    locked, scope = await acquire_discovered_registry_source_write_scope(
        session=session,
        roots=(RegistrySourceFence("enrollment", normalized),),
    )

    if not any(str(item[0]) == normalized for item in scope.enrollments):
        raise RegistryEnrollmentDeleteConflict(
            "registry.enrollment_delete_scope_changed"
        )

    if any(str(item.enrollment_id) == normalized for item in locked):
        raise RegistryEnrollmentDeleteConflict(
            "registry.enrollment_delete_has_obligations"
        )

    # Also protect unusual legacy states with applicability history but
    # without an obligation. Never rely solely on the obligation FK.
    for model, code in (
        (RegistryObligation, "has_obligations"),
        (RegistryApplicabilityRecord, "has_decisions"),
        (RegistryApplicabilityEvent, "has_audit_history"),
    ):
        existing = await session.scalar(
            select(model.id)
            .where(model.enrollment_id == normalized)
            .limit(1)
        )
        if existing is not None:
            raise RegistryEnrollmentDeleteConflict(
                "registry.enrollment_delete_" + code
            )

    # Refresh after waits; never trust an ORM object read before fencing.
    enrollment = await session.scalar(
        select(Enrollment)
        .where(Enrollment.id == normalized)
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    if enrollment is None:
        raise RegistryEnrollmentDeleteConflict(
            "registry.enrollment_delete_missing"
        )

    return enrollment