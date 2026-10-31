from __future__ import annotations

import os
from types import SimpleNamespace

import pytest

import app.services.document_storage as storage

from app.services.completion_pdf_ownership import (
    capture_completion_pdf_receipt,
    clear_completion_pdf_receipts_after_success,
    inspect_recorded_completion_pdf,
    pending_completion_pdfs,
    register_created_completion_pdf,
)


@pytest.fixture
def isolated(tmp_path, monkeypatch):
    monkeypatch.setattr(
        storage,
        "get_private_storage_root",
        lambda: tmp_path.resolve(),
    )
    return tmp_path


def created(relative, content=b"%PDF-1.4\\nTEST"):
    storage.write_new_private_storage_file(relative, content)
    return relative


def test_01_capture_new_pdf(isolated):
    name = created("generated/completion/m21/one.pdf")
    receipt = capture_completion_pdf_receipt(name)
    assert receipt.storage_path == name
    assert len(receipt.sha256) == 64
    assert receipt.size > 0
    assert inspect_recorded_completion_pdf(receipt) == "unchanged"


def test_02_record_in_session(isolated):
    session = SimpleNamespace(info={})
    name = created("generated/completion/m21/two.pdf")
    receipt = register_created_completion_pdf(session, name)
    assert pending_completion_pdfs(session) == (receipt,)


def test_03_multiple_pdf_receipts(isolated):
    session = SimpleNamespace(info={})
    names = [
        created("generated/completion/m21/three.pdf"),
        created("generated/completion/m21/four.pdf"),
    ]
    for name in names:
        register_created_completion_pdf(session, name)
    assert len(pending_completion_pdfs(session)) == 2


def test_04_missing_pdf_cannot_be_registered(isolated):
    session = SimpleNamespace(info={})
    with pytest.raises(FileNotFoundError):
        register_created_completion_pdf(
            session,
            "generated/completion/m21/missing.pdf",
        )
    assert pending_completion_pdfs(session) == ()


def test_05_unrelated_storage_path_rejected(isolated):
    name = created("other/location/file.pdf")
    with pytest.raises(ValueError):
        capture_completion_pdf_receipt(name)


def test_06_path_traversal_rejected(isolated):
    with pytest.raises(ValueError):
        capture_completion_pdf_receipt(
            "generated/completion/../../outside.pdf"
        )


def test_07_modified_pdf_detected(isolated):
    name = created("generated/completion/m21/modified.pdf")
    receipt = capture_completion_pdf_receipt(name)
    (isolated / name).write_bytes(b"%PDF-1.4\\nCHANGED")
    assert inspect_recorded_completion_pdf(receipt) == "changed"


def test_08_replaced_file_detected(isolated):
    name = created("generated/completion/m21/replaced.pdf")
    receipt = capture_completion_pdf_receipt(name)

    replacement = isolated / "replacement.tmp"
    replacement.write_bytes((isolated / name).read_bytes())
    os.replace(replacement, isolated / name)

    assert inspect_recorded_completion_pdf(receipt) == "changed"


def test_09_missing_file_detected(isolated):
    name = created("generated/completion/m21/deleted.pdf")
    receipt = capture_completion_pdf_receipt(name)
    (isolated / name).unlink()
    assert inspect_recorded_completion_pdf(receipt) == "missing"


def test_10_success_clears_journal_only(isolated):
    session = SimpleNamespace(info={})
    name = created("generated/completion/m21/success.pdf")
    register_created_completion_pdf(session, name)

    clear_completion_pdf_receipts_after_success(session)

    assert pending_completion_pdfs(session) == ()
    assert (isolated / name).is_file()
