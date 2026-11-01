"""Fail-closed rollback coordination for completion PDF files.

This is a primitive, not a transaction boundary. Callers must explicitly
distinguish a pre-COMMIT failure from an attempted COMMIT. A cleanup callback
must be separately verified before it is used for real files.
"""

from __future__ import annotations

import asyncio
import inspect
import math
from collections.abc import Callable
from dataclasses import dataclass

from app.services.completion_pdf_ownership import (
    CompletionPDFReceipt,
    clear_completion_pdf_receipts_after_success,
    inspect_recorded_completion_pdf,
    pending_completion_pdfs,
)

_ACTIVE_ROLLBACKS: set[asyncio.Task] = set()


@dataclass(frozen=True)
class CompletionPDFCompensationResult:
    rollback_confirmed: bool
    commit_attempted: bool
    removed_count: int
    preserved_count: int


async def _confirmed_rollback(session, timeout_seconds: float):
    if not math.isfinite(timeout_seconds) or timeout_seconds <= 0:
        raise ValueError("Invalid rollback timeout")

    task = asyncio.create_task(session.rollback())
    _ACTIVE_ROLLBACKS.add(task)

    def done_callback(done):
        _ACTIVE_ROLLBACKS.discard(done)
        if not done.cancelled():
            done.exception()

    task.add_done_callback(done_callback)

    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout_seconds
    cancellation = None
    failures = []

    while not task.done():
        remaining = deadline - loop.time()
        if remaining <= 0:
            task.cancel()
            failures.append("rollback timed out")
            break

        try:
            await asyncio.wait({task}, timeout=remaining)
        except asyncio.CancelledError as exc:
            if cancellation is None:
                cancellation = exc

    confirmed = False

    if task.done():
        try:
            task.result()
            confirmed = True
        except (Exception, asyncio.CancelledError) as exc:
            failures.append("rollback failed: " + repr(exc))

    return confirmed, failures, cancellation


async def compensate_completion_pdf_transaction(
    session,
    *,
    commit_attempted: bool,
    original_error: Exception | asyncio.CancelledError,
    cleanup_receipt: Callable[[CompletionPDFReceipt], None] | None = None,
    rollback_timeout_seconds: float = 5.0,
) -> CompletionPDFCompensationResult:
    """Rollback first; never delete after any COMMIT attempt.

    This helper does not raise the original ordinary exception on success;
    the caller must re-raise it. Cancellation is propagated.

    The callback must remove only the verified receipt's own file and
    durably persist the deletion. Until a safe callback is connected,
    cleanup is intentionally disabled.
    """
    if not isinstance(commit_attempted, bool):
        raise TypeError("commit_attempted must be boolean")

    confirmed, failures, cancellation = await _confirmed_rollback(
        session, rollback_timeout_seconds
    )

    removed = 0
    receipts = ()

    try:
        receipts = pending_completion_pdfs(session)
        if any(not isinstance(item, CompletionPDFReceipt) for item in receipts):
            raise RuntimeError("Invalid completion PDF receipt")
    except Exception as exc:
        failures.append("journal inspection failed: " + repr(exc))

    if confirmed and not commit_attempted and not failures:
        if receipts and cleanup_receipt is None:
            failures.append("PDF cleanup callback is not installed")
        else:
            for receipt in reversed(receipts):
                state = inspect_recorded_completion_pdf(receipt)

                if state != "unchanged":
                    failures.append(
                        receipt.storage_path + ": unsafe state " + state
                    )
                    continue

                try:
                    result = cleanup_receipt(receipt)
                    if inspect.isawaitable(result):
                        raise RuntimeError("Async cleanup callback not supported")
                    if inspect_recorded_completion_pdf(receipt) != "missing":
                        raise RuntimeError("PDF deletion not confirmed")
                    removed += 1
                except (Exception, asyncio.CancelledError) as exc:
                    if isinstance(exc, asyncio.CancelledError) and cancellation is None:
                        cancellation = exc
                    failures.append(
                        receipt.storage_path + ": cleanup failed: " + repr(exc)
                    )

            if not failures:
                clear_completion_pdf_receipts_after_success(session)

    result = CompletionPDFCompensationResult(
        rollback_confirmed=confirmed,
        commit_attempted=commit_attempted,
        removed_count=removed,
        preserved_count=len(receipts) - removed,
    )

    if failures:
        message = "Completion PDF compensation incomplete: " + "; ".join(failures)
        original_error.add_note(message)

        if cancellation is not None:
            cancellation.add_note(message)
            raise cancellation

        raise RuntimeError(message) from original_error

    if cancellation is not None:
        raise cancellation

    if isinstance(original_error, asyncio.CancelledError):
        raise original_error

    return result
