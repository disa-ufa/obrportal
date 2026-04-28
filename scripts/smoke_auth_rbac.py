from __future__ import annotations

import json
import os
from uuid import uuid4
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


BASE_URL = os.getenv("SMOKE_BASE_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("SMOKE_FRONTEND_BASE_URL", "http://localhost:5173")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("SMOKE_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("SMOKE_LEARNER_PASSWORD", "Learner123Local2026!")


def unique_inn() -> str:
    return f"8{uuid4().int % 1_000_000_000:09d}"


def unique_phone() -> str:
    return f"+7888{uuid4().int % 10_000_000:07d}"


def unique_role_code() -> str:
    return f"smoke_custom_{uuid4().hex[:10]}"


def unique_group_code() -> str:
    return f"smoke_group_{uuid4().hex[:10]}"


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


def find_role_permission_id(
    role_detail: dict,
    *,
    permission_code: str,
    required: bool = True,
) -> str | None:
    permissions = role_detail.get("permissions", [])
    if not isinstance(permissions, list):
        raise AssertionError("role permissions must be a list")

    for permission in permissions:
        if permission["code"] == permission_code:
            return str(permission["role_permission_id"])

    if required:
        raise AssertionError(f"Role permission not found: {permission_code}")

    return None



def request_frontend_direct_route(path: str) -> tuple[int, str]:
    frontend_base_url = (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("VITE_FRONTEND_URL")
        or "http://localhost:5173"
    ).rstrip("/")

    frontend_request = Request(f"{frontend_base_url}{path}", method="GET")

    try:
        with urlopen(frontend_request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, body
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body


def assert_frontend_shell(body: str, label: str) -> None:
    normalized_body = body.lower()

    if "<html" not in normalized_body and 'id="root"' not in normalized_body:
        raise AssertionError(f"{label}: frontend shell was not returned")


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



def request_form(
    method: str,
    path: str,
    fields: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict | list | None]:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = urlencode(fields or {}).encode("utf-8")

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


def request_binary(
    method: str,
    path: str,
    token: str | None = None,
) -> tuple[int, bytes, dict]:
    headers = {"Accept": "application/octet-stream"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            return response.status, response.read(), dict(response.headers)
    except HTTPError as error:
        return error.code, error.read(), dict(error.headers)




def request_frontend_text(path: str) -> tuple[int, str, dict]:
    request = Request(
        url=f"{FRONTEND_BASE_URL}{path}",
        headers={"Accept": "text/html"},
        method="GET",
    )

    try:
        with urlopen(request, timeout=15) as response:
            return response.status, response.read().decode("utf-8", errors="replace"), dict(response.headers)
    except HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace"), dict(error.headers)



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

    public_email = f"public_{uuid4().hex[:12]}@example.com"
    public_password = "Public123Local2026!"
    public_phone = f"+7999{uuid4().int % 10_000_000:07d}"

    status, public_register = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": public_email.upper(),
            "password": public_password,
            "full_name": "Public Smoke User",
            "phone": public_phone,
        },
    )
    assert_status(status, 201, "public register")
    assert isinstance(public_register, dict)
    assert public_register["access_token"]
    checks.append("public register ok")

    public_token = str(public_register["access_token"])

    status, public_me = request_json("GET", "/api/v1/auth/me", token=public_token)
    assert_status(status, 200, "public register /auth/me")
    assert isinstance(public_me, dict)
    assert public_me["email"] == public_email
    assert public_me["full_name"] == "Public Smoke User"
    assert public_me["roles"] == []
    checks.append("public register /auth/me ok")

    status, public_login = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": public_email, "password": public_password},
    )
    assert_status(status, 200, "public register login")
    assert isinstance(public_login, dict)
    assert public_login["access_token"]
    checks.append("public register login ok")

    status, duplicate_register = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": public_email,
            "password": public_password,
            "full_name": "Duplicate Public Smoke User",
        },
    )
    assert_status(status, 409, "public register duplicate email")
    assert isinstance(duplicate_register, dict)
    checks.append("public register duplicate email returns 409")

    status, duplicate_phone_register = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": f"public_phone_{uuid4().hex[:12]}@example.com",
            "password": public_password,
            "full_name": "Duplicate Phone Public Smoke User",
            "phone": public_phone,
        },
    )
    assert_status(status, 409, "public register duplicate phone")
    assert isinstance(duplicate_phone_register, dict)
    checks.append("public register duplicate phone returns 409")
    status, public_courses = request_json(
        "GET",
        "/api/v1/public/courses?limit=5",
    )
    assert_status(status, 200, "public courses")
    assert isinstance(public_courses, list)
    checks.append("public courses list ok")

    status, missing_public_course = request_json(
        "GET",
        "/api/v1/public/courses/missing-public-course",
    )
    assert_status(status, 404, "public missing course")
    assert isinstance(missing_public_course, dict)
    checks.append("public missing course returns 404")

    status, admin_account_summary = request_json(
        "GET",
        "/api/v1/account/summary",
        token=admin_token,
    )
    assert_status(status, 200, "admin account summary")
    assert isinstance(admin_account_summary, dict)
    assert isinstance(admin_account_summary["enrollments_count"], int)
    assert admin_account_summary["enrollments_count"] >= 0
    assert isinstance(admin_account_summary["active_courses_count"], int)
    assert admin_account_summary["active_courses_count"] >= 0
    assert admin_account_summary["active_courses_count"] <= admin_account_summary["enrollments_count"]
    assert isinstance(admin_account_summary["documents_count"], int)
    assert admin_account_summary["documents_count"] >= 0
    assert isinstance(admin_account_summary["profile"], dict)
    assert admin_account_summary["profile"]["email"] == ADMIN_EMAIL
    checks.append("admin account summary ok")

    status, admin_account_documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=admin_token,
    )
    assert_status(status, 200, "admin account documents")
    assert isinstance(admin_account_documents, dict)
    assert isinstance(admin_account_documents["total"], int)
    assert admin_account_documents["total"] >= 0
    assert isinstance(admin_account_documents["items"], list)
    checks.append("admin account documents ok")

    status, missing_admin_document_download = request_json(
        "GET",
        "/api/v1/account/documents/00000000-0000-0000-0000-000000000000/download",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing account document download")
    assert isinstance(missing_admin_document_download, dict)
    checks.append("admin missing account document download returns 404")

    status, admin_documents = request_json(
        "GET",
        "/api/v1/admin/documents",
        token=admin_token,
    )
    assert_status(status, 200, "admin documents")
    assert isinstance(admin_documents, list)
    checks.append("admin documents list ok")

    status, filtered_admin_documents = request_json(
        "GET",
        "/api/v1/admin/documents?status=available&limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin documents filters")
    assert isinstance(filtered_admin_documents, list)
    checks.append("admin documents filters ok")

    status, admin_courses = request_json(
        "GET",
        "/api/v1/admin/courses?limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin courses")
    assert isinstance(admin_courses, list)
    checks.append("admin courses list ok")

    status, missing_admin_course = request_json(
        "GET",
        "/api/v1/admin/courses/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing course")
    assert isinstance(missing_admin_course, dict)
    checks.append("admin missing course returns 404")

    status, admin_enrollments = request_json(
        "GET",
        "/api/v1/admin/enrollments?limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin enrollments")
    assert isinstance(admin_enrollments, list)
    checks.append("admin enrollments list ok")

    status, missing_admin_enrollment = request_json(
        "GET",
        "/api/v1/admin/enrollments/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing enrollment")
    assert isinstance(missing_admin_enrollment, dict)
    checks.append("admin missing enrollment returns 404")

    status, missing_admin_document_update = request_json(
        "PATCH",
        "/api/v1/admin/documents/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing document update")
    assert isinstance(missing_admin_document_update, dict)
    checks.append("admin missing document update returns 404")

    status, missing_admin_document_delete = request_json(
        "DELETE",
        "/api/v1/admin/documents/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing document delete")
    assert isinstance(missing_admin_document_delete, dict)
    checks.append("admin missing document delete returns 404")

    status, missing_admin_document_download = request_json(
        "GET",
        "/api/v1/admin/documents/00000000-0000-0000-0000-000000000000/download",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing document download")
    assert isinstance(missing_admin_document_download, dict)
    checks.append("admin missing document download returns 404")

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

    delete_org_inn = unique_inn()
    status, deletable_org = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": delete_org_inn,
            "name": f"Smoke deletable organization {delete_org_inn}",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin organization create for delete")
    assert isinstance(deletable_org, dict)
    deletable_org_id = str(deletable_org["id"])

    status, deleted_org = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{deletable_org_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin organization delete")
    assert isinstance(deleted_org, dict)
    assert deleted_org["status"] == "deleted"
    assert deleted_org["id"] == deletable_org_id
    checks.append("admin organization delete ok")

    status, deleted_org_detail = request_json(
        "GET",
        f"/api/v1/admin/organizations/{deletable_org_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted organization detail")
    assert isinstance(deleted_org_detail, dict)
    checks.append("admin deleted organization detail returns 404")

    created_group_code = unique_group_code()
    status, created_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": created_organization_id,
            "name": f"Smoke group {created_group_code}",
            "code": created_group_code,
            "description": "Smoke learning group",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin learning group create")
    assert isinstance(created_group, dict)
    assert created_group["organization_id"] == created_organization_id
    assert created_group["code"] == created_group_code
    created_group_id = str(created_group["id"])
    checks.append("admin learning group create ok")

    status, learning_groups = request_json(
        "GET",
        "/api/v1/org/groups",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning groups")
    assert isinstance(learning_groups, list)
    assert any(
        isinstance(group, dict) and str(group.get("id")) == created_group_id
        for group in learning_groups
    )
    checks.append("admin learning groups ok")

    status, filtered_learning_groups = request_json(
        "GET",
        f"/api/v1/org/groups?organization_id={created_organization_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning groups filter")
    assert isinstance(filtered_learning_groups, list)
    assert any(
        isinstance(group, dict) and str(group.get("id")) == created_group_id
        for group in filtered_learning_groups
    )
    assert all(
        isinstance(group, dict) and group.get("organization_id") == created_organization_id
        for group in filtered_learning_groups
    )
    checks.append("admin learning groups filter ok")

    status, learning_group_detail = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group detail")
    assert isinstance(learning_group_detail, dict)
    assert learning_group_detail["id"] == created_group_id
    assert learning_group_detail["organization_id"] == created_organization_id
    checks.append("admin learning group detail ok")

    status, updated_learning_group = request_json(
        "PATCH",
        f"/api/v1/org/groups/{created_group_id}",
        {
            "name": f"Smoke group updated {created_group_code}",
            "description": None,
            "is_active": False,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group update")
    assert isinstance(updated_learning_group, dict)
    assert updated_learning_group["id"] == created_group_id
    assert updated_learning_group["is_active"] is False
    checks.append("admin learning group update ok")


    status, initial_group_members = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group members list")
    assert isinstance(initial_group_members, list)
    checks.append("admin learning group members list ok")

    status, created_group_member = request_json(
        "POST",
        f"/api/v1/org/groups/{created_group_id}/members",
        {"user_id": learner_user_id},
        token=admin_token,
    )
    assert_status(status, 201, "admin learning group member add")
    assert isinstance(created_group_member, dict)
    assert created_group_member["id"]
    assert created_group_member["learning_group_id"] == created_group_id
    assert created_group_member["user_id"] == learner_user_id
    assert created_group_member["user_email"] == LEARNER_EMAIL
    assert "user_full_name" in created_group_member
    assert isinstance(created_group_member["user_is_active"], bool)
    assert "created_at" in created_group_member
    assert "updated_at" in created_group_member
    checks.append("admin learning group member add ok")

    status, duplicate_group_member = request_json(
        "POST",
        f"/api/v1/org/groups/{created_group_id}/members",
        {"user_id": learner_user_id},
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate learning group member")
    assert isinstance(duplicate_group_member, dict)
    checks.append("admin duplicate learning group member returns 409")

    grouped_enrollment_course_slug_suffix = "".join(
        character.lower() if character.isalnum() else "-"
        for character in str(created_group_code)
    )
    grouped_enrollment_course_slug = (
        f"smoke-grouped-enrollment-{grouped_enrollment_course_slug_suffix}"
    )

    status, grouped_enrollment_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": grouped_enrollment_course_slug,
            "title": "Smoke Grouped Enrollment Course",
            "description": "Smoke course for grouped enrollment assignment",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin grouped enrollment course create")
    assert isinstance(grouped_enrollment_course, dict)
    checks.append("admin grouped enrollment course create ok")

    status, grouped_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        {
            "user_id": learner_user_id,
            "course_id": grouped_enrollment_course["id"],
            "organization_id": created_organization_id,
            "learning_group_id": created_group_id,
            "status": "assigned",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin grouped enrollment create")
    assert isinstance(grouped_enrollment, dict)
    assert grouped_enrollment["user_id"] == learner_user_id
    assert grouped_enrollment["course_id"] == grouped_enrollment_course["id"]
    assert grouped_enrollment["organization_id"] == created_organization_id
    assert grouped_enrollment["learning_group_id"] == created_group_id
    grouped_enrollment_id = str(grouped_enrollment["id"])
    checks.append("admin grouped enrollment create ok")

    status, filtered_grouped_enrollments = request_json(
        "GET",
        f"/api/v1/admin/enrollments?learning_group_id={created_group_id}&limit=300",
        token=admin_token,
    )
    assert_status(status, 200, "admin grouped enrollments filter")
    assert isinstance(filtered_grouped_enrollments, list)
    assert any(
        isinstance(enrollment, dict) and enrollment.get("id") == grouped_enrollment_id
        for enrollment in filtered_grouped_enrollments
    )
    assert all(
        not isinstance(enrollment, dict)
        or enrollment.get("learning_group_id") == created_group_id
        for enrollment in filtered_grouped_enrollments
    )
    checks.append("admin grouped enrollment filter ok")

    status, deleted_grouped_enrollment = request_json(
        "DELETE",
        f"/api/v1/admin/enrollments/{grouped_enrollment_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin grouped enrollment cleanup delete")
    assert isinstance(deleted_grouped_enrollment, dict)
    assert deleted_grouped_enrollment["status"] == "deleted"
    assert deleted_grouped_enrollment["id"] == grouped_enrollment_id
    checks.append("admin grouped enrollment cleanup delete ok")

    bulk_grouped_enrollment_course_slug_suffix = "".join(
        character.lower() if character.isalnum() else "-"
        for character in str(created_group_code)
    )
    bulk_grouped_enrollment_course_slug = (
        f"smoke-bulk-grouped-enrollment-{bulk_grouped_enrollment_course_slug_suffix}"
    )

    status, bulk_grouped_enrollment_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": bulk_grouped_enrollment_course_slug,
            "title": "Smoke Bulk Grouped Enrollment Course",
            "description": "Smoke course for bulk grouped enrollment assignment",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin bulk grouped enrollment course create")
    assert isinstance(bulk_grouped_enrollment_course, dict)
    bulk_grouped_enrollment_course_id = str(bulk_grouped_enrollment_course["id"])
    checks.append("admin bulk grouped enrollment course create ok")

    status, bulk_grouped_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        {
            "learning_group_id": created_group_id,
            "course_id": bulk_grouped_enrollment_course_id,
            "status": "assigned",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin bulk grouped enrollment create")
    assert isinstance(bulk_grouped_enrollment, dict)
    assert bulk_grouped_enrollment["status"] == "completed"
    assert bulk_grouped_enrollment["learning_group_id"] == created_group_id
    assert bulk_grouped_enrollment["course_id"] == bulk_grouped_enrollment_course_id
    assert bulk_grouped_enrollment["organization_id"] == created_organization_id
    assert bulk_grouped_enrollment["created_count"] >= 1
    assert bulk_grouped_enrollment["skipped_count"] == 0
    assert isinstance(bulk_grouped_enrollment["created"], list)
    assert isinstance(bulk_grouped_enrollment["skipped"], list)
    assert bulk_grouped_enrollment["skipped"] == []

    bulk_created_enrollment_ids = [
        str(enrollment["id"])
        for enrollment in bulk_grouped_enrollment["created"]
        if isinstance(enrollment, dict) and enrollment.get("id")
    ]
    assert bulk_created_enrollment_ids
    assert all(
        enrollment["learning_group_id"] == created_group_id
        for enrollment in bulk_grouped_enrollment["created"]
    )
    assert all(
        enrollment["course_id"] == bulk_grouped_enrollment_course_id
        for enrollment in bulk_grouped_enrollment["created"]
    )
    checks.append("admin bulk grouped enrollment create ok")

    status, repeated_bulk_grouped_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        {
            "learning_group_id": created_group_id,
            "course_id": bulk_grouped_enrollment_course_id,
            "status": "assigned",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin bulk grouped enrollment repeat")
    assert isinstance(repeated_bulk_grouped_enrollment, dict)
    assert repeated_bulk_grouped_enrollment["status"] == "completed"
    assert repeated_bulk_grouped_enrollment["created_count"] == 0
    assert repeated_bulk_grouped_enrollment["skipped_count"] >= 1
    assert repeated_bulk_grouped_enrollment["created"] == []
    assert isinstance(repeated_bulk_grouped_enrollment["skipped"], list)
    assert all(
        skipped.get("reason") == "Enrollment already exists for this user and course"
        for skipped in repeated_bulk_grouped_enrollment["skipped"]
        if isinstance(skipped, dict)
    )
    assert all(
        skipped.get("existing_enrollment_id")
        for skipped in repeated_bulk_grouped_enrollment["skipped"]
        if isinstance(skipped, dict)
    )
    checks.append("admin bulk grouped enrollment repeat skips duplicates ok")

    status, filtered_bulk_grouped_enrollments = request_json(
        "GET",
        (
            "/api/v1/admin/enrollments"
            f"?learning_group_id={created_group_id}"
            f"&course_id={bulk_grouped_enrollment_course_id}"
            "&limit=300"
        ),
        token=admin_token,
    )
    assert_status(status, 200, "admin bulk grouped enrollments filter")
    assert isinstance(filtered_bulk_grouped_enrollments, list)
    assert all(
        not isinstance(enrollment, dict)
        or enrollment.get("learning_group_id") == created_group_id
        for enrollment in filtered_bulk_grouped_enrollments
    )
    assert all(
        not isinstance(enrollment, dict)
        or enrollment.get("course_id") == bulk_grouped_enrollment_course_id
        for enrollment in filtered_bulk_grouped_enrollments
    )
    assert any(
        isinstance(enrollment, dict)
        and str(enrollment.get("id")) in bulk_created_enrollment_ids
        for enrollment in filtered_bulk_grouped_enrollments
    )
    checks.append("admin bulk grouped enrollment filter ok")

    for bulk_created_enrollment_id in bulk_created_enrollment_ids:
        status, deleted_bulk_grouped_enrollment = request_json(
            "DELETE",
            f"/api/v1/admin/enrollments/{bulk_created_enrollment_id}",
            token=admin_token,
        )
        assert_status(status, 200, "admin bulk grouped enrollment cleanup delete")
        assert isinstance(deleted_bulk_grouped_enrollment, dict)
        assert deleted_bulk_grouped_enrollment["status"] == "deleted"
        assert deleted_bulk_grouped_enrollment["id"] == bulk_created_enrollment_id

    checks.append("admin bulk grouped enrollment cleanup delete ok")

    status, frontend_admin_groups_body = request_frontend_direct_route("/admin/groups")
    assert_status(status, 200, "frontend direct admin groups route")
    assert_frontend_shell(frontend_admin_groups_body, "frontend direct admin groups route")
    checks.append("frontend direct admin groups route ok")

    status, frontend_filtered_enrollments_body = request_frontend_direct_route(
        f"/admin/enrollments?learning_group_id={created_group_id}"
    )
    assert_status(status, 200, "frontend direct filtered enrollments route")
    assert_frontend_shell(
        frontend_filtered_enrollments_body,
        "frontend direct filtered enrollments route",
    )
    checks.append("frontend direct filtered enrollments route ok")

    status, group_members_after_add = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group members after add")
    assert isinstance(group_members_after_add, list)
    assert any(
        isinstance(member, dict) and member.get("user_id") == learner_user_id
        for member in group_members_after_add
    )
    checks.append("admin learning group members after add ok")

    if "learner_token" not in locals():
        learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, learner_group_members = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=learner_token,
    )
    assert_status(status, 403, "learner learning group members list forbidden")
    assert isinstance(learner_group_members, dict)
    checks.append("learner learning group members list forbidden")

    status, learner_add_group_member = request_json(
        "POST",
        f"/api/v1/org/groups/{created_group_id}/members",
        {"user_id": learner_user_id},
        token=learner_token,
    )
    assert_status(status, 403, "learner learning group member add forbidden")
    assert isinstance(learner_add_group_member, dict)
    checks.append("learner learning group member add forbidden")

    status, learner_delete_group_member = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}/members/{learner_user_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner learning group member delete forbidden")
    assert isinstance(learner_delete_group_member, dict)
    checks.append("learner learning group member delete forbidden")

    status, deleted_group_member = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}/members/{learner_user_id}",
        token=admin_token,
    )
    assert_status(status, 204, "admin learning group member delete")
    assert deleted_group_member is None
    checks.append("admin learning group member delete ok")

    status, group_members_after_delete = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group members after delete")
    assert isinstance(group_members_after_delete, list)
    assert all(
        not isinstance(member, dict) or member.get("user_id") != learner_user_id
        for member in group_members_after_delete
    )
    checks.append("admin learning group members after delete ok")

    status, missing_group_member_delete = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}/members/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin learning group member delete 404")
    assert isinstance(missing_group_member_delete, dict)
    checks.append("admin learning group member delete 404 ok")


    status, duplicate_learning_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": created_organization_id,
            "name": updated_learning_group["name"],
            "code": unique_group_code(),
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate learning group create")
    assert isinstance(duplicate_learning_group, dict)
    checks.append("admin duplicate learning group create returns 409")

    status, deleted_learning_group = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}",
        token=admin_token,
    )
    assert_status(status, 204, "admin learning group delete")
    assert deleted_learning_group is None
    checks.append("admin learning group delete ok")

    status, deleted_learning_group_detail = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted learning group detail")
    assert isinstance(deleted_learning_group_detail, dict)
    checks.append("admin deleted learning group detail returns 404")

    status, missing_learning_group_delete = request_json(
        "DELETE",
        "/api/v1/org/groups/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin learning group delete 404")
    assert isinstance(missing_learning_group_delete, dict)
    checks.append("admin learning group delete 404 ok")

    status, roles = request_json("GET", "/api/v1/admin/roles", token=admin_token)
    assert_status(status, 200, "admin roles")
    assert isinstance(roles, list)
    assert len(roles) >= 1
    first_role = roles[0]
    assert isinstance(first_role, dict)
    assert first_role.get("id")
    checks.append("admin roles ok")

    created_role_code = unique_role_code()
    status, created_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": created_role_code.upper(),
            "name": "Smoke custom role",
            "description": "Smoke custom role description",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin role create")
    assert isinstance(created_role, dict)
    assert created_role["code"] == created_role_code
    assert created_role["permissions"] == []
    created_role_id = str(created_role["id"])
    checks.append("admin role create ok")

    status, duplicate_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": created_role_code, "name": "Duplicate smoke custom role"},
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate role create")
    assert isinstance(duplicate_role, dict)
    checks.append("admin duplicate role create returns 409")

    status, updated_role = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{created_role_id}",
        {"name": "Smoke custom role updated", "description": None},
        token=admin_token,
    )
    assert_status(status, 200, "admin role update")
    assert isinstance(updated_role, dict)
    assert updated_role["id"] == created_role_id
    assert updated_role["code"] == created_role_code
    assert updated_role["name"] == "Smoke custom role updated"
    assert updated_role["description"] is None
    checks.append("admin role update ok")

    admin_role_for_metadata = next(
        (item for item in roles if isinstance(item, dict) and item.get("code") == "admin"),
        None,
    )
    if admin_role_for_metadata is None:
        raise AssertionError("admin role not found")

    status, protected_role_update = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{admin_role_for_metadata['id']}",
        {"name": "Forbidden admin rename"},
        token=admin_token,
    )
    assert_status(status, 400, "admin system role update protected")
    assert isinstance(protected_role_update, dict)
    checks.append("admin system role update protected returns 400")

    status, missing_role_update = request_json(
        "PATCH",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        {"name": "Missing role"},
        token=admin_token,
    )
    assert_status(status, 404, "admin role update 404")
    assert isinstance(missing_role_update, dict)
    checks.append("admin role update 404 ok")

    deletable_role_code = unique_role_code()
    status, deletable_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": deletable_role_code,
            "name": "Smoke deletable role",
            "description": "Role for delete smoke check",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin role create for delete")
    assert isinstance(deletable_role, dict)
    deletable_role_id = str(deletable_role["id"])

    status, deleted_role = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{deletable_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin role delete")
    assert isinstance(deleted_role, dict)
    assert deleted_role["status"] == "deleted"
    assert deleted_role["id"] == deletable_role_id
    checks.append("admin role delete ok")

    status, deleted_role_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{deletable_role_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted role detail 404")
    assert isinstance(deleted_role_detail, dict)
    checks.append("admin deleted role detail returns 404")

    status, protected_role_delete = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{admin_role_for_metadata['id']}",
        token=admin_token,
    )
    assert_status(status, 400, "admin system role delete protected")
    assert isinstance(protected_role_delete, dict)
    checks.append("admin system role delete protected returns 400")


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

    status, assigned_organization_delete = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{created_organization_id}",
        token=admin_token,
    )
    assert_status(status, 400, "admin assigned organization delete protected")
    assert isinstance(assigned_organization_delete, dict)
    checks.append("admin assigned organization delete protected returns 400")

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

    payments_permission = next(
        (item for item in permissions if isinstance(item, dict) and item.get("code") == "payments.write"),
        None,
    )
    if payments_permission is None:
        raise AssertionError("payments.write permission not found")

    payments_permission_id = str(payments_permission["id"])

    admin_role = next(
        (item for item in roles if isinstance(item, dict) and item.get("code") == "admin"),
        None,
    )
    if admin_role is None:
        raise AssertionError("admin role not found")

    status, teacher_role_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{teacher_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin teacher role detail")
    assert isinstance(teacher_role_detail, dict)

    existing_role_permission_id = find_role_permission_id(
        teacher_role_detail,
        permission_code="payments.write",
        required=False,
    )
    if existing_role_permission_id:
        status, cleanup_role_permission = request_json(
            "DELETE",
            f"/api/v1/admin/roles/{teacher_role_id}/permissions/{existing_role_permission_id}",
            token=admin_token,
        )
        assert_status(status, 200, "admin stale role permission cleanup")
        assert isinstance(cleanup_role_permission, dict)

    status, assigned_role_permission = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 200, "admin role permission assign")
    assert isinstance(assigned_role_permission, dict)
    assigned_role_permission_id = find_role_permission_id(
        assigned_role_permission,
        permission_code="payments.write",
    )
    checks.append("admin role permission assign ok")

    status, duplicate_role_permission = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate role permission assign")
    assert isinstance(duplicate_role_permission, dict)
    checks.append("admin duplicate role permission assign returns 409")

    status, admin_role_permission_protected = request_json(
        "POST",
        f"/api/v1/admin/roles/{admin_role['id']}/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 400, "admin role permissions protected")
    assert isinstance(admin_role_permission_protected, dict)
    checks.append("admin role permissions protected returns 400")

    status, missing_role_permission_assign = request_json(
        "POST",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 404, "admin role permission assign missing role")
    assert isinstance(missing_role_permission_assign, dict)
    checks.append("admin role permission assign 404 ok")

    status, missing_permission_assign = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": "00000000-0000-0000-0000-000000000000"},
        token=admin_token,
    )
    assert_status(status, 404, "admin role permission assign missing permission")
    assert isinstance(missing_permission_assign, dict)
    checks.append("admin role permission missing permission returns 404")

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

    filtered_audit_path = f"/api/v1/admin/audit-events?action={audit_event_detail['action']}&limit=5"
    status, filtered_audit_events = request_json(
        "GET",
        filtered_audit_path,
        token=admin_token,
    )
    assert_status(status, 200, "admin audit-events filter")
    assert isinstance(filtered_audit_events, list)
    if len(filtered_audit_events) > 5:
        raise AssertionError("admin audit-events filter returned too many events")
    if not filtered_audit_events:
        raise AssertionError("admin audit-events filter returned no events")
    if any(event["action"] != audit_event_detail["action"] for event in filtered_audit_events):
        raise AssertionError("admin audit-events filter returned wrong action")
    checks.append("admin audit-events filter ok")

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
    self_enroll_slug = f"smoke-self-enroll-{uuid4().hex[:12]}"

    status, self_enroll_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": self_enroll_slug,
            "title": "Smoke Self Enrollment Course",
            "description": "Smoke course for learner self enrollment",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )
    assert_status(status, 201, "self enroll course create")
    assert isinstance(self_enroll_course, dict)
    checks.append("self enrollment course create ok")

    self_enroll_url = "/api/v1/account/courses/" + str(self_enroll_course["id"]) + "/enroll"

    status, self_enrollment = request_json(
        "POST",
        self_enroll_url,
        token=learner_token,
    )
    assert_status(status, 201, "learner self enrollment")
    assert isinstance(self_enrollment, dict)
    assert self_enrollment["course_id"] == self_enroll_course["id"]
    assert self_enrollment["course_slug"] == self_enroll_slug
    checks.append("learner self enrollment ok")

    status, duplicate_self_enrollment = request_json(
        "POST",
        self_enroll_url,
        token=learner_token,
    )
    assert_status(status, 409, "learner duplicate self enrollment")
    assert isinstance(duplicate_self_enrollment, dict)
    checks.append("learner duplicate self enrollment returns 409")

    status, learner_account_courses = request_json(
        "GET",
        "/api/v1/account/courses",
        token=learner_token,
    )
    assert_status(status, 200, "learner account courses after self enrollment")
    assert isinstance(learner_account_courses, dict)
    assert any(
        item["course_id"] == self_enroll_course["id"]
        for item in learner_account_courses["items"]
    )
    checks.append("learner account courses include self enrollment")
    status, completed_self_enrollment = request_json(
        "POST",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]) + "/complete",
        token=learner_token,
    )
    assert_status(status, 200, "learner complete self enrolled course")
    assert isinstance(completed_self_enrollment, dict)
    assert completed_self_enrollment["status"] == "completed"
    checks.append("learner complete self enrolled course ok")

    status, learner_documents_after_completion = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after course completion")
    assert isinstance(learner_documents_after_completion, dict)

    completion_documents = [
        item
        for item in learner_documents_after_completion["items"]
        if item["enrollment_id"] == self_enrollment["enrollment_id"]
    ]

    assert len(completion_documents) == 1
    assert completion_documents[0]["status"] == "draft"
    assert completion_documents[0]["course_id"] == self_enroll_course["id"]
    assert completion_documents[0]["course_slug"] == self_enroll_slug
    assert completion_documents[0]["file_available"] is True
    assert completion_documents[0]["download_available"] is False
    checks.append("learner course completion creates draft document")

    status, filtered_completion_admin_documents = request_json(
        "GET",
        "/api/v1/admin/documents?enrollment_id=" + quote(str(self_enrollment["enrollment_id"]), safe=""),
        token=admin_token,
    )
    assert_status(status, 200, "admin documents filter by enrollment")
    assert isinstance(filtered_completion_admin_documents, list)
    assert len(filtered_completion_admin_documents) == 1
    assert str(filtered_completion_admin_documents[0]["id"]) == str(completion_documents[0]["id"])
    assert filtered_completion_admin_documents[0]["enrollment_id"] == self_enrollment["enrollment_id"]
    checks.append("admin documents filter by enrollment ok")

    frontend_filtered_documents_path = "/admin/documents?enrollment_id=" + quote(
        str(self_enrollment["enrollment_id"]),
        safe="",
    )
    status, frontend_filtered_documents_html, frontend_filtered_documents_headers = request_frontend_text(
        frontend_filtered_documents_path
    )
    assert_status(status, 200, "frontend direct filtered documents route")
    frontend_filtered_documents_content_type = next(
        (
            value
            for key, value in frontend_filtered_documents_headers.items()
            if key.lower() == "content-type"
        ),
        "",
    )
    assert "html" in frontend_filtered_documents_content_type.lower()
    assert "root" in frontend_filtered_documents_html
    checks.append("frontend direct filtered documents route ok")

    admin_completion_suffix = uuid4().hex[:12]
    admin_completion_user_id = filtered_completion_admin_documents[0]["user_id"]

    status, admin_completion_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": f"admin-completion-{admin_completion_suffix}",
            "title": "Admin Completion Auto Document",
            "description": "Smoke course for admin completion document generation",
            "hours": 16,
            "format": "online",
            "document_type": "??????????",
            "is_active": True,
        },
    )
    assert_status(status, 201, "admin completion course create")
    assert isinstance(admin_completion_course, dict)

    status, admin_completion_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=admin_token,
        body={
            "user_id": admin_completion_user_id,
            "course_id": admin_completion_course["id"],
            "status": "assigned",
        },
    )
    assert_status(status, 201, "admin completion enrollment create")
    assert isinstance(admin_completion_enrollment, dict)

    status, completed_admin_enrollment = request_json(
        "PATCH",
        "/api/v1/admin/enrollments/" + str(admin_completion_enrollment["id"]),
        token=admin_token,
        body={
            "status": "completed",
        },
    )
    assert_status(status, 200, "admin complete enrollment")
    assert isinstance(completed_admin_enrollment, dict)
    assert completed_admin_enrollment["status"] == "completed"
    assert completed_admin_enrollment["started_at"]
    assert completed_admin_enrollment["completed_at"]

    status, admin_completion_documents = request_json(
        "GET",
        "/api/v1/admin/documents?enrollment_id="
        + quote(str(admin_completion_enrollment["id"]), safe=""),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion documents filter")
    assert isinstance(admin_completion_documents, list)
    assert len(admin_completion_documents) == 1
    assert admin_completion_documents[0]["enrollment_id"] == admin_completion_enrollment["id"]
    assert admin_completion_documents[0]["status"] == "draft"
    assert admin_completion_documents[0]["file_available"] is True
    checks.append("admin completion creates draft document ok")

    status, deleted_admin_completion_document = request_json(
        "DELETE",
        "/api/v1/admin/documents/" + str(admin_completion_documents[0]["id"]),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion document cleanup delete")
    assert isinstance(deleted_admin_completion_document, dict)

    status, deleted_admin_completion_enrollment = request_json(
        "DELETE",
        "/api/v1/admin/enrollments/" + str(admin_completion_enrollment["id"]),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion enrollment cleanup delete")
    assert isinstance(deleted_admin_completion_enrollment, dict)

    status, deleted_admin_completion_course = request_json(
        "DELETE",
        "/api/v1/admin/courses/" + str(admin_completion_course["id"]),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion course cleanup delete")
    assert isinstance(deleted_admin_completion_course, dict)
    checks.append("admin completion draft document cleanup ok")

    status, draft_download_payload = request_json(
        "GET",
        "/api/v1/account/documents/" + str(completion_documents[0]["id"]) + "/download",
        token=learner_token,
    )
    assert_status(status, 409, "learner draft document download blocked")
    assert isinstance(draft_download_payload, dict)
    checks.append("learner draft document download blocked")

    completion_document_id = str(completion_documents[0]["id"])

    status, published_completion_document = request_form(
        "PATCH",
        f"/api/v1/admin/documents/{completion_document_id}",
        {"status": "available"},
        token=admin_token,
    )
    assert_status(status, 200, "admin publish generated completion document")
    assert isinstance(published_completion_document, dict)
    assert published_completion_document["id"] == completion_document_id
    assert published_completion_document["status"] == "available"
    assert published_completion_document["file_available"] is True
    checks.append("admin publish generated completion document ok")

    status, learner_documents_after_publish = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after generated PDF publish")
    assert isinstance(learner_documents_after_publish, dict)

    published_completion_documents = [
        item
        for item in learner_documents_after_publish["items"]
        if item["id"] == completion_document_id
    ]

    assert len(published_completion_documents) == 1
    assert published_completion_documents[0]["status"] == "available"
    assert published_completion_documents[0]["file_available"] is True
    assert published_completion_documents[0]["download_available"] is True
    checks.append("learner generated completion document becomes downloadable")

    status, generated_pdf_body, generated_pdf_headers = request_binary(
        "GET",
        f"/api/v1/account/documents/{completion_document_id}/download",
        token=learner_token,
    )
    assert_status(status, 200, "learner generated completion PDF download")
    assert generated_pdf_body.startswith(b"%PDF-")
    assert b"%%EOF" in generated_pdf_body
    assert len(generated_pdf_body) > 2_500

    generated_pdf_content_type = (
        generated_pdf_headers.get("Content-Type", "")
        or generated_pdf_headers.get("content-type", "")
    )
    generated_pdf_disposition = (
        generated_pdf_headers.get("Content-Disposition", "")
        or generated_pdf_headers.get("content-disposition", "")
    )

    assert "application/pdf" in generated_pdf_content_type.lower()
    assert completion_documents[0]["document_number"].lower() in generated_pdf_disposition.lower()
    checks.append("learner generated completion PDF download ok")

    status, generated_public_verify_by_number = request_json(
        "GET",
        f"/api/v1/public/documents/verify?number={completion_documents[0]['document_number']}",
    )
    assert_status(status, 200, "public verify generated completion document by number")
    assert isinstance(generated_public_verify_by_number, dict)
    assert generated_public_verify_by_number["document_number"] == completion_documents[0]["document_number"]
    assert generated_public_verify_by_number["verification_code"] == completion_documents[0]["verification_code"]
    assert generated_public_verify_by_number["registry_status"] == "available"
    assert generated_public_verify_by_number["verification_status"] == "Документ подтверждён"
    checks.append("public verify generated completion document by number ok")

    status, generated_public_verify_by_code = request_json(
        "GET",
        f"/api/v1/public/documents/verify?number={completion_documents[0]['verification_code']}",
    )
    assert_status(status, 200, "public verify generated completion document by code")
    assert isinstance(generated_public_verify_by_code, dict)
    assert generated_public_verify_by_code["document_number"] == completion_documents[0]["document_number"]
    assert generated_public_verify_by_code["verification_code"] == completion_documents[0]["verification_code"]
    assert generated_public_verify_by_code["registry_status"] == "available"
    assert generated_public_verify_by_code["verification_status"] == "Документ подтверждён"
    checks.append("public verify generated completion document by code ok")

    frontend_verify_path = "/verify/" + quote(str(completion_documents[0]["verification_code"]), safe="")
    status, frontend_verify_html, frontend_verify_headers = request_frontend_text(frontend_verify_path)
    assert_status(status, 200, "frontend direct generated document verification route")

    frontend_content_type = (
        frontend_verify_headers.get("Content-Type", "")
        or frontend_verify_headers.get("content-type", "")
    )

    assert "text/html" in frontend_content_type.lower()
    assert '<div id="root">' in frontend_verify_html
    assert (
        'src="/src/main.jsx"' in frontend_verify_html
        or "/assets/index-" in frontend_verify_html
        or 'type="module"' in frontend_verify_html
    )
    checks.append("frontend direct generated document verification route ok")

    status, completed_self_enrollment_again = request_json(
        "POST",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]) + "/complete",
        token=learner_token,
    )
    assert_status(status, 200, "learner repeat complete self enrolled course")
    assert isinstance(completed_self_enrollment_again, dict)

    status, learner_documents_after_repeat_completion = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after repeat completion")
    assert isinstance(learner_documents_after_repeat_completion, dict)

    completion_documents_after_repeat = [
        item
        for item in learner_documents_after_repeat_completion["items"]
        if item["enrollment_id"] == self_enrollment["enrollment_id"]
    ]

    assert len(completion_documents_after_repeat) == 1
    checks.append("learner repeat completion does not duplicate completion document")

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
        "DELETE",
        f"/api/v1/admin/organizations/{created_organization_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization delete")
    checks.append("learner organization delete returns 403")

    status, _ = request_json(
        "GET",
        "/api/v1/org/groups",
        token=learner_token,
    )
    assert_status(status, 403, "learner org groups")
    checks.append("learner learning groups returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner org group detail")
    checks.append("learner learning group detail returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": created_organization_id,
            "name": "Forbidden learner group",
            "code": unique_group_code(),
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner org group create")
    checks.append("learner learning group create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/org/groups/{created_group_id}",
        {"name": "Forbidden learner group update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner org group update")
    checks.append("learner learning group update returns 403")

    status, deleted_created_org = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{created_organization_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin created organization cleanup delete")
    assert isinstance(deleted_created_org, dict)
    checks.append("admin created organization cleanup delete ok")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role detail")
    checks.append("learner role detail returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": unique_role_code(), "name": "Forbidden learner role"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role create")
    checks.append("learner role create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{created_role_id}",
        {"name": "Forbidden learner role update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role update")
    checks.append("learner role update returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{created_role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role delete")
    checks.append("learner role delete returns 403")

    status, deleted_created_role = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{created_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin created role cleanup delete")
    assert isinstance(deleted_created_role, dict)
    checks.append("admin created role cleanup delete ok")


    status, _ = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": payments_permission_id},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role permission assign")
    checks.append("learner role permission assign returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions/{assigned_role_permission_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role permission remove")
    checks.append("learner role permission remove returns 403")

    status, removed_role_permission = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions/{assigned_role_permission_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin role permission remove")
    assert isinstance(removed_role_permission, dict)
    checks.append("admin role permission remove ok")

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

    status, _ = request_json(
        "GET",
        "/api/v1/admin/audit-events?action=admin.user_created&limit=5",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin audit-events filter")
    checks.append("learner audit-events filter returns 403")

    print("Smoke auth/RBAC/admin/org API passed:")
    for check in checks:
        print(f" - {check}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
