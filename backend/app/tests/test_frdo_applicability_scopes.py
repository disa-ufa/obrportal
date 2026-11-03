import asyncio

import pytest
from fastapi.routing import APIRoute

from app.api.v1.admin import list_admin_frdo_obligations
from app.main import app


class EmptyResult:
    def mappings(self):
        return self

    def all(self):
        return []


class CaptureSession:
    def __init__(self):
        self.sql = None

    async def execute(self, statement):
        self.sql = str(
            statement.compile(
                compile_kwargs={"literal_binds": True}
            )
        )
        return EmptyResult()


def run_scope(scope):
    session = CaptureSession()

    result = asyncio.run(
        list_admin_frdo_obligations(
            user_id=None,
            course_id=None,
            status_filter=None,
            applicability_scope=scope,
            q=None,
            limit=100,
            _=object(),
            session=session,
        )
    )

    assert result == []
    assert session.sql is not None
    return session.sql.lower()


@pytest.mark.parametrize(
    "scope,expected",
    [
        ("work", "required"),
        ("history", "not_required"),
        ("review", "needs_review"),
    ],
)
def test_scopes_filter_using_persisted_decision(scope, expected):
    sql = run_scope(scope)

    assert "registry_applicability" in sql
    assert "registry_obligations.enrollment_id" in sql
    assert expected in sql

    if scope == "review":
        assert "is null" in sql


def test_default_list_remains_backward_compatible():
    legacy_sql = run_scope(None)
    history_sql = run_scope("history")

    assert "registry_applicability" not in legacy_sql
    assert "registry_applicability" in history_sql


def test_scope_query_validation_is_registered():
    routes = [
        route
        for route in app.routes
        if isinstance(route, APIRoute)
        and route.path == "/api/v1/admin/frdo/obligations"
        and route.methods == {"GET"}
    ]

    assert len(routes) == 1

    parameters = {
        item.name: item
        for item in routes[0].dependant.query_params
    }

    assert "applicability_scope" in parameters
    parameter = parameters["applicability_scope"]
    assert parameter.required is False


def test_mintrud_scope_not_implicitly_changed():
    routes = [
        route
        for route in app.routes
        if isinstance(route, APIRoute)
        and route.path == "/api/v1/admin/mintrud/obligations"
    ]

    assert len(routes) == 1

    parameters = {
        item.name
        for item in routes[0].dependant.query_params
    }

    assert "applicability_scope" not in parameters