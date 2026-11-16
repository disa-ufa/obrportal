"""M4.5 deterministic scan and API contract tests; no database or filesystem writes."""
from __future__ import annotations

import ast
from pathlib import Path
from types import SimpleNamespace
from hashlib import sha256

import pytest
from fastapi import HTTPException
from app.services.mintrud_protocol_scans import (
    MAX_SIGNED_SCAN_BYTES, scan_digest, sniff_signed_scan_media_type,
    validate_signed_scan, validated_download_content, require_scan_storage_path,
)

PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"
JPG = b"\xff\xd8\xff\xe0" + b"hello" * 20 + b"\xff\xd9"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32 + b"\x00\x00\x00\x00IEND\xaeB`\x82"

@pytest.mark.parametrize("filename, declared, data, media_type, suffix", [
    ("commission.pdf", "application/pdf", PDF, "application/pdf", ".pdf"),
    ("commission.jpg", "image/jpeg", JPG, "image/jpeg", ".jpg"),
    ("commission.jpeg", "application/octet-stream", JPG, "image/jpeg", ".jpg"),
    ("commission.png", "image/png", PNG, "image/png", ".png"),
    (r"C:\\fakepath\\commission.pdf", "application/pdf", PDF, "application/pdf", ".pdf"),
])
def test_accepts_allowed_scan(filename, declared, data, media_type, suffix):
    assert validate_signed_scan(filename, declared, data) == (media_type, suffix)
    assert sniff_signed_scan_media_type(data) == media_type

@pytest.mark.parametrize("filename, declared, data, status", [
    ("a.pdf", "application/pdf", b"", 422),
    ("a.pdf", "application/pdf", b"%PDF-1.4", 415),
    ("a.pdf", "application/pdf", PNG, 415),
    ("a.png", "image/png", JPG, 415),
    ("a.jpg", "image/jpeg", PDF, 415),
    ("a.gif", "image/gif", PNG, 415),
    ("a.pdf", "image/jpeg", PDF, 415),
    ("a.pdf.exe", "application/pdf", PDF, 415),
    ("a.svg", "image/svg+xml", b"<svg/>", 415),
    ("a.pdf", "application/pdf", b"0" * (MAX_SIGNED_SCAN_BYTES + 1), 413),
])
def test_rejects_bad_scan(filename, declared, data, status):
    with pytest.raises(HTTPException) as error:
        validate_signed_scan(filename, declared, data)
    assert error.value.status_code == status


def test_digest_is_sha256_of_exact_content():
    assert scan_digest(PDF) == sha256(PDF).hexdigest()


@pytest.mark.parametrize("path", [
    None, "", "../passwd", "/etc/passwd", "mintrud/signed-protocol-scans/wrong/file.pdf",
    "mintrud/signed-protocol-scans/123/../file.pdf", "mintrud/signed-protocol-scans/123/file.svg",
    "mintrud/signed-protocol-scans/123/other/file.pdf",
])
def test_blocks_unsafe_scan_path(path):
    with pytest.raises(HTTPException) as error:
        require_scan_storage_path("123", path)
    assert error.value.status_code in (404, 409)


def test_accepts_protocol_scoped_private_path():
    expected = "mintrud/signed-protocol-scans/123/97f4.pdf"
    assert require_scan_storage_path("123", expected) == expected


def test_verified_download_returns_exact_bytes():
    p = SimpleNamespace(signed_scan_sha256=scan_digest(PDF), signed_scan_size=len(PDF),
                        signed_scan_media_type="application/pdf")
    assert validated_download_content(p, PDF) == (PDF, "application/pdf")


@pytest.mark.parametrize("replacement", [b"bad", JPG, PDF + b"tampered"])
def test_download_rejects_missing_or_tampered_bytes(replacement):
    p = SimpleNamespace(signed_scan_sha256=scan_digest(PDF), signed_scan_size=len(PDF),
                        signed_scan_media_type="application/pdf")
    with pytest.raises(HTTPException) as error:
        validated_download_content(p, replacement)
    assert error.value.status_code == 409


def test_missing_metadata_rejected():
    p = SimpleNamespace(signed_scan_sha256=None, signed_scan_size=None, signed_scan_media_type=None)
    with pytest.raises(HTTPException) as error:
        validated_download_content(p, PDF)
    assert error.value.status_code == 409


def test_upload_download_routes_guarded_and_no_registry_writes():
    path = Path(__file__).resolve().parents[1] / "api" / "v1" / "mintrud_protocol_drafts.py"
    tree = ast.parse(path.read_text(encoding="utf-8"))
    upload = next(x for x in tree.body if isinstance(x, ast.AsyncFunctionDef) and x.name == "upload_signed_protocol_scan")
    download = next(x for x in tree.body if isinstance(x, ast.AsyncFunctionDef) and x.name == "download_signed_protocol_scan")
    upload_code, download_code = ast.unparse(upload), ast.unparse(download)
    assert 'require_permission(\'mintrud.write\')' in upload_code
    assert 'require_permission(\'mintrud.read\')' in download_code
    assert "with_for_update" in upload_code
    assert "require_signed_protocol(protocol)" in upload_code
    assert "require_signed_protocol(protocol)" in download_code
    assert "attempt.publish_manifest()" in upload_code
    assert "write_resource(attempt.scan, content, attempt.namespace)" in upload_code
    assert "signed_scan_path" in upload_code
    assert "validated_download_content" in download_code
    for body in (upload_code, download_code):
        for forbidden in ("auto_sync_mintrud_after_signing", "apply_mintrud_protocol_sync",
                          "mark_registry_exported", "apply_registry_approval"):
            assert forbidden not in body


def test_metadata_model_schema_already_provided_by_m44():
    path = Path(__file__).resolve().parents[1] / "models" / "mintrud_knowledge_protocol.py"
    text = path.read_text(encoding="utf-8")
    for name in ("signed_scan_path", "signed_scan_sha256", "signed_scan_size",
                 "signed_scan_media_type", "signed_scan_uploaded_at", "signed_scan_uploaded_by_user_id"):
        assert name in text
