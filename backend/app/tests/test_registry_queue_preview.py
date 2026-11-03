import asyncio
import inspect

import pytest
from fastapi.routing import APIRoute

from app.api.v1.registry_applicability_preview import router
from app.services.registry_queue_preview import (
    read_legacy_registry_queue_preview,
    summarize_legacy_queue_rows,
)


BASELINE_ROWS = [
    (
        "frdo", "needs_approval",
        "frdo.auto.manual_review", "2026-09-04-v1",
        "occupational_safety_training", "not_required", "auto",
        "", "", False, 74,
    ),
    (
        "mintrud", "pending_data",
        "mintrud.auto.occupational_safety_training",
        "2026-09-04-v1",
        "occupational_safety_training", "not_required", "auto",
        "", "", False, 73,
    ),
    (
        "mintrud", "needs_approval",
        "mintrud.auto.occupational_safety_training",
        "2026-09-04-v1",
        "occupational_safety_training", "not_required", "auto",
        "", "", True, 1,
    ),
]


def test_frdo_legacy_preview_baseline():
    report = summarize_legacy_queue_rows(
        BASELINE_ROWS, registry="frdo"
    )
    assert report["total"] == 74
    assert report["scope_counts"]["review"] == 74
    assert report["scope_counts"]["work"] == 0
    assert report["reason_counts"]["rule_change_review"] == 74
    assert report["current_decision_counts"]["not_required"] == 74
    assert report["approval_allowed"] is False
    assert report["export_allowed"] is False


def test_mintrud_legacy_preview_baseline():
    report = summarize_legacy_queue_rows(
        BASELINE_ROWS, registry="mintrud"
    )
    assert report["total"] == 74
    assert report["scope_counts"]["review"] == 74
    assert report["reason_counts"]["candidate_required_for_review"] == 73
    assert report["reason_counts"]["preserve_lifecycle_and_evidence"] == 1
    assert report["protected_evidence_count"] == 1


def test_preview_is_aggregate_only():
    report = summarize_legacy_queue_rows(
        BASELINE_ROWS, registry="frdo"
    )
    assert "items" not in report
    assert "user_id" not in report
    assert "enrollment_id" not in report
    assert report["database_writes"] == 0
    assert report["preview_only"] is True


def test_preview_service_executes_only_read_query():
    class FakeResult:
        def all(self):
            return BASELINE_ROWS

    class ReadOnlySession:
        def __init__(self):
            self.calls = 0

        async def execute(self, statement):
            self.calls += 1
            sql = str(statement).lstrip()
            assert sql.startswith("WITH evidence AS")
            assert "SELECT" in sql
            return FakeResult()

    session = ReadOnlySession()
    report = asyncio.run(
        read_legacy_registry_queue_preview(
            session=session, registry="frdo"
        )
    )
    assert session.calls == 1
    assert report["total"] == 74


def test_preview_routes_are_read_only_and_permission_bound():
    routes = {
        item.path: item
        for item in router.routes
        if isinstance(item, APIRoute)
    }

    for registry in ("frdo", "mintrud"):
        route = routes[
            f"/admin/{registry}/queue-triage-preview"
        ]
        assert route.methods == {"GET"}

        permissions = [
            inspect.getclosurevars(dep.call).nonlocals[
                "permission_code"
            ]
            for dep in route.dependant.dependencies
            if inspect.isfunction(dep.call)
            and "permission_code" in
                inspect.getclosurevars(dep.call).nonlocals
        ]
        assert permissions == [f"{registry}.read"]


def test_invalid_registry_is_rejected():
    with pytest.raises(ValueError):
        summarize_legacy_queue_rows(BASELINE_ROWS, registry="invalid")