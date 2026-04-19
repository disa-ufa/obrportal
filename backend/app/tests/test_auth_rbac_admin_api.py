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
    headers = {"Accept": "application/json"}

    data = None
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
        with urlopen(request, timeout=15) as response:
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
        {"email": email, "password": password},
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["access_token"]

    return str(payload["access_token"])


def test_admin_login_and_me() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json("GET", "/api/v1/auth/me", token=token)

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["email"] == ADMIN_EMAIL
    assert any(role["code"] == "admin" for role in payload["roles"])


def test_bad_password_returns_401() -> None:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": ADMIN_EMAIL, "password": "wrong-password"},
    )

    assert status == 401
    assert isinstance(payload, dict)


def test_no_token_returns_401_for_admin_api() -> None:
    status, payload = request_json("GET", "/api/v1/admin/users")

    assert status == 401
    assert isinstance(payload, dict)


def test_learner_cannot_access_admin_api() -> None:
    token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, payload = request_json("GET", "/api/v1/admin/users", token=token)

    assert status == 403
    assert isinstance(payload, dict)


def test_admin_rbac_check_and_read_only_api() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, rbac = request_json("GET", "/api/v1/admin/rbac-check", token=token)
    assert status == 200
    assert isinstance(rbac, dict)
    assert rbac["status"] == "ok"
    assert rbac["has_permission"] is True

    status, users = request_json("GET", "/api/v1/admin/users", token=token)
    assert status == 200
    assert isinstance(users, list)
    assert len(users) >= 2

    status, organizations = request_json("GET", "/api/v1/admin/organizations", token=token)
    assert status == 200
    assert isinstance(organizations, list)
    assert len(organizations) >= 1

    status, roles = request_json("GET", "/api/v1/admin/roles", token=token)
    assert status == 200
    assert isinstance(roles, list)
    assert len(roles) >= 1

    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=token)
    assert status == 200
    assert isinstance(permissions, list)
    assert len(permissions) >= 1

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)


def test_admin_can_read_user_detail() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, users = request_json("GET", "/api/v1/admin/users", token=token)
    assert status == 200
    assert isinstance(users, list)
    assert len(users) >= 1

    user_id = users[0]["id"]

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/users/{user_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == user_id
    assert detail["email"]
    assert "created_at" in detail
    assert "updated_at" in detail
    assert isinstance(detail["roles"], list)


def test_admin_user_detail_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_read_user_detail() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, users = request_json("GET", "/api/v1/admin/users", token=admin_token)
    assert status == 200
    assert isinstance(users, list)
    assert len(users) >= 1

    user_id = users[0]["id"]

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/users/{user_id}",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)


def test_admin_can_read_organization_detail() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, organizations = request_json("GET", "/api/v1/admin/organizations", token=token)
    assert status == 200
    assert isinstance(organizations, list)
    assert len(organizations) >= 1

    organization_id = organizations[0]["id"]

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == organization_id
    assert detail["inn"]
    assert detail["name"]
    assert "created_at" in detail
    assert "updated_at" in detail


def test_admin_organization_detail_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_read_organizations() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, organizations = request_json("GET", "/api/v1/admin/organizations", token=admin_token)
    assert status == 200
    assert isinstance(organizations, list)
    assert len(organizations) >= 1

    organization_id = organizations[0]["id"]

    status, payload = request_json(
        "GET",
        "/api/v1/admin/organizations",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)
