"""Ownership snapshots for newly generated completion PDFs.

Recording does not prove transaction commit, and does not authorize deletion.
The caller must register only a file created exclusively by its operation.
"""

from __future__ import annotations

import hashlib
import os
import stat
from dataclasses import dataclass
from pathlib import PurePosixPath

from app.services import document_storage as _storage_service
from app.services.document_storage import (
    normalize_relative_storage_path,
    resolve_private_storage_path,
)

_SESSION_KEY = "_m21_completion_pdf_ownership"


@dataclass(frozen=True, slots=True)
class CompletionPDFReceipt:
    storage_path: str
    device: int
    inode: int
    size: int
    modified_ns: int
    sha256: str


def capture_completion_pdf_receipt(storage_path: str) -> CompletionPDFReceipt:
    relative = normalize_relative_storage_path(storage_path)
    parts = PurePosixPath(relative).parts

    if (
        len(parts) < 4
        or parts[:2] != ("generated", "completion")
        or not relative.lower().endswith(".pdf")
    ):
        raise ValueError("Not a generated completion PDF path")

    absolute = resolve_private_storage_path(relative)
    if absolute is None:
        raise ValueError("Unsafe completion PDF path")

    before = absolute.lstat()

    if not stat.S_ISREG(before.st_mode):
        raise ValueError("Completion PDF must be a regular file")

    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    flags |= getattr(os, "O_BINARY", 0)

    fd = os.open(absolute, flags)

    with os.fdopen(fd, "rb") as stream:
        opened = os.fstat(stream.fileno())

        if (
            opened.st_dev != before.st_dev
            or opened.st_ino != before.st_ino
        ):
            raise RuntimeError("Completion PDF identity changed")

        digest = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)

        finished = os.fstat(stream.fileno())

    after = absolute.lstat()

    def identity(value):
        return (
            value.st_dev,
            value.st_ino,
            value.st_size,
            value.st_mtime_ns,
        )

    if identity(before) != identity(finished) or identity(before) != identity(after):
        raise RuntimeError("Completion PDF changed during snapshot")

    return CompletionPDFReceipt(
        storage_path=relative,
        device=after.st_dev,
        inode=after.st_ino,
        size=after.st_size,
        modified_ns=after.st_mtime_ns,
        sha256=digest.hexdigest(),
    )


def register_created_completion_pdf(session, storage_path: str) -> CompletionPDFReceipt:
    """Record a just-created file; only the exclusive writer establishes ownership."""
    receipt = capture_completion_pdf_receipt(storage_path)
    pending = session.info.setdefault(_SESSION_KEY, [])

    if not isinstance(pending, list):
        raise RuntimeError("Invalid completion PDF journal")

    if any(item.storage_path == receipt.storage_path for item in pending):
        raise RuntimeError("Completion PDF is already registered")

    pending.append(receipt)
    return receipt


def pending_completion_pdfs(session) -> tuple[CompletionPDFReceipt, ...]:
    pending = session.info.get(_SESSION_KEY, [])
    if not isinstance(pending, list):
        raise RuntimeError("Invalid completion PDF journal")
    return tuple(pending)


def inspect_recorded_completion_pdf(receipt: CompletionPDFReceipt) -> str:
    """Return unchanged, changed, missing, or unsafe; never delete a file."""
    try:
        current = capture_completion_pdf_receipt(receipt.storage_path)
    except FileNotFoundError:
        return "missing"
    except ValueError:
        return "unsafe"
    except RuntimeError:
        return "changed"

    return "unchanged" if current == receipt else "changed"


def clear_completion_pdf_receipts_after_success(session) -> None:
    """Call only after an unequivocally successful database COMMIT."""
    session.info.pop(_SESSION_KEY, None)

def cleanup_failed_completion_pdf_registration(
    session,
    receipt: CompletionPDFReceipt,
) -> None:
    """Compensate a pre-commit registration failure conservatively.

    Only a file captured immediately after this operation's exclusive
    creation is eligible. A changed file or possibly successful journal
    registration must be preserved. This assumes private storage is
    not writable by an adversarial process racing with pathname unlink.
    """
    pending = pending_completion_pdfs(session)

    if any(item.storage_path == receipt.storage_path for item in pending):
        raise RuntimeError(
            "Completion PDF may already be registered; preserving file"
        )

    if inspect_recorded_completion_pdf(receipt) != "unchanged":
        raise RuntimeError(
            "Completion PDF identity changed; preserving file"
        )

    absolute = resolve_private_storage_path(receipt.storage_path)

    if absolute is None:
        raise RuntimeError("Completion PDF path is unsafe")

    current = absolute.lstat()

    if (
        current.st_dev != receipt.device
        or current.st_ino != receipt.inode
        or current.st_size != receipt.size
        or current.st_mtime_ns != receipt.modified_ns
    ):
        raise RuntimeError(
            "Completion PDF changed before cleanup; preserving file"
        )

    absolute.unlink()

    if absolute.exists() or absolute.is_symlink():
        raise RuntimeError("Completion PDF removal is not confirmed")

    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    directory_flags |= getattr(os, "O_NOFOLLOW", 0)

    directory_fd = os.open(absolute.parent, directory_flags)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)


def delete_registered_completion_pdf(
    session,
    receipt: CompletionPDFReceipt,
) -> None:
    """Delete an owned, unchanged PDF after separately confirmed rollback.

    This function does NOT confirm database rollback or COMMIT outcome.
    Caller must do that first. The private storage hierarchy must exclude
    untrusted concurrent filesystem mutation.
    The journal is NOT cleared here: multi-file compensation owns clearing.
    """
    if not isinstance(receipt, CompletionPDFReceipt):
        raise RuntimeError("Invalid completion PDF receipt")

    pending = pending_completion_pdfs(session)

    if (
        sum(item == receipt for item in pending) != 1
        or sum(item.storage_path == receipt.storage_path for item in pending) != 1
    ):
        raise RuntimeError("Receipt is not uniquely registered; preserving PDF")

    relative = normalize_relative_storage_path(receipt.storage_path)
    parts = PurePosixPath(relative).parts

    if (
        len(parts) < 4
        or parts[:2] != ("generated", "completion")
        or not relative.lower().endswith(".pdf")
    ):
        raise RuntimeError("Not a generated completion PDF")

    directory_no_follow = getattr(os, "O_NOFOLLOW", 0)
    directory_flag = getattr(os, "O_DIRECTORY", 0)

    if not directory_no_follow or not directory_flag:
        raise RuntimeError("Safe directory traversal is unavailable")

    directory_flags = (
        os.O_RDONLY
        | directory_flag
        | directory_no_follow
        | getattr(os, "O_CLOEXEC", 0)
    )

    read_flags = (
        os.O_RDONLY
        | directory_no_follow
        | getattr(os, "O_NONBLOCK", 0)
        | getattr(os, "O_CLOEXEC", 0)
    )

    root = _storage_service.get_private_storage_root()
    parent_fd = os.open(root, directory_flags)

    try:
        for component in parts[:-1]:
            child_fd = os.open(
                component,
                directory_flags,
                dir_fd=parent_fd,
            )
            os.close(parent_fd)
            parent_fd = child_fd

        filename = parts[-1]

        def verify_identity(value):
            if (
                not stat.S_ISREG(value.st_mode)
                or value.st_dev != receipt.device
                or value.st_ino != receipt.inode
                or value.st_size != receipt.size
                or value.st_mtime_ns != receipt.modified_ns
                or value.st_nlink != 1
            ):
                raise RuntimeError(
                    "Completion PDF identity changed; preserving file"
                )

        first = os.stat(
            filename,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        verify_identity(first)

        file_fd = os.open(
            filename,
            read_flags,
            dir_fd=parent_fd,
        )

        with os.fdopen(file_fd, "rb") as handle:
            opened = os.fstat(handle.fileno())
            verify_identity(opened)

            digest = hashlib.sha256()
            for chunk in iter(
                lambda: handle.read(1024 * 1024),
                b"",
            ):
                digest.update(chunk)

            finished = os.fstat(handle.fileno())
            verify_identity(finished)

        if digest.hexdigest() != receipt.sha256:
            raise RuntimeError(
                "Completion PDF content changed; preserving file"
            )

        last = os.stat(
            filename,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        verify_identity(last)

        os.unlink(filename, dir_fd=parent_fd)

        try:
            os.stat(
                filename,
                dir_fd=parent_fd,
                follow_symlinks=False,
            )
        except FileNotFoundError:
            pass
        else:
            raise RuntimeError(
                "Completion PDF removal is not confirmed"
            )

        os.fsync(parent_fd)

    finally:
        os.close(parent_fd)
