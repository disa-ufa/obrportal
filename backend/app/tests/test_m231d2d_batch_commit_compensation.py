"""M2.3.1D.2D: batch export compensation contracts for FRDO and Mintrud."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import app.api.v1.admin as admin


class FakeSession:
    def __init__(
        self,
        *,
        commit_ack_lost: bool = False,
        rollback_fails: bool = False,
    ):
        self.commit_ack_lost = commit_ack_lost
        self.rollback_fails = rollback_fails
        self.commits = 0
        self.rollbacks = 0
        self.committed = False
        self.fence_calls = 0

    async def execute(self, statement, params=None):
        sql = str(statement).strip()
        if sql != "SELECT pg_advisory_xact_lock(:fence_key)":
            raise AssertionError("Unexpected SQL in FakeSession")
        if not isinstance(params, dict) or not isinstance(params.get("fence_key"), int):
            raise AssertionError("Invalid advisory fence key")
        self.fence_calls += 1
        return None

    async def commit(self):
        self.commits += 1
        self.committed = True

        if self.commit_ack_lost:
            raise ConnectionError("simulated batch COMMIT ACK loss")

    async def rollback(self):
        self.rollbacks += 1

        if self.rollback_fails:
            raise RuntimeError("simulated rollback failure")


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "phase",
    [
        "success",
        "audit_failed",
        "commit_ack_lost",
        "domain_rejected",
        "rollback_failed",
        "cleanup_unconfirmed",
        "cleanup_raises",
        "rollback_cleanup_failed",
    ],
)
def test_batch_export_compensation_contract(monkeypatch, registry, phase):
    """Exercise real API exception branches with isolated IO/session doubles."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "production_exports_enabled", True)

    artifact_path = f"generated/registry/{registry}/batches/test-batch.bin"

    batch = SimpleNamespace(
        id=str(__import__("uuid").uuid4()),
        registry=registry,
        status="exported",
        artifact_kind="portal-upload-artifact",
        transport="file",
        schema_version="isolated-unit-test",
        obligation_count=1,
        record_count=1,
        artifact_path=artifact_path,
        artifact_sha256="a" * 64,
    )

    session = FakeSession(
        commit_ack_lost=(phase == "commit_ack_lost"),
        rollback_fails=phase in {
            "rollback_failed",
            "rollback_cleanup_failed",
        },
    )

    existing_files = {artifact_path}
    delete_calls = []
    service_calls = []
    audit_calls = []

    service_name = {
        "frdo": "create_frdo_registry_submission_batch",
        "mintrud": "create_mintrud_registry_submission_batch",
    }[registry]

    builder_name = {
        "frdo": "build_admin_frdo_submission_batch_item",
        "mintrud": "build_admin_mintrud_submission_batch_item",
    }[registry]

    endpoint_name = {
        "frdo": "prepare_admin_frdo_submission_batch",
        "mintrud": "prepare_admin_mintrud_submission_batch",
    }[registry]

    async def fake_service(
        service_session,
        *,
        obligation_ids,
        generated_by_user_id,
    ):
        assert service_session is session
        service_calls.append((list(obligation_ids), generated_by_user_id))
        return batch

    def fake_builder(value):
        assert value is batch
        return SimpleNamespace(id=batch.id, registry=batch.registry)

    precommit_failure = phase in {
        "audit_failed",
        "domain_rejected",
        "rollback_failed",
        "cleanup_unconfirmed",
        "cleanup_raises",
        "rollback_cleanup_failed",
    }

    async def fake_audit(audit_session, **kwargs):
        assert audit_session is session
        audit_calls.append(kwargs["action"])

        if phase == "domain_rejected":
            raise admin.RegistrySubmissionBatchError(
                "simulated invalid batch"
            )

        if precommit_failure:
            raise ValueError("simulated audit failure")

    def fake_delete(path):
        delete_calls.append(path)
        assert path == artifact_path

        if phase == "cleanup_raises":
            raise OSError("simulated delete exception")

        if phase in {
            "cleanup_unconfirmed",
            "rollback_cleanup_failed",
        }:
            return False

        existing_files.discard(path)
        return True

    # This unit test commits to memory, so its independent outcome probe must
    # observe that same fake durable state. Real SQL probes are tested separately.
    probe_calls = []
    async def fake_outcome(**kwargs):
        assert session.rollbacks == 1
        assert session.fence_calls == 1
        assert kwargs == dict(batch_id=batch.id, registry=registry,
                              artifact_path=artifact_path, artifact_sha256=batch.artifact_sha256)
        probe_calls.append(kwargs)
        return admin.BatchCommitOutcome.COMMITTED if session.committed else admin.BatchCommitOutcome.NOT_COMMITTED
    monkeypatch.setattr(admin, "check_registry_batch_commit_outcome", fake_outcome)

    monkeypatch.setattr(admin, service_name, fake_service)
    monkeypatch.setattr(admin, builder_name, fake_builder)
    monkeypatch.setattr(admin, "create_admin_audit_event", fake_audit)
    monkeypatch.setattr(
        admin,
        "delete_registry_submission_batch_artifact_safely",
        fake_delete,
    )

    async def invoke():
        endpoint = getattr(admin, endpoint_name)

        return await endpoint(
            payload=SimpleNamespace(
                obligation_ids=["test-obligation"],
            ),
            request=object(),
            current_user=SimpleNamespace(id="test-actor"),
            session=session,
        )

    error = None

    if phase == "success":
        result = asyncio.run(invoke())
        assert result.id == batch.id

    elif phase == "commit_ack_lost":
        with pytest.raises(
            ConnectionError,
            match="simulated batch COMMIT ACK loss",
        ) as captured:
            asyncio.run(invoke())
        error = captured.value

    elif phase == "domain_rejected":
        with pytest.raises(HTTPException) as captured:
            asyncio.run(invoke())
        error = captured.value
        assert error.status_code == 409
        assert error.detail == "simulated invalid batch"

    elif phase == "audit_failed":
        with pytest.raises(
            ValueError,
            match="simulated audit failure",
        ) as captured:
            asyncio.run(invoke())
        error = captured.value

    else:
        with pytest.raises(
            RuntimeError,
            match="Registry batch compensation incomplete",
        ) as captured:
            asyncio.run(invoke())

        error = captured.value

        assert isinstance(error.__cause__, ValueError)
        assert "simulated audit failure" in str(error.__cause__)

        if phase in {
            "rollback_failed",
            "rollback_cleanup_failed",
        }:
            assert "rollback failed" in str(error)

        if phase == "cleanup_unconfirmed":
            assert "cleanup could not be confirmed" in str(error)

        if phase in {
            "rollback_failed",
            "rollback_cleanup_failed",
        }:
            assert "cleanup" not in str(error)

        if phase == "cleanup_raises":
            assert "cleanup raised" in str(error)

    assert service_calls == [
        (["test-obligation"], "test-actor"),
    ]

    assert audit_calls == [
        f"admin.{registry}_submission_batch_prepared",
    ]

    assert session.commits == (
        1 if phase in {"success", "commit_ack_lost"} else 0
    )

    assert session.rollbacks == (
        0 if phase == "success" else 1
    )
    assert session.fence_calls == 1
    assert len(probe_calls) == (1 if phase == "commit_ack_lost" else 0)

    if phase in {"success", "commit_ack_lost"}:
        assert session.committed is True
        assert artifact_path in existing_files
        assert delete_calls == []

    elif phase in {
        "rollback_failed",
        "rollback_cleanup_failed",
    }:
        assert session.committed is False
        assert artifact_path in existing_files
        assert delete_calls == []

    elif phase in {
        "cleanup_unconfirmed",
        "cleanup_raises",
    }:
        assert session.committed is False
        assert artifact_path in existing_files
        assert delete_calls == [artifact_path]

    else:
        assert session.committed is False
        assert artifact_path not in existing_files
        assert delete_calls == [artifact_path]

@pytest.mark.parametrize("outcome,cleanup_ok", [
    (admin.BatchCommitOutcome.COMMITTED, True),
    (admin.BatchCommitOutcome.NOT_COMMITTED, True),
    (admin.BatchCommitOutcome.NOT_COMMITTED, False),
    (admin.BatchCommitOutcome.UNKNOWN, True),
])
def test_independent_outcome_controls_artifact_cleanup(tmp_path, monkeypatch, outcome, cleanup_ok):
    from hashlib import sha256
    from uuid import uuid4
    from app.core.config import settings
    monkeypatch.setattr(settings, "document_storage_dir", str(tmp_path))
    relative = "generated/registry/frdo/" + str(uuid4()) + ".xlsx"
    physical = tmp_path / relative
    physical.parent.mkdir(parents=True)
    content = b"synthetic artifact with verified bytes"
    physical.write_bytes(content)
    batch_id = str(uuid4()); session = FakeSession(); calls = []
    async def probe(**kwargs):
        assert session.rollbacks == 1
        assert kwargs == dict(batch_id=batch_id, registry="frdo", artifact_path=relative,
                              artifact_sha256=sha256(content).hexdigest())
        return outcome
    def cleanup(path):
        assert path == relative
        calls.append(path)
        if cleanup_ok: physical.unlink()
        return cleanup_ok
    monkeypatch.setattr(admin, "check_registry_batch_commit_outcome", probe)
    monkeypatch.setattr(admin, "delete_registry_submission_batch_artifact_safely", cleanup)
    original = ConnectionError("synthetic uncertain COMMIT")
    async def invoke():
        await admin._compensate_failed_registry_batch_export(
            session, artifact_path_to_cleanup=relative, commit_attempted=True,
            original_error=original, batch_id=batch_id, artifact_sha256=sha256(content).hexdigest(),
            registry="frdo", commit_fence_acquired=True)
    if outcome is admin.BatchCommitOutcome.NOT_COMMITTED and not cleanup_ok:
        with pytest.raises(RuntimeError, match="cleanup could not be confirmed") as caught:
            asyncio.run(invoke())
        assert caught.value.__cause__ is original
    else:
        asyncio.run(invoke())
    assert calls == ([relative] if outcome is admin.BatchCommitOutcome.NOT_COMMITTED else [])
    assert physical.exists() == (outcome is not admin.BatchCommitOutcome.NOT_COMMITTED or not cleanup_ok)
    if physical.exists(): assert physical.read_bytes() == content
