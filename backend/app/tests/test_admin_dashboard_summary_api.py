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


def get_list(path: str, token: str) -> list[dict]:
    status, payload = request_json("GET", path, token=token)

    assert status == 200
    assert isinstance(payload, list)

    return payload


def test_admin_dashboard_summary_matches_admin_lists() -> None:
    token = login()

    status, summary = request_json(
        "GET",
        "/api/v1/admin/dashboard-summary",
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)

    expected_keys = {
        "users_total",
        "users_inactive",
        "organizations_total",
        "groups_total",
        "groups_inactive",
        "courses_total",
        "courses_inactive",
        "enrollments_total",
        "enrollments_assigned",
        "enrollments_active",
        "enrollments_completed",
        "enrollments_action_required",
        "documents_total",
        "documents_available",
        "documents_draft",
        "documents_revoked",
        "documents_action_required",
        "roles_total",
        "permissions_total",
        "audit_events_total",
    }

    assert expected_keys == set(summary)

    for key in expected_keys:
        assert isinstance(summary[key], int)
        assert summary[key] >= 0

    users = get_list("/api/v1/admin/users", token)
    organizations = get_list("/api/v1/admin/organizations", token)
    groups = get_list("/api/v1/org/groups", token)
    courses = get_list("/api/v1/admin/courses?limit=300", token)
    enrollments = get_list("/api/v1/admin/enrollments?limit=300", token)
    action_required_enrollments = get_list(
        "/api/v1/admin/enrollments?limit=300&action_required=true",
        token,
    )
    documents = get_list("/api/v1/admin/documents?limit=300", token)
    action_required_documents = get_list(
        "/api/v1/admin/documents?limit=300&action_required=true",
        token,
    )
    roles = get_list("/api/v1/admin/roles", token)
    permissions = get_list("/api/v1/admin/permissions", token)

    assert summary["users_total"] == len(users)
    assert summary["users_inactive"] == len([item for item in users if item.get("is_active") is False])
    assert summary["organizations_total"] == len(organizations)
    assert summary["groups_total"] == len(groups)
    assert summary["groups_inactive"] == len([item for item in groups if item.get("is_active") is False])
    # These admin list endpoints are intentionally limited by `limit=300`.
    # The dashboard summary returns real DB totals, so exact equality is unsafe
    # on a long-lived local/test database with more than 300 rows.
    assert summary["courses_total"] >= len(courses)
    assert summary["courses_inactive"] >= len([item for item in courses if item.get("is_active") is False])
    assert summary["courses_inactive"] <= summary["courses_total"]

    assert summary["enrollments_total"] >= len(enrollments)
    assert summary["enrollments_assigned"] >= len([item for item in enrollments if item.get("status") == "assigned"])
    assert summary["enrollments_active"] >= len([item for item in enrollments if item.get("status") == "active"])
    assert summary["enrollments_completed"] >= len([item for item in enrollments if item.get("status") == "completed"])
    assert summary["enrollments_action_required"] >= len(action_required_enrollments)
    assert summary["enrollments_action_required"] == (
        summary["enrollments_assigned"] + summary["enrollments_completed"]
    )
    assert summary["enrollments_action_required"] <= summary["enrollments_total"]

    assert summary["documents_total"] >= len(documents)
    assert summary["documents_available"] >= len([item for item in documents if item.get("status") == "available"])
    assert summary["documents_draft"] >= len([item for item in documents if item.get("status") == "draft"])
    assert summary["documents_revoked"] >= len([item for item in documents if item.get("status") == "revoked"])
    assert summary["documents_action_required"] >= len(action_required_documents)
    assert summary["documents_action_required"] >= (
        summary["documents_draft"] + summary["documents_revoked"]
    )
    assert summary["documents_action_required"] <= summary["documents_total"]

    assert summary["roles_total"] == len(roles)
    assert summary["permissions_total"] == len(permissions)


def test_admin_dashboard_summary_requires_auth() -> None:
    status, payload = request_json("GET", "/api/v1/admin/dashboard-summary")

    assert status == 401
    assert isinstance(payload, dict)
