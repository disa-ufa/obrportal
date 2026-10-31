"""Experimental C -> S -> D -> O boundary; no production callers or grants.

Start with an unused, engine-bound AsyncSession (no auth/read autobegin).
The caller MUST commit/rollback/close after success, including cancellation.
Never share an AsyncSession between concurrent tasks. Existing writers remain
uncoordinated; this module alone does not make any export safe.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.services.registry_action_lockset import (
    RegistryActionLockError,
    acquire_registry_new_action_lockset,
    acquire_registry_source_write_fences,
    normalize_registry_lockset,
    normalize_registry_source_fences,
    _assert_read_committed,
    _require_clean_lockset_transaction,
)

# PostgreSQL's two-int advisory key space is disjoint from the existing
# hashtextextended(bigint) source/decision locks. No probabilistic hash separation.
CATALOG_POLICY_NAMESPACE = 0x4F425250  # OBRP
CATALOG_POLICY_RESOURCE = 0x504F4C31  # POL1; reserve pair for global policy v1
_SQL = {
    'shared': 'SELECT pg_advisory_xact_lock_shared(:namespace, :resource)',
    'exclusive': 'SELECT pg_advisory_xact_lock(:namespace, :resource)',
}


class RegistryCatalogFenceError(RegistryActionLockError):
    pass


def _mode(mode: str) -> None:
    if mode not in _SQL:
        raise RegistryCatalogFenceError('registry.catalog_invalid_mode')


class RegistryCatalogPolicyFence:
    """Transaction-local evidence only, never an applicability authorization.

    Use begin_registry_catalog_policy_fence to construct. Requiring an already
    held mode is a no-SQL assertion, not a late/reverse lock acquisition.
    One complete downstream lockset only: no incremental scopes or upgrades.
    """

    def __init__(self, session, transaction, mode, *, _token=None):
        if _token is not _CONSTRUCTION_TOKEN:
            raise RegistryCatalogFenceError('registry.catalog_use_boundary')
        self._session = session
        self._transaction = transaction
        self._mode = mode
        self._downstream = None
        self._result = None
        self._failed = False

    def require_mode(self, mode: str) -> None:
        _mode(mode)
        if (self._failed or not self._transaction.is_active
                or self._session.get_transaction() is not self._transaction
                or self._session.in_nested_transaction()):
            raise RegistryCatalogFenceError('registry.catalog_inactive_transaction')
        if mode == 'exclusive' and self._mode != 'exclusive':
            raise RegistryCatalogFenceError('registry.catalog_upgrade_forbidden')

    def require_session(self, session: AsyncSession, mode: str) -> None:
        """Validate evidence against the exact writer session and live TX."""
        if session is not self._session:
            raise RegistryCatalogFenceError('registry.catalog_wrong_session')
        self.require_mode(mode)

    async def source_fences(self, *, source_fences):
        """Delegate canonical S to existing implementation; repeat exact set only."""
        self.require_mode('shared')
        keys = normalize_registry_source_fences(source_fences=source_fences)
        return await self._acquire(('sources', keys),
            acquire_registry_source_write_fences, source_fences=source_fences)

    async def action_lockset(self, *, source_fences, obligation_targets):
        """Delegate S -> D -> O; caller must still rediscover and check inputs."""
        self.require_mode('shared')
        normalized = normalize_registry_lockset(
            source_fences=source_fences, obligation_targets=obligation_targets)
        return await self._acquire(('action', normalized),
            acquire_registry_new_action_lockset,
            source_fences=source_fences, obligation_targets=obligation_targets)

    async def _acquire(self, identity, operation, **kwargs):
        _require_clean_lockset_transaction(self._session)
        if self._downstream is not None:
            if identity != self._downstream or self._result is None:
                raise RegistryCatalogFenceError('registry.catalog_lockset_expansion_forbidden')
            return self._result
        self._downstream = identity
        try:
            self._result = await operation(session=self._session, **kwargs)
            return self._result
        except BaseException:
            self._failed = True
            # Caller owns rollback; no successful evidence survives cancellation.
            raise


_CONSTRUCTION_TOKEN = object()


async def begin_registry_catalog_policy_fence(
    *, session: AsyncSession, mode: str,
) -> RegistryCatalogPolicyFence:
    """Begin fresh transaction, check RC, acquire C. NEVER commit.

    Reject every pre-existing transaction, even read-only autobegin: empty ORM
    collections cannot prove absence of earlier row locks or flushed writes.
    Reject connection-bound sessions to avoid an enclosing external transaction.
    On acquisition failure/cancellation roll back only the transaction we started.
    On success caller owns its entire remaining lifetime and rollback on errors.
    """
    _mode(mode)
    if session.in_nested_transaction() or session.in_transaction():
        raise RegistryCatalogFenceError('registry.catalog_fresh_session_required')
    if session.new or session.dirty or session.deleted:
        raise RegistryCatalogFenceError('registry.catalog_pending_changes')
    if not isinstance(session.bind, AsyncEngine) or session.bind.dialect.name != 'postgresql':
        raise RegistryCatalogFenceError('registry.catalog_postgresql_engine_required')
    # Select the first factory C mode before any SQL. Never upgrade shared C.
    from app.services.registry_session_coordination import MODE_KEY, RegistryCoordinatedSession
    coordinated = isinstance(getattr(session, "sync_session", None), RegistryCoordinatedSession)
    if coordinated:
        session.info[MODE_KEY] = mode
    transaction = await session.begin()
    try:
        with session.no_autoflush:
            _require_clean_lockset_transaction(session)
            await _assert_read_committed(session)
            await session.execute(text(_SQL[mode]), {
                'namespace': CATALOG_POLICY_NAMESPACE,
                'resource': CATALOG_POLICY_RESOURCE,
            })
        if coordinated:
            session.info.pop(MODE_KEY, None)
        return RegistryCatalogPolicyFence(session, transaction, mode,
                                          _token=_CONSTRUCTION_TOKEN)
    except BaseException:
        if coordinated:
            session.info.pop(MODE_KEY, None)
        await session.rollback()
        raise
