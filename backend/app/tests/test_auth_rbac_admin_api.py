from __future__ import annotations

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Admin123Local2026!")

LEARNER_EMAIL = os.getenv("TEST_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("TEST_LEARNER_PASSWORD", "Learner123Local2026!")


def request_json(
    method: str,
    path: str,
    body: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict | list | None]:
    data = None
    headers = {
        "Accept": "application/json",
    }

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def login(email: str, password: str) -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {
            "email": email,
            "password": password,
        },
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload.get("token_type") == "bearer"
    assert payload.get("access_token")

    return payload["access_token"]


def test_health_and_ready_are_ok() -> None:
    status, health = request_json("GET", "/health")

    assert status == 200
    assert isinstance(health, dict)
    assert health["status"] == "ok"
    assert health["app"] == "ObrPortal"

    status, ready = request_json("GET", "/api/v1/ready")

    assert status == 200
    assert isinstance(ready, dict)
    assert ready["status"] == "ok"
    assert ready["database"] == "ok"
    assert ready["redis"] == "ok"
    assert ready["storage"] == "ok"


def test_admin_can_login_and_read_current_user() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json("GET", "/api/v1/auth/me", token=token)

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["email"] == ADMIN_EMAIL
    assert payload["is_active"] is True
    assert any(role["code"] == "admin" for role in payload["roles"])


def test_admin_can_access_admin_api() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, users = request_json("GET", "/api/v1/admin/users", token=token)
    assert status == 200
    assert isinstance(users, list)
    assert len(users) >= 2

    user_emails = {item["email"] for item in users}
    assert ADMIN_EMAIL in user_emails
    assert LEARNER_EMAIL in user_emails

    status, roles = request_json("GET", "/api/v1/admin/roles", token=token)
    assert status == 200
    assert isinstance(roles, list)
    assert len(roles) >= 9

    role_codes = {item["code"] for item in roles}
    assert "admin" in role_codes
    assert "learner_fl" in role_codes
    assert "frdo_operator" in role_codes

    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=token)
    assert status == 200
    assert isinstance(permissions, list)
    assert len(permissions) >= 43

    permission_codes = {item["code"] for item in permissions}
    assert "admin.users.read" in permission_codes
    assert "admin.roles.read" in permission_codes
    assert "frdo.export" in permission_codes

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert len(audit_events) >= 1

    audit_actions = {item["action"] for item in audit_events}
    assert "login_success" in audit_actions


def test_admin_api_requires_authentication() -> None:
    protected_paths = [
        "/api/v1/admin/rbac-check",
        "/api/v1/admin/users",
        "/api/v1/admin/roles",
        "/api/v1/admin/permissions",
        "/api/v1/admin/audit-events",
    ]

    for path in protected_paths:
        status, _ = request_json("GET", path)

        assert status == 401


def test_learner_cannot_access_admin_api() -> None:
    token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    protected_paths = [
        "/api/v1/admin/rbac-check",
        "/api/v1/admin/users",
        "/api/v1/admin/roles",
        "/api/v1/admin/permissions",
        "/api/v1/admin/audit-events",
    ]

    for path in protected_paths:
        status, payload = request_json("GET", path, token=token)

        assert status == 403
        assert isinstance(payload, dict)
        assert "Permission required" in payload["detail"]
