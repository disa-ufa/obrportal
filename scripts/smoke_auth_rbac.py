from __future__ import annotations

import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = "http://localhost:8000"

ADMIN_EMAIL = "admin@obrportal.local"
ADMIN_PASSWORD = "Admin123Local2026!"

LEARNER_EMAIL = "learner@obrportal.local"
LEARNER_PASSWORD = "Learner123Local2026!"


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


def assert_status(actual: int, expected: int, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected HTTP {expected}, got {actual}")


def assert_list_min_count(payload: dict | list | None, minimum: int, label: str) -> list:
    if not isinstance(payload, list):
        raise AssertionError(f"{label}: expected list payload")

    if len(payload) < minimum:
        raise AssertionError(f"{label}: expected at least {minimum} items, got {len(payload)}")

    return payload


def login(email: str, password: str) -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {
            "email": email,
            "password": password,
        },
    )

    assert_status(status, 200, f"login {email}")

    if not isinstance(payload, dict):
        raise AssertionError(f"login {email}: expected dict payload")

    token = payload.get("access_token")

    if not token:
        raise AssertionError(f"login {email}: access_token missing")

    return token


def main() -> int:
    checks: list[str] = []

    status, health = request_json("GET", "/health")
    assert_status(status, 200, "health")
    assert isinstance(health, dict) and health.get("status") == "ok"
    checks.append("health ok")

    status, ready = request_json("GET", "/api/v1/ready")
    assert_status(status, 200, "ready")
    assert isinstance(ready, dict) and ready.get("status") == "ok"
    checks.append("ready ok")

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    checks.append("admin login ok")

    status, me = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert_status(status, 200, "admin /auth/me")
    assert isinstance(me, dict) and me.get("email") == ADMIN_EMAIL
    assert any(role.get("code") == "admin" for role in me.get("roles", []))
    checks.append("admin /auth/me ok")

    status, rbac = request_json("GET", "/api/v1/admin/rbac-check", token=admin_token)
    assert_status(status, 200, "admin rbac-check")
    assert isinstance(rbac, dict) and rbac.get("has_permission") is True
    checks.append("admin rbac-check ok")

    status, users_payload = request_json("GET", "/api/v1/admin/users", token=admin_token)
    assert_status(status, 200, "admin users")
    users = assert_list_min_count(users_payload, 2, "admin users")
    user_emails = {item.get("email") for item in users}
    assert ADMIN_EMAIL in user_emails
    assert LEARNER_EMAIL in user_emails
    checks.append("admin users ok")

    status, roles_payload = request_json("GET", "/api/v1/admin/roles", token=admin_token)
    assert_status(status, 200, "admin roles")
    roles = assert_list_min_count(roles_payload, 9, "admin roles")
    role_codes = {item.get("code") for item in roles}
    assert "admin" in role_codes
    assert "learner_fl" in role_codes
    assert "frdo_operator" in role_codes
    checks.append("admin roles ok")

    status, permissions_payload = request_json("GET", "/api/v1/admin/permissions", token=admin_token)
    assert_status(status, 200, "admin permissions")
    permissions = assert_list_min_count(permissions_payload, 43, "admin permissions")
    permission_codes = {item.get("code") for item in permissions}
    assert "admin.users.read" in permission_codes
    assert "frdo.export" in permission_codes
    checks.append("admin permissions ok")

    status, audit_payload = request_json("GET", "/api/v1/admin/audit-events", token=admin_token)
    assert_status(status, 200, "admin audit-events")
    audit_events = assert_list_min_count(audit_payload, 1, "admin audit-events")
    audit_actions = {item.get("action") for item in audit_events}
    assert "login_success" in audit_actions
    checks.append("admin audit-events ok")

    status, _ = request_json("GET", "/api/v1/admin/rbac-check")
    assert_status(status, 401, "rbac-check without token")
    checks.append("no token returns 401")

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    checks.append("learner login ok")

    protected_paths = [
        "/api/v1/admin/rbac-check",
        "/api/v1/admin/users",
        "/api/v1/admin/roles",
        "/api/v1/admin/permissions",
        "/api/v1/admin/audit-events",
    ]

    for path in protected_paths:
        status, _ = request_json("GET", path, token=learner_token)
        assert_status(status, 403, f"learner forbidden {path}")

    checks.append("learner admin API returns 403")

    print("Smoke auth/RBAC/admin API passed:")
    for check in checks:
        print(f" - {check}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Smoke auth/RBAC/admin API failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
