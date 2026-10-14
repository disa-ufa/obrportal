"""Dormant DB-derived lock scope for future cooperating source writers.

No production caller, writes, commits, authorization or readiness grant. Roots
are existing courses, learners or enrollments. An enrollment root covers linked
document/context first inserts and edits. Resolving document/context IDs to that
root, reassignment, deletion and batch lifecycle integration remain out of scope.
Never add this after legacy row locks or partially activate production writers.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.models.user import User
from app.services.registry_action_lockset import (
    RegistryActionLockError,
    RegistryObligationTarget,
    RegistrySourceFence,
    _acquire_advisory_keys,
    _assert_read_committed,
    _lock_registry_obligations,
    normalize_registry_source_fences,
)


@dataclass(frozen=True)
class RegistrySourceWriteScope:
    """Dependency snapshot only; contains no policy verdict or reusable grant."""

    roots: tuple[RegistrySourceFence, ...]
    # Scalar projections bypass stale ORM identities, including old enrollment
    # course/user/organization assignments. Child values are read AFTER locking.
    enrollments: tuple[tuple[str, str, str, str | None], ...]
    source_fences: tuple[RegistrySourceFence, ...]
    targets: tuple[RegistryObligationTarget, ...]


def _validate_roots(roots: tuple[RegistrySourceFence, ...]) -> None:
    normalize_registry_source_fences(source_fences=roots)
    if any(root.kind not in {"course", "learner", "enrollment"} for root in roots):
        raise RegistryActionLockError("registry.writer_unsupported_root")


def _assert_clean_transaction(session: AsyncSession) -> None:
    if not session.in_transaction() or session.in_nested_transaction():
        raise RegistryActionLockError("registry.writer_fresh_transaction_required")
    if session.new or session.dirty or session.deleted:
        raise RegistryActionLockError("registry.writer_pending_changes")


async def discover_registry_source_write_scope(
    *, session: AsyncSession, roots: tuple[RegistrySourceFence, ...],
) -> RegistrySourceWriteScope:
    """Discover BOTH registries at every status, including no-obligation cases.

    This is an unlocked snapshot. Do not use it to write; use the acquiring wrapper
    as the first lock-taking operation of a fresh READ COMMITTED transaction.
    """
    _validate_roots(roots)
    _assert_clean_transaction(session)
    ordered_roots = tuple(sorted(set(roots), key=lambda item: (item.kind, item.resource_id)))
    conditions = []
    models = {"course": Course, "learner": User, "enrollment": Enrollment}
    columns = {"course": Enrollment.course_id, "learner": Enrollment.user_id,
               "enrollment": Enrollment.id}
    with session.no_autoflush:
        for kind, model in models.items():
            ids = {root.resource_id for root in ordered_roots if root.kind == kind}
            if not ids:
                continue
            found = set((await session.scalars(select(model.id).where(model.id.in_(ids)))).all())
            if found != ids:
                raise RegistryActionLockError("registry.writer_root_missing")
            conditions.append(columns[kind].in_(ids))
        enrollments = tuple(tuple(row) for row in (await session.execute(
            select(Enrollment.id, Enrollment.course_id, Enrollment.user_id,
                   Enrollment.organization_id)
            .where(or_(*conditions)).order_by(Enrollment.id)
        )).all())
        enrollment_ids = tuple(row[0] for row in enrollments)
        targets = tuple(RegistryObligationTarget(*row) for row in (await session.execute(
            select(RegistryObligation.id, RegistryObligation.enrollment_id,
                   RegistryObligation.registry)
            .where(RegistryObligation.enrollment_id.in_(enrollment_ids))
            .order_by(RegistryObligation.id)
        )).all())
    if any(target.registry not in {"frdo", "mintrud"} for target in targets):
        raise RegistryActionLockError("registry.writer_unknown_registry")
    fences = set(ordered_roots)
    for enrollment_id, course_id, learner_id, organization_id in enrollments:
        fences.update((RegistrySourceFence("enrollment", enrollment_id),
                       RegistrySourceFence("course", course_id),
                       RegistrySourceFence("learner", learner_id)))
        if organization_id is not None:
            fences.add(RegistrySourceFence("organization", organization_id))
    source_fences = tuple(sorted(fences, key=lambda item: (item.kind, item.resource_id)))
    normalize_registry_source_fences(source_fences=source_fences)
    return RegistrySourceWriteScope(ordered_roots, enrollments, source_fences, targets)


async def acquire_discovered_registry_source_write_scope(
    *, session: AsyncSession, roots: tuple[RegistrySourceFence, ...],
) -> tuple[tuple[RegistryObligation, ...], RegistrySourceWriteScope]:
    """Source fences -> both decision keys per enrollment -> obligation rows.

    Re-discover before proceeding to later lock phases. A membership change requires
    rollback and a NEW transaction, never adding an earlier lock to this lockset.
    No source row may be locked/modified before this returns. Keep all fences until
    commit/rollback and read source values freshly afterward. Caller owns rollback
    on EVERY exception. Even success is not permission for an approval/export.

    All enrollment insertion/reassignment/deletion writers must eventually fence
    both old/new parents. Existing writers do not, so this protocol is dormant.
    """
    _validate_roots(roots)
    _assert_clean_transaction(session)
    with session.no_autoflush:
        await _assert_read_committed(session)
        before = await discover_registry_source_write_scope(session=session, roots=roots)
        await _acquire_advisory_keys(session=session, keys=normalize_registry_source_fences(
            source_fences=before.source_fences,
        ))
        after = await discover_registry_source_write_scope(session=session, roots=roots)
        if before != after:
            raise RegistryActionLockError("registry.writer_scope_changed_during_lock")
        # Also fence decisions when an obligation does not yet exist. This is
        # the exact namespace used by persist_registry_applicability.
        decision_keys = tuple(sorted(
            "registry-applicability:" + row[0] + ":" + registry
            for row in after.enrollments for registry in ("frdo", "mintrud")
        ))
        await _acquire_advisory_keys(session=session, keys=decision_keys)
        locked = await _lock_registry_obligations(session=session, targets=after.targets)
        # A legacy decision/obligation writer can still bypass source fences.
        # Detect changed membership while waiting on its later locks too.
        final = await discover_registry_source_write_scope(session=session, roots=roots)
        if after != final:
            raise RegistryActionLockError("registry.writer_scope_changed_during_lock")
    return locked, final
