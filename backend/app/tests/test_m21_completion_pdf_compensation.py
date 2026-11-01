import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

import app.services.document_storage as storage

from app.services.completion_pdf_ownership import (
    pending_completion_pdfs,
    register_created_completion_pdf,
)
from app.services.completion_pdf_compensation import (
    compensate_completion_pdf_transaction,
)


class FakeSession:
    def __init__(self, *, error=None, delay=0):
        self.info = {}
        self.error = error
        self.delay = delay
        self.rollbacks = 0

    async def rollback(self):
        self.rollbacks += 1
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.error:
            raise self.error


@pytest.fixture
def files(tmp_path, monkeypatch):
    monkeypatch.setattr(
        storage, "get_private_storage_root",
        lambda: tmp_path.resolve(),
    )

    def make(session, name):
        relative = "generated/completion/m21/" + name
        storage.write_new_private_storage_file(
            relative, b"%PDF-1.4\\nTEST"
        )
        register_created_completion_pdf(session, relative)
        return tmp_path / relative

    def remove(receipt):
        (tmp_path / receipt.storage_path).unlink()

    return make, remove


@pytest.mark.asyncio
async def test_01_empty_journal_rolls_back():
    session = FakeSession()
    result = await compensate_completion_pdf_transaction(
        session,
        commit_attempted=False,
        original_error=RuntimeError("precommit"),
    )
    assert result.rollback_confirmed
    assert result.removed_count == 0
    assert session.rollbacks == 1


@pytest.mark.asyncio
async def test_02_precommit_removes_owned_pdf(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "one.pdf")
    result = await compensate_completion_pdf_transaction(
        session,
        commit_attempted=False,
        original_error=RuntimeError("precommit"),
        cleanup_receipt=remove,
    )
    assert not file.exists()
    assert result.removed_count == 1
    assert pending_completion_pdfs(session) == ()


@pytest.mark.asyncio
async def test_03_bulk_failure_removes_every_pdf(files):
    make, remove = files
    session = FakeSession()
    paths = [make(session, f"{i}.pdf") for i in range(5)]
    result = await compensate_completion_pdf_transaction(
        session,
        commit_attempted=False,
        original_error=RuntimeError("bulk failure"),
        cleanup_receipt=remove,
    )
    assert all(not file.exists() for file in paths)
    assert result.removed_count == 5
    assert pending_completion_pdfs(session) == ()


@pytest.mark.asyncio
async def test_04_commit_attempt_preserves_pdf(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "uncertain.pdf")
    result = await compensate_completion_pdf_transaction(
        session,
        commit_attempted=True,
        original_error=OSError("lost COMMIT acknowledgment"),
        cleanup_receipt=remove,
    )
    assert file.exists()
    assert result.removed_count == 0
    assert result.preserved_count == 1
    assert len(pending_completion_pdfs(session)) == 1


@pytest.mark.asyncio
async def test_05_rollback_failure_preserves_pdf(files):
    make, remove = files
    session = FakeSession(error=OSError("rollback failed"))
    file = make(session, "rollback.pdf")
    with pytest.raises(RuntimeError, match="compensation incomplete"):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=False,
            original_error=RuntimeError("original failure"),
            cleanup_receipt=remove,
        )
    assert file.exists()
    assert len(pending_completion_pdfs(session)) == 1


@pytest.mark.asyncio
async def test_06_rollback_timeout_preserves_pdf(files):
    make, remove = files
    session = FakeSession(delay=1)
    file = make(session, "timeout.pdf")
    with pytest.raises(RuntimeError, match="rollback timed out"):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=False,
            original_error=RuntimeError("original failure"),
            cleanup_receipt=remove,
            rollback_timeout_seconds=0.01,
        )
    assert file.exists()


@pytest.mark.asyncio
async def test_07_missing_cleanup_callback_fails_closed(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "no-cleaner.pdf")
    with pytest.raises(RuntimeError, match="callback is not installed"):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=False,
            original_error=RuntimeError("original failure"),
        )
    assert file.exists()


@pytest.mark.asyncio
async def test_08_modified_pdf_is_preserved(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "modified.pdf")
    file.write_bytes(b"MODIFIED")
    with pytest.raises(RuntimeError, match="unsafe state changed"):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=False,
            original_error=RuntimeError("original failure"),
            cleanup_receipt=remove,
        )
    assert file.read_bytes() == b"MODIFIED"


@pytest.mark.asyncio
async def test_09_cleanup_failure_preserves_journal(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "cleanup.pdf")

    def fail_cleanup(receipt):
        raise OSError("forced cleanup failure")

    with pytest.raises(RuntimeError, match="cleanup failed"):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=False,
            original_error=RuntimeError("original failure"),
            cleanup_receipt=fail_cleanup,
        )
    assert file.exists()
    assert len(pending_completion_pdfs(session)) == 1


@pytest.mark.asyncio
async def test_10_cancellation_after_commit_attempt_preserves_pdf(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "cancel.pdf")
    with pytest.raises(asyncio.CancelledError):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=True,
            original_error=asyncio.CancelledError(),
            cleanup_receipt=remove,
        )
    assert file.exists()
    assert len(pending_completion_pdfs(session)) == 1


@pytest.mark.asyncio
async def test_11_next_transaction_after_success(files):
    make, remove = files
    session = FakeSession()
    first = make(session, "first.pdf")
    await compensate_completion_pdf_transaction(
        session,
        commit_attempted=False,
        original_error=RuntimeError("first error"),
        cleanup_receipt=remove,
    )
    second = make(session, "second.pdf")
    assert not first.exists()
    assert second.exists()
    assert len(pending_completion_pdfs(session)) == 1


@pytest.mark.asyncio
async def test_12_cleanup_callback_must_remove_file(files):
    make, remove = files
    session = FakeSession()
    file = make(session, "noop.pdf")
    with pytest.raises(RuntimeError, match="PDF deletion not confirmed"):
        await compensate_completion_pdf_transaction(
            session,
            commit_attempted=False,
            original_error=RuntimeError("original failure"),
            cleanup_receipt=lambda receipt: None,
        )
    assert file.exists()
