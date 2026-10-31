"""Import batch boundary: existing identities only; no locks inside savepoints."""
from dataclasses import dataclass, field
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
from app.services.registry_import_identity_keys import identity_lock_keys
from app.services.registry_import_identity_locks import acquire_import_identity_locks

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
    planned_identity_keys: frozenset = field(default_factory=frozenset)
    created_user_ids: set = field(default_factory=set)
    created_enrollment_ids: set = field(default_factory=set)

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
        users = {
            str(u.id)
            for u in (
                *identity.users_by_email.values(),
                *identity.users_by_phone.values(),
            )
        }
        enrollments = {
            str(e.id)
            for e in identity.enrollments_by_user_id.values()
        }
        allowed_users = self.user_ids.union(self.created_user_ids)
        allowed_enrollments = self.enrollment_ids.union(
            self.created_enrollment_ids
        )
        if (
            not users.issubset(allowed_users)
            or not enrollments.issubset(allowed_enrollments)
        ):
            raise RegistryActionLockError(
                'registry.import_scope_expanded'
            )

    def _require_planned_identity(self, *, email, phone, snils):
        if not email:
            raise RegistryActionLockError(
                'registry.import_unplanned_identity'
            )
        identities = tuple(
            (kind, value)
            for kind, value in (
                ('email', email),
                ('phone', phone),
                ('snils', snils),
            )
            if value
        )
        keys = frozenset(identity_lock_keys(identities))
        if (
            not keys
            or not keys.issubset(self.planned_identity_keys)
        ):
            raise RegistryActionLockError(
                'registry.import_unplanned_identity'
            )

    def require_user(self, user, *, email, phone, snils):
        self._require_planned_identity(
            email=email,
            phone=phone,
            snils=snils,
        )
        if user is not None:
            uid = str(user.id)
            if (
                uid not in self.user_ids
                and uid not in self.created_user_ids
            ):
                raise RegistryActionLockError(
                    'registry.import_scope_expanded'
                )

    def require_enrollment(
        self,
        enrollment,
        *,
        user,
        course_id,
        created_user,
        email,
        phone,
        snils,
    ):
        self._require_planned_identity(
            email=email,
            phone=phone,
            snils=snils,
        )
        if (
            user is None
            or not course_id
            or str(course_id) != str(self.parents[0])
        ):
            raise RegistryActionLockError(
                'registry.import_unplanned_enrollment'
            )

        uid = str(user.id)
        if (
            uid not in self.user_ids
            and uid not in self.created_user_ids
            and not created_user
        ):
            raise RegistryActionLockError(
                'registry.import_unplanned_enrollment'
            )

        if enrollment is not None:
            eid = str(enrollment.id)
            if (
                eid not in self.enrollment_ids
                and eid not in self.created_enrollment_ids
            ):
                raise RegistryActionLockError(
                    'registry.import_scope_expanded'
                )
            if (
                str(enrollment.user_id) != uid
                or str(enrollment.course_id) != str(course_id)
            ):
                raise RegistryActionLockError(
                    'registry.import_unplanned_enrollment'
                )

    def remember_success(
        self,
        *,
        user,
        enrollment,
        created_user,
        created_enrollment,
        email,
        phone,
        snils,
    ):
        self._require_planned_identity(
            email=email,
            phone=phone,
            snils=snils,
        )
        if created_user:
            if str(user.id) in self.user_ids:
                raise RegistryActionLockError(
                    'registry.import_scope_expanded'
                )
            self.created_user_ids.add(str(user.id))

        if created_enrollment:
            if enrollment is None:
                raise RegistryActionLockError(
                    'registry.import_unplanned_enrollment'
                )
            if str(enrollment.id) in self.enrollment_ids:
                raise RegistryActionLockError(
                    'registry.import_scope_expanded'
                )
            self.created_enrollment_ids.add(
                str(enrollment.id)
            )

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


async def _identity_plan(session, batch_id):
    """Snapshot the complete parsed batch before any identity/source locks.

    The caller MUST read it again after waiting on identity locks.
    A changed batch requires rollback, never lockset expansion.
    """
    from app.services import learner_import_batches as service

    batch = await session.scalar(
        select(ImportBatch)
        .where(
            ImportBatch.id == batch_id,
            ImportBatch.import_type == 'learner_roster',
        )
        .options(selectinload(ImportBatch.rows))
        .execution_options(populate_existing=True)
    )

    if batch is None or batch.status != 'parsed':
        raise RegistryActionLockError(
            'registry.import_batch_not_parsed'
        )

    snapshot = (
        batch.status,
        batch.course_id,
        batch.organization_id,
        batch.learning_group_id,
        tuple(sorted(
            (
                str(row.id),
                row.row_number,
                row.status,
                json.dumps(
                    row.normalized_data_json,
                    sort_keys=True,
                ),
            )
            for row in batch.rows
        )),
    )

    identities = []

    for row in batch.rows:
        if row.status != 'valid':
            continue

        data = row.normalized_data_json or {}

        for kind in ('email', 'phone', 'snils'):
            value = service.normalize_import_text(
                data.get(kind)
            )

            if kind == 'email':
                value = value.lower()

            if value:
                identities.append((kind, value))

    return snapshot, tuple(identities)

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
        identity_before, identities_before = await _identity_plan(
            session, batch_id
        )

        # Capture source state before waiting for identity locks.
        # Do not silently accept concurrent affiliation changes.
        _, _, _, sources_before_identity_wait = await _read(
            session, batch_id
        )

        # C is already held. Acquire I before S/D/O.
        if identities_before:
            await acquire_import_identity_locks(
                session, identities_before
            )

        identity_after, identities_after = await _identity_plan(
            session, batch_id
        )

        if (
            identity_before != identity_after
            or identity_lock_keys(identities_before)
            != identity_lock_keys(identities_after)
        ):
            raise RegistryActionLockError(
                'registry.import_identity_scope_changed'
            )

        # Check changes observed while waiting for identity locks.
        # No S/D/O locks have been acquired at this point.
        batch, lookup, users, before = await _read(
            session, batch_id
        )
        if before != sources_before_identity_wait:
            raise RegistryActionLockError(
                'registry.import_scope_changed'
            )

        # Existing source/decision/obligation lock protocol follows.
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
            (batch.course_id,batch.organization_id,batch.learning_group_id),
            planned_identity_keys=frozenset(
                identity_lock_keys(identities_before)
            ),_token=_TOKEN)
        return batch
