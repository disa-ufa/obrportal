from __future__ import annotations

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("SMOKE_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("SMOKE_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("SMOKE_LEARNER_PASSWORD", "Learner123Local2026!")


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


def assert_status(actual: int, expected: int, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected status {expected}, got {actual}")


def login(email: str, password: str) -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": email, "password": password},
    )

    assert_status(status, 200, f"login {email}")

    if not isinstance(payload, dict) or not payload.get("access_token"):
        raise AssertionError(f"login {email}: access_token missing")

    return str(payload["access_token"])


def main() -> int:
    checks: list[str] = []

    status, health = request_json("GET", "/health")
    assert_status(status, 200, "health")
    assert isinstance(health, dict)
    assert health["status"] == "ok"
    checks.append("health ok")

    status, ready = request_json("GET", "/api/v1/ready")
    assert_status(status, 200, "ready")
    assert isinstance(ready, dict)
    assert ready["status"] == "ok"
    checks.append("ready ok")

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    checks.append("admin login ok")

    status, me = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert_status(status, 200, "admin /auth/me")
    assert isinstance(me, dict)
    assert me["email"] == ADMIN_EMAIL
    checks.append("admin /auth/me ok")

    status, rbac = request_json("GET", "/api/v1/admin/rbac-check", token=admin_token)
    assert_status(status, 200, "admin rbac-check")
    assert isinstance(rbac, dict)
    assert rbac["status"] == "ok"
    assert rbac["has_permission"] is True
    checks.append("admin rbac-check ok")

    status, users = request_json("GET", "/api/v1/admin/users", token=admin_token)
    assert_status(status, 200, "admin users")
    assert isinstance(users, list)
    assert len(users) >= 2
    first_user = users[0]
    assert isinstance(first_user, dict)
    assert first_user.get("id")
    checks.append("admin users ok")

    user_id = str(first_user["id"])
    status, user_detail = request_json(
        "GET",
        f"/api/v1/admin/users/{user_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin user detail")
    assert isinstance(user_detail, dict)
    assert user_detail["id"] == user_id
    assert user_detail["email"]
    assert "created_at" in user_detail
    assert "updated_at" in user_detail
    assert isinstance(user_detail["roles"], list)
    checks.append("admin user detail ok")

    status, missing_user = request_json(
        "GET",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin user detail 404")
    assert isinstance(missing_user, dict)
    checks.append("admin user detail 404 ok")

    status, organizations = request_json(
        "GET",
        "/api/v1/admin/organizations",
        token=admin_token,
    )
    assert_status(status, 200, "admin organizations")
    assert isinstance(organizations, list)
    assert len(organizations) >= 1
    first_org = organizations[0]
    assert isinstance(first_org, dict)
    assert first_org.get("id")
    assert first_org.get("inn")
    checks.append("admin organizations ok")

    organization_id = str(first_org["id"])
    status, organization_detail = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin organization detail")
    assert isinstance(organization_detail, dict)
    assert organization_detail["id"] == organization_id
    assert organization_detail["inn"]
    assert "created_at" in organization_detail
    assert "updated_at" in organization_detail
    checks.append("admin organization detail ok")

    status, missing_org = request_json(
        "GET",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin organization detail 404")
    assert isinstance(missing_org, dict)
    checks.append("admin organization detail 404 ok")

    status, roles = request_json("GET", "/api/v1/admin/roles", token=admin_token)
    assert_status(status, 200, "admin roles")
    assert isinstance(roles, list)
    assert len(roles) >= 1
    first_role = roles[0]
    assert isinstance(first_role, dict)
    assert first_role.get("id")
    checks.append("admin roles ok")

    role_id = str(first_role["id"])
    status, role_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin role detail")
    assert isinstance(role_detail, dict)
    assert role_detail["id"] == role_id
    assert role_detail["code"]
    assert role_detail["name"]
    assert "created_at" in role_detail
    assert "updated_at" in role_detail
    assert isinstance(role_detail["permissions"], list)
    checks.append("admin role detail ok")

    status, missing_role = request_json(
        "GET",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin role detail 404")
    assert isinstance(missing_role, dict)
    checks.append("admin role detail 404 ok")

    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=admin_token)
    assert_status(status, 200, "admin permissions")
    assert isinstance(permissions, list)
    assert len(permissions) >= 1
    checks.append("admin permissions ok")

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=admin_token)
    assert_status(status, 200, "admin audit-events")
    assert isinstance(audit_events, list)
    checks.append("admin audit-events ok")

    status, _ = request_json("GET", "/api/v1/admin/users")
    assert_status(status, 401, "no token admin users")
    checks.append("no token returns 401")

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    checks.append("learner login ok")

    status, _ = request_json("GET", "/api/v1/admin/users", token=learner_token)
    assert_status(status, 403, "learner admin API")
    checks.append("learner admin API returns 403")

    status, _ = request_json("GET", f"/api/v1/admin/users/{user_id}", token=learner_token)
    assert_status(status, 403, "learner admin user detail")
    checks.append("learner user detail returns 403")

    status, _ = request_json("GET", "/api/v1/admin/organizations", token=learner_token)
    assert_status(status, 403, "learner admin organizations")
    checks.append("learner organizations returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization detail")
    checks.append("learner organization detail returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role detail")
    checks.append("learner role detail returns 403")

    print("Smoke auth/RBAC/admin API passed:")
    for check in checks:
        print(f" - {check}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
