"""C4.4D.4H: cancellation and coordinator lifetime."""

import asyncio

import pytest

import app.services.document_storage as storage
import app.services.completion_pdf_transaction_boundary as boundary_module

from app.services.completion_pdf_ownership import (
    pending_completion_pdfs,
    register_created_completion_pdf,
)
from app.services.completion_pdf_transaction_boundary import (
    CompletionPDFTransactionBoundary,
)


OLD = "generated/completion/cancel-guard/old.pdf"
NEW = "generated/completion/cancel-guard/new.pdf"


class FakeSession:
    def __init__(self, *, rollback_error=None, commit_error=None):
        self.info = {}
        self.rollbacks = 0
        self.commits = 0
        self.rollback_error = rollback_error
        self.commit_error = commit_error

    async def rollback(self):
        self.rollbacks += 1
        if self.rollback_error is not None:
            raise self.rollback_error

    async def commit(self):
        self.commits += 1
        if self.commit_error is not None:
            raise self.commit_error


def prepare(monkeypatch, tmp_path, session):
    monkeypatch.setattr(
        storage,
        "get_private_storage_root",
        lambda: tmp_path,
    )

    storage.write_new_private_storage_file(
        OLD, b"%PDF-1.4\\nOLD-DO-NOT-CHANGE"
    )

    boundary = CompletionPDFTransactionBoundary(session)

    storage.write_new_private_storage_file(
        NEW, b"%PDF-1.4\\nNEW"
    )
    register_created_completion_pdf(session, NEW)

    assert len(pending_completion_pdfs(session)) == 1

    return boundary


@pytest.mark.asyncio
async def test_01_clean_precommit_cancel_releases_and_preserves_old(
    monkeypatch, tmp_path
):
    session = FakeSession()
    boundary = prepare(monkeypatch, tmp_path, session)
    error = asyncio.CancelledError("original")

    with pytest.raises(asyncio.CancelledError) as raised:
        await boundary.compensate(error)

    assert raised.value is error
    assert session.rollbacks == 1
    assert session.commits == 0
    assert (tmp_path / OLD).is_file()
    assert (tmp_path / OLD).read_bytes().endswith(
        b"OLD-DO-NOT-CHANGE"
    )
    assert not (tmp_path / NEW).exists()
    assert pending_completion_pdfs(session) == ()

    replacement = CompletionPDFTransactionBoundary(session)
    assert replacement is not boundary


@pytest.mark.asyncio
async def test_02_clean_cancel_without_pdf_releases_session():
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)
    error = asyncio.CancelledError("no PDF")

    with pytest.raises(asyncio.CancelledError) as raised:
        await boundary.compensate(error)

    assert raised.value is error
    assert session.rollbacks == 1
    assert pending_completion_pdfs(session) == ()

    replacement = CompletionPDFTransactionBoundary(session)
    assert replacement is not boundary


@pytest.mark.asyncio
async def test_03_attempted_commit_cancel_preserves_and_blocks(
    monkeypatch, tmp_path
):
    error = asyncio.CancelledError("commit interrupted")
    session = FakeSession(commit_error=error)
    boundary = prepare(monkeypatch, tmp_path, session)

    with pytest.raises(asyncio.CancelledError) as committed:
        await boundary.commit()

    assert committed.value is error

    with pytest.raises(asyncio.CancelledError) as compensated:
        await boundary.compensate(error)

    assert compensated.value is error
    assert session.commits == 1
    assert session.rollbacks == 1
    assert (tmp_path / OLD).is_file()
    assert (tmp_path / NEW).is_file()
    assert len(pending_completion_pdfs(session)) == 1

    with pytest.raises(RuntimeError, match="already exists"):
        CompletionPDFTransactionBoundary(session)


@pytest.mark.asyncio
async def test_04_failed_rollback_during_cancel_blocks_reuse(
    monkeypatch, tmp_path
):
    session = FakeSession(
        rollback_error=OSError("rollback not confirmed")
    )
    boundary = prepare(monkeypatch, tmp_path, session)

    with pytest.raises(RuntimeError, match="compensation incomplete"):
        await boundary.compensate(
            asyncio.CancelledError("original")
        )

    assert session.rollbacks == 1
    assert (tmp_path / OLD).is_file()
    assert (tmp_path / NEW).is_file()
    assert len(pending_completion_pdfs(session)) == 1

    with pytest.raises(RuntimeError, match="already exists"):
        CompletionPDFTransactionBoundary(session)


@pytest.mark.asyncio
async def test_05_distinct_compensation_cancel_keeps_boundary(
    monkeypatch
):
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)

    original = asyncio.CancelledError("original")
    interrupted = asyncio.CancelledError("different")

    async def interrupted_compensation(*args, **kwargs):
        raise interrupted

    monkeypatch.setattr(
        boundary_module,
        "compensate_completion_pdf_transaction",
        interrupted_compensation,
    )

    with pytest.raises(asyncio.CancelledError) as raised:
        await boundary.compensate(original)

    assert raised.value is interrupted
    assert session.rollbacks == 0

    with pytest.raises(RuntimeError, match="already exists"):
        CompletionPDFTransactionBoundary(session)
