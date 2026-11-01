"""Early, transaction-scoped identity advisory locks for learner imports.

Experimental primitive. Not wired into the production import path.
Call after the catalog C fence and before source/decision/row locks.
Never acquire or expand these locks inside an ORM savepoint.
"""

from __future__ import annotations

from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.registry_action_lockset import (
    RegistryActionLockError,
    _acquire_advisory_keys,
    _assert_read_committed,
)
from app.services.registry_document_transaction import (
    require_document_boundary,
)
from app.services.registry_import_identity_keys import (
    identity_lock_keys,
)

IDENTITY_SCOPE_KEY = "registry.import.identity.locks"


async def acquire_import_identity_locks(
    session: AsyncSession,
    identities: Iterable[tuple[str, str]],
) -> tuple[str, ...]:
    """Acquire all identity locks once, in canonical order.

    The caller owns commit and rollback. Any acquisition failure
    requires rollback of the entire transaction.
    """
    fence = require_document_boundary(session)
    fence.require_session(session, "shared")

    if (
        not session.in_transaction()
        or session.in_nested_transaction()
    ):
        raise RegistryActionLockError(
            "registry.import_identity_requires_outer_transaction"
        )

    if session.new or session.dirty or session.deleted:
        raise RegistryActionLockError(
            "registry.import_identity_pending_orm_changes"
        )

    if IDENTITY_SCOPE_KEY in session.info:
        raise RegistryActionLockError(
            "registry.import_identity_scope_reused"
        )

    keys = identity_lock_keys(identities)

    if not keys:
        raise RegistryActionLockError(
            "registry.import_identity_empty_scope"
        )

    # Mark pending BEFORE attempting any SQL locks.
    # A partial failure must never permit a second acquisition.
    session.info[IDENTITY_SCOPE_KEY] = ("pending", keys)

    with session.no_autoflush:
        await _assert_read_committed(session)
        await _acquire_advisory_keys(
            session=session,
            keys=keys,
        )

    session.info[IDENTITY_SCOPE_KEY] = ("held", keys)

    return keys