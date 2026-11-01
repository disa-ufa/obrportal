"""Conservative reconciliation of uncertain registry batch COMMIT outcomes.

A transaction-level PostgreSQL advisory fence must be acquired in the *original*
transaction before COMMIT. A distinct session takes the same fence after an
exception. Acquiring it establishes that the first transaction has ended; a
READ COMMITTED query can then determine whether the exact batch persisted.

Any error, timeout, cancellation, or inconsistent row returns UNKNOWN, never
permission to delete an artifact. PostgreSQL integration tests are required.
"""
from __future__ import annotations

import asyncio
from enum import Enum
from hashlib import sha256
import logging
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.registry_submission_batch import RegistrySubmissionBatch

_LOG = logging.getLogger(__name__)
_PROBE_SECONDS = 6.0
_active_probes: set[asyncio.Task] = set()


class BatchCommitOutcome(str, Enum):
    COMMITTED = "committed"
    NOT_COMMITTED = "not_committed"
    UNKNOWN = "unknown"


def _fence_key(batch_id: str) -> int:
    """Stable, domain-separated 64-bit signed advisory-lock key."""
    canonical = str(UUID(batch_id))
    digest = sha256(b"obrportal:registry-batch-commit:v1:" + canonical.encode("ascii")).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=True)


async def acquire_batch_commit_fence(session: AsyncSession, *, batch_id: str) -> None:
    """Acquire before starting COMMIT; released by PostgreSQL at transaction end."""
    await session.execute(text("SELECT pg_advisory_xact_lock(:fence_key)"), {"fence_key": _fence_key(batch_id)})


async def _probe_once(
    *, batch_id: str, registry: str, artifact_path: str, artifact_sha256: str
) -> BatchCommitOutcome:
    # The factory creates an independent SQLAlchemy session/connection.
    async with AsyncSessionLocal() as verification:
        async with verification.begin():
            # The coordinated factory acquires C before the first statement.
            # Changing isolation here would follow a query; verify instead.
            level = (await verification.execute(text("SHOW transaction_isolation"))).scalar_one()
            if str(level).lower().replace("_", " ") != "read committed":
                return BatchCommitOutcome.UNKNOWN
            await verification.execute(text("SET LOCAL lock_timeout = '4s'"))
            await verification.execute(text("SET LOCAL statement_timeout = '5s'"))
            # Wait until the writer transaction has *actually ended*.
            await verification.execute(
                text("SELECT pg_advisory_xact_lock(:fence_key)"),
                {"fence_key": _fence_key(batch_id)},
            )
            result = await verification.execute(
                select(RegistrySubmissionBatch).where(RegistrySubmissionBatch.id == batch_id)
            )
            batch = result.scalar_one_or_none()
            if batch is None:
                return BatchCommitOutcome.NOT_COMMITTED
            if (
                str(batch.registry) == registry
                and str(batch.artifact_path) == artifact_path
                and str(batch.artifact_sha256).lower() == artifact_sha256.lower()
            ):
                return BatchCommitOutcome.COMMITTED
            return BatchCommitOutcome.UNKNOWN


def _forget_probe(done: asyncio.Task) -> None:
    _active_probes.discard(done)
    if not done.cancelled():
        try:
            done.result()
        except Exception:
            _LOG.warning("Registry COMMIT verification eventually failed", exc_info=True)


async def check_registry_batch_commit_outcome(
    *, batch_id: str, registry: str, artifact_path: str, artifact_sha256: str
) -> BatchCommitOutcome:
    """Bound the wait; on uncertainty keep the file and reconcile later."""
    task = asyncio.create_task(
        _probe_once(
            batch_id=batch_id,
            registry=registry,
            artifact_path=artifact_path,
            artifact_sha256=artifact_sha256,
        )
    )
    _active_probes.add(task)
    task.add_done_callback(_forget_probe)
    try:
        done, _ = await asyncio.wait({task}, timeout=_PROBE_SECONDS)
        if not done:
            task.cancel()  # Never allow late completion to delete anything.
            return BatchCommitOutcome.UNKNOWN
        return task.result()
    except (Exception, asyncio.CancelledError):
        # A second cancellation or a dead connection cannot establish rollback.
        task.cancel()
        _LOG.warning("Registry COMMIT result could not be verified", exc_info=True)
        return BatchCommitOutcome.UNKNOWN
