import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services import completion_documents as completion
from app.services import document_storage as storage
from app.services.completion_pdf_ownership import (
    pending_completion_pdfs,
    register_created_completion_pdf,
)


@pytest.fixture
def pdf_case(tmp_path, monkeypatch):
    monkeypatch.setattr(
        storage, "get_private_storage_root",
        lambda: tmp_path.resolve(),
    )
    monkeypatch.setattr(
        completion, "build_completion_learner_full_name",
        lambda **kwargs: "Test Learner",
    )

    session = SimpleNamespace(info={})

    enrollment = SimpleNamespace(
        completed_at=datetime(
            2026, 10, 16, tzinfo=timezone.utc
        )
    )
    document = SimpleNamespace(
        document_number="AUTO-M21-C43C",
        document_type="Certificate",
        verification_code="M21C43CCODE",
    )
    course = SimpleNamespace(
        title="Test course",
        hours=16,
        document_type="Certificate",
    )

    name = "generated/completion/m21/failure.pdf"

    def generate():
        with patch.object(
            completion,
            "build_completion_document_storage_path",
            return_value=Path(name),
        ):
            return completion.write_completion_document_pdf_to_storage(
                enrollment=enrollment,
                document=document,
                course=course,
                learner=None,
                learner_profile=None,
                organization=None,
                session=session,
            )

    return tmp_path, session, name, generate


def test_01_registration_failure_removes_own_pdf(pdf_case):
    root, session, name, generate = pdf_case

    with patch.object(
        completion,
        "register_created_completion_pdf",
        side_effect=RuntimeError("injected registration failure"),
    ):
        with pytest.raises(RuntimeError, match="injected registration failure"):
            generate()

    assert not (root / name).exists()
    assert pending_completion_pdfs(session) == ()


def test_02_failure_after_journal_append_preserves_pdf(pdf_case):
    root, session, name, generate = pdf_case

    def append_then_fail(current_session, relative):
        register_created_completion_pdf(current_session, relative)
        raise RuntimeError("failure after journal append")

    with patch.object(
        completion,
        "register_created_completion_pdf",
        side_effect=append_then_fail,
    ):
        with pytest.raises(
            RuntimeError, match="failure after journal append"
        ):
            generate()

    assert (root / name).is_file()
    assert len(pending_completion_pdfs(session)) == 1


def test_03_modified_pdf_is_not_deleted(pdf_case):
    root, session, name, generate = pdf_case

    def modify_then_fail(current_session, relative):
        (root / relative).write_bytes(b"CHANGED")
        raise RuntimeError("modified during registration")

    with patch.object(
        completion,
        "register_created_completion_pdf",
        side_effect=modify_then_fail,
    ):
        with pytest.raises(
            RuntimeError, match="modified during registration"
        ):
            generate()

    assert (root / name).read_bytes() == b"CHANGED"
    assert pending_completion_pdfs(session) == ()


def test_04_replaced_pdf_is_not_deleted(pdf_case):
    root, session, name, generate = pdf_case

    def replace_then_fail(current_session, relative):
        target = root / relative
        other = root / "replacement.tmp"
        other.write_bytes(target.read_bytes())
        os.replace(other, target)
        raise RuntimeError("replaced during registration")

    with patch.object(
        completion,
        "register_created_completion_pdf",
        side_effect=replace_then_fail,
    ):
        with pytest.raises(
            RuntimeError, match="replaced during registration"
        ):
            generate()

    assert (root / name).is_file()
    assert pending_completion_pdfs(session) == ()


def test_05_cancellation_removes_unchanged_pdf(pdf_case):
    root, session, name, generate = pdf_case

    with patch.object(
        completion,
        "register_created_completion_pdf",
        side_effect=asyncio.CancelledError(),
    ):
        with pytest.raises(asyncio.CancelledError):
            generate()

    assert not (root / name).exists()
    assert pending_completion_pdfs(session) == ()


def test_06_receipt_capture_failure_preserves_pdf(pdf_case):
    root, session, name, generate = pdf_case

    with patch.object(
        completion,
        "capture_completion_pdf_receipt",
        side_effect=OSError("receipt capture unavailable"),
    ):
        with pytest.raises(
            OSError, match="receipt capture unavailable"
        ):
            generate()

    assert (root / name).is_file()
    assert pending_completion_pdfs(session) == ()


def test_07_cleanup_failure_preserves_original_error(pdf_case):
    root, session, name, generate = pdf_case

    real_unlink = Path.unlink

    def fail_target_unlink(path, *args, **kwargs):
        if path == (root / name):
            raise OSError("injected cleanup failure")
        return real_unlink(path, *args, **kwargs)

    with patch.object(
        completion,
        "register_created_completion_pdf",
        side_effect=RuntimeError("original registration error"),
    ):
        with patch.object(
            Path, "unlink",
            fail_target_unlink,
        ):
            with pytest.raises(
                RuntimeError, match="original registration error"
            ) as error:
                generate()

    assert (root / name).is_file()
    assert any(
        "cleanup unconfirmed" in note
        for note in getattr(error.value, "__notes__", [])
    )
