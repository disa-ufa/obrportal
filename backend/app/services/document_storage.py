from __future__ import annotations

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

    absolute_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with absolute_path.open(
        "xb"
    ) as file_handle:
        file_handle.write(
            content
        )

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
