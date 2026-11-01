import os
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace

import pytest

import app.services.document_storage as storage

from app.services.completion_pdf_ownership import (
    capture_completion_pdf_receipt,
    delete_registered_completion_pdf,
    pending_completion_pdfs,
    register_created_completion_pdf,
)
from app.services.completion_pdf_compensation import (
    compensate_completion_pdf_transaction,
)


class FakeSession:
    def __init__(self):
        self.info = {}
        self.rollbacks = 0

    async def rollback(self):
        self.rollbacks += 1


@pytest.fixture
def case(tmp_path, monkeypatch):
    monkeypatch.setattr(
        storage,
        "get_private_storage_root",
        lambda: tmp_path.resolve(),
    )

    session = FakeSession()

    def create(filename, content=b"%PDF-1.4\\nSAFE"):
        relative = "generated/completion/m21/" + filename
        storage.write_new_private_storage_file(relative, content)
        receipt = register_created_completion_pdf(
            session, relative
        )
        return tmp_path / relative, receipt

    return tmp_path, session, create


def test_01_registered_unchanged_file_deleted(case):
    root, session, create = case
    path, receipt = create("one.pdf")

    delete_registered_completion_pdf(session, receipt)

    assert not path.exists()
    assert len(pending_completion_pdfs(session)) == 1


def test_02_unregistered_receipt_refused(case):
    root, session, create = case
    relative = "generated/completion/m21/unregistered.pdf"
    storage.write_new_private_storage_file(relative, b"%PDF-1.4")
    receipt = capture_completion_pdf_receipt(relative)

    with pytest.raises(RuntimeError, match="not uniquely registered"):
        delete_registered_completion_pdf(session, receipt)

    assert (root / relative).is_file()


def test_03_forged_receipt_refused(case):
    root, session, create = case
    path, receipt = create("forged.pdf")
    forged = replace(receipt, sha256="0" * 64)

    with pytest.raises(RuntimeError, match="not uniquely registered"):
        delete_registered_completion_pdf(session, forged)

    assert path.is_file()


def test_04_modified_same_size_and_mtime_refused(case):
    root, session, create = case
    original = b"%PDF-1.4\\nSAFE"
    path, receipt = create("modified.pdf", original)

    path.write_bytes(b"%PDF-1.4\\nEVIL")
    os.utime(
        path,
        ns=(receipt.modified_ns, receipt.modified_ns),
    )

    with pytest.raises(RuntimeError, match="content changed"):
        delete_registered_completion_pdf(session, receipt)

    assert path.is_file()


def test_05_replaced_same_content_refused(case):
    root, session, create = case
    path, receipt = create("replaced.pdf")
    candidate = root / "replacement.tmp"
    candidate.write_bytes(path.read_bytes())
    os.replace(candidate, path)

    with pytest.raises(RuntimeError, match="identity changed"):
        delete_registered_completion_pdf(session, receipt)

    assert path.is_file()


def test_06_symlink_instead_of_file_refused(case):
    root, session, create = case
    path, receipt = create("symlink.pdf")
    external = root / "other.pdf"
    external.write_bytes(path.read_bytes())
    path.unlink()
    path.symlink_to(external)

    with pytest.raises((OSError, RuntimeError)):
        delete_registered_completion_pdf(session, receipt)

    assert path.is_symlink()
    assert external.is_file()


def test_07_symlink_directory_refused(case):
    root, session, create = case
    path, receipt = create("directory.pdf")
    directory = path.parent
    moved = directory.with_name("m21-moved")
    directory.rename(moved)
    directory.symlink_to(moved, target_is_directory=True)

    with pytest.raises((OSError, RuntimeError)):
        delete_registered_completion_pdf(session, receipt)

    assert (moved / path.name).is_file()


def test_08_missing_registered_file_refused(case):
    root, session, create = case
    path, receipt = create("missing.pdf")
    path.unlink()

    with pytest.raises(FileNotFoundError):
        delete_registered_completion_pdf(session, receipt)

    assert len(pending_completion_pdfs(session)) == 1


def test_09_reject_non_receipt_argument(case):
    root, session, create = case
    path, receipt = create("invalid.pdf")

    with pytest.raises(RuntimeError, match="Invalid completion PDF receipt"):
        delete_registered_completion_pdf(
            session, SimpleNamespace(storage_path=receipt.storage_path)
        )

    assert path.is_file()


def test_10_directory_fsync_failure_is_reported(case, monkeypatch):
    root, session, create = case
    path, receipt = create("fsync.pdf")
    original_fsync = os.fsync

    def failing_fsync(fd):
        import stat
        if stat.S_ISDIR(os.fstat(fd).st_mode):
            raise OSError("forced directory fsync failure")
        return original_fsync(fd)

    monkeypatch.setattr(os, "fsync", failing_fsync)

    with pytest.raises(OSError, match="forced directory fsync failure"):
        delete_registered_completion_pdf(session, receipt)

    assert not path.exists()
    assert len(pending_completion_pdfs(session)) == 1


@pytest.mark.asyncio
async def test_11_precommit_compensation_clears_bulk_journal(case):
    root, session, create = case
    paths = [create(f"bulk-{i}.pdf")[0] for i in range(3)]

    result = await compensate_completion_pdf_transaction(
        session,
        commit_attempted=False,
        original_error=RuntimeError("forced transaction failure"),
        cleanup_receipt=lambda receipt: delete_registered_completion_pdf(
            session, receipt
        ),
    )

    assert result.rollback_confirmed
    assert result.removed_count == 3
    assert all(not path.exists() for path in paths)
    assert pending_completion_pdfs(session) == ()


@pytest.mark.asyncio
async def test_12_attempted_commit_never_calls_delete(case):
    root, session, create = case
    path, receipt = create("commit.pdf")

    def must_not_run(_receipt):
        raise AssertionError("Delete callback should not run")

    result = await compensate_completion_pdf_transaction(
        session,
        commit_attempted=True,
        original_error=OSError("lost COMMIT ACK"),
        cleanup_receipt=must_not_run,
    )

    assert result.removed_count == 0
    assert path.is_file()
    assert len(pending_completion_pdfs(session)) == 1
