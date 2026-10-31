"""R1/A2.1: durable artifact writes and batch compensation regression."""

import asyncio
import errno
import os
from unittest import mock

import pytest

import app.services.compliance_registry_batches as batches
import app.services.document_storage as storage


def test_durable_file_and_directory_sync(tmp_path):
    target = tmp_path / "new" / "artifact.xml"

    with mock.patch.object(
        storage, "resolve_private_storage_path",
        return_value=target,
    ):
        with mock.patch.object(
            storage.os, "fsync", wraps=os.fsync,
        ) as sync:
            result = storage.write_private_storage_file_exclusive(
                "new/artifact.xml", b"<test/>"
            )

    assert target.read_bytes() == b"<test/>"
    assert result is not None
    assert sync.call_count >= 3


def test_file_fsync_failure_removes_new_file(tmp_path):
    target = tmp_path / "new" / "artifact.xml"

    with mock.patch.object(
        storage, "resolve_private_storage_path",
        return_value=target,
    ):
        with mock.patch.object(
            storage.os, "fsync",
            side_effect=OSError(errno.EIO, "simulated fsync failure"),
        ):
            with pytest.raises(OSError):
                storage.write_private_storage_file_exclusive(
                    "new/artifact.xml", b"<test/>"
                )

    assert not target.exists()


def test_directory_fsync_failure_removes_new_file(tmp_path):
    target = tmp_path / "new" / "artifact.xml"
    real_fsync = os.fsync
    calls = [0]

    def controlled_fsync(fd):
        calls[0] += 1

        if calls[0] == 2:
            raise OSError(errno.EIO, "simulated directory fsync failure")

        return real_fsync(fd)

    with mock.patch.object(
        storage, "resolve_private_storage_path",
        return_value=target,
    ):
        with mock.patch.object(
            storage.os, "fsync",
            side_effect=controlled_fsync,
        ):
            with pytest.raises(OSError):
                storage.write_private_storage_file_exclusive(
                    "new/artifact.xml", b"<test/>"
                )

    assert calls[0] >= 2
    assert not target.exists()


def test_exclusive_write_preserves_existing_file(tmp_path):
    target = tmp_path / "existing.xml"
    target.write_bytes(b"ORIGINAL")

    with mock.patch.object(
        storage, "resolve_private_storage_path",
        return_value=target,
    ):
        with pytest.raises(FileExistsError):
            storage.write_private_storage_file_exclusive(
                "existing.xml", b"REPLACEMENT"
            )

    assert target.read_bytes() == b"ORIGINAL"


class FakeSession:
    def __init__(self, mode):
        self.mode = mode
        self.rollbacks = 0

    async def rollback(self):
        self.rollbacks += 1

        if self.mode == "fail":
            raise RuntimeError("simulated rollback failure")

        if self.mode == "slow":
            await asyncio.sleep(60)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode,commit_attempted,cancelled,expect_delete",
    [
        pytest.param("ok", False, False, True, id="rollback-success"),
        pytest.param("fail", False, False, False, id="rollback-failure"),
        pytest.param("ok", True, False, False, id="commit-attempted"),
        pytest.param("ok", False, True, True, id="cancel-before-commit"),
        pytest.param("ok", True, True, False, id="cancel-after-commit"),
        pytest.param("slow", False, False, False, id="rollback-timeout"),
    ],
)
async def test_registry_batch_compensation(
    monkeypatch,
    mode,
    commit_attempted,
    cancelled,
    expect_delete,
):
    session = FakeSession(mode)
    deleted = []

    def delete_artifact(path):
        deleted.append(path)
        return True

    original_error = (
        asyncio.CancelledError("simulated request cancellation")
        if cancelled
        else ValueError("simulated original failure")
    )

    if mode == "slow":
        monkeypatch.setattr(
            batches, "_BATCH_ROLLBACK_TIMEOUT", 0.1
        )

    async def invoke():
        await batches.compensate_registry_batch_export(
            session,
            artifact_path_to_cleanup="test.xml",
            commit_attempted=commit_attempted,
            original_error=original_error,
            delete_artifact=delete_artifact,
        )

    if cancelled:
        with pytest.raises(asyncio.CancelledError) as captured:
            await invoke()

        assert captured.value is original_error

    elif mode == "fail":
        with pytest.raises(RuntimeError, match="rollback failed"):
            await invoke()

    elif mode == "slow":
        with pytest.raises(RuntimeError, match="timed out"):
            await invoke()

    else:
        await invoke()

    assert session.rollbacks == 1
    assert deleted == (["test.xml"] if expect_delete else [])
