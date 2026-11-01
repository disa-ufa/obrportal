"""Explicit transaction boundary for completion PDF creation.

This component does not automatically intercept SQLAlchemy commit calls.
Every relevant API handler must use this coordinator explicitly.
"""

from __future__ import annotations

import asyncio

from app.services.completion_pdf_compensation import (
    CompletionPDFCompensationResult,
    compensate_completion_pdf_transaction,
)
from app.services.completion_pdf_ownership import (
    clear_completion_pdf_receipts_after_success,
    delete_registered_completion_pdf,
    pending_completion_pdfs,
)

_SESSION_KEY = "_m21_completion_pdf_transaction_boundary"


class CompletionPDFTransactionBoundary:
    """Track one database transaction and its generated PDFs.

    After an uncertain COMMIT or failed compensation, the session is
    deliberately blocked from adopting a new completion-PDF transaction.
    """

    def __init__(self, session):
        if _SESSION_KEY in session.info:
            raise RuntimeError(
                "Completion PDF transaction boundary already exists"
            )

        if pending_completion_pdfs(session):
            raise RuntimeError(
                "Unresolved completion PDF journal in session"
            )

        self.session = session
        self.commit_attempted = False
        self.commit_succeeded = False
        self.compensation_started = False

        session.info[_SESSION_KEY] = self

    def _assert_active(self):
        if self.session.info.get(_SESSION_KEY) is not self:
            raise RuntimeError(
                "Completion PDF transaction boundary is not active"
            )

    def _release(self):
        self._assert_active()
        self.session.info.pop(_SESSION_KEY)

    async def commit(self):
        """Mark COMMIT attempted before awaiting the database.

        A raised exception or cancellation from session.commit()
        is ALWAYS treated as an uncertain COMMIT outcome.
        """
        self._assert_active()

        if self.commit_attempted or self.compensation_started:
            raise RuntimeError(
                "Completion PDF transaction is already finalized or attempted"
            )

        self.commit_attempted = True

        await self.session.commit()

        self.commit_succeeded = True
        clear_completion_pdf_receipts_after_success(self.session)
        self._release()

    async def compensate(
        self,
        original_error,
        *,
        rollback_timeout_seconds: float = 5.0,
    ) -> CompletionPDFCompensationResult:
        """Compensate only a failure before the first COMMIT attempt.

        Any attempted COMMIT preserves files, even after a successful
        subsequent rollback. The caller re-raises the original error.
        """
        if self.compensation_started:
            raise RuntimeError(
                "Completion PDF compensation was already attempted"
            )

        if self.commit_succeeded:
            self.compensation_started = True
            return CompletionPDFCompensationResult(
                rollback_confirmed=False,
                commit_attempted=True,
                removed_count=0,
                preserved_count=0,
            )

        self._assert_active()
        self.compensation_started = True

        try:
            result = await compensate_completion_pdf_transaction(
                self.session,
                commit_attempted=self.commit_attempted,
                original_error=original_error,
                cleanup_receipt=lambda receipt: delete_registered_completion_pdf(
                    self.session,
                    receipt,
                ),
                rollback_timeout_seconds=rollback_timeout_seconds,
            )
        except asyncio.CancelledError as propagated:
            # The helper re-raises the identical original cancellation
            # only after clean rollback and compensation.
            # A different cancellation must leave the session blocked.
            if (
                propagated is original_error
                and not self.commit_attempted
                and not pending_completion_pdfs(self.session)
            ):
                self._release()
            raise

        if (
            not self.commit_attempted
            and result.rollback_confirmed
            and result.preserved_count == 0
            and not pending_completion_pdfs(self.session)
        ):
            self._release()

        return result
