from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services import completion_documents as completion
from app.services import document_storage as storage
from app.services.completion_pdf_ownership import (
    inspect_recorded_completion_pdf,
    pending_completion_pdfs,
)


@pytest.fixture
def pdf_context(tmp_path, monkeypatch):
    monkeypatch.setattr(
        storage,
        "get_private_storage_root",
        lambda: tmp_path.resolve(),
    )
    monkeypatch.setattr(
        completion,
        "build_completion_learner_full_name",
        lambda **kwargs: "Test Learner",
    )

    enrollment = SimpleNamespace(
        completed_at=datetime(
            2026, 10, 16, tzinfo=timezone.utc
        )
    )
    document = SimpleNamespace(
        document_number="AUTO-M21-C43B",
        document_type="Certificate",
        verification_code="M21C43BCODE",
    )
    course = SimpleNamespace(
        title="Test program",
        hours=16,
        document_type="Certificate",
    )

    def generate(session=None):
        kwargs = dict(
            enrollment=enrollment,
            document=document,
            course=course,
            learner=None,
            learner_profile=None,
            organization=None,
        )
        if session is not None:
            kwargs["session"] = session
        return completion.write_completion_document_pdf_to_storage(
            **kwargs
        )

    return tmp_path, generate


def test_01_real_pdf_registers_with_session(pdf_context):
    root, generate = pdf_context
    session = SimpleNamespace(info={})

    name = generate(session)
    receipts = pending_completion_pdfs(session)

    assert len(receipts) == 1
    assert receipts[0].storage_path == name
    assert inspect_recorded_completion_pdf(receipts[0]) == "unchanged"
    assert (root / name).read_bytes().startswith(b"%PDF-")


def test_02_two_pdfs_share_transaction_journal(pdf_context):
    root, generate = pdf_context
    session = SimpleNamespace(info={})

    with patch.object(
        completion,
        "build_completion_document_storage_path",
        side_effect=[
            Path("generated/completion/m21/first.pdf"),
            Path("generated/completion/m21/second.pdf"),
        ],
    ):
        first = generate(session)
        second = generate(session)

    receipts = pending_completion_pdfs(session)
    assert len(receipts) == 2
    assert {item.storage_path for item in receipts} == {first, second}
    assert all(
        inspect_recorded_completion_pdf(item) == "unchanged"
        for item in receipts
    )


def test_03_legacy_writer_without_session_still_works(pdf_context):
    root, generate = pdf_context
    name = generate()
    assert (root / name).is_file()


def test_04_invalid_journal_fails_before_file_write(pdf_context):
    root, generate = pdf_context
    session = SimpleNamespace(
        info={"_m21_completion_pdf_ownership": {}}
    )
    name = Path("generated/completion/m21/invalid.pdf")

    with patch.object(
        completion,
        "build_completion_document_storage_path",
        return_value=name,
    ):
        with pytest.raises(RuntimeError, match="Invalid completion PDF journal"):
            generate(session)

    assert not (root / name).exists()


def test_05_existing_pdf_collision_does_not_register(pdf_context):
    root, generate = pdf_context
    session = SimpleNamespace(info={})
    name = Path("generated/completion/m21/existing.pdf")
    target = root / name

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"PREEXISTING FILE")

    with patch.object(
        completion,
        "build_completion_document_storage_path",
        return_value=name,
    ):
        with pytest.raises(FileExistsError):
            generate(session)

    assert target.read_bytes() == b"PREEXISTING FILE"
    assert pending_completion_pdfs(session) == ()
