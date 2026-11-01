from app.services.registry_applicability_preview import SCOPE_TO_DECISION


def test_scope_mapping_keeps_unresolved_out_of_work():
    assert SCOPE_TO_DECISION == {
        "work": "required",
        "review": "needs_review",
        "history": "not_required",
    }


def test_preview_routes_require_registry_specific_permissions(monkeypatch):
    import asyncio
    import inspect

    import pytest
    from fastapi import HTTPException
    from fastapi.routing import APIRoute

    from app.api.v1 import rbac
    from app.api.v1.registry_applicability_preview import router

    routes = {
        route.path: route
        for route in router.routes
        if isinstance(route, APIRoute)
    }
    for registry in ("frdo", "mintrud"):
        path = f"/admin/{registry}/applicability-preview"
        route = routes[path]
        assert route.methods == {"GET"}

        # require_permission returns a closure named "dependency" for both
        # registries; __name__ cannot identify which permission is enforced.
        authorization_dependencies = [
            dep.call
            for dep in route.dependant.dependencies
            if inspect.isfunction(dep.call)
            and "permission_code" in inspect.getclosurevars(dep.call).nonlocals
        ]
        assert len(authorization_dependencies) == 1
        dependency = authorization_dependencies[0]
        expected_permission = f"{registry}.read"
        assert (
            inspect.getclosurevars(dependency).nonlocals["permission_code"]
            == expected_permission
        )

        user = object()
        session = object()
        opposite_permission = (
            "mintrud.read" if registry == "frdo" else "frdo.read"
        )

        async def get_wrong_permissions(_user, _session):
            return {opposite_permission}

        monkeypatch.setattr(rbac, "get_user_permission_codes", get_wrong_permissions)
        with pytest.raises(HTTPException) as error:
            asyncio.run(dependency(current_user=user, session=session))
        assert error.value.status_code == 403
        assert error.value.detail == f"Permission required: {expected_permission}"

        async def get_correct_permissions(_user, _session):
            return {expected_permission}

        monkeypatch.setattr(rbac, "get_user_permission_codes", get_correct_permissions)
        assert asyncio.run(
            dependency(current_user=user, session=session)
        ) is user


def test_preview_does_not_touch_mutating_endpoints():
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "api/v1/admin.py"
    assert "applicability-preview" not in path.read_text(encoding="utf-8")
