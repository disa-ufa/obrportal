from pathlib import Path

import pytest

from app.core.config import settings
from app.services.document_storage import (
    write_private_storage_file_exclusive,
)


@pytest.mark.parametrize("failure_phase", ["write", "flush"])
def test_m231d2c3_partial_private_storage_file_is_removed(
    tmp_path, monkeypatch, failure_phase,
):
    monkeypatch.setattr(
        settings, "document_storage_dir", str(tmp_path)
    )

    relative = "m231d2c3/partial.bin"
    target = tmp_path / "m231d2c3" / "partial.bin"
    original_open = Path.open

    class InterruptedHandle:
        def __init__(self, handle):
            self.handle = handle

        def __enter__(self):
            self.handle.__enter__()
            return self

        def __exit__(self, *args):
            return self.handle.__exit__(*args)

        def write(self, content):
            if failure_phase == "write":
                self.handle.write(content[:3])
                raise OSError("injected write failure")
            return self.handle.write(content)

        def flush(self):
            if failure_phase == "flush":
                raise OSError("injected flush failure")
            return self.handle.flush()

    def injected_open(path, mode="r", *args, **kwargs):
        handle = original_open(path, mode, *args, **kwargs)
        if path == target and mode == "xb":
            return InterruptedHandle(handle)
        return handle

    monkeypatch.setattr(Path, "open", injected_open)

    with pytest.raises(OSError, match="injected"):
        write_private_storage_file_exclusive(
            relative, b"partial-content-must-not-survive"
        )

    assert not target.exists()


def test_m231d2c3_private_storage_collision_preserves_original(
    tmp_path, monkeypatch,
):
    monkeypatch.setattr(
        settings, "document_storage_dir", str(tmp_path)
    )

    target = tmp_path / "m231d2c3" / "existing.bin"
    target.parent.mkdir(parents=True, exist_ok=True)
    sentinel = b"existing-file-must-survive"
    target.write_bytes(sentinel)

    with pytest.raises(FileExistsError):
        write_private_storage_file_exclusive(
            "m231d2c3/existing.bin",
            b"replacement-must-not-be-written",
        )

    assert target.read_bytes() == sentinel


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "failure_stage",
    ["before_commit", "committed_ack_lost"],
)
def test_m231d2c3_internal_commit_ack_loss_file_consistency(
    tmp_path, monkeypatch, registry, failure_stage,
):
    """A lost commit ACK must not remove a potentially persisted file."""
    import asyncio
    from types import SimpleNamespace

    from app.api.v1 import admin as registry_admin

    artifact = tmp_path / f"{registry}-attempt.bin"

    state = {
        "commits": 0,
        "rollbacks": 0,
        "persisted_path": None,
        "deleted_paths": [],
    }

    attempt = SimpleNamespace(
        id="attempt-test",
        attempt_no=1,
        artifact_path=None,
        artifact_sha256=None,
        artifact_kind="internal_export_package",
        transport="file",
        schema_version="test",
    )

    obligation = SimpleNamespace(
        id="obligation-test",
        registry=registry,
        approval_fingerprint="approval-test",
    )

    current_user = SimpleNamespace(id="user-test")

    class FakeSession:
        async def commit(self):
            state["commits"] += 1

            if failure_stage != "committed_ack_lost":
                raise AssertionError("commit reached unexpectedly")

            # Simulate PostgreSQL having committed the metadata,
            # while the application never receives the ACK.
            state["persisted_path"] = str(artifact)
            raise ConnectionError("simulated lost commit ACK")

        async def rollback(self):
            state["rollbacks"] += 1

            # Rollback cannot undo a transaction already committed.
            return None

    async def approval_ok(*args, **kwargs):
        return None

    async def create_attempt(*args, **kwargs):
        return attempt

    async def attach_artifact(*args, **kwargs):
        content = kwargs["content"]
        artifact.write_bytes(content)

        attempt.artifact_path = str(artifact)
        attempt.artifact_sha256 = "test-sha256"

        return attempt

    async def audit_event(*args, **kwargs):
        if failure_stage == "before_commit":
            raise RuntimeError("simulated failure before commit")

        return None

    def delete_artifact(path):
        state["deleted_paths"].append(path)
        Path(path).unlink(missing_ok=True)
        return True

    monkeypatch.setattr(
        registry_admin,
        "validate_registry_approval_current",
        approval_ok,
    )

    monkeypatch.setattr(
        registry_admin,
        "build_registry_export_package",
        lambda obligation: {"registry": registry},
    )

    monkeypatch.setattr(
        registry_admin,
        "serialize_registry_export_package",
        lambda package: b"test-export-content",
    )

    monkeypatch.setattr(
        registry_admin,
        "create_registry_submission_attempt",
        create_attempt,
    )

    monkeypatch.setattr(
        registry_admin,
        "attach_registry_submission_artifact",
        attach_artifact,
    )

    monkeypatch.setattr(
        registry_admin,
        "build_admin_registry_submission_attempt_item",
        lambda attempt: {"id": attempt.id},
    )

    monkeypatch.setattr(
        registry_admin,
        "create_admin_audit_event",
        audit_event,
    )

    monkeypatch.setattr(
        registry_admin,
        "delete_registry_artifact_safely",
        delete_artifact,
    )

    async def scenario():
        with pytest.raises(
            (RuntimeError, ConnectionError),
            match="simulated",
        ):
            await registry_admin.prepare_admin_registry_export_attempt(
                FakeSession(),
                obligation=obligation,
                current_user=current_user,
                request=SimpleNamespace(),
                audit_action="test.registry.export",
            )

    asyncio.run(scenario())

    assert state["rollbacks"] == 1

    if failure_stage == "before_commit":
        assert state["commits"] == 0
        assert state["persisted_path"] is None
        assert not artifact.exists()
        assert state["deleted_paths"] == [str(artifact)]

    else:
        assert state["commits"] == 1
        assert state["persisted_path"] == str(artifact)

        assert artifact.exists(), (
            "AMBIGUOUS_COMMIT_DELETED_PERSISTED_ARTIFACT: "
            f"registry={registry}"
        )


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "failure_stage",
    ["before_commit", "committed_ack_lost"],
)
def test_m231d2c3_real_pg_commit_ack_loss(
    tmp_path, monkeypatch, registry, failure_stage,
):
    """Observe real PostgreSQL durability using a separate session."""
    import asyncio
    import os
    import re
    from types import SimpleNamespace

    from sqlalchemy import text
    from sqlalchemy.engine import make_url
    from sqlalchemy.ext.asyncio import (
        async_sessionmaker,
        create_async_engine,
    )

    from app.api.v1 import admin as registry_admin

    test_db = os.environ.get("M231D2C3_TEST_DB", "")

    assert re.fullmatch(
        r"m231d2c3_ack_[0-9a-f]{12}", test_db
    ), "Disposable PostgreSQL database is required"

    url = os.environ["DATABASE_URL"]
    parsed_url = make_url(url)

    assert parsed_url.database == test_db
    assert parsed_url.host == "postgres"

    monkeypatch.setattr(
        settings, "document_storage_dir", str(tmp_path)
    )

    relative_path = (
        f"generated/registry/m231d2c3/"
        f"{registry}-{failure_stage}.bin"
    )
    actual_file = tmp_path.joinpath(
        *relative_path.split("/")
    )

    attempt = SimpleNamespace(
        id="real-pg-attempt",
        attempt_no=1,
        artifact_path=None,
        artifact_sha256=None,
        artifact_kind="internal_export_package",
        transport="file",
        schema_version="test",
    )

    obligation = SimpleNamespace(
        id="real-pg-obligation",
        registry=registry,
        approval_fingerprint="fingerprint",
    )

    calls = {
        "commits": 0,
        "rollbacks": 0,
    }

    async def approval_ok(*args, **kwargs):
        return None

    async def create_attempt(*args, **kwargs):
        return attempt

    async def attach_artifact(*args, **kwargs):
        saved_path = write_private_storage_file_exclusive(
            relative_path, kwargs["content"]
        )
        attempt.artifact_path = saved_path
        attempt.artifact_sha256 = "sha256-test"
        return attempt

    async def audit_event(session, *args, **kwargs):
        await session.execute(
            text(
                "INSERT INTO m231d2c3_ack_probe "
                "(registry, phase, artifact_path) "
                "VALUES (:registry, :phase, :path)"
            ),
            {
                "registry": registry,
                "phase": failure_stage,
                "path": relative_path,
            },
        )

        if failure_stage == "before_commit":
            raise RuntimeError(
                "simulated failure before commit"
            )

    monkeypatch.setattr(
        registry_admin,
        "validate_registry_approval_current",
        approval_ok,
    )
    monkeypatch.setattr(
        registry_admin,
        "build_registry_export_package",
        lambda obligation: {"registry": registry},
    )
    monkeypatch.setattr(
        registry_admin,
        "serialize_registry_export_package",
        lambda package: b"real-pg-test-artifact",
    )
    monkeypatch.setattr(
        registry_admin,
        "create_registry_submission_attempt",
        create_attempt,
    )
    monkeypatch.setattr(
        registry_admin,
        "attach_registry_submission_artifact",
        attach_artifact,
    )
    monkeypatch.setattr(
        registry_admin,
        "build_admin_registry_submission_attempt_item",
        lambda attempt: {"id": attempt.id},
    )
    monkeypatch.setattr(
        registry_admin,
        "create_admin_audit_event",
        audit_event,
    )

    async def scenario():
        engine = create_async_engine(url)

        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text(
                        "CREATE TABLE IF NOT EXISTS "
                        "m231d2c3_ack_probe ("
                        "registry TEXT NOT NULL, "
                        "phase TEXT NOT NULL, "
                        "artifact_path TEXT NOT NULL, "
                        "PRIMARY KEY (registry, phase))"
                    )
                )

            maker = async_sessionmaker(
                engine, expire_on_commit=False
            )

            async with maker() as real_session:

                class SessionProxy:
                    async def execute(self, *args, **kwargs):
                        return await real_session.execute(
                            *args, **kwargs
                        )

                    async def commit(self):
                        calls["commits"] += 1
                        await real_session.commit()

                        if failure_stage == "committed_ack_lost":
                            raise ConnectionError(
                                "simulated lost commit ACK"
                            )

                    async def rollback(self):
                        calls["rollbacks"] += 1
                        await real_session.rollback()

                with pytest.raises(
                    (RuntimeError, ConnectionError),
                    match="simulated",
                ):
                    await (
                        registry_admin
                        .prepare_admin_registry_export_attempt(
                            SessionProxy(),
                            obligation=obligation,
                            current_user=SimpleNamespace(
                                id="test-user"
                            ),
                            request=SimpleNamespace(),
                            audit_action="test.export",
                        )
                    )

            # An independent session sees only committed data.
            async with maker() as verification_session:
                persisted_path = await (
                    verification_session.scalar(
                        text(
                            "SELECT artifact_path "
                            "FROM m231d2c3_ack_probe "
                            "WHERE registry = :registry "
                            "AND phase = :phase"
                        ),
                        {
                            "registry": registry,
                            "phase": failure_stage,
                        },
                    )
                )

            assert calls["rollbacks"] == 1

            if failure_stage == "before_commit":
                assert calls["commits"] == 0
                assert persisted_path is None
                assert not actual_file.exists()

            else:
                assert calls["commits"] == 1
                assert persisted_path == relative_path

                assert actual_file.exists(), (
                    "REAL_PG_COMMITTED_ARTIFACT_DELETED: "
                    f"registry={registry}"
                )

        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "failure_mode",
    ["rollback_raises", "cleanup_unconfirmed"],
)
def test_m231d2c3_precommit_compensation_failure(
    tmp_path, monkeypatch, registry, failure_mode,
):
    """Pre-commit failures must not silently skip compensation."""
    import asyncio
    from types import SimpleNamespace

    from app.api.v1 import admin as registry_admin

    artifact = tmp_path / f"{registry}-precommit.bin"

    state = {
        "commits": 0,
        "rollbacks": 0,
        "delete_calls": [],
    }

    attempt = SimpleNamespace(
        id="compensation-test-attempt",
        attempt_no=1,
        artifact_path=None,
        artifact_sha256=None,
        artifact_kind="internal_export_package",
        transport="file",
        schema_version="test",
    )

    obligation = SimpleNamespace(
        id="compensation-test-obligation",
        registry=registry,
        approval_fingerprint="test-fingerprint",
    )

    class FakeSession:
        async def commit(self):
            state["commits"] += 1
            raise AssertionError(
                "Commit must not begin after an audit failure"
            )

        async def rollback(self):
            state["rollbacks"] += 1

            if failure_mode == "rollback_raises":
                raise OSError("forced rollback failure")

    async def approval_ok(*args, **kwargs):
        return None

    async def create_attempt(*args, **kwargs):
        return attempt

    async def attach_artifact(*args, **kwargs):
        artifact.write_bytes(kwargs["content"])
        attempt.artifact_path = str(artifact)
        attempt.artifact_sha256 = "test-sha256"
        return attempt

    async def fail_audit(*args, **kwargs):
        raise RuntimeError("forced precommit failure")

    def delete_artifact(path):
        state["delete_calls"].append(path)

        if failure_mode == "cleanup_unconfirmed":
            return False

        Path(path).unlink(missing_ok=True)
        return True

    monkeypatch.setattr(
        registry_admin,
        "validate_registry_approval_current",
        approval_ok,
    )
    monkeypatch.setattr(
        registry_admin,
        "build_registry_export_package",
        lambda obligation: {"registry": registry},
    )
    monkeypatch.setattr(
        registry_admin,
        "serialize_registry_export_package",
        lambda package: b"test-compensation-content",
    )
    monkeypatch.setattr(
        registry_admin,
        "create_registry_submission_attempt",
        create_attempt,
    )
    monkeypatch.setattr(
        registry_admin,
        "attach_registry_submission_artifact",
        attach_artifact,
    )
    monkeypatch.setattr(
        registry_admin,
        "build_admin_registry_submission_attempt_item",
        lambda attempt: {"id": attempt.id},
    )
    monkeypatch.setattr(
        registry_admin,
        "create_admin_audit_event",
        fail_audit,
    )
    monkeypatch.setattr(
        registry_admin,
        "delete_registry_artifact_safely",
        delete_artifact,
    )

    async def scenario():
        with pytest.raises(Exception) as captured:
            await registry_admin.prepare_admin_registry_export_attempt(
                FakeSession(),
                obligation=obligation,
                current_user=SimpleNamespace(id="test-user"),
                request=SimpleNamespace(),
                audit_action="test.registry.precommit_failure",
            )

        return captured.value

    error = asyncio.run(scenario())

    messages = []
    current = error

    for _ in range(5):
        if current is None:
            break
        messages.append(str(current))
        current = current.__cause__ or current.__context__

    error_details = " | ".join(messages)

    # Preserve evidence of the original failure.
    assert "forced precommit failure" in error_details

    assert state["commits"] == 0
    assert state["rollbacks"] == 1

    # Even when rollback fails, compensation must be attempted.
    assert state["delete_calls"] == [str(artifact)], (
        "ROLLBACK_FAILURE_SKIPPED_FILE_CLEANUP: "
        f"registry={registry}, mode={failure_mode}"
    )

    if failure_mode == "rollback_raises":
        assert "forced rollback failure" in error_details
        assert not artifact.exists()

    else:
        # The simulated failed deletion must be observable.
        assert artifact.exists()
        assert "cleanup could not be confirmed" in error_details, (
            "SILENT_ARTIFACT_CLEANUP_FAILURE: "
            f"registry={registry}"
        )


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "phase",
    [
        "success",
        "mark_rejected",
        "rollback_failed",
        "cleanup_unconfirmed",
        "audit_failed",
        "commit_ack_lost",
    ],
)
def test_m231d2c3_portal_route_compensation(
    tmp_path, monkeypatch, registry, phase,
):
    """Exercise both portal handlers and their compensation paths."""
    import asyncio
    from types import SimpleNamespace

    from fastapi import HTTPException

    from app.api.v1 import admin as registry_admin

    artifact = tmp_path / f"{registry}-{phase}.bin"

    state = {
        "commits": 0,
        "rollbacks": 0,
        "mark_calls": 0,
        "delete_calls": [],
        "committed": False,
    }

    obligation = SimpleNamespace(
        id="portal-obligation-test",
        registry=registry,
        approval_fingerprint="test-fingerprint",
        approval_snapshot_json={
            "course": {
                "regulatory_program_type": "test-program"
            }
        },
    )

    attempt = SimpleNamespace(
        id="portal-attempt-test",
        attempt_no=1,
        artifact_path=None,
        artifact_sha256=None,
        artifact_kind="portal_upload",
        transport="file",
        schema_version="test-version",
    )

    contract = SimpleNamespace(
        status="available",
        template_kind="test-template",
        source_reference="test-source",
        source_sha256="test-source-hash",
        template_contract_version="frdo-test-version",
        contract_version="mintrud-test-version",
        file_format="test-format",
        mime_type="application/octet-stream",
        extension=".xlsx" if registry == "frdo" else ".xml",
    )

    class FakeSession:
        async def commit(self):
            state["commits"] += 1
            state["committed"] = True

            if phase == "commit_ack_lost":
                raise ConnectionError("forced commit ACK loss")

        async def rollback(self):
            state["rollbacks"] += 1

            if phase == "rollback_failed":
                raise OSError("forced rollback failure")

    async def get_obligation(
        obligation_id, session, *, registry,
    ):
        assert obligation_id == obligation.id
        assert registry == obligation.registry
        return obligation

    async def approval_ok(*args, **kwargs):
        return None

    async def create_attempt(session, **kwargs):
        assert kwargs["artifact_kind"] == (
            registry_admin.REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD
        )
        assert kwargs["transport"] == "file"
        return attempt

    async def attach_artifact(
        session, *, attempt_id, content, extension,
    ):
        assert attempt_id == attempt.id
        assert extension == contract.extension
        assert isinstance(content, bytes)
        assert content

        artifact.write_bytes(content)

        attempt.artifact_path = str(artifact)
        attempt.artifact_sha256 = "test-artifact-sha256"

        return attempt

    async def mark_exported(session, *, attempt_id):
        assert attempt_id == attempt.id
        state["mark_calls"] += 1

        if phase in {
            "mark_rejected",
            "rollback_failed",
            "cleanup_unconfirmed",
        }:
            raise registry_admin.RegistrySubmissionAttemptError(
                "forced mark failure"
            )

        return attempt

    async def audit_event(*args, **kwargs):
        if phase == "audit_failed":
            raise RuntimeError("forced audit failure")

    def delete_artifact(path):
        state["delete_calls"].append(path)
        assert path == str(artifact)

        if phase == "cleanup_unconfirmed":
            return False

        artifact.unlink(missing_ok=True)
        return True

    monkeypatch.setattr(
        registry_admin,
        "get_admin_registry_export_obligation_or_404",
        get_obligation,
    )
    monkeypatch.setattr(
        registry_admin,
        "validate_registry_approval_current",
        approval_ok,
    )
    monkeypatch.setattr(
        registry_admin,
        "require_frdo_po_portal_contract",
        lambda **kwargs: contract,
    )
    monkeypatch.setattr(
        registry_admin,
        "require_registry_portal_artifact_contract",
        lambda registry: contract,
    )
    monkeypatch.setattr(
        registry_admin,
        "prepare_frdo_po_portal_artifact",
        lambda **kwargs: b"fake-xlsx-artifact",
    )
    monkeypatch.setattr(
        registry_admin,
        "serialize_mintrud_eisot_xml_v109",
        lambda snapshot: b"<test/>",
    )
    monkeypatch.setattr(
        registry_admin,
        "validate_mintrud_eisot_xml_v109",
        lambda content: None,
    )
    monkeypatch.setattr(
        registry_admin,
        "create_registry_submission_attempt",
        create_attempt,
    )
    monkeypatch.setattr(
        registry_admin,
        "attach_registry_submission_artifact",
        attach_artifact,
    )
    monkeypatch.setattr(
        registry_admin,
        "mark_registry_exported",
        mark_exported,
    )
    monkeypatch.setattr(
        registry_admin,
        "build_admin_registry_submission_attempt_item",
        lambda attempt: {"id": attempt.id},
    )
    monkeypatch.setattr(
        registry_admin,
        "create_admin_audit_event",
        audit_event,
    )
    monkeypatch.setattr(
        registry_admin,
        "delete_registry_artifact_safely",
        delete_artifact,
    )

    async def run_route():
        common = {
            "obligation_id": obligation.id,
            "request": SimpleNamespace(),
            "current_user": SimpleNamespace(
                id="portal-test-user"
            ),
            "session": FakeSession(),
        }

        if registry == "frdo":
            return await (
                registry_admin
                .prepare_admin_frdo_portal_artifact(**common)
            )

        return await (
            registry_admin
            .prepare_admin_mintrud_portal_artifact(**common)
        )

    # Every injected downstream failure is unreachable through a closed HTTP entry.
    with pytest.raises(HTTPException) as captured:
        asyncio.run(run_route())
    assert captured.value.status_code == 409
    assert captured.value.detail["code"] == "registry.single_export.disabled"
    assert state["mark_calls"] == 0
    assert state["commits"] == 0
    assert state["rollbacks"] == 0
    assert state["committed"] is False
    assert state["delete_calls"] == []
    assert not artifact.exists()
