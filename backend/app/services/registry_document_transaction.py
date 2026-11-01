"""Opt-in document request owner. No commit and no export authorization."""
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.api.v1.auth import get_current_user, oauth2_scheme
from app.api.v1.rbac import get_user_permission_codes
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence, RegistryCatalogPolicyFence
from app.services.registry_action_lockset import RegistryActionLockError, RegistrySourceFence
from app.services.registry_source_write_scope import acquire_discovered_registry_source_write_scope
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation

_KEY = 'registry.document.request.fence'


async def get_registry_document_db():
    # Dependency shared by auth and endpoint: C precedes both, no old autobegin.
    async with AsyncSessionLocal() as session:
        fence = await begin_registry_catalog_policy_fence(session=session, mode='shared')
        session.info[_KEY] = fence
        try:
            yield session
        except RegistryActionLockError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        finally:
            session.info.pop(_KEY, None)
            if session.in_transaction():
                await session.rollback()


async def require_registry_document_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_registry_document_db),
):
    user = await get_current_user(token=token, session=session)
    await recheck_document_permission(session, user)
    return user


async def require_registry_profile_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_registry_document_db),
):
    return await get_current_user(token=token, session=session)


async def lock_profile_sources(*, session, user):
    require_document_boundary(session)
    session.info['registry.document.scope_taken'] = True
    await acquire_discovered_registry_source_write_scope(session=session,
        roots=(RegistrySourceFence('learner', str(user.id)),))
    await session.refresh(user)
    if not user.is_active:
        raise HTTPException(status_code=401, detail='User is inactive or not found')


async def recheck_document_permission(session, user):
    await session.refresh(user)
    if not user.is_active:
        raise HTTPException(status_code=401, detail='User is inactive or not found')
    if 'admin.users.write' not in await get_user_permission_codes(user, session):
        raise HTTPException(status_code=403, detail='Permission required: admin.users.write')


def require_document_boundary(session):
    fence = session.info.get(_KEY)
    if not isinstance(fence, RegistryCatalogPolicyFence):
        raise RegistryActionLockError('registry.document_boundary_required')
    fence.require_session(session, 'shared')
    if session.new or session.dirty or session.deleted:
        raise RegistryActionLockError('registry.document_pending_changes')
    if session.info.get('registry.document.scope_taken'):
        raise RegistryActionLockError('registry.document_scope_already_taken')
    return fence


async def _identity(session, document_id):
    row = (await session.execute(select(DocumentRecord.id, DocumentRecord.user_id,
        DocumentRecord.course_id, DocumentRecord.enrollment_id).where(DocumentRecord.id == document_id))).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail='Document not found')
    refs = tuple((await session.execute(select(RegistryObligation.id,
        RegistryObligation.enrollment_id).where(RegistryObligation.document_id == document_id)
        .order_by(RegistryObligation.id))).all())
    return tuple(row), refs


async def lock_document_sources(*, session, user_id=None, document_id=None,
                                course_id=None, enrollment_id=None):
    """One full graph then fresh row; no DML, no retries or lockset expansion.

    Learner root covers both registries and first/unlinked documents. Add old
    and proposed course/enrollment parents before any S/D/O. Conservative scope
    reuses the existing canonical source writer implementation unchanged.
    """
    require_document_boundary(session)
    with session.no_autoflush:
        before = await _identity(session, document_id) if document_id else None
        if before:
            _, user_id, old_course, old_enrollment = before[0]
        else:
            old_course = old_enrollment = None
        roots = {RegistrySourceFence('learner', str(user_id))}
        for cid in (old_course, course_id):
            if cid: roots.add(RegistrySourceFence('course', str(cid)))
        for eid in (old_enrollment, enrollment_id):
            if eid:
                owner = await session.scalar(select(Enrollment.user_id).where(Enrollment.id == eid))
                if owner != user_id:
                    raise RegistryActionLockError('registry.document_enrollment_owner_mismatch')
                roots.add(RegistrySourceFence('enrollment', str(eid)))
        session.info['registry.document.scope_taken'] = True
        await acquire_discovered_registry_source_write_scope(session=session,
            roots=tuple(sorted(roots, key=lambda r:(r.kind,r.resource_id))))
        if before:
            after = await _identity(session, document_id)
            if before != after:
                raise RegistryActionLockError('registry.document_scope_changed')
            document = await session.scalar(select(DocumentRecord).where(DocumentRecord.id == document_id)
                .with_for_update().execution_options(populate_existing=True))
            if document is None or before != await _identity(session, document_id):
                raise RegistryActionLockError('registry.document_scope_changed')
            return document
    return None
