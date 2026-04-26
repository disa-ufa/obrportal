from __future__ import annotations

from pathlib import Path

import pytest

from app.core.config import settings
from app.services.document_storage import (
    build_document_download_filename,
    delete_private_storage_file,
    normalize_relative_storage_path,
    resolve_private_storage_path,
    write_private_storage_file,
)


def test_normalize_relative_storage_path_accepts_safe_path() -> None:
    assert normalize_relative_storage_path("generated/completion/test.pdf") == (
        "generated/completion/test.pdf"
    )
    assert normalize_relative_storage_path(Path("documents/test.pdf")) == "documents/test.pdf"


def test_normalize_relative_storage_path_rejects_unsafe_path() -> None:
    with pytest.raises(ValueError):
        normalize_relative_storage_path("../secret.pdf")

    with pytest.raises(ValueError):
        normalize_relative_storage_path("/tmp/secret.pdf")

    with pytest.raises(ValueError):
        normalize_relative_storage_path("")

    with pytest.raises(ValueError):
        normalize_relative_storage_path("documents/../secret.pdf")


def test_write_and_resolve_private_storage_file(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "document_storage_dir", str(tmp_path))

    relative_path = write_private_storage_file(
        "generated/completion/test.pdf",
        b"%PDF-test",
    )

    assert relative_path == "generated/completion/test.pdf"

    absolute_path = resolve_private_storage_path(relative_path)

    assert absolute_path is not None
    assert absolute_path.exists()
    assert absolute_path.read_bytes() == b"%PDF-test"
    assert tmp_path in absolute_path.parents


def test_resolve_private_storage_path_returns_none_for_traversal(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "document_storage_dir", str(tmp_path))

    assert resolve_private_storage_path("../outside.pdf") is None
    assert resolve_private_storage_path("/tmp/outside.pdf") is None


def test_write_private_storage_file_rejects_traversal(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "document_storage_dir", str(tmp_path))

    with pytest.raises(ValueError):
        write_private_storage_file("../outside.pdf", b"bad")


def test_delete_private_storage_file(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "document_storage_dir", str(tmp_path))

    relative_path = write_private_storage_file("documents/file.pdf", b"content")
    absolute_path = resolve_private_storage_path(relative_path)

    assert absolute_path is not None
    assert absolute_path.exists()

    assert delete_private_storage_file(relative_path) is True
    assert not absolute_path.exists()
    assert delete_private_storage_file(relative_path) is False
    assert delete_private_storage_file("../outside.pdf") is False
    assert delete_private_storage_file(None) is False


def test_build_document_download_filename() -> None:
    assert build_document_download_filename("DOC-123", "documents/file.pdf") == "DOC-123.pdf"
    assert build_document_download_filename("DOC 123 / test", "documents/file.docx") == (
        "DOC_123___test.docx"
    )
    assert build_document_download_filename("   ", None) == "document.bin"