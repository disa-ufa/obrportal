"""Opt-in stable-snapshot reader for registry applicability inputs.

The existing low-level reader executes multiple SELECT statements. Under
PostgreSQL READ COMMITTED those statements may observe different committed
versions. This opt-in wrapper REQUIRES that its caller already configured
REPEATABLE READ or SERIALIZABLE isolation *before* reading any related data.

The same session and transaction must be used for any later decision write.
Stable visibility alone does NOT prevent a concurrent modification of source
rows after the snapshot: future approval/export integrations still need
locking, stale-version checks, and reviewed race handling.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import RegistryObligation
from app.services.registry_applicability_db_inputs import (
    CurrentRegistryApplicabilityInputs,
    load_current_registry_applicability_inputs,
)

_STABLE_ISOLATION_LEVELS = frozenset({"repeatable read", "serializable"})


async def load_consistent_registry_applicability_inputs(
    *,
    session: AsyncSession,
    obligation: RegistryObligation,
) -> CurrentRegistryApplicabilityInputs:
    """Fail closed unless the transaction provides a stable SQL snapshot.

    Configure the session/engine transaction isolation ahead of time:
      stable_engine = engine.execution_options(isolation_level="REPEATABLE READ")
      stable_sessionmaker = async_sessionmaker(stable_engine)
      async with stable_sessionmaker.begin() as session:
          result = await load_consistent_registry_applicability_inputs(...)

    This function does not create, commit, roll back or upgrade a transaction,
    and it never changes the connection isolation level behind the caller.
    """
    if not session.in_transaction():
        raise RuntimeError(
            "A caller-owned PostgreSQL snapshot transaction is required"
        )

    observed = (await session.execute(
        text("SHOW transaction_isolation")
    )).scalar_one()
    isolation = str(observed).strip().lower().replace("_", " ")
    if isolation not in _STABLE_ISOLATION_LEVELS:
        raise RuntimeError(
            "Registry applicability snapshot requires REPEATABLE READ "
            "or SERIALIZABLE isolation"
        )

    return await load_current_registry_applicability_inputs(
        session=session,
        obligation=obligation,
    )
