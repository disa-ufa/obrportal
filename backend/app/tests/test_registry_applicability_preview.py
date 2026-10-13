from app.services.registry_applicability_preview import SCOPE_TO_DECISION


def test_scope_mapping_keeps_unresolved_out_of_work():
    assert SCOPE_TO_DECISION == {
        "work": "required",
        "review": "needs_review",
        "history": "not_required",
    }


def test_preview_routes_require_registry_specific_permissions():
    from app.api.v1.registry_applicability_preview import router
    from fastapi.routing import APIRoute

    routes = {
        route.path: route
        for route in router.routes
        if isinstance(route, APIRoute)
    }
    for registry in ("frdo", "mintrud"):
        path = f"/admin/{registry}/applicability-preview"
        route = routes[path]
        assert route.methods == {"GET"}
        dependencies = [
            getattr(dep.call, "__name__", "")
            for dep in route.dependant.dependencies
        ]
        assert any("permission" in name or "require_" in name for name in dependencies)


def test_preview_does_not_touch_mutating_endpoints():
    from pathlib import Path

    path = Path(__file__).resolve().parents[1] / "api/v1/admin.py"
    assert "applicability-preview" not in path.read_text(encoding="utf-8")
