from __future__ import annotations

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Admin123Local2026!")


def request_json(
    method: str,
    path: str,
    body: dict | None = None,
    *,
    token: str | None = None,
) -> tuple[int, object | None]:
    data = None
    headers = {"Accept": "application/json"}

    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def login() -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    assert status == 200
    assert isinstance(payload, dict)

    return str(payload["access_token"])


def test_admin_worklist_summary_matches_dashboard_summary() -> None:
    token = login()

    status, summary = request_json(
        "GET",
        "/api/v1/admin/worklist-summary",
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)
    assert set(summary) == {"documents", "enrollments"}

    documents = summary["documents"]
    enrollments = summary["enrollments"]

    assert isinstance(documents, dict)
    assert isinstance(enrollments, dict)

    assert set(documents) == {
        "total",
        "available",
        "draft",
        "revoked",
        "action_required",
    }
    assert set(enrollments) == {
        "total",
        "assigned",
        "active",
        "completed",
        "cancelled",
        "action_required",
    }

    for section in (documents, enrollments):
        for value in section.values():
            assert isinstance(value, int)
            assert value >= 0

    assert documents["action_required"] >= documents["draft"] + documents["revoked"]
    assert documents["action_required"] <= documents["total"]
    assert enrollments["action_required"] == enrollments["assigned"] + enrollments["completed"]
    assert enrollments["action_required"] <= enrollments["total"]

    status, dashboard_summary = request_json(
        "GET",
        "/api/v1/admin/dashboard-summary",
        token=token,
    )

    assert status == 200
    assert isinstance(dashboard_summary, dict)

    assert documents["total"] == dashboard_summary["documents_total"]
    assert documents["available"] == dashboard_summary["documents_available"]
    assert documents["draft"] == dashboard_summary["documents_draft"]
    assert documents["revoked"] == dashboard_summary["documents_revoked"]
    assert documents["action_required"] == dashboard_summary["documents_action_required"]

    assert enrollments["total"] == dashboard_summary["enrollments_total"]
    assert enrollments["assigned"] == dashboard_summary["enrollments_assigned"]
    assert enrollments["active"] == dashboard_summary["enrollments_active"]
    assert enrollments["completed"] == dashboard_summary["enrollments_completed"]
    assert enrollments["action_required"] == dashboard_summary["enrollments_action_required"]


def test_admin_worklist_summary_requires_auth() -> None:
    status, payload = request_json("GET", "/api/v1/admin/worklist-summary")

    assert status == 401
    assert isinstance(payload, dict)



def test_admin_worklist_summary_supports_filter_params() -> None:
    token = login()
    missing_id = "00000000-0000-0000-0000-000000000000"

    status, summary = request_json(
        "GET",
        (
            "/api/v1/admin/worklist-summary"
            f"?documents_enrollment_id={missing_id}"
            f"&enrollments_user_id={missing_id}"
        ),
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)

    documents = summary["documents"]
    enrollments = summary["enrollments"]

    assert documents["total"] == 0
    assert documents["available"] == 0
    assert documents["draft"] == 0
    assert documents["revoked"] == 0
    assert documents["action_required"] == 0

    assert enrollments["total"] == 0
    assert enrollments["assigned"] == 0
    assert enrollments["active"] == 0
    assert enrollments["completed"] == 0
    assert enrollments["cancelled"] == 0
    assert enrollments["action_required"] == 0


def test_admin_worklist_summary_query_filters_match_list_endpoints() -> None:
    token = login()

    status, documents = request_json(
        "GET",
        "/api/v1/admin/documents?q=__missing_worklist_query__&limit=300",
        token=token,
    )

    assert status == 200
    assert documents == []

    status, summary = request_json(
        "GET",
        "/api/v1/admin/worklist-summary?documents_q=__missing_worklist_query__",
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)
    assert summary["documents"]["total"] == 0
    assert summary["documents"]["action_required"] == 0

    status, enrollments = request_json(
        "GET",
        "/api/v1/admin/enrollments?q=__missing_worklist_query__&limit=300",
        token=token,
    )

    assert status == 200
    assert enrollments == []

    status, summary = request_json(
        "GET",
        "/api/v1/admin/worklist-summary?enrollments_q=__missing_worklist_query__",
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)
    assert summary["enrollments"]["total"] == 0
    assert summary["enrollments"]["action_required"] == 0
