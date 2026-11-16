"""M4.5: Validate an optional private scan of an already signed paper protocol.

A scan is documentary evidence, not a digital signature. It cannot modify the
commission results, create a Mintrud registry record, or trigger an export.
"""
from __future__ import annotations

from hashlib import sha256
from pathlib import PurePosixPath

from fastapi import HTTPException

MAX_SIGNED_SCAN_BYTES = 10 * 1024 * 1024
_MEDIA_BY_SUFFIX = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}
_SUFFIX_BY_MEDIA = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}
_PNG_END = b"\x00\x00\x00\x00IEND\xaeB`\x82"


def sniff_signed_scan_media_type(content: bytes) -> str | None:
    """Conservative magic-byte check; not a malware scanner or PDF parser."""
    if content.startswith(b"%PDF-") and b"%%EOF" in content[-2048:]:
        return "application/pdf"
    if content.startswith(b"\xff\xd8\xff") and content.endswith(b"\xff\xd9"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n") and content.endswith(_PNG_END):
        return "image/png"
    return None


def validate_signed_scan(filename: str | None, declared_media_type: str | None,
                         content: bytes) -> tuple[str, str]:
    """Return (media type, safe extension); reject empty, oversize and mismatches."""
    if not content:
        raise HTTPException(status_code=422, detail="Signed protocol scan is empty")
    if len(content) > MAX_SIGNED_SCAN_BYTES:
        raise HTTPException(status_code=413, detail="Signed protocol scan exceeds 10 MiB")
    # Never trust an uploaded client path; keep only the extension for validation.
    safe_name = PurePosixPath((filename or "").replace("\\", "/")).name
    suffix = "." + safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    expected_type = _MEDIA_BY_SUFFIX.get(suffix)
    if not expected_type:
        raise HTTPException(status_code=415, detail="Only PDF, JPG and PNG scans are allowed")
    actual_type = sniff_signed_scan_media_type(content)
    if actual_type is None or actual_type != expected_type:
        raise HTTPException(status_code=415, detail="Scan content does not match its file format")
    declared = (declared_media_type or "").split(";", 1)[0].strip().lower()
    if declared not in ("", "application/octet-stream", actual_type):
        raise HTTPException(status_code=415, detail="Scan Content-Type does not match its file format")
    return actual_type, _SUFFIX_BY_MEDIA[actual_type]


def scan_digest(content: bytes) -> str:
    return sha256(content).hexdigest()


def require_scan_storage_path(protocol_id: str, relative_path: str | None) -> str:
    """Restrict downloads to the immutable protocol-owned private directory."""
    if not relative_path:
        raise HTTPException(status_code=404, detail="Signed protocol scan not attached")
    candidate = PurePosixPath(relative_path)
    expected = ("mintrud", "signed-protocol-scans", str(protocol_id))
    if (candidate.is_absolute() or len(candidate.parts) != 4
            or candidate.parts[:3] != expected
            or candidate.suffix.lower() not in _MEDIA_BY_SUFFIX
            or any(part in ("", ".", "..") for part in candidate.parts)):
        raise HTTPException(status_code=409, detail="Signed protocol scan storage path is invalid")
    return candidate.as_posix()


def validated_download_content(protocol, file_content: bytes) -> tuple[bytes, str]:
    """Fail closed if the stored file no longer matches its metadata."""
    if (not protocol.signed_scan_sha256 or not protocol.signed_scan_media_type
            or not isinstance(protocol.signed_scan_size, int)):
        raise HTTPException(status_code=409, detail="Signed protocol scan metadata missing")
    if (not file_content or len(file_content) > MAX_SIGNED_SCAN_BYTES
            or len(file_content) != protocol.signed_scan_size
            or scan_digest(file_content) != protocol.signed_scan_sha256
            or sniff_signed_scan_media_type(file_content) != protocol.signed_scan_media_type):
        raise HTTPException(status_code=409, detail="Signed protocol scan integrity mismatch")
    return file_content, protocol.signed_scan_media_type
