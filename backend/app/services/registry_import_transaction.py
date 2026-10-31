"""Import batch boundary: existing identities only; no locks inside savepoints."""
from dataclasses import dataclass
from contextlib import asynccontextmanager
import json
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.auth import get_current_user, oauth2_scheme
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.import_batch import ImportBatch, ImportRow
from app.models.organization import Organization
from app.models.learning_group import LearningGroup
from app.services.registry_document_transaction import (
    require_document_boundary, recheck_document_permission, get_registry_document_db,
)
from app.services.registry_action_lockset import RegistryActionLockError, RegistrySourceFence
from app.services.registry_source_write_scope import acquire_discovered_registry_source_write_scope

KEY = 'registry.import.scope'
_TOKEN = object()


async def get_registry_import_db():
    """Import-specific lifecycle, reusing the tested fresh C transaction owner."""
    async with asynccontextmanager(get_registry_document_db)() as session:
        try:
            yield session
        finally:
            session.info.pop(KEY, None)


async def require_registry_import_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_registry_import_db),
):
    user = await get_current_user(token=token, session=session)
    await recheck_document_permission(session, user)
    return user


@dataclass
class ImportScope:
    session: object
    fence: object
    batch_id: str
    user_ids: frozenset
    enrollment_ids: frozenset
    parents: tuple
    _token: object = None
    started: bool = False

    def __post_init__(self):
        if self._token is not _TOKEN:
            raise RegistryActionLockError('registry.import_use_prepare_boundary')

    def require(self, session, batch):
        self.fence.require_session(session, 'shared')
        if self.session is not session or str(batch.id) != self.batch_id:
            raise RegistryActionLockError('registry.import_wrong_scope')
        if (batch.course_id, batch.organization_id, batch.learning_group_id) != self.parents:
            raise RegistryActionLockError('registry.import_parent_scope_changed')
        if session.in_nested_transaction():
            raise RegistryActionLockError('registry.import_nested_boundary')

    def verify_lookups(self, lookups):
        identity = lookups.identity
        users = {str(u.id) for u in (*identity.users_by_email.values(), *identity.users_by_phone.values())}
        enrollments = {str(e.id) for e in identity.enrollments_by_user_id.values()}
        if not users.issubset(self.user_ids) or not enrollments.issubset(self.enrollment_ids):
            raise RegistryActionLockError('registry.import_scope_expanded')

    def require_user(self, user):
        if user is None or str(user.id) not in self.user_ids:
            raise RegistryActionLockError('registry.import_new_identity_not_supported')

    def require_enrollment(self, enrollment):
        if enrollment is None or str(enrollment.id) not in self.enrollment_ids:
            raise RegistryActionLockError('registry.import_new_enrollment_not_supported')

    async def before_savepoint(self, session, batch, lookups):
        self.require(session, batch)
        self.verify_lookups(lookups)
        # Previous row outcome belongs to the outer TX. Make that flush explicit;
        # begin_nested must never hide an autoflush preceding lock acquisition.
        await session.flush()
        if session.new or session.dirty or session.deleted:
            raise RegistryActionLockError('registry.import_pending_before_savepoint')


def require_import_scope(session, batch):
    scope = session.info.get(KEY)
    if not isinstance(scope, ImportScope):
        raise RegistryActionLockError('registry.import_source_scope_required')
    scope.require(session, batch)
    if scope.started or session.new or session.dirty or session.deleted:
        raise RegistryActionLockError('registry.import_unclean_or_reused_scope')
    scope.started = True
    return scope


async def _read(session, batch_id):
    from app.services import learner_import_batches as service
    batch = await session.scalar(select(ImportBatch).where(
        ImportBatch.id == batch_id, ImportBatch.import_type == 'learner_roster'
    ).options(selectinload(ImportBatch.rows)).execution_options(populate_existing=True))
    if batch is None or batch.status != 'parsed':
        raise RegistryActionLockError('registry.import_batch_not_parsed')
    rows = sorted((r for r in batch.rows if r.status == 'valid'), key=lambda r:r.row_number)
    lookups = await service.load_learner_import_preflight_lookups(session, rows=rows, course_id=batch.course_id)
    # Existing ORM identities may have been loaded before the advisory wait.
    objects = {id(v):v for mapping in (lookups.users_by_email, lookups.users_by_phone,
        lookups.profiles_by_user_id, lookups.profiles_by_snils, lookups.enrollments_by_user_id)
        for v in mapping.values()}
    for obj in objects.values():
        await session.refresh(obj)
    lookups = await service.load_learner_import_preflight_lookups(session, rows=rows, course_id=batch.course_id)
    users = {str(u.id) for u in (*lookups.users_by_email.values(), *lookups.users_by_phone.values())}
    for row in rows:
        data = row.normalized_data_json or {}
        email = service.normalize_import_text(data.get('email')).lower()
        if not email:
            continue  # retain existing row validation semantics
        user, conflict = service.resolve_learner_import_user(email=email,
            phone=service.normalize_import_text(data.get('phone')), lookups=lookups)
        snils_profile = lookups.profiles_by_snils.get(service.normalize_import_text(data.get('snils')))
        if conflict or (snils_profile is not None and (user is None or snils_profile.user_id != user.id)):
            continue
        if user is None:
            raise RegistryActionLockError('registry.import_new_identity_not_supported')
        if batch.course_id and str(user.id) not in lookups.enrollments_by_user_id:
            raise RegistryActionLockError('registry.import_new_enrollment_not_supported')
    parents = []
    if batch.organization_id:
        oid = await session.scalar(select(Organization.id).where(Organization.id == batch.organization_id))
        if oid is None: raise RegistryActionLockError('registry.import_organization_missing')
        parents.append(('organization', oid))
    if batch.learning_group_id:
        group = (await session.execute(select(LearningGroup.id, LearningGroup.organization_id).where(
            LearningGroup.id == batch.learning_group_id))).one_or_none()
        if group is None or group.organization_id != batch.organization_id:
            raise RegistryActionLockError('registry.import_group_scope_mismatch')
        parents.append(tuple(group))
    signature = (
        batch.status, batch.course_id, batch.organization_id, batch.learning_group_id,
        tuple(sorted((r.id,r.row_number,r.status,json.dumps(r.normalized_data_json,sort_keys=True)) for r in batch.rows)),
        tuple(sorted((k,str(v.id)) for k,v in lookups.users_by_email.items())),
        tuple(sorted((k,str(v.id)) for k,v in lookups.users_by_phone.items())),
        tuple(sorted((k,str(v.user_id)) for k,v in lookups.profiles_by_snils.items())),
        tuple(sorted((k,str(v.id),v.course_id,v.organization_id,v.learning_group_id) for k,v in lookups.enrollments_by_user_id.items())),
        tuple(parents),
    )
    return batch, lookups, users, signature


async def prepare_import_scope(*, session, batch_id, actor):
    fence = require_document_boundary(session)
    if KEY in session.info:
        raise RegistryActionLockError('registry.import_scope_already_prepared')
    with session.no_autoflush:
        batch, lookup, users, before = await _read(session, batch_id)
        roots = {RegistrySourceFence('learner', uid) for uid in users}
        roots.add(RegistrySourceFence('learner', str(actor.id)))
        if batch.course_id: roots.add(RegistrySourceFence('course', str(batch.course_id)))
        extra = (RegistrySourceFence('organization',str(batch.organization_id)),) if batch.organization_id else ()
        session.info['registry.document.scope_taken'] = True
        await acquire_discovered_registry_source_write_scope(session=session,
            roots=tuple(sorted(roots,key=lambda r:(r.kind,r.resource_id))),additional_source_fences=extra)
        # Batch/source rows are strictly after S/D/O. Recheck again after row wait.
        await session.scalar(select(ImportBatch.id).where(ImportBatch.id==batch_id).with_for_update())
        await session.execute(select(ImportRow.id).where(ImportRow.batch_id==batch_id).order_by(ImportRow.id).with_for_update())
        batch, lookup, users, after = await _read(session, batch_id)
        if before != after:
            raise RegistryActionLockError('registry.import_scope_changed')
        await recheck_document_permission(session, actor)
        session.info[KEY] = ImportScope(session,fence,str(batch_id),frozenset(users),
            frozenset(str(e.id) for e in lookup.enrollments_by_user_id.values()),
            (batch.course_id,batch.organization_id,batch.learning_group_id),_token=_TOKEN)
        return batch
