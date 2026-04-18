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
) -> tuple[int, dict | None]:
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

    token = payload.get("access_token") if payload else None

    if not token:
        raise AssertionError(f"login {email}: access_token missing")

    return token


def main() -> int:
    checks: list[str] = []

    status, health = request_json("GET", "/health")
    assert_status(status, 200, "health")
    assert health and health.get("status") == "ok"
    checks.append("health ok")

    status, ready = request_json("GET", "/api/v1/ready")
    assert_status(status, 200, "ready")
    assert ready and ready.get("status") == "ok"
    checks.append("ready ok")

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    checks.append("admin login ok")

    status, me = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert_status(status, 200, "admin /auth/me")
    assert me and me.get("email") == ADMIN_EMAIL
    assert any(role.get("code") == "admin" for role in me.get("roles", []))
    checks.append("admin /auth/me ok")

    status, rbac = request_json("GET", "/api/v1/admin/rbac-check", token=admin_token)
    assert_status(status, 200, "admin rbac-check")
    assert rbac and rbac.get("has_permission") is True
    checks.append("admin rbac-check ok")

    status, _ = request_json("GET", "/api/v1/admin/rbac-check")
    assert_status(status, 401, "rbac-check without token")
    checks.append("no token returns 401")

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    checks.append("learner login ok")

    status, _ = request_json("GET", "/api/v1/admin/rbac-check", token=learner_token)
    assert_status(status, 403, "learner rbac-check")
    checks.append("learner rbac-check returns 403")

    print("Smoke auth/RBAC passed:")
    for check in checks:
        print(f" - {check}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Smoke auth/RBAC failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
