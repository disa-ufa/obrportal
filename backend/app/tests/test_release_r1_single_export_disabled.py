"""Release boundary: authentic routing/RBAC, fail-on-use business dependencies."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.v1 import admin, rbac
from app.api.v1.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("operation", ["export", "portal-artifact"])
@pytest.mark.parametrize("access", ["allowed", "wrong_registry", "anonymous"])
@pytest.mark.parametrize("veto", [False, True])
async def test_single_export_boundary(monkeypatch, tmp_path, registry, operation, access, veto):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", veto)
    monkeypatch.setattr(settings, "document_storage_dir", str(tmp_path))
    session = SimpleNamespace(**{
        name: AsyncMock(side_effect=AssertionError("Unexpected DB/business use: " + name))
        for name in ("execute", "scalar", "flush", "commit", "rollback")
    }, add=Mock(side_effect=AssertionError("Unexpected insert")))
    blocked = []
    for name in ("get_admin_registry_export_obligation_or_404",
                 "validate_registry_approval_current", "create_registry_submission_attempt",
                 "attach_registry_submission_artifact", "mark_registry_exported",
                 "create_admin_audit_event", "prepare_admin_registry_export_attempt"):
        trap = AsyncMock(side_effect=AssertionError("Unexpected call: " + name))
        monkeypatch.setattr(admin, name, trap)
        blocked.append(trap)
    app = FastAPI()
    app.include_router(admin.router)

    async def db():
        yield session

    async def actor():
        return SimpleNamespace(id="synthetic-actor")

    app.dependency_overrides[get_db] = db
    if access != "anonymous":
        app.dependency_overrides[get_current_user] = actor
    permission = registry if access == "allowed" else ("mintrud" if registry == "frdo" else "frdo")
    permissions = AsyncMock(return_value={permission + ".export"})
    monkeypatch.setattr(rbac, "get_user_permission_codes", permissions)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test.local") as client:
        response = await client.post(f"/admin/{registry}/obligations/synthetic/{operation}")
    if access == "allowed":
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "registry.single_export.disabled"
        assert "пакетную" in response.json()["detail"]["message"]
        permissions.assert_awaited_once()
    elif access == "wrong_registry":
        assert response.status_code == 403
        assert response.json() == {"detail": f"Permission required: {registry}.export"}
    else:
        assert response.status_code == 401
        permissions.assert_not_awaited()
    for trap in blocked:
        trap.assert_not_called()
    for trap in vars(session).values():
        trap.assert_not_called()
    assert list(tmp_path.iterdir()) == []


def test_only_four_registered_http_handlers_use_release_guard():
    import ast
    import inspect
    from fastapi.routing import APIRoute
    guarded = []
    for route in admin.router.routes:
        if not isinstance(route, APIRoute):
            continue
        node = ast.parse(inspect.getsource(route.endpoint)).body[0]
        calls = [n for n in ast.walk(node) if isinstance(n, ast.Call)
                 and isinstance(n.func, ast.Name)
                 and n.func.id == "_reject_legacy_single_registry_export"]
        if calls:
            assert isinstance(node.body[0], ast.Expr)
            assert node.body[0].value.func.id == "_reject_legacy_single_registry_export"
            guarded.append((route.path, route.methods))
    assert sorted(path for path, methods in guarded) == sorted(
        f"/admin/{registry}/obligations/{{obligation_id}}/{operation}"
        for registry in ("frdo", "mintrud") for operation in ("export", "portal-artifact")
    )
    assert all(methods == {"POST"} for _, methods in guarded)
