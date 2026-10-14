"""Read-only source-scope discovery for a future registry new-action boundary.

DORMANT: this module is not wired into approval, export or batches and grants
no permission or eligibility. Until source writers adopt the same advisory
fences, comparing a pre/post-lock snapshot cannot guarantee commit-time
freshness. Do not activate a global applicability gate on this evidence.

Caller owns a fresh READ COMMITTED transaction. A scope mismatch is terminal
for that transaction: roll back and retry discovery from a NEW transaction.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.frdo_registry_context import FrdoRegistryContext
from app.models.mintrud_learn_program import CourseMintrudLearnProgram
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_obligation import RegistryObligation
from app.services.registry_action_lockset import (
    RegistryActionLockError,
    _assert_read_committed,
    RegistryObligationTarget,
    RegistrySourceFence,
    acquire_registry_new_action_lockset,
    normalize_registry_lockset,
)


@dataclass(frozen=True)
class RegistrySourceScopeRow:
    obligation_id: str
    enrollment_id: str
    registry: str
    course_id: str
    learner_id: str
    organization_id: str | None
    document_id: str | None
    # These are actual linked child rows, not just obligation.document_id.
    # Their absence is significant when a concurrent source writer inserts one.
    enrollment_document_id: str | None = None
    registry_context_id: str | None = None


@dataclass(frozen=True)
class RegistryDiscoveredActionScope:
    """A comparison snapshot, NOT an authorization grant."""

    rows: tuple[RegistrySourceScopeRow, ...]
    source_fences: tuple[RegistrySourceFence, ...]
    targets: tuple[RegistryObligationTarget, ...]
    # Mintrud course<->catalog membership (including empty) is part of scope.
    mintrud_mapping_memberships: tuple[tuple[str, str], ...] = ()


def _canonical_id(raw: str) -> str:
    try:
        normalized = str(UUID(raw))
    except (TypeError, AttributeError, ValueError) as exc:
        raise RegistryActionLockError("registry.scope_invalid_uuid") from exc
    if not isinstance(raw, str) or raw != normalized:
        raise RegistryActionLockError("registry.scope_noncanonical_uuid")
    return normalized


def _validate_request(
    *,
    actor_id: str,
    registry: str,
    obligation_ids: tuple[str, ...],
) -> tuple[str, tuple[str, ...]]:
    actor = _canonical_id(actor_id)
    if registry not in {"frdo", "mintrud"}:
        raise RegistryActionLockError("registry.scope_invalid_registry")
    if not obligation_ids:
        raise RegistryActionLockError("registry.scope_empty")
    ids = tuple(_canonical_id(item) for item in obligation_ids)
    if len(set(ids)) != len(ids):
        raise RegistryActionLockError("registry.scope_duplicate_target")
    return actor, tuple(sorted(ids))


def build_registry_action_scope(
    *,
    actor_id: str,
    registry: str,
    obligation_ids: tuple[str, ...],
    rows: tuple[RegistrySourceScopeRow, ...],
    mintrud_mapping_memberships: tuple[tuple[str, str], ...] = (),
) -> RegistryDiscoveredActionScope:
    """Make source keys only from verified DB rows, never request-supplied scope."""
    actor, ids = _validate_request(
        actor_id=actor_id, registry=registry, obligation_ids=obligation_ids,
    )
    if len(rows) != len(ids):
        raise RegistryActionLockError("registry.scope_missing_obligation")

    discovered_ids: set[str] = set()
    fences: set[RegistrySourceFence] = {RegistrySourceFence("actor", actor)}
    targets: list[RegistryObligationTarget] = []
    for item in rows:
        if not isinstance(item, RegistrySourceScopeRow):
            raise RegistryActionLockError("registry.scope_invalid_row")
        obligation_id = _canonical_id(item.obligation_id)
        enrollment_id = _canonical_id(item.enrollment_id)
        if obligation_id not in ids or obligation_id in discovered_ids:
            raise RegistryActionLockError("registry.scope_unexpected_target")
        if item.registry != registry:
            raise RegistryActionLockError("registry.scope_registry_mismatch")
        discovered_ids.add(obligation_id)
        fences.update({
            RegistrySourceFence("enrollment", enrollment_id),
            RegistrySourceFence("course", _canonical_id(item.course_id)),
            RegistrySourceFence("learner", _canonical_id(item.learner_id)),
        })
        if item.organization_id is not None:
            fences.add(RegistrySourceFence(
                "organization", _canonical_id(item.organization_id),
            ))
        for dependent_id in (
            item.document_id,
            item.enrollment_document_id,
            item.registry_context_id,
        ):
            if dependent_id is not None:
                _canonical_id(dependent_id)
        targets.append(RegistryObligationTarget(
            obligation_id=obligation_id,
            enrollment_id=enrollment_id,
            registry=registry,
        ))
    if discovered_ids != set(ids):
        raise RegistryActionLockError("registry.scope_missing_obligation")

    # Reject mapping rows outside the locked course scope or from another
    # registry, rather than allowing caller-supplied memberships to be trusted.
    discovered_courses = {item.course_id for item in rows}
    memberships: set[tuple[str, str]] = set()
    if registry != "mintrud" and mintrud_mapping_memberships:
        raise RegistryActionLockError("registry.scope_unexpected_mapping")
    for member in mintrud_mapping_memberships:
        if not isinstance(member, tuple) or len(member) != 2:
            raise RegistryActionLockError("registry.scope_invalid_mapping")
        course_id, program_id = (_canonical_id(value) for value in member)
        if course_id not in discovered_courses or (course_id, program_id) in memberships:
            raise RegistryActionLockError("registry.scope_invalid_mapping")
        memberships.add((course_id, program_id))

    ordered_fences = tuple(sorted(fences, key=lambda item: (item.kind, item.resource_id)))
    ordered_targets = tuple(sorted(targets, key=lambda item: item.obligation_id))
    normalize_registry_lockset(
        source_fences=ordered_fences, obligation_targets=ordered_targets,
    )
    return RegistryDiscoveredActionScope(
        rows=tuple(sorted(rows, key=lambda item: item.obligation_id)),
        source_fences=ordered_fences,
        targets=ordered_targets,
        mintrud_mapping_memberships=tuple(sorted(memberships)),
    )


def _require_clean_action_transaction(session: AsyncSession) -> None:
    """Reject ORM writes or savepoints BEFORE any SQL that might autoflush.

    This cannot detect earlier explicit SQL writes/locks; the caller must still
    supply a fresh transaction with no pre-acquired locks or flushed changes.
    """
    if not session.in_transaction() or session.in_nested_transaction():
        raise RegistryActionLockError("registry.scope_fresh_transaction_required")
    if session.new or session.dirty or session.deleted:
        raise RegistryActionLockError("registry.scope_pending_changes")


async def discover_registry_action_scope(
    *,
    session: AsyncSession,
    actor_id: str,
    registry: str,
    obligation_ids: tuple[str, ...],
) -> RegistryDiscoveredActionScope:
    """Read trusted relationship without writes, autoflush or row locks.

    Requires READ COMMITTED and a clean, non-nested active transaction. Never
    use an in-memory ORM object or request-supplied owner to determine scope.
    """
    _require_clean_action_transaction(session)
    _validate_request(
        actor_id=actor_id, registry=registry, obligation_ids=obligation_ids,
    )
    with session.no_autoflush:
        await _assert_read_committed(session)
        query = (
            select(
                RegistryObligation.id,
                RegistryObligation.enrollment_id,
                RegistryObligation.registry,
                Enrollment.course_id,
                Enrollment.user_id,
                Enrollment.organization_id,
                RegistryObligation.document_id,
                DocumentRecord.id,
                func.coalesce(FrdoRegistryContext.id, MintrudRegistryContext.id),
            )
            .join(Enrollment, Enrollment.id == RegistryObligation.enrollment_id)
            .outerjoin(DocumentRecord, DocumentRecord.enrollment_id == Enrollment.id)
            .outerjoin(
                FrdoRegistryContext,
                and_(
                    FrdoRegistryContext.obligation_id == RegistryObligation.id,
                    RegistryObligation.registry == "frdo",
                ),
            )
            .outerjoin(
                MintrudRegistryContext,
                and_(
                    MintrudRegistryContext.obligation_id == RegistryObligation.id,
                    RegistryObligation.registry == "mintrud",
                ),
            )
            .where(RegistryObligation.id.in_(obligation_ids))
            .order_by(RegistryObligation.id)
        )
        result = (await session.execute(query)).all()
        rows = tuple(RegistrySourceScopeRow(*record) for record in result)

        # Membership is independently queried because joining a many-to-many table
        # into the obligation select would duplicate the obligation rows.
        memberships: tuple[tuple[str, str], ...] = ()
        if registry == "mintrud" and rows:
            course_ids = tuple(sorted({row.course_id for row in rows}))
            memberships = tuple((
                await session.execute(
                    select(
                        CourseMintrudLearnProgram.course_id,
                        CourseMintrudLearnProgram.mintrud_learn_program_id,
                    )
                    .where(CourseMintrudLearnProgram.course_id.in_(course_ids))
                    .order_by(
                        CourseMintrudLearnProgram.course_id,
                        CourseMintrudLearnProgram.mintrud_learn_program_id,
                    )
                )
            ).all())

    return build_registry_action_scope(
        actor_id=actor_id, registry=registry,
        obligation_ids=obligation_ids, rows=rows,
        mintrud_mapping_memberships=memberships,
    )


async def acquire_discovered_registry_action_scope(
    *,
    session: AsyncSession,
    actor_id: str,
    registry: str,
    obligation_ids: tuple[str, ...],
) -> tuple[tuple[RegistryObligation, ...], RegistryDiscoveredActionScope]:
    """Stage source discovery -> ordered lockset -> mandatory rediscovery.

    Must be the FIRST lock-taking protocol in this transaction. Any exception
    requires caller rollback. Successful return is NOT permission to mutate:
    RBAC, canonical fingerprint, required decision, readiness and history still
    need an atomic guarded service boundary and source-writer participation.
    """
    _require_clean_action_transaction(session)
    before = await discover_registry_action_scope(
        session=session, actor_id=actor_id,
        registry=registry, obligation_ids=obligation_ids,
    )
    locked = await acquire_registry_new_action_lockset(
        session=session,
        source_fences=before.source_fences,
        obligation_targets=before.targets,
    )
    # Under READ COMMITTED, a child committed by a cooperating writer while
    # we waited for its parent fence must be visible to this second discovery.
    after = await discover_registry_action_scope(
        session=session, actor_id=actor_id,
        registry=registry, obligation_ids=obligation_ids,
    )
    if before != after:
        raise RegistryActionLockError("registry.scope_changed_during_lock")
    return locked, after
