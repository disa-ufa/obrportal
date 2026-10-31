import asyncio

import pytest

import app.services.document_storage as storage
from app.services.completion_pdf_ownership import (
    pending_completion_pdfs,
    register_created_completion_pdf,
)
from app.services.completion_pdf_transaction_boundary import (
    CompletionPDFTransactionBoundary,
)


class FakeSession:
    def __init__(self, *, commit_error=None, rollback_error=None):
        self.info = {}
        self.commit_error = commit_error
        self.rollback_error = rollback_error
        self.commits = 0
        self.rollbacks = 0

    async def commit(self):
        self.commits += 1
        if self.commit_error is not None:
            raise self.commit_error

    async def rollback(self):
        self.rollbacks += 1
        if self.rollback_error is not None:
            raise self.rollback_error


@pytest.fixture
def pdf(tmp_path, monkeypatch):
    monkeypatch.setattr(
        storage,
        "get_private_storage_root",
        lambda: tmp_path.resolve(),
    )

    def create(session, filename):
        relative = "generated/completion/m21/" + filename
        storage.write_new_private_storage_file(
            relative, b"%PDF-1.4\\nTEST"
        )
        register_created_completion_pdf(session, relative)
        return tmp_path / relative

    return create


@pytest.mark.asyncio
async def test_01_successful_commit_preserves_pdf_and_clears_journal(pdf):
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "success.pdf")

    await boundary.commit()

    assert path.is_file()
    assert session.commits == 1
    assert session.rollbacks == 0
    assert pending_completion_pdfs(session) == ()
    assert "_m21_completion_pdf_transaction_boundary" not in session.info


@pytest.mark.asyncio
async def test_02_precommit_failure_deletes_owned_pdf(pdf):
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "precommit.pdf")

    result = await boundary.compensate(RuntimeError("precommit failure"))

    assert result.rollback_confirmed
    assert result.removed_count == 1
    assert not path.exists()
    assert session.rollbacks == 1
    assert pending_completion_pdfs(session) == ()
    assert "_m21_completion_pdf_transaction_boundary" not in session.info


@pytest.mark.asyncio
async def test_03_bulk_precommit_failure_deletes_all(pdf):
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)
    paths = [pdf(session, f"bulk-{i}.pdf") for i in range(4)]

    result = await boundary.compensate(RuntimeError("bulk failure"))

    assert result.removed_count == 4
    assert all(not path.exists() for path in paths)
    assert pending_completion_pdfs(session) == ()


@pytest.mark.asyncio
async def test_04_uncertain_commit_preserves_files_and_blocks_reuse(pdf):
    session = FakeSession(commit_error=OSError("lost COMMIT ACK"))
    boundary = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "uncertain.pdf")

    with pytest.raises(OSError, match="lost COMMIT ACK"):
        await boundary.commit()

    result = await boundary.compensate(OSError("lost COMMIT ACK"))

    assert result.commit_attempted
    assert result.removed_count == 0
    assert path.is_file()
    assert len(pending_completion_pdfs(session)) == 1
    assert session.rollbacks == 1

    with pytest.raises(RuntimeError, match="already exists"):
        CompletionPDFTransactionBoundary(session)


@pytest.mark.asyncio
async def test_05_cancelled_commit_preserves_files(pdf):
    session = FakeSession(commit_error=asyncio.CancelledError())
    boundary = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "cancelled.pdf")

    with pytest.raises(asyncio.CancelledError):
        await boundary.commit()

    with pytest.raises(asyncio.CancelledError):
        await boundary.compensate(asyncio.CancelledError())

    assert path.is_file()
    assert len(pending_completion_pdfs(session)) == 1
    assert session.rollbacks == 1


@pytest.mark.asyncio
async def test_06_failed_rollback_preserves_file_and_blocks_reuse(pdf):
    session = FakeSession(
        rollback_error=OSError("injected rollback failure")
    )
    boundary = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "rollback.pdf")

    with pytest.raises(RuntimeError, match="compensation incomplete"):
        await boundary.compensate(RuntimeError("precommit failure"))

    assert path.is_file()
    assert len(pending_completion_pdfs(session)) == 1

    with pytest.raises(RuntimeError, match="already exists"):
        CompletionPDFTransactionBoundary(session)


@pytest.mark.asyncio
async def test_07_failure_after_successful_commit_does_not_rollback(pdf):
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "after-commit.pdf")

    await boundary.commit()
    result = await boundary.compensate(
        RuntimeError("downstream response failure")
    )

    assert path.is_file()
    assert result.commit_attempted
    assert result.removed_count == 0
    assert session.rollbacks == 0


def test_08_second_active_boundary_is_rejected():
    session = FakeSession()
    first = CompletionPDFTransactionBoundary(session)

    with pytest.raises(RuntimeError, match="already exists"):
        CompletionPDFTransactionBoundary(session)

    assert session.info["_m21_completion_pdf_transaction_boundary"] is first


def test_09_unresolved_journal_prevents_adoption(pdf):
    session = FakeSession()
    path = pdf(session, "orphan-journal.pdf")

    with pytest.raises(RuntimeError, match="Unresolved"):
        CompletionPDFTransactionBoundary(session)

    assert path.is_file()


@pytest.mark.asyncio
async def test_10_new_boundary_allowed_after_clean_rollback(pdf):
    session = FakeSession()
    first = CompletionPDFTransactionBoundary(session)
    path = pdf(session, "first.pdf")

    await first.compensate(RuntimeError("first failure"))

    assert not path.exists()

    second = CompletionPDFTransactionBoundary(session)
    next_path = pdf(session, "second.pdf")
    await second.commit()

    assert next_path.is_file()
    assert pending_completion_pdfs(session) == ()


@pytest.mark.asyncio
async def test_11_duplicate_commit_is_forbidden():
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)
    await boundary.commit()

    with pytest.raises(RuntimeError, match="not active"):
        await boundary.commit()

    assert session.commits == 1


@pytest.mark.asyncio
async def test_12_precommit_failure_without_pdf_releases_session():
    session = FakeSession()
    boundary = CompletionPDFTransactionBoundary(session)

    result = await boundary.compensate(RuntimeError("before PDF creation"))

    assert result.rollback_confirmed
    assert result.removed_count == 0
    assert session.rollbacks == 1

    replacement = CompletionPDFTransactionBoundary(session)
    assert replacement is not boundary
