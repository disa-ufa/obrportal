"""The staged veto must not silently become a global applicability gate."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.core.config import Settings, settings
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
    create_registry_submission_attempt,
)


def _session(registry="frdo", decision=None, *, enabled=True, isolation="read committed"):
    obligation = SimpleNamespace(id="obligation", enrollment_id="enrollment", registry=registry)
    session = SimpleNamespace(
        execute=AsyncMock(side_effect=[
            Mock(scalar_one_or_none=Mock(return_value=obligation)),
            Mock(scalar_one=Mock(return_value=isolation)),
        ]),
        scalar=AsyncMock(side_effect=[decision, 0] if enabled else [0]),
        add=Mock(), flush=AsyncMock(), rollback=AsyncMock(), commit=AsyncMock(),
    )
    return session, obligation


async def _attempt(session):
    return await create_registry_submission_attempt(
        session, obligation_id="obligation", snapshot={"test": True},
        generated_by_user_id=None,
    )


def test_veto_is_disabled_unless_explicitly_configured(monkeypatch):
    monkeypatch.delenv("REGISTRY_ATTEMPT_APPLICABILITY_VETO_ENABLED", raising=False)
    assert Settings(_env_file=None).registry_attempt_applicability_veto_enabled is False
    monkeypatch.setenv("REGISTRY_ATTEMPT_APPLICABILITY_VETO_ENABLED", "true")
    assert Settings(_env_file=None).registry_attempt_applicability_veto_enabled is True


@pytest.mark.asyncio
async def test_disabled_veto_does_not_query_new_schema(monkeypatch):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", False)
    session, _ = _session(enabled=False)
    attempt = await _attempt(session)
    assert attempt.attempt_no == 1
    assert session.execute.await_count == 1  # Only the legacy obligation query.
    session.flush.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", ["not_required", "needs_review"])
async def test_export_http_translates_staged_veto_without_writes(monkeypatch, registry, decision):
    """Exercise routing/dependencies/error mapping; DB and approval are doubles.

    Actual row contention and persistence are tested in writer_pg. Enabling the
    existing partial veto here is test-local, never a production configuration.
    """
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient
    from app.api.v1 import admin, rbac
    from app.api.v1.auth import get_current_user
    from app.db.session import get_db

    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, obligation = _session(registry, decision)
    app = FastAPI()
    app.include_router(admin.router)

    async def db():
        yield session

    async def actor():
        return SimpleNamespace(id="actor")

    app.dependency_overrides[get_db] = db
    app.dependency_overrides[get_current_user] = actor
    monkeypatch.setattr(rbac, "get_user_permission_codes", AsyncMock(return_value={registry + ".export"}))
    monkeypatch.setattr(admin, "get_admin_" + registry + "_obligation_or_404", AsyncMock(return_value=obligation))
    monkeypatch.setattr(admin, "validate_registry_approval_current", AsyncMock())
    monkeypatch.setattr(admin, "build_registry_export_package", Mock(return_value={"test": True}))
    monkeypatch.setattr(admin, "serialize_registry_export_package", Mock(return_value=b"test"))
    attach, audit = AsyncMock(), AsyncMock()
    monkeypatch.setattr(admin, "attach_registry_submission_artifact", attach)
    monkeypatch.setattr(admin, "create_admin_audit_event", audit)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test.local") as client:
        response = await client.post("/admin/" + registry + "/obligations/obligation/export")
    assert response.status_code == 409
    assert response.json() == {"detail": "registry.applicability_" + decision}
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
async def test_registry_mutation_http_requires_its_own_permission(monkeypatch, registry):
    """Other-registry permission must not reach any mutation service."""
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient
    from app.api.v1 import admin, rbac
    from app.api.v1.auth import get_current_user
    from app.db.session import get_db

    app = FastAPI()
    app.include_router(admin.router)
    session = SimpleNamespace(execute=AsyncMock(), scalar=AsyncMock(), add=Mock(), commit=AsyncMock())

    async def db():
        yield session

    async def actor():
        return SimpleNamespace(id="actor")

    app.dependency_overrides[get_db] = db
    app.dependency_overrides[get_current_user] = actor
    other = "mintrud" if registry == "frdo" else "frdo"
    monkeypatch.setattr(rbac, "get_user_permission_codes", AsyncMock(return_value={other + ".approve", other + ".export"}))
    paths = [
        ("obligations/obligation/approve", "approve"),
        ("obligations/obligation/export", "export"),
        ("obligations/obligation/portal-artifact", "export"),
        ("obligations/obligation/attempts/attempt/submitted", "export"),
        ("obligations/obligation/attempts/attempt/result", "export"),
        ("batches", "export"),
        ("batches/batch/submitted", "export"),
        ("batches/batch/" + ("results" if registry == "frdo" else "result"), "export"),
    ]
    if registry == "mintrud":
        paths.append(("batches/batch/imported", "export"))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test.local") as client:
        for path, permission in paths:
            response = await client.post("/admin/" + registry + "/" + path, json={})
            assert response.status_code == 403, (path, response.text)
            assert response.json() == {"detail": "Permission required: " + registry + "." + permission}
    session.execute.assert_not_awaited()
    session.scalar.assert_not_awaited()
    session.add.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", ["not_required", "needs_review", "invalid"])
async def test_enabled_veto_rejects_before_attempt_or_artifact(monkeypatch, registry, decision):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, _ = _session(registry, decision)
    with pytest.raises(RegistrySubmissionAttemptError, match="registry.applicability_" + decision):
        await _attempt(session)
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("decision", [None, "required"])
async def test_missing_or_required_retains_legacy_behavior_not_an_export_grant(monkeypatch, decision):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, _ = _session(decision=decision)
    attempt = await _attempt(session)
    assert attempt.artifact_path is None
    assert attempt.submitted_at is None
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("isolation", ["repeatable read", "serializable"])
async def test_snapshot_isolation_cannot_hide_a_concurrent_first_decision(monkeypatch, isolation):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, _ = _session(isolation=isolation)
    with pytest.raises(RegistrySubmissionAttemptError, match="requires_read_committed"):
        await _attempt(session)
    session.scalar.assert_not_awaited()
    session.add.assert_not_called()


@pytest.mark.asyncio
async def test_database_failure_is_not_treated_as_missing_decision(monkeypatch):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, _ = _session()
    session.scalar.side_effect = RuntimeError("database read failed")
    with pytest.raises(RuntimeError, match="database read failed"):
        await _attempt(session)
    session.add.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("decision", ["not_required", "needs_review"])
async def test_export_api_translates_real_veto_to_409_and_rolls_back(monkeypatch, registry, decision):
    from app.api.v1 import admin

    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, obligation = _session(registry, decision)
    monkeypatch.setattr(admin, "validate_registry_approval_current", AsyncMock())
    monkeypatch.setattr(admin, "build_registry_export_package", Mock(return_value={"test": True}))
    monkeypatch.setattr(admin, "serialize_registry_export_package", Mock(return_value=b"test"))
    attach = AsyncMock()
    audit = AsyncMock()
    monkeypatch.setattr(admin, "attach_registry_submission_artifact", attach)
    monkeypatch.setattr(admin, "create_admin_audit_event", audit)
    with pytest.raises(HTTPException) as exc:
        await admin.prepare_admin_registry_export_attempt(
            session, obligation=obligation, current_user=SimpleNamespace(id="actor"),
            request=Mock(), audit_action="test.export",
        )
    assert exc.value.status_code == 409
    assert exc.value.detail == "registry.applicability_" + decision
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
