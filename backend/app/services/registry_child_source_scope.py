"""Dormant trusted document/context -> enrollment dependency resolver.

Reads *database* relationships, not request-supplied owner hints or ORM
identities. Never grants export permission, writes, commits, or changes routes.
A successful lock preflight is NOT commit-time safety until all source writers
take the matching fences. Call in a fresh READ COMMITTED transaction, BEFORE
any later row locks, and rollback on every error.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.frdo_registry_context import FrdoRegistryContext
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.registry_obligation import RegistryObligation
from app.services.registry_action_lockset import RegistryActionLockError, RegistrySourceFence
from app.services.registry_source_write_scope import acquire_discovered_registry_source_write_scope


_UNCHANGED = object()
_CONTEXT_MODELS = {"frdo": FrdoRegistryContext, "mintrud": MintrudRegistryContext}


@dataclass(frozen=True)
class RegistryChildDependencyScope:
    """Exact discovery evidence and old/new enrollment roots; NOT a grant."""

    kind: str
    source_id: str
    current_enrollment_id: str | None
    proposed_enrollment_id: str | None
    roots: tuple[RegistrySourceFence, ...]
    # Immutable scalar projections; includes absent/present child membership.
    evidence: tuple[tuple[str | None, ...], ...]


def _uuid(value: str) -> str:
    try:
        canonical = str(UUID(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise RegistryActionLockError("registry.child_invalid_uuid") from exc
    if not isinstance(value, str) or value != canonical:
        raise RegistryActionLockError("registry.child_noncanonical_uuid")
    return canonical


def _transaction(session: AsyncSession) -> None:
    if not session.in_transaction() or session.in_nested_transaction():
        raise RegistryActionLockError("registry.child_fresh_transaction_required")
    if session.new or session.dirty or session.deleted:
        raise RegistryActionLockError("registry.child_pending_changes")


def _roots(*ids: str | None) -> tuple[RegistrySourceFence, ...]:
    return tuple(RegistrySourceFence("enrollment", item) for item in sorted({
        _uuid(item) for item in ids if item is not None
    }))


async def _enrollments(
    session: AsyncSession, ids: tuple[str, ...],
) -> tuple[tuple[str, str, str, str | None], ...]:
    if not ids:
        return ()
    rows = tuple(tuple(row) for row in (await session.execute(
        select(Enrollment.id, Enrollment.course_id, Enrollment.user_id,
               Enrollment.organization_id)
        .where(Enrollment.id.in_(ids)).order_by(Enrollment.id)
    )).all())
    if {row[0] for row in rows} != set(ids):
        raise RegistryActionLockError("registry.child_enrollment_missing")
    return rows


def _make_scope(
    *, kind: str, source_id: str, current: str | None,
    proposed: str | None, evidence: tuple[tuple[str | None, ...], ...],
) -> RegistryChildDependencyScope:
    roots = _roots(current, proposed)
    if not roots:
        raise RegistryActionLockError("registry.child_unlinked")
    return RegistryChildDependencyScope(
        kind=kind, source_id=source_id, current_enrollment_id=current,
        proposed_enrollment_id=proposed, roots=roots, evidence=evidence,
    )


async def resolve_registry_document_scope(
    *, session: AsyncSession, document_id: str,
    proposed_enrollment_id: str | None | object = _UNCHANGED,
) -> RegistryChildDependencyScope:
    """Resolve existing document and old/new owners; absence is not an owner.

    A proposed None means detach. No proposal means keep the current owner.
    Document -> obligation cross-references are checked, not inferred.
    """
    _transaction(session)
    document_id = _uuid(document_id)
    if proposed_enrollment_id is not _UNCHANGED and proposed_enrollment_id is not None:
        proposed_enrollment_id = _uuid(proposed_enrollment_id)
    with session.no_autoflush:
        doc = (await session.execute(
            select(DocumentRecord.id, DocumentRecord.enrollment_id,
                   DocumentRecord.user_id, DocumentRecord.course_id)
            .where(DocumentRecord.id == document_id)
        )).one_or_none()
        if doc is None:
            raise RegistryActionLockError("registry.child_document_missing")
        doc_id, linked, user_id, course_id = tuple(doc)
        proposal = linked if proposed_enrollment_id is _UNCHANGED else proposed_enrollment_id
        references = tuple(tuple(row) for row in (await session.execute(
            select(RegistryObligation.id, RegistryObligation.enrollment_id)
            .where(RegistryObligation.document_id == document_id)
            .order_by(RegistryObligation.id)
        )).all())
        # An obligation's optional document pointer is NOT proof of ownership.
        if any(enrollment_id != linked for _, enrollment_id in references):
            raise RegistryActionLockError("registry.child_document_reference_mismatch")
        if linked != proposal and references:
            raise RegistryActionLockError("registry.child_document_reassignment_with_history")
        enrollments = await _enrollments(session, tuple(
            sorted({item for item in (linked, proposal) if item is not None})
        ))
        for enrollment_id, enrollment_course, learner_id, _ in enrollments:
            if learner_id != user_id or (
                course_id is not None and enrollment_course != course_id
            ):
                raise RegistryActionLockError("registry.child_document_owner_mismatch")
        evidence = (
            (doc_id, linked, user_id, course_id, proposal),
            *references,
            *enrollments,
        )
    return _make_scope(
        kind="document", source_id=doc_id,
        current=linked, proposed=proposal, evidence=evidence,
    )


async def resolve_registry_document_creation_scope(
    *, session: AsyncSession, enrollment_id: str,
    expected_user_id: str, expected_course_id: str | None = None,
) -> RegistryChildDependencyScope:
    """Resolve a first linked document via existing enrollment parent."""
    _transaction(session)
    enrollment_id = _uuid(enrollment_id)
    expected_user_id = _uuid(expected_user_id)
    if expected_course_id is not None:
        expected_course_id = _uuid(expected_course_id)
    with session.no_autoflush:
        rows = await _enrollments(session, (enrollment_id,))
        _, course_id, learner_id, organization_id = rows[0]
        if learner_id != expected_user_id or (
            expected_course_id is not None and course_id != expected_course_id
        ):
            raise RegistryActionLockError("registry.child_document_owner_mismatch")
        document_ids = tuple((await session.scalars(
            select(DocumentRecord.id)
            .where(DocumentRecord.enrollment_id == enrollment_id)
            .order_by(DocumentRecord.id)
        )).all())
        if document_ids:
            raise RegistryActionLockError("registry.child_document_already_exists")
    return _make_scope(
        kind="document_create", source_id=enrollment_id,
        current=None, proposed=enrollment_id,
        evidence=((enrollment_id, course_id, learner_id, organization_id),
                  (None,)),
    )


async def resolve_registry_context_scope(
    *, session: AsyncSession, registry: str, context_id: str,
) -> RegistryChildDependencyScope:
    """Resolve an existing FRDO/Mintrud context through a verified obligation."""
    _transaction(session)
    if registry not in _CONTEXT_MODELS:
        raise RegistryActionLockError("registry.child_invalid_registry")
    context_id = _uuid(context_id)
    model = _CONTEXT_MODELS[registry]
    with session.no_autoflush:
        context = (await session.execute(
            select(model.id, model.obligation_id)
            .where(model.id == context_id)
        )).one_or_none()
        if context is None:
            raise RegistryActionLockError("registry.child_context_missing")
        cid, obligation_id = tuple(context)
    return await _resolve_context_parent(
        session=session, registry=registry, obligation_id=obligation_id,
        expected_context_id=cid,
    )


async def resolve_registry_context_upsert_scope(
    *, session: AsyncSession, registry: str, obligation_id: str,
) -> RegistryChildDependencyScope:
    """Determine parent of an existing OR first context by obligation ID."""
    _transaction(session)
    return await _resolve_context_parent(
        session=session, registry=registry, obligation_id=_uuid(obligation_id),
        expected_context_id=_UNCHANGED,
    )


async def _resolve_context_parent(
    *, session: AsyncSession, registry: str, obligation_id: str,
    expected_context_id: str | object,
) -> RegistryChildDependencyScope:
    if registry not in _CONTEXT_MODELS:
        raise RegistryActionLockError("registry.child_invalid_registry")
    model = _CONTEXT_MODELS[registry]
    with session.no_autoflush:
        parent = (await session.execute(
            select(RegistryObligation.id, RegistryObligation.enrollment_id,
                   RegistryObligation.registry)
            .where(RegistryObligation.id == obligation_id)
        )).one_or_none()
        if parent is None:
            raise RegistryActionLockError("registry.child_obligation_missing")
        oid, enrollment_id, actual_registry = tuple(parent)
        if actual_registry != registry:
            raise RegistryActionLockError("registry.child_registry_mismatch")
        linked_contexts = tuple((await session.scalars(
            select(model.id).where(model.obligation_id == oid).order_by(model.id)
        )).all())
        if len(linked_contexts) > 1:
            raise RegistryActionLockError("registry.child_ambiguous_context")
        current_context_id = linked_contexts[0] if linked_contexts else None
        if expected_context_id is not _UNCHANGED and current_context_id != expected_context_id:
            raise RegistryActionLockError("registry.child_context_reassigned")
        parents = await _enrollments(session, (enrollment_id,))
        evidence = (
            (oid, enrollment_id, actual_registry, current_context_id),
            *parents,
        )
    return _make_scope(
        kind="context_" + registry, source_id=oid,
        current=enrollment_id, proposed=enrollment_id, evidence=evidence,
    )


async def _acquire_and_rediscover(
    *, session: AsyncSession, before: RegistryChildDependencyScope,
    resolver, **kwargs,
) -> RegistryChildDependencyScope:
    """Child read -> shared source/decision/row lockset -> child rediscovery.

    A changed scope must cause ROLLBACK and retry in a NEW transaction.
    """
    await acquire_discovered_registry_source_write_scope(
        session=session, roots=before.roots,
    )
    after = await resolver(session=session, **kwargs)
    if after != before:
        raise RegistryActionLockError("registry.child_scope_changed_during_lock")
    return after


async def acquire_registry_document_scope(
    *, session: AsyncSession, document_id: str,
    proposed_enrollment_id: str | None | object = _UNCHANGED,
) -> RegistryChildDependencyScope:
    before = await resolve_registry_document_scope(
        session=session, document_id=document_id,
        proposed_enrollment_id=proposed_enrollment_id,
    )
    return await _acquire_and_rediscover(
        session=session, before=before, resolver=resolve_registry_document_scope,
        document_id=document_id, proposed_enrollment_id=proposed_enrollment_id,
    )


async def acquire_registry_document_creation_scope(
    *, session: AsyncSession, enrollment_id: str,
    expected_user_id: str, expected_course_id: str | None = None,
) -> RegistryChildDependencyScope:
    before = await resolve_registry_document_creation_scope(
        session=session, enrollment_id=enrollment_id,
        expected_user_id=expected_user_id, expected_course_id=expected_course_id,
    )
    return await _acquire_and_rediscover(
        session=session, before=before, resolver=resolve_registry_document_creation_scope,
        enrollment_id=enrollment_id, expected_user_id=expected_user_id,
        expected_course_id=expected_course_id,
    )


async def acquire_registry_context_scope(
    *, session: AsyncSession, registry: str, context_id: str,
) -> RegistryChildDependencyScope:
    before = await resolve_registry_context_scope(
        session=session, registry=registry, context_id=context_id,
    )
    return await _acquire_and_rediscover(
        session=session, before=before, resolver=resolve_registry_context_scope,
        registry=registry, context_id=context_id,
    )


async def acquire_registry_context_upsert_scope(
    *, session: AsyncSession, registry: str, obligation_id: str,
) -> RegistryChildDependencyScope:
    before = await resolve_registry_context_upsert_scope(
        session=session, registry=registry, obligation_id=obligation_id,
    )
    return await _acquire_and_rediscover(
        session=session, before=before, resolver=resolve_registry_context_upsert_scope,
        registry=registry, obligation_id=obligation_id,
    )
