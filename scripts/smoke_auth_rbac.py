from __future__ import annotations

import json
import os
from uuid import uuid4
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("SMOKE_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("SMOKE_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("SMOKE_LEARNER_PASSWORD", "Learner123Local2026!")


def unique_inn() -> str:
    return f"8{uuid4().int % 1_000_000_000:09d}"


def unique_phone() -> str:
    return f"+7888{uuid4().int % 10_000_000:07d}"


def find_user_role_id(
    user_detail: dict,
    *,
    role_code: str,
    organization_id: str | None = None,
) -> str:
    roles = user_detail.get("roles", [])
    if not isinstance(roles, list):
        raise AssertionError("user roles must be a list")

    for role in roles:
        if role["code"] == role_code and role.get("organization_id") == organization_id:
            return str(role["id"])

    raise AssertionError(f"User role not found: {role_code} / {organization_id}")


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


    learner_user = next(
        (item for item in users if isinstance(item, dict) and item.get("email") == LEARNER_EMAIL),
        None,
    )
    if learner_user is None:
        raise AssertionError("learner user not found")

    learner_user_id = str(learner_user["id"])

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

    created_user_suffix = uuid4().hex[:10]
    created_user_email = f"smoke-created-{created_user_suffix}@obrportal.local"
    created_user_password = "SmokeCreated123!"
    created_user_phone = unique_phone()
    status, created_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": created_user_email,
            "password": created_user_password,
            "full_name": f"Smoke created user {created_user_suffix}",
            "phone": created_user_phone,
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin user create")
    assert isinstance(created_user, dict)
    assert created_user["email"] == created_user_email
    assert created_user["phone"] == created_user_phone
    assert created_user["roles"] == []
    checks.append("admin user create ok")

    created_user_token = login(created_user_email, created_user_password)
    if not created_user_token:
        raise AssertionError("created user login failed")
    checks.append("created user login ok")

    created_user_new_password = "SmokeReset123!"
    status, reset_password_user = request_json(
        "POST",
        f"/api/v1/admin/users/{created_user['id']}/password",
        {"password": created_user_new_password},
        token=admin_token,
    )
    assert_status(status, 200, "admin user password reset")
    assert isinstance(reset_password_user, dict)
    assert reset_password_user["id"] == created_user["id"]
    if "password" in reset_password_user or "hashed_password" in reset_password_user:
        raise AssertionError("password fields leaked in user password reset response")
    checks.append("admin user password reset ok")

    status, old_password_login = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": created_user_email, "password": created_user_password},
    )
    assert_status(status, 401, "created user old password rejected")
    assert isinstance(old_password_login, dict)
    checks.append("created user old password rejected")

    created_user_reset_token = login(created_user_email, created_user_new_password)
    if not created_user_reset_token:
        raise AssertionError("created user reset password login failed")
    checks.append("created user reset password login ok")

    status, duplicate_created_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": created_user_email,
            "password": created_user_password,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate user create")
    assert isinstance(duplicate_created_user, dict)
    checks.append("admin duplicate user create returns 409")

    user_update_phone = unique_phone()
    status, updated_user = request_json(
        "PATCH",
        f"/api/v1/admin/users/{learner_user_id}",
        {
            "full_name": f"Smoke learner {user_update_phone}",
            "phone": user_update_phone,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin user update")
    assert isinstance(updated_user, dict)
    assert updated_user["id"] == learner_user_id
    assert updated_user["phone"] == user_update_phone
    checks.append("admin user update ok")

    status, deactivated_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/deactivate",
        token=admin_token,
    )
    assert_status(status, 200, "admin user deactivate")
    assert isinstance(deactivated_user, dict)
    assert deactivated_user["id"] == learner_user_id
    assert deactivated_user["is_active"] is False
    checks.append("admin user deactivate ok")

    status, activated_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/activate",
        token=admin_token,
    )
    assert_status(status, 200, "admin user activate")
    assert isinstance(activated_user, dict)
    assert activated_user["id"] == learner_user_id
    assert activated_user["is_active"] is True
    checks.append("admin user activate ok")

    status, missing_user_update = request_json(
        "PATCH",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000",
        {"full_name": "Missing user"},
        token=admin_token,
    )
    assert_status(status, 404, "admin user update 404")
    assert isinstance(missing_user_update, dict)
    checks.append("admin user update 404 ok")

    status, missing_user_password_reset = request_json(
        "POST",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000/password",
        {"password": "MissingSmoke123!"},
        token=admin_token,
    )
    assert_status(status, 404, "admin user password reset 404")
    assert isinstance(missing_user_password_reset, dict)
    checks.append("admin user password reset 404 ok")

    status, last_admin_deactivate = request_json(
        "POST",
        f"/api/v1/admin/users/{user_id}/deactivate",
        token=admin_token,
    )
    assert_status(status, 400, "admin last admin deactivate 400")
    assert isinstance(last_admin_deactivate, dict)
    checks.append("admin last admin deactivate returns 400")

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

    created_org_inn = unique_inn()
    status, created_org = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": created_org_inn,
            "kpp": "027801001",
            "ogrn": "1020200000000",
            "name": f"Smoke organization {created_org_inn}",
            "legal_address": "Smoke legal address",
            "actual_address": "Smoke actual address",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin organization create")
    assert isinstance(created_org, dict)
    assert created_org["id"]
    assert created_org["inn"] == created_org_inn
    checks.append("admin organization create ok")

    created_organization_id = str(created_org["id"])
    status, updated_org = request_json(
        "PATCH",
        f"/api/v1/admin/organizations/{created_organization_id}",
        {
            "name": f"Smoke organization updated {created_org_inn}",
            "actual_address": "Smoke updated actual address",
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin organization update")
    assert isinstance(updated_org, dict)
    assert updated_org["id"] == created_organization_id
    assert updated_org["name"].startswith("Smoke organization updated")
    checks.append("admin organization update ok")

    status, missing_org_update = request_json(
        "PATCH",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        {"name": "Missing organization"},
        token=admin_token,
    )
    assert_status(status, 404, "admin organization update 404")
    assert isinstance(missing_org_update, dict)
    checks.append("admin organization update 404 ok")

    status, roles = request_json("GET", "/api/v1/admin/roles", token=admin_token)
    assert_status(status, 200, "admin roles")
    assert isinstance(roles, list)
    assert len(roles) >= 1
    first_role = roles[0]
    assert isinstance(first_role, dict)
    assert first_role.get("id")
    checks.append("admin roles ok")

    teacher_role = next(
        (item for item in roles if isinstance(item, dict) and item.get("code") == "teacher"),
        None,
    )
    if teacher_role is None:
        raise AssertionError("teacher role not found")

    teacher_role_id = str(teacher_role["id"])

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

    status, assigned_role_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": created_organization_id,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin user role assign")
    assert isinstance(assigned_role_user, dict)
    assert assigned_role_user["id"] == learner_user_id
    assigned_user_role_id = find_user_role_id(
        assigned_role_user,
        role_code="teacher",
        organization_id=created_organization_id,
    )
    checks.append("admin user role assign ok")

    status, duplicate_role_assign = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": created_organization_id,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate user role assign")
    assert isinstance(duplicate_role_assign, dict)
    checks.append("admin duplicate user role assign returns 409")

    status, last_admin_role_remove = request_json(
        "DELETE",
        f"/api/v1/admin/users/{user_id}/roles/{find_user_role_id(user_detail, role_code='admin')}",
        token=admin_token,
    )
    assert_status(status, 400, "admin last admin role remove 400")
    assert isinstance(last_admin_role_remove, dict)
    checks.append("admin last admin role remove returns 400")

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
    first_permission = permissions[0]
    assert isinstance(first_permission, dict)
    assert first_permission.get("id")
    checks.append("admin permissions ok")

    permission_id = str(first_permission["id"])
    status, permission_detail = request_json(
        "GET",
        f"/api/v1/admin/permissions/{permission_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin permission detail")
    assert isinstance(permission_detail, dict)
    assert permission_detail["id"] == permission_id
    assert permission_detail["code"]
    assert permission_detail["name"]
    assert "created_at" in permission_detail
    assert "updated_at" in permission_detail
    assert isinstance(permission_detail["roles"], list)
    checks.append("admin permission detail ok")

    status, missing_permission = request_json(
        "GET",
        "/api/v1/admin/permissions/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin permission detail 404")
    assert isinstance(missing_permission, dict)
    checks.append("admin permission detail 404 ok")

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=admin_token)
    assert_status(status, 200, "admin audit-events")
    assert isinstance(audit_events, list)
    assert len(audit_events) >= 1
    first_audit_event = audit_events[0]
    assert isinstance(first_audit_event, dict)
    assert first_audit_event.get("id")
    checks.append("admin audit-events ok")

    audit_event_id = str(first_audit_event["id"])
    status, audit_event_detail = request_json(
        "GET",
        f"/api/v1/admin/audit-events/{audit_event_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin audit event detail")
    assert isinstance(audit_event_detail, dict)
    assert audit_event_detail["id"] == audit_event_id
    assert audit_event_detail["action"]
    assert "payload" in audit_event_detail
    assert "created_at" in audit_event_detail
    checks.append("admin audit event detail ok")

    status, missing_audit_event = request_json(
        "GET",
        "/api/v1/admin/audit-events/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin audit event detail 404")
    assert isinstance(missing_audit_event, dict)
    checks.append("admin audit event detail 404 ok")

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

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/users/{learner_user_id}",
        {"full_name": "Forbidden learner update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user update")
    checks.append("learner user update returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": f"forbidden-smoke-{uuid4().hex[:10]}@obrportal.local",
            "password": "ForbiddenSmoke123!",
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user create")
    checks.append("learner user create returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/password",
        {"password": "ForbiddenResetSmoke123!"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user password reset")
    checks.append("learner user password reset returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/deactivate",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user deactivate")
    checks.append("learner user deactivate returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/activate",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user activate")
    checks.append("learner user activate returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": created_organization_id,
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user role assign")
    checks.append("learner user role assign returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{assigned_user_role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user role remove")
    checks.append("learner user role remove returns 403")

    status, removed_role_user = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{assigned_user_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin user role remove")
    assert isinstance(removed_role_user, dict)
    assert removed_role_user["id"] == learner_user_id
    checks.append("admin user role remove ok")

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
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": unique_inn(),
            "name": "Forbidden learner organization",
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization create")
    checks.append("learner organization create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/organizations/{created_organization_id}",
        {"name": "Forbidden learner update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization update")
    checks.append("learner organization update returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role detail")
    checks.append("learner role detail returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/permissions/{permission_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin permission detail")
    checks.append("learner permission detail returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/audit-events/{audit_event_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin audit event detail")
    checks.append("learner audit event detail returns 403")

    print("Smoke auth/RBAC/admin API passed:")
    for check in checks:
        print(f" - {check}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
