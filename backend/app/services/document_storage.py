from __future__ import annotations

import asyncio
import errno
import os
from mimetypes import guess_type

from pathlib import Path, PurePosixPath

from app.core.config import settings


def get_private_storage_root() -> Path:
    return Path(settings.document_storage_dir).resolve()


def normalize_relative_storage_path(storage_path: str | Path | PurePosixPath) -> str:
    raw_value = str(storage_path).replace("\\", "/").strip()

    if not raw_value:
        raise ValueError("Storage path is required")

    relative_path = PurePosixPath(raw_value)

    if relative_path.is_absolute():
        raise ValueError("Storage path must be relative")

    if any(part in {"", ".", ".."} for part in relative_path.parts):
        raise ValueError("Storage path contains unsafe segments")

    return relative_path.as_posix()


def resolve_private_storage_path(storage_path: str | Path | PurePosixPath) -> Path | None:
    try:
        safe_relative_path = normalize_relative_storage_path(storage_path)
    except ValueError:
        return None

    storage_root = get_private_storage_root()
    absolute_path = (storage_root / safe_relative_path).resolve()

    try:
        absolute_path.relative_to(storage_root)
    except ValueError:
        return None

    return absolute_path


def write_private_storage_file(
    storage_path: str | Path | PurePosixPath,
    content: bytes,
) -> str:
    safe_relative_path = normalize_relative_storage_path(storage_path)
    absolute_path = resolve_private_storage_path(safe_relative_path)

    if absolute_path is None:
        raise ValueError("Invalid document storage path")

    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(content)

    return safe_relative_path


def prepare_durable_artifact_directory(parent: Path) -> Path:
    """Remember the existing ancestor whose new directory entry needs syncing."""
    ancestor = parent
    while not ancestor.exists():
        ancestor = ancestor.parent
    parent.mkdir(parents=True, exist_ok=True)
    return ancestor


def sync_artifact_directory_chain(parent: Path, ancestor: Path) -> None:
    """Persist directory entries bottom-up, including newly created parents.

    Fail closed on unsupported platforms/filesystems. This requests OS/storage
    durability; it cannot guarantee that the underlying device honors fsync.
    """
    if not hasattr(os, "O_DIRECTORY"):
        raise OSError(errno.ENOTSUP, "Artifact directory fsync is unsupported")
    directory = parent
    while True:
        fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
        if directory == ancestor:
            break
        directory = directory.parent


def write_private_storage_file_exclusive(
    storage_path: str | Path | PurePosixPath,
    content: bytes,
) -> str:
    safe_relative_path = normalize_relative_storage_path(
        storage_path
    )

    absolute_path = resolve_private_storage_path(
        safe_relative_path
    )

    if absolute_path is None:
        raise ValueError(
            "Invalid document storage path"
        )

    ancestor = prepare_durable_artifact_directory(absolute_path.parent)

    created = False
    try:
        with absolute_path.open("xb") as file_handle:
            created = True
            if file_handle.write(content) != len(content):
                raise OSError("Registry artifact write was incomplete")
            file_handle.flush()
            os.fsync(file_handle.fileno())
        sync_artifact_directory_chain(absolute_path.parent, ancestor)
    except (Exception, asyncio.CancelledError) as exc:
        # The handle is closed before cleanup, including failed buffered flushes.
        # Never remove an artifact that existed before the exclusive open.
        if created:
            try:
                absolute_path.unlink(missing_ok=True)
            except OSError as cleanup_error:
                if not isinstance(exc, asyncio.CancelledError):
                    raise
                exc.add_note(f"Partial artifact cleanup failed: {cleanup_error}")
        raise

    return safe_relative_path


def delete_private_storage_file(storage_path: str | Path | PurePosixPath | None) -> bool:
    if not storage_path:
        return False

    absolute_path = resolve_private_storage_path(storage_path)

    if absolute_path is None:
        return False

    if absolute_path.exists() and absolute_path.is_file():
        absolute_path.unlink()
        return True

    return False


def build_document_download_filename(
    document_number: str,
    storage_path: str | Path | PurePosixPath | None,
    *,
    fallback_suffix: str = ".bin",
) -> str:
    suffix = PurePosixPath(str(storage_path or "")).suffix.lower()

    if not suffix or (suffix == ".bin" and fallback_suffix != ".bin"):
        suffix = fallback_suffix

    safe_stem = "".join(
        ch if ch.isalnum() or ch in ("-", "_") else "_"
        for ch in document_number
    ).strip("_")

    if not safe_stem:
        safe_stem = "document"

    return f"{safe_stem}{suffix}"


def detect_document_download_metadata(
    *,
    resolved_path: Path,
    storage_path: str | Path | PurePosixPath | None,
    document_number: str,
) -> tuple[str, str]:
    media_type = guess_type(resolved_path.name)[0] or "application/octet-stream"
    fallback_suffix = ".bin"

    try:
        with resolved_path.open("rb") as file:
            header = file.read(8)

        if header.startswith(b"%PDF"):
            media_type = "application/pdf"
            fallback_suffix = ".pdf"
    except OSError:
        pass

    filename = build_document_download_filename(
        document_number,
        storage_path,
        fallback_suffix=fallback_suffix,
    )

    return media_type, filename

def write_new_private_storage_file(
    storage_path: str | Path | PurePosixPath,
    content: bytes,
) -> str:
    """Create a new durable file without overwriting existing data.

    Compatibility wrapper for completion-document PDF generation.
    The established exclusive writer owns partial-write cleanup.
    Database transaction compensation is handled separately.
    """
    return write_private_storage_file_exclusive(
        storage_path,
        content,
    )
