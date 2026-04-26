from __future__ import annotations

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
) -> str:
    suffix = PurePosixPath(str(storage_path or "")).suffix or ".bin"

    safe_stem = "".join(
        ch if ch.isalnum() or ch in ("-", "_") else "_"
        for ch in document_number
    ).strip("_")

    if not safe_stem:
        safe_stem = "document"

    return f"{safe_stem}{suffix}"