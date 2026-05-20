from __future__ import annotations

import json
import os
from uuid import uuid4
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("TEST_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("TEST_LEARNER_PASSWORD", "Learner123Local2026!")


def unique_inn() -> str:
    return f"9{uuid4().int % 1_000_000_000:09d}"


def unique_phone() -> str:
    return f"+7999{uuid4().int % 10_000_000:07d}"


def unique_role_code() -> str:
    return f"custom_{uuid4().hex[:12]}"


def unique_group_code() -> str:
    return f"group_{uuid4().hex[:12]}"


def get_user_id_by_email(token: str, email: str) -> str:
    status, users = request_json("GET", "/api/v1/admin/users", token=token)
    assert status == 200
    assert isinstance(users, list)

    for user in users:
        if user["email"] == email:
            return str(user["id"])

    raise AssertionError(f"User not found: {email}")


def get_role_id_by_code(token: str, code: str) -> str:
    status, roles = request_json("GET", "/api/v1/admin/roles", token=token)
    assert status == 200
    assert isinstance(roles, list)

    for role in roles:
        if role["code"] == code:
            return str(role["id"])

    raise AssertionError(f"Role not found: {code}")


def get_permission_id_by_code(token: str, code: str) -> str:
    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=token)
    assert status == 200
    assert isinstance(permissions, list)

    for permission in permissions:
        if permission["code"] == code:
            return str(permission["id"])

    raise AssertionError(f"Permission not found: {code}")


def find_role_permission_id(
    role_detail: dict,
    *,
    permission_code: str,
    required: bool = True,
) -> str | None:
    permissions = role_detail.get("permissions", [])
    assert isinstance(permissions, list)

    for permission in permissions:
        if permission["code"] == permission_code:
            return str(permission["role_permission_id"])

    if required:
        raise AssertionError(f"Role permission not found: {permission_code}")

    return None


def create_test_organization(token: str) -> str:
    inn = unique_inn()

    status, organization = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": inn,
            "name": f"Role assignment test organization {inn}",
        },
        token=token,
    )

    assert status == 201
    assert isinstance(organization, dict)

    return str(organization["id"])


def create_test_learning_group(
    token: str,
    organization_id: str,
    *,
    name: str | None = None,
    code: str | None = None,
) -> dict:
    group_code = code or unique_group_code()
    group_name = name or f"Learning group {group_code}"

    status, group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": organization_id,
            "name": group_name,
            "code": group_code,
            "description": "Autotest learning group",
        },
        token=token,
    )

    assert status == 201
    assert isinstance(group, dict)

    return group


def find_user_role_id(
    user_detail: dict,
    *,
    role_code: str,
    organization_id: str | None = None,
) -> str:
    roles = user_detail.get("roles", [])
    assert isinstance(roles, list)

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

def test_admin_can_read_role_detail() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, roles = request_json("GET", "/api/v1/admin/roles", token=token)
    assert status == 200
    assert isinstance(roles, list)
    assert len(roles) >= 1

    role_id = roles[0]["id"]

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == role_id
    assert detail["code"]
    assert detail["name"]
    assert "created_at" in detail
    assert "updated_at" in detail
    assert isinstance(detail["permissions"], list)


def test_admin_role_detail_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)




def test_admin_can_create_and_update_role() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    role_code = unique_role_code()

    status, created = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": role_code.upper(),
            "name": "Custom manager",
            "description": "Initial custom role",
        },
        token=token,
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["code"] == role_code
    assert created["name"] == "Custom manager"
    assert created["description"] == "Initial custom role"
    assert created["permissions"] == []

    role_id = str(created["id"])

    status, duplicate = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": role_code,
            "name": "Duplicate custom role",
        },
        token=token,
    )
    assert status == 409
    assert isinstance(duplicate, dict)

    status, updated = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{role_id}",
        {
            "name": "Custom manager updated",
            "description": None,
        },
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == role_id
    assert updated["code"] == role_code
    assert updated["name"] == "Custom manager updated"
    assert updated["description"] is None

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.role_created"
        and event["entity_id"] == role_id
        for event in audit_events
    )
    assert any(
        event["action"] == "admin.role_updated"
        and event["entity_id"] == role_id
        for event in audit_events
    )



def test_admin_can_delete_custom_role_and_delete_guards() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    role_code = unique_role_code()

    status, created = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": role_code,
            "name": "Deletable custom role",
            "description": "Role scheduled for deletion",
        },
        token=token,
    )
    assert status == 201
    assert isinstance(created, dict)
    role_id = str(created["id"])

    permission_id = get_permission_id_by_code(token, "payments.write")
    status, role_with_permission = request_json(
        "POST",
        f"/api/v1/admin/roles/{role_id}/permissions",
        {"permission_id": permission_id},
        token=token,
    )
    assert status == 200
    assert isinstance(role_with_permission, dict)
    assert find_role_permission_id(role_with_permission, permission_code="payments.write")

    status, deleted = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{role_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(deleted, dict)
    assert deleted["status"] == "deleted"
    assert deleted["id"] == role_id

    status, missing = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(missing, dict)

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.role_deleted"
        and event["entity_id"] == role_id
        for event in audit_events
    )

    admin_role_id = get_role_id_by_code(token, "admin")
    status, protected = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{admin_role_id}",
        token=token,
    )
    assert status == 400
    assert isinstance(protected, dict)

    assigned_role_code = unique_role_code()
    status, assigned_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": assigned_role_code, "name": "Assigned custom role"},
        token=token,
    )
    assert status == 201
    assert isinstance(assigned_role, dict)
    assigned_role_id = str(assigned_role["id"])
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    status, assigned_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {"role_id": assigned_role_id, "organization_id": None},
        token=token,
    )
    assert status == 200
    assert isinstance(assigned_user, dict)
    assigned_user_role_id = find_user_role_id(
        assigned_user,
        role_code=assigned_role_code,
        organization_id=None,
    )

    status, assigned_role_delete = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{assigned_role_id}",
        token=token,
    )
    assert status == 400
    assert isinstance(assigned_role_delete, dict)

    status, cleaned_user = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{assigned_user_role_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(cleaned_user, dict)

    status, cleaned_role = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{assigned_role_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(cleaned_role, dict)
    assert cleaned_role["status"] == "deleted"

    status, missing_delete = request_json(
        "DELETE",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_delete, dict)


def test_admin_role_update_guards() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_role_id = get_role_id_by_code(token, "admin")

    status, payload = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{admin_role_id}",
        {"name": "Forbidden admin rename"},
        token=token,
    )
    assert status == 400
    assert isinstance(payload, dict)

    status, payload = request_json(
        "PATCH",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        {"name": "Missing role"},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": "Bad Code With Spaces", "name": "Bad role"},
        token=token,
    )
    assert status == 422
    assert isinstance(payload, dict)


def test_learner_cannot_create_update_or_delete_role() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    role_id = get_role_id_by_code(admin_token, "teacher")

    status, payload = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": unique_role_code(), "name": "Forbidden role"},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{role_id}",
        {"name": "Forbidden role update"},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{role_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_assign_and_remove_role_permission() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    role_id = get_role_id_by_code(token, "teacher")
    permission_id = get_permission_id_by_code(token, "payments.write")

    status, initial_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(initial_detail, dict)

    existing_role_permission_id = find_role_permission_id(
        initial_detail,
        permission_code="payments.write",
        required=False,
    )

    if existing_role_permission_id:
        status, cleanup = request_json(
            "DELETE",
            f"/api/v1/admin/roles/{role_id}/permissions/{existing_role_permission_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(cleanup, dict)

    status, updated = request_json(
        "POST",
        f"/api/v1/admin/roles/{role_id}/permissions",
        {"permission_id": permission_id},
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == role_id

    role_permission_id = find_role_permission_id(
        updated,
        permission_code="payments.write",
    )

    status, duplicate = request_json(
        "POST",
        f"/api/v1/admin/roles/{role_id}/permissions",
        {"permission_id": permission_id},
        token=token,
    )
    assert status == 409
    assert isinstance(duplicate, dict)

    status, removed = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{role_id}/permissions/{role_permission_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(removed, dict)
    assert removed["id"] == role_id
    assert find_role_permission_id(
        removed,
        permission_code="payments.write",
        required=False,
    ) is None

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.role_permission_assigned"
        and event["entity_id"] == role_id
        for event in audit_events
    )
    assert any(
        event["action"] == "admin.role_permission_removed"
        and event["entity_id"] == role_id
        for event in audit_events
    )


def test_admin_role_permission_write_missing_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    role_id = get_role_id_by_code(token, "teacher")
    permission_id = get_permission_id_by_code(token, "payments.write")
    missing_id = "00000000-0000-0000-0000-000000000000"

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/roles/{missing_id}/permissions",
        {"permission_id": permission_id},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/roles/{role_id}/permissions",
        {"permission_id": missing_id},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{role_id}/permissions/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)


def test_admin_role_permissions_are_protected() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_role_id = get_role_id_by_code(token, "admin")
    permission_id = get_permission_id_by_code(token, "admin.roles.write")

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/roles/{admin_role_id}/permissions",
        {"permission_id": permission_id},
        token=token,
    )

    assert status == 400
    assert isinstance(payload, dict)


def test_learner_cannot_assign_or_remove_role_permission() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    role_id = get_role_id_by_code(admin_token, "teacher")
    permission_id = get_permission_id_by_code(admin_token, "payments.write")

    status, initial_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=admin_token,
    )
    assert status == 200
    assert isinstance(initial_detail, dict)

    existing_role_permission_id = find_role_permission_id(
        initial_detail,
        permission_code="payments.write",
        required=False,
    )

    if existing_role_permission_id:
        status, cleanup = request_json(
            "DELETE",
            f"/api/v1/admin/roles/{role_id}/permissions/{existing_role_permission_id}",
            token=admin_token,
        )
        assert status == 200
        assert isinstance(cleanup, dict)

    status, assigned = request_json(
        "POST",
        f"/api/v1/admin/roles/{role_id}/permissions",
        {"permission_id": permission_id},
        token=admin_token,
    )
    assert status == 200
    assert isinstance(assigned, dict)

    role_permission_id = find_role_permission_id(
        assigned,
        permission_code="payments.write",
    )

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/roles/{role_id}/permissions",
        {"permission_id": permission_id},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{role_id}/permissions/{role_permission_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    cleanup_status, cleanup_payload = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{role_id}/permissions/{role_permission_id}",
        token=admin_token,
    )
    assert cleanup_status == 200
    assert isinstance(cleanup_payload, dict)

def test_learner_cannot_read_role_detail() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, roles = request_json("GET", "/api/v1/admin/roles", token=admin_token)
    assert status == 200
    assert isinstance(roles, list)
    assert len(roles) >= 1

    role_id = roles[0]["id"]

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_read_permission_detail() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=token)
    assert status == 200
    assert isinstance(permissions, list)
    assert len(permissions) >= 1

    permission_id = permissions[0]["id"]

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/permissions/{permission_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == permission_id
    assert detail["code"]
    assert detail["name"]
    assert "created_at" in detail
    assert "updated_at" in detail
    assert isinstance(detail["roles"], list)


def test_admin_permission_detail_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/permissions/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_read_permission_detail() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=admin_token)
    assert status == 200
    assert isinstance(permissions, list)
    assert len(permissions) >= 1

    permission_id = permissions[0]["id"]

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/permissions/{permission_id}",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_read_audit_event_detail() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert len(audit_events) >= 1

    audit_event_id = audit_events[0]["id"]

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/audit-events/{audit_event_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == audit_event_id
    assert detail["action"]
    assert "actor_user_id" in detail
    assert "entity_type" in detail
    assert "entity_id" in detail
    assert "ip_address" in detail
    assert "user_agent" in detail
    assert isinstance(detail["payload"], dict)
    assert "created_at" in detail


def test_admin_audit_event_detail_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/audit-events/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_read_audit_event_detail() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=admin_token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert len(audit_events) >= 1

    audit_event_id = audit_events[0]["id"]

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/audit-events/{audit_event_id}",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_create_and_update_organization() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    inn = unique_inn()

    create_payload = {
        "inn": inn,
        "kpp": "027801001",
        "ogrn": "1020200000000",
        "name": f"???????? ??????????? {inn}",
        "legal_address": "450000, ?????????? ????????????, ?. ???, ???????? ?????",
        "actual_address": "450000, ?????????? ????????????, ?. ???, ???????? ?????",
        "document_issuer_name": f"Document issuer {inn}",
        "document_signer_position": "Director",
        "document_signer_name": "Ivanov I.I.",
        "document_basis": "License test basis",
        "document_place": "Ufa",
    }

    status, created = request_json(
        "POST",
        "/api/v1/admin/organizations",
        create_payload,
        token=token,
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["id"]
    assert created["inn"] == inn
    assert created["name"] == create_payload["name"]
    assert created["document_issuer_name"] == create_payload["document_issuer_name"]
    assert created["document_signer_position"] == "Director"
    assert created["document_signer_name"] == "Ivanov I.I."
    assert created["document_basis"] == "License test basis"
    assert created["document_place"] == "Ufa"
    assert "created_at" in created
    assert "updated_at" in created

    organization_id = created["id"]
    updated_name = f"??????????? ??????????? {inn}"

    status, updated = request_json(
        "PATCH",
        f"/api/v1/admin/organizations/{organization_id}",
        {
            "name": updated_name,
            "actual_address": "450000, ?????????? ????????????, ?. ???, ??????????? ?????",
            "document_issuer_name": f"Updated document issuer {inn}",
            "document_signer_position": "Head of education",
            "document_signer_name": "Petrov P.P.",
            "document_basis": "Updated license test basis",
            "document_place": "Ufa updated",
        },
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == organization_id
    assert updated["inn"] == inn
    assert updated["name"] == updated_name
    assert updated["document_issuer_name"] == f"Updated document issuer {inn}"
    assert updated["document_signer_position"] == "Head of education"
    assert updated["document_signer_name"] == "Petrov P.P."
    assert updated["document_basis"] == "Updated license test basis"
    assert updated["document_place"] == "Ufa updated"

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.organization_created"
        and event["entity_id"] == organization_id
        for event in audit_events
    )
    assert any(
        event["action"] == "admin.organization_updated"
        and event["entity_id"] == organization_id
        for event in audit_events
    )


def test_admin_create_organization_duplicate_inn_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    inn = unique_inn()

    payload = {
        "inn": inn,
        "name": f"???????? ??? {inn}",
    }

    status, created = request_json(
        "POST",
        "/api/v1/admin/organizations",
        payload,
        token=token,
    )

    assert status == 201
    assert isinstance(created, dict)

    status, duplicate = request_json(
        "POST",
        "/api/v1/admin/organizations",
        payload,
        token=token,
    )

    assert status == 409
    assert isinstance(duplicate, dict)


def test_admin_update_organization_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "PATCH",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        {"name": "?????????????? ???????????"},
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_admin_can_delete_unused_organization() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)

    status, deleted = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{organization_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(deleted, dict)
    assert deleted["status"] == "deleted"
    assert deleted["id"] == organization_id

    status, missing = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(missing, dict)

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.organization_deleted"
        and event["entity_id"] == organization_id
        for event in audit_events
    )


def test_admin_cannot_delete_organization_assigned_to_user() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)
    teacher_role_id = get_role_id_by_code(token, "teacher")
    organization_id = create_test_organization(token)

    status, updated = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": organization_id,
        },
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)

    user_role_id = find_user_role_id(
        updated,
        role_code="teacher",
        organization_id=organization_id,
    )

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{organization_id}",
        token=token,
    )
    assert status == 400
    assert isinstance(payload, dict)

    cleanup_status, cleanup_payload = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{user_role_id}",
        token=token,
    )
    assert cleanup_status == 200
    assert isinstance(cleanup_payload, dict)

    status, deleted = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{organization_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(deleted, dict)


def test_admin_delete_organization_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "DELETE",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_create_or_update_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    inn = unique_inn()

    create_payload = {
        "inn": inn,
        "name": f"??????????? ??? ???????? ???? {inn}",
    }

    status, created = request_json(
        "POST",
        "/api/v1/admin/organizations",
        create_payload,
        token=admin_token,
    )

    assert status == 201
    assert isinstance(created, dict)
    organization_id = created["id"]

    status, payload = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": unique_inn(),
            "name": "??????????? ???????????",
        },
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "PATCH",
        f"/api/v1/admin/organizations/{organization_id}",
        {"name": "??????????? ??????????"},
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{organization_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_create_user_and_created_user_can_login() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    suffix = uuid4().hex[:10]
    email = f"created-{suffix}@obrportal.local"
    password = "CreatedUser123!"
    phone = unique_phone()

    status, created = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": f"  {email.upper()}  ",
            "password": password,
            "full_name": "Created test user",
            "phone": phone,
            "is_active": True,
            "is_email_verified": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["id"]
    assert created["email"] == email
    assert created["phone"] == phone
    assert created["full_name"] == "Created test user"
    assert created["is_active"] is True
    assert created["is_email_verified"] is True
    assert created["mfa_enabled"] is False
    assert created["roles"] == []

    created_user_token = login(email, password)
    assert created_user_token

    status, duplicate = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": email,
            "password": password,
        },
        token=token,
    )
    assert status == 409
    assert isinstance(duplicate, dict)

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.user_created"
        and event["entity_id"] == created["id"]
        for event in audit_events
    )


def test_admin_can_reset_user_password() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    suffix = uuid4().hex[:10]
    email = f"password-reset-{suffix}@obrportal.local"
    initial_password = "InitialUser123!"
    new_password = "ResetUser123!"

    status, created = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": email,
            "password": initial_password,
            "full_name": "Password reset test user",
            "is_active": True,
            "is_email_verified": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(created, dict)
    user_id = created["id"]

    assert login(email, initial_password)

    status, updated = request_json(
        "POST",
        f"/api/v1/admin/users/{user_id}/password",
        {"password": new_password},
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == user_id
    assert "password" not in updated
    assert "hashed_password" not in updated

    status, old_password_payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": email, "password": initial_password},
    )
    assert status == 401
    assert isinstance(old_password_payload, dict)

    assert login(email, new_password)

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.user_password_reset"
        and event["entity_id"] == user_id
        and initial_password not in json.dumps(event.get("payload", {}))
        and new_password not in json.dumps(event.get("payload", {}))
        for event in audit_events
    )


def test_learner_cannot_create_user() -> None:
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, payload = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": f"forbidden-{uuid4().hex[:10]}@obrportal.local",
            "password": "Forbidden123!",
        },
        token=learner_token,
    )

    assert status == 403
    assert isinstance(payload, dict)


def test_admin_can_update_user() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    user_id = get_user_id_by_email(token, LEARNER_EMAIL)
    phone = unique_phone()

    status, updated = request_json(
        "PATCH",
        f"/api/v1/admin/users/{user_id}",
        {
            "full_name": f"Updated learner {phone}",
            "phone": phone,
            "is_email_verified": False,
        },
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == user_id
    assert updated["phone"] == phone
    assert updated["full_name"] == f"Updated learner {phone}"
    assert updated["is_email_verified"] is False

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.user_updated"
        and event["entity_id"] == user_id
        for event in audit_events
    )


def test_admin_can_deactivate_and_activate_user() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    status, deactivated = request_json(
        "POST",
        f"/api/v1/admin/users/{user_id}/deactivate",
        token=token,
    )

    assert status == 200
    assert isinstance(deactivated, dict)
    assert deactivated["id"] == user_id
    assert deactivated["is_active"] is False

    status, activated = request_json(
        "POST",
        f"/api/v1/admin/users/{user_id}/activate",
        token=token,
    )

    assert status == 200
    assert isinstance(activated, dict)
    assert activated["id"] == user_id
    assert activated["is_active"] is True

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.user_deactivated"
        and event["entity_id"] == user_id
        for event in audit_events
    )
    assert any(
        event["action"] == "admin.user_activated"
        and event["entity_id"] == user_id
        for event in audit_events
    )


def test_admin_user_write_missing_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    missing_user_id = "00000000-0000-0000-0000-000000000000"

    status, payload = request_json(
        "PATCH",
        f"/api/v1/admin/users/{missing_user_id}",
        {"full_name": "Missing user"},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{missing_user_id}/password",
        {"password": "MissingUser123!"},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{missing_user_id}/activate",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{missing_user_id}/deactivate",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)


def test_admin_cannot_deactivate_last_active_admin() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_user_id = get_user_id_by_email(token, ADMIN_EMAIL)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{admin_user_id}/deactivate",
        token=token,
    )

    assert status == 400
    assert isinstance(payload, dict)


def test_learner_cannot_update_activate_or_deactivate_user() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_user_id = get_user_id_by_email(admin_token, LEARNER_EMAIL)

    status, activated = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/activate",
        token=admin_token,
    )
    assert status == 200
    assert isinstance(activated, dict)

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, payload = request_json(
        "PATCH",
        f"/api/v1/admin/users/{learner_user_id}",
        {"full_name": "Forbidden update"},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/password",
        {"password": "ForbiddenReset123!"},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/deactivate",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/activate",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_assign_and_remove_user_role() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)
    teacher_role_id = get_role_id_by_code(token, "teacher")
    organization_id = create_test_organization(token)

    status, updated = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": organization_id,
        },
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == learner_user_id

    user_role_id = find_user_role_id(
        updated,
        role_code="teacher",
        organization_id=organization_id,
    )

    status, duplicate = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": organization_id,
        },
        token=token,
    )

    assert status == 409
    assert isinstance(duplicate, dict)

    status, removed = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{user_role_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(removed, dict)
    assert removed["id"] == learner_user_id

    assert not any(
        role["id"] == user_role_id
        for role in removed["roles"]
    )

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=token)
    assert status == 200
    assert isinstance(audit_events, list)
    assert any(
        event["action"] == "admin.user_role_assigned"
        and event["entity_id"] == learner_user_id
        for event in audit_events
    )
    assert any(
        event["action"] == "admin.user_role_removed"
        and event["entity_id"] == learner_user_id
        for event in audit_events
    )


def test_admin_user_role_write_missing_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)
    teacher_role_id = get_role_id_by_code(token, "teacher")
    organization_id = create_test_organization(token)
    missing_id = "00000000-0000-0000-0000-000000000000"

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{missing_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": organization_id,
        },
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": missing_id,
            "organization_id": organization_id,
        },
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": missing_id,
        },
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)


def test_admin_cannot_remove_last_admin_role_from_last_active_admin() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    admin_user_id = get_user_id_by_email(token, ADMIN_EMAIL)

    status, admin_detail = request_json(
        "GET",
        f"/api/v1/admin/users/{admin_user_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(admin_detail, dict)

    admin_user_role_id = find_user_role_id(
        admin_detail,
        role_code="admin",
        organization_id=None,
    )

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/users/{admin_user_id}/roles/{admin_user_role_id}",
        token=token,
    )

    assert status == 400
    assert isinstance(payload, dict)


def test_learner_cannot_assign_or_remove_user_role() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_user_id = get_user_id_by_email(admin_token, LEARNER_EMAIL)
    teacher_role_id = get_role_id_by_code(admin_token, "teacher")
    organization_id = create_test_organization(admin_token)

    status, assigned = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": organization_id,
        },
        token=admin_token,
    )

    assert status == 200
    assert isinstance(assigned, dict)

    user_role_id = find_user_role_id(
        assigned,
        role_code="teacher",
        organization_id=organization_id,
    )

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, payload = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": organization_id,
        },
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{user_role_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    cleanup_status, cleanup_payload = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{user_role_id}",
        token=admin_token,
    )
    assert cleanup_status == 200
    assert isinstance(cleanup_payload, dict)



def test_admin_can_filter_audit_events() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    inn = unique_inn()

    status, organization = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": inn,
            "name": f"Audit filter organization {inn}",
        },
        token=token,
    )

    assert status == 201
    assert isinstance(organization, dict)
    organization_id = str(organization["id"])

    status, events = request_json(
        "GET",
        f"/api/v1/admin/audit-events?action=admin.organization_created&entity_type=organization&entity_id={organization_id}&limit=5",
        token=token,
    )

    assert status == 200
    assert isinstance(events, list)
    assert 1 <= len(events) <= 5
    assert all(event["action"] == "admin.organization_created" for event in events)
    assert all(event["entity_type"] == "organization" for event in events)
    assert all(event["entity_id"] == organization_id for event in events)

    status, limited_events = request_json(
        "GET",
        "/api/v1/admin/audit-events?limit=1",
        token=token,
    )

    assert status == 200
    assert isinstance(limited_events, list)
    assert len(limited_events) <= 1

    status, payload = request_json(
        "GET",
        "/api/v1/admin/audit-events?action=admin.organization_created&limit=5",
        token=login(LEARNER_EMAIL, LEARNER_PASSWORD),
    )

    assert status == 403
    assert isinstance(payload, dict)


def test_admin_can_create_list_filter_read_and_update_learning_group() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group_code = unique_group_code()
    group_name = f"Learning group {group_code}"

    status, created = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": organization_id,
            "name": f"  {group_name}  ",
            "code": f"  {group_code}  ",
            "description": "  Initial group description  ",
        },
        token=token,
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["organization_id"] == organization_id
    assert created["name"] == group_name
    assert created["code"] == group_code
    assert created["description"] == "Initial group description"
    assert created["is_active"] is True
    assert "created_at" in created
    assert "updated_at" in created

    group_id = str(created["id"])

    status, groups = request_json("GET", "/api/v1/org/groups", token=token)
    assert status == 200
    assert isinstance(groups, list)
    assert any(group["id"] == group_id for group in groups)

    status, filtered_groups = request_json(
        "GET",
        f"/api/v1/org/groups?organization_id={organization_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(filtered_groups, list)
    assert any(group["id"] == group_id for group in filtered_groups)
    assert all(group["organization_id"] == organization_id for group in filtered_groups)

    status, detail = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}",
        token=token,
    )
    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == group_id
    assert detail["organization_id"] == organization_id

    updated_name = f"{group_name} updated"
    status, updated = request_json(
        "PATCH",
        f"/api/v1/org/groups/{group_id}",
        {
            "name": updated_name,
            "description": None,
            "is_active": False,
        },
        token=token,
    )
    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == group_id
    assert updated["name"] == updated_name
    assert updated["description"] is None
    assert updated["is_active"] is False


def test_learning_group_duplicate_name_or_code_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group_code = unique_group_code()
    group_name = f"Duplicate group {group_code}"

    created = create_test_learning_group(
        token,
        organization_id,
        name=group_name,
        code=group_code,
    )
    assert created["name"] == group_name
    assert created["code"] == group_code

    status, duplicate_name = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": organization_id,
            "name": group_name,
            "code": unique_group_code(),
        },
        token=token,
    )
    assert status == 409
    assert isinstance(duplicate_name, dict)

    status, duplicate_code = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": organization_id,
            "name": f"{group_name} another",
            "code": group_code,
        },
        token=token,
    )
    assert status == 409
    assert isinstance(duplicate_code, dict)


def test_learning_group_missing_organization_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    missing_id = "00000000-0000-0000-0000-000000000000"

    status, create_payload = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": missing_id,
            "name": "Missing organization group",
            "code": unique_group_code(),
        },
        token=token,
    )
    assert status == 404
    assert isinstance(create_payload, dict)

    status, list_payload = request_json(
        "GET",
        f"/api/v1/org/groups?organization_id={missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(list_payload, dict)

    status, group_payload = request_json(
        "GET",
        "/api/v1/org/groups/00000000-0000-0000-0000-000000000000",
        token=token,
    )
    assert status == 404
    assert isinstance(group_payload, dict)

    status, update_payload = request_json(
        "PATCH",
        "/api/v1/org/groups/00000000-0000-0000-0000-000000000000",
        {"name": "Missing group"},
        token=token,
    )
    assert status == 404
    assert isinstance(update_payload, dict)


def test_learner_cannot_access_learning_groups_api() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    organization_id = create_test_organization(admin_token)
    group = create_test_learning_group(admin_token, organization_id)
    group_id = str(group["id"])

    status, payload = request_json(
        "GET",
        "/api/v1/org/groups",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": organization_id,
            "name": "Forbidden group",
            "code": unique_group_code(),
        },
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "PATCH",
        f"/api/v1/org/groups/{group_id}",
        {"name": "Forbidden update"},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

def test_admin_can_delete_learning_group() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])

    status, payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group_id}",
        token=token,
    )
    assert status == 204
    assert payload is None

    status, payload = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)


def test_admin_delete_learning_group_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "DELETE",
        "/api/v1/org/groups/00000000-0000-0000-0000-000000000000",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)




def test_org_rep_learning_groups_are_limited_to_assigned_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    first_group = create_test_learning_group(
        admin_token,
        first_organization_id,
        name=f"Scoped own group {unique_group_code()}",
        code=unique_group_code(),
    )
    second_group = create_test_learning_group(
        admin_token,
        second_organization_id,
        name=f"Scoped foreign group {unique_group_code()}",
        code=unique_group_code(),
    )

    first_group_id = str(first_group["id"])
    second_group_id = str(second_group["id"])

    org_rep_email = f"org_rep_scope_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgRepScope123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Scoped organization representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)
    org_rep_user_id = str(org_rep_user["id"])

    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    status, scoped_user = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user_id}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200
    assert isinstance(scoped_user, dict)

    org_rep_token = login(org_rep_email, org_rep_password)

    status, groups = request_json("GET", "/api/v1/org/groups", token=org_rep_token)
    assert status == 200
    assert isinstance(groups, list)
    assert any(group["id"] == first_group_id for group in groups)
    assert all(group["organization_id"] == first_organization_id for group in groups)
    assert all(group["id"] != second_group_id for group in groups)

    status, own_filtered_groups = request_json(
        "GET",
        f"/api/v1/org/groups?organization_id={first_organization_id}",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(own_filtered_groups, list)
    assert any(group["id"] == first_group_id for group in own_filtered_groups)
    assert all(
        group["organization_id"] == first_organization_id
        for group in own_filtered_groups
    )

    status, foreign_filtered_groups = request_json(
        "GET",
        f"/api/v1/org/groups?organization_id={second_organization_id}",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_filtered_groups, dict)

    status, own_detail = request_json(
        "GET",
        f"/api/v1/org/groups/{first_group_id}",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(own_detail, dict)
    assert own_detail["id"] == first_group_id
    assert own_detail["organization_id"] == first_organization_id

    status, foreign_detail = request_json(
        "GET",
        f"/api/v1/org/groups/{second_group_id}",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_detail, dict)

    status, created_own_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": first_organization_id,
            "name": f"Scoped created own group {unique_group_code()}",
            "code": unique_group_code(),
        },
        token=org_rep_token,
    )
    assert status == 201
    assert isinstance(created_own_group, dict)
    created_own_group_id = str(created_own_group["id"])
    assert created_own_group["organization_id"] == first_organization_id

    status, created_foreign_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": second_organization_id,
            "name": f"Scoped created foreign group {unique_group_code()}",
            "code": unique_group_code(),
        },
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(created_foreign_group, dict)

    status, updated_own_group = request_json(
        "PATCH",
        f"/api/v1/org/groups/{created_own_group_id}",
        {
            "name": f"Scoped updated own group {unique_group_code()}",
            "is_active": False,
        },
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(updated_own_group, dict)
    assert updated_own_group["id"] == created_own_group_id
    assert updated_own_group["is_active"] is False

    status, updated_foreign_group = request_json(
        "PATCH",
        f"/api/v1/org/groups/{second_group_id}",
        {"name": f"Scoped forbidden update {unique_group_code()}"},
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(updated_foreign_group, dict)

    status, own_members = request_json(
        "GET",
        f"/api/v1/org/groups/{first_group_id}/members",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(own_members, list)

    status, foreign_members = request_json(
        "GET",
        f"/api/v1/org/groups/{second_group_id}/members",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_members, dict)

    status, added_member = request_json(
        "POST",
        f"/api/v1/org/groups/{first_group_id}/members",
        {"user_id": org_rep_user_id},
        token=org_rep_token,
    )
    assert status == 201
    assert isinstance(added_member, dict)
    assert added_member["learning_group_id"] == first_group_id
    assert added_member["user_id"] == org_rep_user_id

    status, foreign_member_add = request_json(
        "POST",
        f"/api/v1/org/groups/{second_group_id}/members",
        {"user_id": org_rep_user_id},
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_member_add, dict)

    status, removed_member = request_json(
        "DELETE",
        f"/api/v1/org/groups/{first_group_id}/members/{org_rep_user_id}",
        token=org_rep_token,
    )
    assert status == 204
    assert removed_member is None

    status, deleted_own_group = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_own_group_id}",
        token=org_rep_token,
    )
    assert status == 204
    assert deleted_own_group is None

    status, deleted_foreign_group = request_json(
        "DELETE",
        f"/api/v1/org/groups/{second_group_id}",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(deleted_foreign_group, dict)


def test_learner_cannot_delete_learning_group() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    organization_id = create_test_organization(admin_token)
    group = create_test_learning_group(admin_token, organization_id)
    group_id = str(group["id"])

    status, payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)
def test_public_register_returns_token_and_me() -> None:
    email = f"public_{uuid4().hex[:12]}@example.com"
    password = "Public123Local2026!"
    phone = unique_phone()

    status, payload = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": email.upper(),
            "password": password,
            "full_name": "Public User",
            "phone": phone,
        },
    )

    assert status == 201
    assert isinstance(payload, dict)
    assert payload["access_token"]

    token = str(payload["access_token"])

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    assert me_payload["email"] == email
    assert me_payload["full_name"] == "Public User"
    assert me_payload["is_active"] is True
    assert me_payload["is_email_verified"] is False
    assert me_payload["mfa_enabled"] is False
    assert me_payload["roles"] == []

    login_token = login(email, password)
    assert login_token


def test_public_register_duplicate_email_returns_409() -> None:
    email = f"dup_{uuid4().hex[:12]}@example.com"

    first_status, first_payload = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": email,
            "password": "Public123Local2026!",
            "full_name": "Duplicate Email User",
        },
    )
    assert first_status == 201
    assert isinstance(first_payload, dict)

    status, payload = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": email.upper(),
            "password": "Public123Local2026!",
            "full_name": "Duplicate Email User 2",
        },
    )

    assert status == 409
    assert isinstance(payload, dict)


def test_public_register_duplicate_phone_returns_409() -> None:
    phone = unique_phone()

    first_status, first_payload = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": f"phonea_{uuid4().hex[:12]}@example.com",
            "password": "Public123Local2026!",
            "full_name": "Phone A",
            "phone": phone,
        },
    )
    assert first_status == 201
    assert isinstance(first_payload, dict)

    status, payload = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": f"phoneb_{uuid4().hex[:12]}@example.com",
            "password": "Public123Local2026!",
            "full_name": "Phone B",
            "phone": phone,
        },
    )

    assert status == 409
    assert isinstance(payload, dict)
def test_admin_can_get_account_summary() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/account/summary",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert isinstance(payload["enrollments_count"], int)
    assert payload["enrollments_count"] >= 0
    assert isinstance(payload["active_courses_count"], int)
    assert payload["active_courses_count"] >= 0
    assert payload["active_courses_count"] <= payload["enrollments_count"]
    assert isinstance(payload["documents_count"], int)
    assert payload["documents_count"] >= 0
    assert isinstance(payload["profile"], dict)
    assert payload["profile"]["email"] == ADMIN_EMAIL

def test_learner_can_get_account_summary() -> None:
    token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/account/summary",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert isinstance(payload["enrollments_count"], int)
    assert payload["enrollments_count"] >= 0
    assert isinstance(payload["active_courses_count"], int)
    assert payload["active_courses_count"] >= 0
    assert payload["active_courses_count"] <= payload["enrollments_count"]
    assert isinstance(payload["documents_count"], int)
    assert payload["documents_count"] >= 0
    assert isinstance(payload["profile"], dict)
    assert payload["profile"]["email"] == LEARNER_EMAIL

def test_account_summary_without_token_returns_401() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/account/summary",
    )

    assert status == 401
    assert isinstance(payload, dict)
def unique_course_slug() -> str:
    from uuid import uuid4

    return f"course-{uuid4().hex[:12]}"


def create_test_course_in_db(
    *,
    title: str | None = None,
    slug: str | None = None,
    description: str | None = "Test course description",
    hours: int | None = 24,
    format_: str | None = "Онлайн",
    document_type: str | None = "Сертификат",
) -> dict:
    import asyncio
    from uuid import uuid4

    import app.db.base  # noqa: F401
    from app.core.config import settings
    from app.models.course import Course
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    course_title = title or f"Test Course {uuid4().hex[:8]}"
    course_slug = slug or unique_course_slug()

    async def _create() -> dict:
        engine = create_async_engine(settings.database_url, future=True)
        SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

        try:
            async with SessionLocal() as session:
                course = Course(
                    title=course_title,
                    slug=course_slug,
                    description=description,
                    hours=hours,
                    format=format_,
                    document_type=document_type,
                    is_active=True,
                )
                session.add(course)
                await session.commit()
                await session.refresh(course)

                return {
                    "id": str(course.id),
                    "title": course.title,
                    "slug": course.slug,
                }
        finally:
            await engine.dispose()

    return asyncio.run(_create())


def create_test_course_with_enrollment_in_db(
    *,
    user_id: str,
    title: str | None = None,
    slug: str | None = None,
    description: str | None = "Test course description",
    hours: int | None = 24,
    format_: str | None = "Онлайн",
    document_type: str | None = "Сертификат",
    organization_id: str | None = None,
    learning_group_id: str | None = None,
    status: str = "assigned",
) -> dict:
    import asyncio
    from uuid import uuid4

    import app.db.base  # noqa: F401
    from app.core.config import settings
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    course_title = title or f"Test Course {uuid4().hex[:8]}"
    course_slug = slug or unique_course_slug()

    async def _create() -> dict:
        engine = create_async_engine(settings.database_url, future=True)
        SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

        try:
            async with SessionLocal() as session:
                course = Course(
                    title=course_title,
                    slug=course_slug,
                    description=description,
                    hours=hours,
                    format=format_,
                    document_type=document_type,
                    is_active=True,
                )
                session.add(course)
                await session.flush()

                enrollment = Enrollment(
                    user_id=user_id,
                    course_id=course.id,
                    organization_id=organization_id,
                    learning_group_id=learning_group_id,
                    status=status,
                )
                session.add(enrollment)
                await session.commit()
                await session.refresh(course)
                await session.refresh(enrollment)

                return {
                    "course": {
                        "id": str(course.id),
                        "title": course.title,
                        "slug": course.slug,
                    },
                    "enrollment": {
                        "id": str(enrollment.id),
                        "user_id": str(enrollment.user_id),
                        "course_id": str(enrollment.course_id),
                        "organization_id": str(enrollment.organization_id) if enrollment.organization_id else None,
                        "learning_group_id": str(enrollment.learning_group_id) if enrollment.learning_group_id else None,
                        "status": enrollment.status,
                    },
                }
        finally:
            await engine.dispose()

    return asyncio.run(_create())


def test_admin_can_filter_enrollments_by_organization() -> None:
    from urllib.parse import urlencode

    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    first_organization_id = create_test_organization(token)
    second_organization_id = create_test_organization(token)

    first_created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        organization_id=first_organization_id,
        status="active",
    )
    second_created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        organization_id=second_organization_id,
        status="active",
    )

    first_enrollment_id = first_created["enrollment"]["id"]
    second_enrollment_id = second_created["enrollment"]["id"]

    query = urlencode(
        {
            "organization_id": first_organization_id,
            "limit": 300,
        }
    )

    status, enrollments = request_json(
        "GET",
        f"/api/v1/admin/enrollments?{query}",
        token=token,
    )

    assert status == 200
    assert isinstance(enrollments, list)
    assert any(item["id"] == first_enrollment_id for item in enrollments)
    assert all(item["organization_id"] == first_organization_id for item in enrollments)
    assert not any(item["id"] == second_enrollment_id for item in enrollments)

    summary_query = urlencode(
        {
            "enrollments_organization_id": first_organization_id,
        }
    )

    status, summary = request_json(
        "GET",
        f"/api/v1/admin/worklist-summary?{summary_query}",
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)
    assert summary["enrollments"]["total"] >= 1


def test_admin_can_get_account_courses() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        organization_id=organization_id,
        learning_group_id=group_id,
        status="active",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    status, payload = request_json(
        "GET",
        "/api/v1/account/courses",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["total"] >= 1
    assert isinstance(payload["items"], list)

    item = next(
        (candidate for candidate in payload["items"] if candidate["enrollment_id"] == enrollment["id"]),
        None,
    )
    assert item is not None
    assert item["course_id"] == course["id"]
    assert item["course_slug"] == course["slug"]
    assert item["course_title"] == course["title"]
    assert item["organization_id"] == organization_id
    assert item["learning_group_id"] == group_id
    assert item["status"] == "active"


def test_learner_can_get_account_courses() -> None:
    token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="assigned",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    status, payload = request_json(
        "GET",
        "/api/v1/account/courses",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["total"] >= 1
    assert isinstance(payload["items"], list)

    item = next(
        (candidate for candidate in payload["items"] if candidate["enrollment_id"] == enrollment["id"]),
        None,
    )
    assert item is not None
    assert item["course_id"] == course["id"]
    assert item["course_slug"] == course["slug"]
    assert item["course_title"] == course["title"]
    assert item["organization_id"] is None
    assert item["learning_group_id"] is None
    assert item["status"] == "assigned"


def test_account_courses_without_token_returns_401() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/account/courses",
    )

    assert status == 401
    assert isinstance(payload, dict)


def unique_document_number() -> str:
    from uuid import uuid4

    return f"DOC-{uuid4().hex[:12].upper()}"


def create_test_document_record_in_db(
    *,
    user_id: str,
    course_id: str | None = None,
    enrollment_id: str | None = None,
    title: str | None = None,
    document_type: str = "Сертификат",
    status: str = "available",
    file_url: str | None = None,
    storage_content: bytes | None = None,
    storage_extension: str = ".pdf",
) -> dict:
    import asyncio
    from pathlib import Path
    from uuid import uuid4

    import app.db.base  # noqa: F401
    from app.core.config import settings
    from app.models.document_record import DocumentRecord
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    document_title = title or f"Document {uuid4().hex[:8]}"
    document_number = unique_document_number()
    storage_path = None

    if storage_content is not None:
        storage_root = Path(settings.document_storage_dir)
        storage_root.mkdir(parents=True, exist_ok=True)

        relative_path = Path("tests") / f"{document_number.lower()}{storage_extension}"
        absolute_path = storage_root / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(storage_content)
        storage_path = relative_path.as_posix()

    async def _create() -> dict:
        engine = create_async_engine(settings.database_url, future=True)
        SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

        try:
            async with SessionLocal() as session:
                document = DocumentRecord(
                    user_id=user_id,
                    course_id=course_id,
                    enrollment_id=enrollment_id,
                    document_number=document_number,
                    document_type=document_type,
                    title=document_title,
                    status=status,
                    storage_path=storage_path,
                    file_url=file_url,
                )
                session.add(document)
                await session.commit()
                await session.refresh(document)

                return {
                    "id": str(document.id),
                    "document_number": document.document_number,
                    "verification_code": document.verification_code,
                    "document_type": document.document_type,
                    "title": document.title,
                    "status": document.status,
                    "course_id": str(document.course_id) if document.course_id else None,
                    "enrollment_id": str(document.enrollment_id) if document.enrollment_id else None,
                    "storage_path": document.storage_path,
                    "file_available": bool(document.storage_path),
                }
        finally:
            await engine.dispose()

    return asyncio.run(_create())

def test_admin_can_get_account_documents() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Admin certificate",
        document_type="Сертификат",
    )

    status, payload = request_json(
        "GET",
        "/api/v1/account/documents",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["total"] >= 1
    assert isinstance(payload["items"], list)

    item = next(
        (candidate for candidate in payload["items"] if candidate["id"] == document["id"]),
        None,
    )
    assert item is not None
    assert item["document_number"] == document["document_number"]
    assert item["verification_code"].startswith("DOCV-")
    assert item["document_type"] == "Сертификат"
    assert item["title"] == "Admin certificate"
    assert item["course_id"] == course["id"]
    assert item["course_slug"] == course["slug"]
    assert item["course_title"] == course["title"]
    assert item["enrollment_id"] == enrollment["id"]


def test_account_documents_without_token_returns_401() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/account/documents",
    )

    assert status == 401
    assert isinstance(payload, dict)


def test_public_can_verify_document() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Public verify certificate",
        document_type="Сертификат",
        status="available",
        storage_content=b"public verify certificate content",
        storage_extension=".pdf",
    )

    status, payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={document["document_number"]}',
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["document_number"] == document["document_number"]
    assert payload["verification_code"].startswith("DOCV-")
    assert payload["document_type"] == "Сертификат"
    assert payload["title"] == "Public verify certificate"
    assert payload["course_title"] == course["title"]
    assert "course_hours" in payload
    assert "course_format" in payload
    assert "completed_at" in payload
    assert payload["issuer_name"]
    assert payload["issuer_short_name"]
    assert payload["issuer_address"]
    assert payload["issuer_license"]
    assert "issuer_inn" in payload
    assert "issuer_kpp" in payload
    assert "issuer_ogrn" in payload
    assert payload["registry_status"] == "available"
    assert payload["verification_status"] == "Документ подтверждён"
    status, code_payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={payload["verification_code"]}',
    )

    assert status == 200
    assert isinstance(code_payload, dict)
    assert code_payload["document_number"] == document["document_number"]
    assert code_payload["verification_code"] == payload["verification_code"]
    assert code_payload["verification_status"] == "Документ подтверждён"

def test_public_verify_document_not_found_returns_404() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/public/documents/verify?number=DOC-NOT-FOUND",
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_admin_can_get_account_document_download() -> None:
    from urllib.request import Request, urlopen

    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Downloadable certificate",
        document_type="Сертификат",
        storage_content=b"downloadable certificate content",
        storage_extension=".pdf",
    )

    request = Request(
        f"http://127.0.0.1:8000/api/v1/account/documents/{document['id']}/download",
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )

    with urlopen(request, timeout=20) as response:
        body = response.read()
        disposition = response.headers.get("Content-Disposition", "")

    assert body == b"downloadable certificate content"
    assert document["document_number"].lower() in disposition.lower()


def test_foreign_user_cannot_get_account_document_download() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    admin_user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=admin_user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    document = create_test_document_record_in_db(
        user_id=admin_user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Private document",
        file_url="https://example.com/files/private-document.pdf",
    )

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, payload = request_json(
        "GET",
        f'/api/v1/account/documents/{document["id"]}/download',
        token=learner_token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_account_document_download_without_token_returns_401() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/account/documents/00000000-0000-0000-0000-000000000000/download",
    )

    assert status == 401
    assert isinstance(payload, dict)


def post_multipart_admin_document(
    *,
    token: str,
    fields: dict[str, str],
    file_field: tuple[str, bytes, str] | None = None,
):
    import httpx

    files = None

    if file_field is not None:
        filename, content, content_type = file_field
        files = {
            "file": (filename, content, content_type),
        }

    return httpx.post(
        "http://127.0.0.1:8000/api/v1/admin/documents",
        headers={"Authorization": f"Bearer {token}"},
        data=fields,
        files=files,
        timeout=20.0,
    )


def test_admin_can_filter_documents_by_organization() -> None:
    from urllib.parse import urlencode

    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    first_organization_id = create_test_organization(token)
    second_organization_id = create_test_organization(token)

    first_created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        organization_id=first_organization_id,
        status="completed",
    )
    second_created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        organization_id=second_organization_id,
        status="completed",
    )

    first_course = first_created["course"]
    first_enrollment = first_created["enrollment"]
    second_course = second_created["course"]
    second_enrollment = second_created["enrollment"]

    first_document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=first_course["id"],
        enrollment_id=first_enrollment["id"],
        title="Organization filtered document first",
        status="available",
    )
    second_document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=second_course["id"],
        enrollment_id=second_enrollment["id"],
        title="Organization filtered document second",
        status="available",
    )

    query = urlencode(
        {
            "organization_id": first_organization_id,
            "limit": 300,
        }
    )

    status, documents = request_json(
        "GET",
        f"/api/v1/admin/documents?{query}",
        token=token,
    )

    assert status == 200
    assert isinstance(documents, list)
    assert any(item["id"] == first_document["id"] for item in documents)
    assert all(item["organization_id"] == first_organization_id for item in documents)
    assert not any(item["id"] == second_document["id"] for item in documents)

    summary_query = urlencode(
        {
            "documents_organization_id": first_organization_id,
        }
    )

    status, summary = request_json(
        "GET",
        f"/api/v1/admin/worklist-summary?{summary_query}",
        token=token,
    )

    assert status == 200
    assert isinstance(summary, dict)
    assert summary["documents"]["total"] >= 1


def test_admin_can_list_admin_documents() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/documents",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, list)


def test_admin_can_create_document_with_file() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    response = post_multipart_admin_document(
        token=token,
        fields={
            "user_id": user_id,
            "title": "Admin uploaded certificate",
            "document_type": "Сертификат",
            "status": "available",
        },
        file_field=("certificate.pdf", b"admin uploaded certificate content", "application/pdf"),
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["title"] == "Admin uploaded certificate"
    assert payload["document_type"] == "Сертификат"
    assert payload["status"] == "available"
    assert payload["user_id"] == user_id
    assert payload["file_available"] is True

    status, account_documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=token,
    )

    assert status == 200
    assert isinstance(account_documents, dict)

    item = next(
        (candidate for candidate in account_documents["items"] if candidate["id"] == payload["id"]),
        None,
    )
    assert item is not None
    assert item["file_available"] is True


def test_admin_create_document_duplicate_number_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document_number = unique_document_number()

    first_response = post_multipart_admin_document(
        token=token,
        fields={
            "user_id": user_id,
            "title": "Duplicate document first",
            "document_type": "Сертификат",
            "document_number": document_number,
            "status": "available",
        },
    )
    assert first_response.status_code == 201

    second_response = post_multipart_admin_document(
        token=token,
        fields={
            "user_id": user_id,
            "title": "Duplicate document second",
            "document_type": "Сертификат",
            "document_number": document_number,
            "status": "available",
        },
    )
    assert second_response.status_code == 409


def test_learner_cannot_create_admin_document() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    response = post_multipart_admin_document(
        token=learner_token,
        fields={
            "user_id": user_id,
            "title": "Forbidden document",
            "document_type": "Сертификат",
            "status": "available",
        },
    )

    assert response.status_code == 403


def patch_multipart_admin_document(
    *,
    token: str,
    document_id: str,
    fields: dict[str, str],
    file_field: tuple[str, bytes, str] | None = None,
):
    import httpx

    files = None

    if file_field is not None:
        filename, content, content_type = file_field
        files = {
            "file": (filename, content, content_type),
        }

    return httpx.patch(
        f"http://127.0.0.1:8000/api/v1/admin/documents/{document_id}",
        headers={"Authorization": f"Bearer {token}"},
        data=fields,
        files=files,
        timeout=20.0,
    )


def test_admin_can_update_document_status_and_replace_file() -> None:
    from urllib.request import Request, urlopen

    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Original certificate",
        document_type="Сертификат",
        status="available",
        storage_content=b"old document content",
        storage_extension=".pdf",
    )

    response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "title": "Updated certificate",
            "document_type": "Удостоверение",
            "status": "draft",
        },
        file_field=("updated.pdf", b"updated document content", "application/pdf"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == document["id"]
    assert payload["title"] == "Updated certificate"
    assert payload["document_type"] == "Удостоверение"
    assert payload["status"] == "draft"
    assert payload["file_available"] is True

    status, account_documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=token,
    )

    assert status == 200
    assert isinstance(account_documents, dict)

    item = next(
        (candidate for candidate in account_documents["items"] if candidate["id"] == document["id"]),
        None,
    )
    assert item is not None
    assert item["title"] == "Updated certificate"
    assert item["document_type"] == "Удостоверение"
    assert item["status"] == "draft"
    assert item["file_available"] is True
    assert item["download_available"] is False

    status, draft_download_payload = request_json(
        "GET",
        f'/api/v1/account/documents/{document["id"]}/download',
        token=token,
    )

    assert status == 409
    assert isinstance(draft_download_payload, dict)


def test_admin_update_document_duplicate_number_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    first_document = create_test_document_record_in_db(
        user_id=user_id,
        title="First duplicate source",
    )
    second_document = create_test_document_record_in_db(
        user_id=user_id,
        title="Second duplicate target",
    )

    response = patch_multipart_admin_document(
        token=token,
        document_id=second_document["id"],
        fields={
            "document_number": first_document["document_number"],
        },
    )

    assert response.status_code == 409


def test_learner_cannot_update_admin_document() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Forbidden update document",
    )

    response = patch_multipart_admin_document(
        token=learner_token,
        document_id=document["id"],
        fields={
            "title": "Learner should not update this",
        },
    )

    assert response.status_code == 403


def delete_admin_document_request(
    *,
    token: str,
    document_id: str,
):
    import httpx

    return httpx.delete(
        f"http://127.0.0.1:8000/api/v1/admin/documents/{document_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )


def test_admin_can_delete_document() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Document to delete",
        storage_content=b"document to delete content",
        storage_extension=".pdf",
    )

    response = delete_admin_document_request(
        token=token,
        document_id=document["id"],
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "deleted"
    assert payload["id"] == document["id"]

    status, account_documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=token,
    )

    assert status == 200
    assert isinstance(account_documents, dict)
    assert all(item["id"] != document["id"] for item in account_documents["items"])

    status, missing_download_payload = request_json(
        "GET",
        f'/api/v1/account/documents/{document["id"]}/download',
        token=token,
    )

    assert status == 404
    assert isinstance(missing_download_payload, dict)


def test_admin_delete_document_not_found_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    response = delete_admin_document_request(
        token=token,
        document_id="00000000-0000-0000-0000-000000000000",
    )

    assert response.status_code == 404


def test_learner_cannot_delete_admin_document() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Forbidden delete document",
    )

    response = delete_admin_document_request(
        token=learner_token,
        document_id=document["id"],
    )

    assert response.status_code == 403


def get_admin_document_download_response(
    *,
    token: str,
    document_id: str,
):
    import httpx

    return httpx.get(
        f"http://127.0.0.1:8000/api/v1/admin/documents/{document_id}/download",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )



def get_admin_document_generation_event_download_response(
    *,
    token: str,
    document_id: str,
    event_id: str,
):
    import httpx

    return httpx.get(
        f"http://127.0.0.1:8000/api/v1/admin/documents/{document_id}/generation-events/{event_id}/download",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )


def get_account_document_download_response(
    *,
    token: str,
    document_id: str,
):
    import httpx

    return httpx.get(
        f"http://127.0.0.1:8000/api/v1/account/documents/{document_id}/download",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20.0,
    )
def test_admin_can_download_admin_document() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Admin downloadable document",
        storage_content=b"admin downloadable content",
        storage_extension=".pdf",
    )

    response = get_admin_document_download_response(
        token=token,
        document_id=document["id"],
    )

    assert response.status_code == 200
    assert response.content == b"admin downloadable content"

    disposition = response.headers.get("content-disposition", "")
    assert document["document_number"].lower() in disposition.lower()


def test_admin_can_regenerate_generated_completion_document() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": f"Regenerated Completion PDF {slug}",
            "description": "Regeneration target course",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        f"/api/v1/admin/documents?enrollment_id={enrollment_id}",
        token=admin_token,
    )

    assert status == 200
    assert isinstance(documents, list)
    assert len(documents) == 1

    document = documents[0]
    assert document["document_number"].startswith("AUTO-")
    assert document["status"] == "draft"
    assert document["file_available"] is True
    assert document["generated_at"] is not None
    assert document["generated_by_user_id"] is None
    assert document["generated_by_user_email"] is None
    assert document["generation_source"] == "auto_completion"
    assert document["generation_template_version"] == "completion_pdf_v1"

    status, generation_events_before = request_json(
        "GET",
        f'/api/v1/admin/documents/{document["id"]}/generation-events',
        token=admin_token,
    )

    assert status == 200
    assert isinstance(generation_events_before, list)
    assert len(generation_events_before) == 1
    first_generation_event = generation_events_before[0]
    assert first_generation_event["document_id"] == document["id"]
    assert first_generation_event["source"] == "auto_completion"
    assert first_generation_event["template_version"] == "completion_pdf_v1"
    assert first_generation_event["storage_path"].endswith(".pdf")
    assert first_generation_event["generated_by_user_id"] is None

    status, regenerated = request_json(
        "POST",
        f'/api/v1/admin/documents/{document["id"]}/regenerate',
        token=admin_token,
    )

    assert status == 200
    assert isinstance(regenerated, dict)
    assert regenerated["id"] == document["id"]
    assert regenerated["document_number"] == document["document_number"]
    assert regenerated["file_available"] is True
    assert regenerated["generated_at"] is not None
    assert regenerated["generated_by_user_id"] is not None
    assert regenerated["generated_by_user_email"] == ADMIN_EMAIL
    assert regenerated["generation_source"] == "admin_regenerate"
    assert regenerated["generation_template_version"] == "completion_pdf_v1"

    status, generation_events_after = request_json(
        "GET",
        f'/api/v1/admin/documents/{document["id"]}/generation-events',
        token=admin_token,
    )

    assert status == 200
    assert isinstance(generation_events_after, list)
    assert len(generation_events_after) == 2
    latest_generation_event = generation_events_after[0]
    assert latest_generation_event["document_id"] == document["id"]
    assert latest_generation_event["source"] == "admin_regenerate"
    assert latest_generation_event["template_version"] == "completion_pdf_v1"
    assert latest_generation_event["generated_by_user_email"] == ADMIN_EMAIL
    assert latest_generation_event["storage_path"].endswith(".pdf")
    assert latest_generation_event["storage_path"] != first_generation_event["storage_path"]

    latest_artifact_response = get_admin_document_generation_event_download_response(
        token=admin_token,
        document_id=document["id"],
        event_id=latest_generation_event["id"],
    )

    assert latest_artifact_response.status_code == 200
    assert latest_artifact_response.content.startswith(b"%PDF")

    first_artifact_response = get_admin_document_generation_event_download_response(
        token=admin_token,
        document_id=document["id"],
        event_id=first_generation_event["id"],
    )

    assert first_artifact_response.status_code == 200
    assert first_artifact_response.content.startswith(b"%PDF")

    missing_artifact_response = get_admin_document_generation_event_download_response(
        token=admin_token,
        document_id=document["id"],
        event_id="missing-generation-event",
    )

    assert missing_artifact_response.status_code == 404

    response = get_admin_document_download_response(
        token=admin_token,
        document_id=document["id"],
    )

    assert response.status_code == 200
    assert response.content.startswith(b"%PDF")

    status, audit_events = request_json(
        "GET",
        f'/api/v1/admin/audit-events?action=admin.document_regenerated&entity_id={document["id"]}',
        token=admin_token,
    )

    assert status == 200
    assert isinstance(audit_events, list)
    assert any(event["action"] == "admin.document_regenerated" for event in audit_events)


def test_admin_download_document_without_file_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Document without file",
    )

    response = get_admin_document_download_response(
        token=token,
        document_id=document["id"],
    )

    assert response.status_code == 409


def test_learner_cannot_download_admin_document() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Forbidden admin download document",
        storage_content=b"private admin file",
        storage_extension=".pdf",
    )

    response = get_admin_document_download_response(
        token=learner_token,
        document_id=document["id"],
    )

    assert response.status_code == 403


def test_admin_can_filter_admin_documents() -> None:
    from urllib.parse import urlencode

    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    matching_document = create_test_document_record_in_db(
        user_id=user_id,
        title="Unique filtered document",
        document_type="Сертификат фильтра",
        status="draft",
    )

    create_test_document_record_in_db(
        user_id=user_id,
        title="Another available document",
        document_type="Удостоверение",
        status="available",
    )

    query = urlencode(
        {
            "user_id": user_id,
            "status": "draft",
            "document_type": "Сертификат",
            "q": matching_document["document_number"],
        }
    )

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/documents?{query}",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, list)
    assert any(item["id"] == matching_document["id"] for item in payload)
    assert all(item["status"] == "draft" for item in payload)
    assert all(item["user_id"] == user_id for item in payload)


def test_admin_documents_invalid_status_filter_returns_422() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/documents?status=unknown",
        token=token,
    )

    assert status == 422
    assert isinstance(payload, dict)


def test_admin_can_list_admin_courses() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/courses",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, list)


def test_admin_can_create_update_activate_deactivate_and_delete_course() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    slug = unique_course_slug()

    status, created = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": slug,
            "title": "Admin Course CRUD",
            "description": "Initial admin course description",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["slug"] == slug
    assert created["title"] == "Admin Course CRUD"
    assert created["hours"] == 72
    assert created["is_active"] is True
    course_id = created["id"]

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == course_id

    status, updated = request_json(
        "PATCH",
        f"/api/v1/admin/courses/{course_id}",
        token=token,
        body={
            "title": "Admin Course CRUD Updated",
            "hours": 108,
            "format": "mixed",
            "document_type": "Удостоверение",
        },
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["title"] == "Admin Course CRUD Updated"
    assert updated["hours"] == 108
    assert updated["format"] == "mixed"
    assert updated["document_type"] == "Удостоверение"

    status, deactivated = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_id}/deactivate",
        token=token,
    )

    assert status == 200
    assert isinstance(deactivated, dict)
    assert deactivated["is_active"] is False

    status, activated = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_id}/activate",
        token=token,
    )

    assert status == 200
    assert isinstance(activated, dict)
    assert activated["is_active"] is True

    status, deleted = request_json(
        "DELETE",
        f"/api/v1/admin/courses/{course_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(deleted, dict)
    assert deleted["status"] == "deleted"
    assert deleted["id"] == course_id

    status, missing = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_id}",
        token=token,
    )

    assert status == 404
    assert isinstance(missing, dict)


def test_admin_course_duplicate_slug_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    slug = unique_course_slug()

    status, first = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": slug,
            "title": "First duplicate slug course",
        },
    )

    assert status == 201
    assert isinstance(first, dict)

    status, second = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": slug,
            "title": "Second duplicate slug course",
        },
    )

    assert status == 409
    assert isinstance(second, dict)


def test_admin_can_filter_admin_courses() -> None:
    from urllib.parse import urlencode

    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": slug,
            "title": f"Unique Admin Filter Course {slug}",
            "description": f"Filter target description {slug}",
            "is_active": False,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    query = urlencode(
        {
            "is_active": "false",
            "q": slug,
        }
    )

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/courses?{query}",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, list)
    assert any(item["id"] == created_course["id"] for item in payload)
    assert all(item["is_active"] is False for item in payload)


def test_admin_cannot_delete_course_with_enrollment() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    created = create_test_course_with_enrollment_in_db(
        user_id=str(me_payload["id"]),
        status="assigned",
    )
    course = created["course"]

    status, payload = request_json(
        "DELETE",
        f'/api/v1/admin/courses/{course["id"]}',
        token=token,
    )

    assert status == 400
    assert isinstance(payload, dict)


def test_admin_cannot_delete_course_with_document() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    course = create_test_course_in_db(
        title="Course with document delete guard",
        description="Course should not be deleted while document exists",
    )

    document = create_test_document_record_in_db(
        user_id=str(me_payload["id"]),
        course_id=course["id"],
        title="Course delete guard document",
        document_type="Сертификат",
        status="available",
    )

    assert document["course_id"] == course["id"]

    status, payload = request_json(
        "DELETE",
        f'/api/v1/admin/courses/{course["id"]}',
        token=token,
    )

    assert status == 400
    assert isinstance(payload, dict)
    assert payload["detail"] == "Cannot delete course with documents"

    status, still_existing = request_json(
        "GET",
        f'/api/v1/admin/courses/{course["id"]}',
        token=token,
    )

    assert status == 200
    assert isinstance(still_existing, dict)
    assert still_existing["id"] == course["id"]


def test_admin_course_missing_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/courses/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_manage_admin_courses() -> None:
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, list_payload = request_json(
        "GET",
        "/api/v1/admin/courses",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(list_payload, dict)

    status, create_payload = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=learner_token,
        body={
            "slug": unique_course_slug(),
            "title": "Learner forbidden course",
        },
    )

    assert status == 403
    assert isinstance(create_payload, dict)


def test_admin_can_list_admin_enrollments() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/enrollments",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, list)





def test_admin_can_bulk_create_group_enrollments_and_skip_duplicates() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, admin_me = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(admin_me, dict)
    admin_user_id = str(admin_me["id"])

    status, learner_me = request_json("GET", "/api/v1/auth/me", token=learner_token)
    assert status == 200
    assert isinstance(learner_me, dict)
    learner_user_id = str(learner_me["id"])

    organization_id = create_test_organization(admin_token)
    group = create_test_learning_group(admin_token, organization_id)
    group_id = str(group["id"])

    for user_id in [admin_user_id, learner_user_id]:
        status, member = request_json(
            "POST",
            f"/api/v1/org/groups/{group_id}/members",
            token=admin_token,
            body={"user_id": user_id},
        )
        assert status == 201
        assert isinstance(member, dict)
        assert member["learning_group_id"] == group_id
        assert member["user_id"] == user_id

    course = create_test_course_in_db(title="Bulk Group Enrollment Course")

    status, created = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        token=admin_token,
        body={
            "learning_group_id": group_id,
            "course_id": course["id"],
            "status": "assigned",
        },
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["status"] == "completed"
    assert created["learning_group_id"] == group_id
    assert created["course_id"] == course["id"]
    assert created["organization_id"] == organization_id
    assert created["created_count"] == 2
    assert created["skipped_count"] == 0
    assert isinstance(created["created"], list)
    assert isinstance(created["skipped"], list)
    assert created["skipped"] == []

    created_user_ids = {item["user_id"] for item in created["created"]}
    assert created_user_ids == {admin_user_id, learner_user_id}
    assert all(item["learning_group_id"] == group_id for item in created["created"])
    assert all(item["organization_id"] == organization_id for item in created["created"])

    status, repeated = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        token=admin_token,
        body={
            "learning_group_id": group_id,
            "course_id": course["id"],
            "status": "assigned",
        },
    )

    assert status == 201
    assert isinstance(repeated, dict)
    assert repeated["status"] == "completed"
    assert repeated["created_count"] == 0
    assert repeated["skipped_count"] == 2
    assert repeated["created"] == []
    assert isinstance(repeated["skipped"], list)

    skipped_user_ids = {item["user_id"] for item in repeated["skipped"]}
    assert skipped_user_ids == {admin_user_id, learner_user_id}
    assert all(
        item["reason"] == "Enrollment already exists for this user and course"
        for item in repeated["skipped"]
    )
    assert all(item["existing_enrollment_id"] for item in repeated["skipped"])

    status, filtered = request_json(
        "GET",
        f"/api/v1/admin/enrollments?learning_group_id={group_id}&course_id={course['id']}&limit=300",
        token=admin_token,
    )

    assert status == 200
    assert isinstance(filtered, list)
    assert len([item for item in filtered if item["course_id"] == course["id"]]) == 2
    assert all(item["learning_group_id"] == group_id for item in filtered)


def test_admin_bulk_group_enrollments_rejects_empty_group() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    organization_id = create_test_organization(admin_token)
    group = create_test_learning_group(admin_token, organization_id)
    group_id = str(group["id"])
    course = create_test_course_in_db(title="Empty Bulk Group Enrollment Course")

    status, payload = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        token=admin_token,
        body={
            "learning_group_id": group_id,
            "course_id": course["id"],
            "status": "assigned",
        },
    )

    assert status == 400
    assert isinstance(payload, dict)
    assert payload["detail"] == "Learning group has no members"


def test_admin_rejects_enrollment_group_when_user_is_not_member() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])
    course = create_test_course_in_db(title="Enrollment Group Membership Course")

    status, rejected = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": course["id"],
            "organization_id": organization_id,
            "learning_group_id": group_id,
            "status": "assigned",
        },
    )

    assert status == 400
    assert isinstance(rejected, dict)
    assert rejected["detail"] == "User is not a member of learning group"

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        token=token,
        body={"user_id": user_id},
    )
    assert status == 201
    assert isinstance(member, dict)

    status, created = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": course["id"],
            "organization_id": organization_id,
            "learning_group_id": group_id,
            "status": "assigned",
        },
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["learning_group_id"] == group_id
    assert created["learning_group_name"] == group["name"]


def test_admin_rejects_enrollment_group_from_another_organization() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    first_organization_id = create_test_organization(token)
    second_organization_id = create_test_organization(token)

    group = create_test_learning_group(token, first_organization_id)
    group_id = str(group["id"])

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        token=token,
        body={"user_id": user_id},
    )
    assert status == 201
    assert isinstance(member, dict)

    course = create_test_course_in_db(title="Enrollment Group Organization Mismatch Course")

    status, rejected = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": course["id"],
            "organization_id": second_organization_id,
            "learning_group_id": group_id,
            "status": "assigned",
        },
    )

    assert status == 400
    assert isinstance(rejected, dict)
    assert rejected["detail"] == "Learning group belongs to another organization"


def test_admin_can_filter_admin_enrollments_by_learning_group() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    organization_id = create_test_organization(token)

    first_group = create_test_learning_group(
        token,
        organization_id,
        name=f"Enrollment filter group A {unique_group_code()}",
        code=unique_group_code(),
    )
    second_group = create_test_learning_group(
        token,
        organization_id,
        name=f"Enrollment filter group B {unique_group_code()}",
        code=unique_group_code(),
    )

    first_group_id = str(first_group["id"])
    second_group_id = str(second_group["id"])

    status, first_member = request_json(
        "POST",
        f"/api/v1/org/groups/{first_group_id}/members",
        token=token,
        body={"user_id": user_id},
    )
    assert status == 201
    assert isinstance(first_member, dict)

    status, second_member = request_json(
        "POST",
        f"/api/v1/org/groups/{second_group_id}/members",
        token=token,
        body={"user_id": user_id},
    )
    assert status == 201
    assert isinstance(second_member, dict)

    first_course = create_test_course_in_db(title="Enrollment Filter Course A")
    second_course = create_test_course_in_db(title="Enrollment Filter Course B")

    status, first_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": first_course["id"],
            "organization_id": organization_id,
            "learning_group_id": first_group_id,
            "status": "assigned",
        },
    )

    assert status == 201
    assert isinstance(first_enrollment, dict)
    assert first_enrollment["learning_group_id"] == first_group_id
    assert first_enrollment["learning_group_name"] == first_group["name"]

    status, second_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": second_course["id"],
            "organization_id": organization_id,
            "learning_group_id": second_group_id,
            "status": "active",
        },
    )

    assert status == 201
    assert isinstance(second_enrollment, dict)
    assert second_enrollment["learning_group_id"] == second_group_id

    status, filtered = request_json(
        "GET",
        f"/api/v1/admin/enrollments?learning_group_id={first_group_id}&limit=300",
        token=token,
    )

    assert status == 200
    assert isinstance(filtered, list)
    assert any(item["id"] == first_enrollment["id"] for item in filtered)
    assert all(item["learning_group_id"] == first_group_id for item in filtered)
    assert all(item["id"] != second_enrollment["id"] for item in filtered)


def test_admin_can_create_update_and_delete_enrollment() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    course = create_test_course_in_db(
        title="Admin Enrollment Course",
    )

    status, created = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": course["id"],
            "status": "assigned",
        },
    )

    assert status == 201
    assert isinstance(created, dict)
    assert created["user_id"] == user_id
    assert created["course_id"] == course["id"]
    assert created["status"] == "assigned"
    enrollment_id = created["id"]

    status, account_courses = request_json(
        "GET",
        "/api/v1/account/courses",
        token=token,
    )

    assert status == 200
    assert isinstance(account_courses, dict)
    assert any(item["enrollment_id"] == enrollment_id for item in account_courses["items"])

    status, updated = request_json(
        "PATCH",
        f"/api/v1/admin/enrollments/{enrollment_id}",
        token=token,
        body={
            "status": "active",
        },
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["status"] == "active"

    status, detail = request_json(
        "GET",
        f"/api/v1/admin/enrollments/{enrollment_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(detail, dict)
    assert detail["id"] == enrollment_id
    assert detail["course_title"] == course["title"]

    status, deleted = request_json(
        "DELETE",
        f"/api/v1/admin/enrollments/{enrollment_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(deleted, dict)
    assert deleted["status"] == "deleted"
    assert deleted["id"] == enrollment_id

    status, missing = request_json(
        "GET",
        f"/api/v1/admin/enrollments/{enrollment_id}",
        token=token,
    )

    assert status == 404
    assert isinstance(missing, dict)


def test_admin_duplicate_enrollment_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    course = create_test_course_in_db(
        title="Duplicate Enrollment Course",
    )

    status, first = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": course["id"],
            "status": "assigned",
        },
    )

    assert status == 201
    assert isinstance(first, dict)

    status, second = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=token,
        body={
            "user_id": user_id,
            "course_id": course["id"],
            "status": "assigned",
        },
    )

    assert status == 409
    assert isinstance(second, dict)


def test_admin_enrollment_invalid_status_returns_422() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/enrollments?status=unknown",
        token=token,
    )

    assert status == 422
    assert isinstance(payload, dict)


def test_admin_enrollment_missing_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, payload = request_json(
        "GET",
        "/api/v1/admin/enrollments/00000000-0000-0000-0000-000000000000",
        token=token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_manage_admin_enrollments() -> None:
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, list_payload = request_json(
        "GET",
        "/api/v1/admin/enrollments",
        token=learner_token,
    )

    assert status == 403
    assert isinstance(list_payload, dict)

    status, create_payload = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=learner_token,
        body={
            "user_id": "00000000-0000-0000-0000-000000000000",
            "course_id": "00000000-0000-0000-0000-000000000000",
            "status": "assigned",
        },
    )

    assert status == 403
    assert isinstance(create_payload, dict)


def test_public_can_list_active_courses() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    active_slug = unique_course_slug()
    inactive_slug = unique_course_slug()

    status, active_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": active_slug,
            "title": "Public Active Course",
            "description": "Visible public course",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(active_course, dict)

    status, inactive_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": inactive_slug,
            "title": "Public Inactive Course",
            "description": "Hidden public course",
            "hours": 36,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": False,
        },
    )

    assert status == 201
    assert isinstance(inactive_course, dict)

    status, payload = request_json(
        "GET",
        f"/api/v1/public/courses?q={active_slug}",
    )

    assert status == 200
    assert isinstance(payload, list)
    assert any(item["slug"] == active_slug for item in payload)
    assert all(item["slug"] != inactive_slug for item in payload)


def test_public_can_get_active_course_detail_by_slug() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    slug = unique_course_slug()

    status, created = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": slug,
            "title": "Public Detail Course",
            "description": "Course detail from backend",
            "hours": 108,
            "format": "mixed",
            "document_type": "Удостоверение",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created, dict)

    status, payload = request_json(
        "GET",
        f"/api/v1/public/courses/{slug}",
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["slug"] == slug
    assert payload["title"] == "Public Detail Course"
    assert payload["hours"] == 108
    assert payload["document_type"] == "Удостоверение"


def test_public_inactive_course_detail_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    slug = unique_course_slug()

    status, created = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=token,
        body={
            "slug": slug,
            "title": "Inactive Detail Course",
            "is_active": False,
        },
    )

    assert status == 201
    assert isinstance(created, dict)

    status, payload = request_json(
        "GET",
        f"/api/v1/public/courses/{slug}",
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_public_missing_course_detail_returns_404() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/public/courses/missing-public-course",
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_learner_can_self_enroll_active_course() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Self Enrollment Active Course",
            "description": "Self enrollment course",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    assert enrolled["course_id"] == created_course["id"]
    assert enrolled["course_slug"] == slug
    assert enrolled["status"] == "assigned"

    status, account_courses = request_json(
        "GET",
        "/api/v1/account/courses",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(account_courses, dict)
    assert any(item["course_id"] == created_course["id"] for item in account_courses["items"])


def test_self_enroll_duplicate_course_returns_409() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Self Enrollment Duplicate Course",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, first = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(first, dict)

    status, duplicate = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 409
    assert isinstance(duplicate, dict)


def test_self_enroll_inactive_course_returns_404() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Self Enrollment Inactive Course",
            "is_active": False,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, payload = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_guest_cannot_self_enroll_course() -> None:
    status, payload = request_json(
        "POST",
        "/api/v1/account/courses/00000000-0000-0000-0000-000000000000/enroll",
    )

    assert status == 401
    assert isinstance(payload, dict)


def test_learner_can_start_and_complete_self_enrolled_course() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Learner Course Progress",
            "description": "Course progress smoke",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    enrollment_id = enrolled["enrollment_id"]

    status, started = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/start",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(started, dict)
    assert started["enrollment_id"] == enrollment_id
    assert started["status"] == "active"

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["enrollment_id"] == enrollment_id
    assert completed["status"] == "completed"

    status, restart_completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/start",
        token=learner_token,
    )

    assert status == 400
    assert isinstance(restart_completed, dict)


def test_guest_cannot_start_or_complete_course() -> None:
    status, start_payload = request_json(
        "POST",
        "/api/v1/account/courses/00000000-0000-0000-0000-000000000000/start",
    )

    assert status == 401
    assert isinstance(start_payload, dict)

    status, complete_payload = request_json(
        "POST",
        "/api/v1/account/courses/00000000-0000-0000-0000-000000000000/complete",
    )

    assert status == 401
    assert isinstance(complete_payload, dict)


def test_account_course_progress_dates_are_returned() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Learner Course Dates",
            "description": "Course progress dates",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    assert enrolled["started_at"] is None
    assert enrolled["completed_at"] is None

    enrollment_id = enrolled["enrollment_id"]

    status, started = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/start",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(started, dict)
    assert started["status"] == "active"
    assert started["started_at"] is not None
    assert started["completed_at"] is None

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"
    assert completed["started_at"] is not None
    assert completed["completed_at"] is not None

    status, account_courses = request_json(
        "GET",
        "/api/v1/account/courses",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(account_courses, dict)

    item = next(
        candidate
        for candidate in account_courses["items"]
        if candidate["enrollment_id"] == enrollment_id
    )

    assert item["status"] == "completed"
    assert item["started_at"] is not None
    assert item["completed_at"] is not None


def test_complete_course_creates_draft_document() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Learner Completion Document",
            "description": "Course completion document",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)

    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)

    matched_documents = [
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    ]

    assert len(matched_documents) == 1

    document = matched_documents[0]
    assert document["course_id"] == created_course["id"]
    assert document["course_slug"] == slug
    assert document["document_type"] == "Сертификат"
    assert document["status"] == "draft"
    assert document["file_available"] is True
    assert document["download_available"] is False

    status, completed_again = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed_again, dict)

    status, documents_after_repeat = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents_after_repeat, dict)

    matched_documents_after_repeat = [
        item
        for item in documents_after_repeat["items"]
        if item["enrollment_id"] == enrollment_id
    ]

    assert len(matched_documents_after_repeat) == 1


def test_draft_completion_document_cannot_be_downloaded_by_learner() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Learner Draft Download Protection",
            "description": "Draft download protection",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)

    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)

    draft_document = next(
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    )

    assert draft_document["status"] == "draft"
    assert draft_document["file_available"] is True
    assert draft_document["download_available"] is False

    status, download_payload = request_json(
        "GET",
        f'/api/v1/account/documents/{draft_document["id"]}/download',
        token=learner_token,
    )

    assert status == 409
    assert isinstance(download_payload, dict)


def test_admin_can_publish_completion_document_for_learner_download() -> None:
    from urllib.request import Request, urlopen

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Learner Published Completion Document",
            "description": "Published completion document",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)

    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)

    draft_document = next(
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    )

    assert draft_document["status"] == "draft"
    assert draft_document["file_available"] is True
    assert draft_document["download_available"] is False

    response = patch_multipart_admin_document(
        token=admin_token,
        document_id=draft_document["id"],
        fields={
            "title": "Published completion certificate",
            "status": "available",
        },
        file_field=(
            "completion-certificate.pdf",
            b"published completion certificate",
            "application/pdf",
        ),
    )

    assert response.status_code == 200
    published_payload = response.json()
    assert published_payload["id"] == draft_document["id"]
    assert published_payload["status"] == "available"
    assert published_payload["file_available"] is True

    status, documents_after_publish = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents_after_publish, dict)

    published_document = next(
        item
        for item in documents_after_publish["items"]
        if item["id"] == draft_document["id"]
    )

    assert published_document["status"] == "available"
    assert published_document["file_available"] is True
    assert published_document["download_available"] is True

    request = Request(
        f'http://127.0.0.1:8000/api/v1/account/documents/{draft_document["id"]}/download',
        headers={"Authorization": f"Bearer {learner_token}"},
        method="GET",
    )

    with urlopen(request, timeout=20) as download_response:
        body = download_response.read()

    assert body == b"published completion certificate"



def test_admin_documents_include_enrollment_details() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)

    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Enrollment details certificate",
        document_type="Сертификат",
        status="available",
        storage_content=b"enrollment details document",
        storage_extension=".pdf",
    )

    status, documents = request_json(
        "GET",
        "/api/v1/admin/documents",
        token=admin_token,
    )

    assert status == 200
    assert isinstance(documents, list)

    item = next(
        candidate
        for candidate in documents
        if candidate["id"] == document["id"]
    )

    assert item["course_id"] == course["id"]
    assert item["course_title"] == course["title"]
    assert item["enrollment_id"] == enrollment["id"]
    assert item["enrollment_status"] == "completed"

    assert "organization_id" in item
    assert "organization_name" in item
    assert "learning_group_id" in item
    assert "learning_group_name" in item



def test_admin_can_create_document_linked_to_enrollment_via_api() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)

    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    response = post_multipart_admin_document(
        token=admin_token,
        fields={
            "user_id": user_id,
            "title": "API linked enrollment document",
            "document_type": "Сертификат",
            "status": "draft",
            "enrollment_id": enrollment["id"],
        },
    )

    assert response.status_code == 201
    created_document = response.json()
    assert isinstance(created_document, dict)

    assert created_document["title"] == "API linked enrollment document"
    assert created_document["verification_code"].startswith("DOCV-")
    assert created_document["document_type"] == "Сертификат"
    assert created_document["status"] == "draft"
    assert created_document["user_id"] == user_id
    assert created_document["course_id"] == course["id"]
    assert created_document["course_title"] == course["title"]
    assert created_document["enrollment_id"] == enrollment["id"]
    assert created_document["enrollment_status"] == "completed"
    assert created_document["file_available"] is False

    status, documents = request_json(
        "GET",
        "/api/v1/admin/documents",
        token=admin_token,
    )

    assert status == 200
    assert isinstance(documents, list)

    item = next(
        candidate
        for candidate in documents
        if candidate["id"] == created_document["id"]
    )

    assert item["course_id"] == course["id"]
    assert item["course_title"] == course["title"]
    assert item["enrollment_id"] == enrollment["id"]
    assert item["enrollment_status"] == "completed"



def test_admin_rejects_document_course_mismatched_with_enrollment() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)

    user_id = str(me_payload["id"])

    first = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    second = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="assigned",
    )

    enrollment = first["enrollment"]
    another_course = second["course"]

    response = post_multipart_admin_document(
        token=admin_token,
        fields={
            "user_id": user_id,
            "title": "Mismatched enrollment document",
            "document_type": "Сертификат",
            "status": "draft",
            "course_id": another_course["id"],
            "enrollment_id": enrollment["id"],
        },
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["detail"] == "Enrollment course does not match document course"



def test_admin_rejects_document_enrollment_for_another_user() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, admin_me = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(admin_me, dict)

    status, learner_me = request_json("GET", "/api/v1/auth/me", token=learner_token)
    assert status == 200
    assert isinstance(learner_me, dict)

    admin_user_id = str(admin_me["id"])
    learner_user_id = str(learner_me["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=learner_user_id,
        status="completed",
    )
    foreign_enrollment = created["enrollment"]

    create_response = post_multipart_admin_document(
        token=admin_token,
        fields={
            "user_id": admin_user_id,
            "title": "Foreign enrollment create document",
            "document_type": "Сертификат",
            "status": "draft",
            "enrollment_id": foreign_enrollment["id"],
        },
    )

    assert create_response.status_code == 400
    create_payload = create_response.json()
    assert create_payload["detail"] == "Enrollment belongs to another user"

    document = create_test_document_record_in_db(
        user_id=admin_user_id,
        title="Foreign enrollment update document",
        document_type="Сертификат",
        status="draft",
    )

    update_response = patch_multipart_admin_document(
        token=admin_token,
        document_id=document["id"],
        fields={
            "enrollment_id": foreign_enrollment["id"],
        },
    )

    assert update_response.status_code == 400
    update_payload = update_response.json()
    assert update_payload["detail"] == "Enrollment belongs to another user"



def test_admin_rejects_document_course_update_mismatched_with_existing_enrollment() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)

    user_id = str(me_payload["id"])

    first = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    second = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="assigned",
    )

    course = first["course"]
    enrollment = first["enrollment"]
    another_course = second["course"]

    document = create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Existing enrollment document",
        document_type="Сертификат",
        status="draft",
    )

    response = patch_multipart_admin_document(
        token=admin_token,
        document_id=document["id"],
        fields={
            "course_id": another_course["id"],
        },
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["detail"] == "Enrollment course does not match document course"


def test_public_verify_draft_document_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    document = create_test_document_record_in_db(
        user_id=str(me_payload["id"]),
        title="Draft public verify document",
        document_type="Сертификат",
        status="draft",
        storage_content=b"draft document content",
        storage_extension=".pdf",
    )

    status, payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={document["document_number"]}',
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_public_verify_available_document_without_file_returns_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    document = create_test_document_record_in_db(
        user_id=str(me_payload["id"]),
        title="Available document without file",
        document_type="Сертификат",
        status="available",
    )

    status, payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={document["document_number"]}',
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_public_verify_revoked_document_returns_revoked_status() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    document = create_test_document_record_in_db(
        user_id=str(me_payload["id"]),
        title="Revoked public verify document",
        document_type="Сертификат",
        status="revoked",
        storage_content=b"revoked document content",
        storage_extension=".pdf",
    )

    status, payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={document["document_number"]}',
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["document_number"] == document["document_number"]
    assert payload["registry_status"] == "revoked"
    assert payload["verification_status"] == "Документ отозван"


def test_admin_documents_filter_by_verification_code() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    document = create_test_document_record_in_db(
        user_id=str(me_payload["id"]),
        title="Verification code searchable document",
        document_type="Сертификат",
        status="available",
        storage_content=b"verification code searchable content",
        storage_extension=".pdf",
    )

    query = f'q={document["verification_code"]}'

    status, payload = request_json(
        "GET",
        f"/api/v1/admin/documents?{query}",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, list)
    assert any(item["id"] == document["id"] for item in payload)
    assert all(
        document["verification_code"] == item["verification_code"]
        or document["verification_code"].lower() in item["verification_code"].lower()
        for item in payload
        if item["id"] == document["id"]
    )



def test_learner_course_completion_generates_draft_pdf_file() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "PDF Completion Course",
            "description": "Course should generate draft PDF after completion",
            "hours": 36,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)
    assert isinstance(documents["items"], list)

    matched_documents = [
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    ]

    assert len(matched_documents) == 1

    document = matched_documents[0]
    assert document["status"] == "draft"
    assert document["file_available"] is True
    assert document["download_available"] is False
    assert document["document_number"].startswith("AUTO-")
    assert document["verification_code"].startswith("DOCV-")

    status, download_payload = request_json(
        "GET",
        f'/api/v1/account/documents/{document["id"]}/download',
        token=learner_token,
    )

    assert status == 409
    assert isinstance(download_payload, dict)
    assert download_payload["detail"] == "Document is not available for download"

def test_admin_cannot_create_second_document_for_same_enrollment() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Existing enrollment document",
        document_type="Сертификат",
        status="draft",
    )

    response = post_multipart_admin_document(
        token=admin_token,
        fields={
            "user_id": user_id,
            "title": "Duplicate enrollment document",
            "document_type": "Сертификат",
            "status": "draft",
            "enrollment_id": enrollment["id"],
        },
    )

    assert response.status_code == 409
    payload = response.json()
    assert payload["detail"] == "Document for this enrollment already exists"


def test_admin_cannot_update_second_document_to_existing_enrollment() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    created = create_test_course_with_enrollment_in_db(
        user_id=user_id,
        status="completed",
    )
    course = created["course"]
    enrollment = created["enrollment"]

    create_test_document_record_in_db(
        user_id=user_id,
        course_id=course["id"],
        enrollment_id=enrollment["id"],
        title="Primary enrollment document",
        document_type="Сертификат",
        status="draft",
    )

    second_document = create_test_document_record_in_db(
        user_id=user_id,
        title="Second document without enrollment",
        document_type="Сертификат",
        status="draft",
    )

    response = patch_multipart_admin_document(
        token=admin_token,
        document_id=second_document["id"],
        fields={
            "enrollment_id": enrollment["id"],
        },
    )

    assert response.status_code == 409
    payload = response.json()
    assert payload["detail"] == "Document for this enrollment already exists"


def test_completion_document_keeps_enrollment_course_and_user_integrity() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Integrity Completion Course",
            "description": "Course for document integrity checks",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)

    matched_documents = [
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    ]

    assert len(matched_documents) == 1

    document = matched_documents[0]
    assert document["course_id"] == created_course["id"]
    assert document["course_slug"] == slug
    assert document["enrollment_id"] == enrollment_id
    assert document["status"] == "draft"
    assert document["file_available"] is True
    assert document["download_available"] is False

    status, admin_documents = request_json(
        "GET",
        f"/api/v1/admin/documents?q={document['document_number']}",
        token=admin_token,
    )

    assert status == 200
    assert isinstance(admin_documents, list)

    admin_document = next(
        item
        for item in admin_documents
        if item["id"] == document["id"]
    )

    status, learner_me = request_json("GET", "/api/v1/auth/me", token=learner_token)
    assert status == 200
    assert isinstance(learner_me, dict)

    assert admin_document["user_id"] == learner_me["id"]
    assert admin_document["course_id"] == created_course["id"]
    assert admin_document["enrollment_id"] == enrollment_id
    assert admin_document["enrollment_status"] == "completed"

def test_admin_can_publish_generated_completion_pdf_without_reupload() -> None:
    from urllib.request import Request, urlopen

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Generated PDF Publish Without Reupload",
            "description": "Generated completion PDF should be published without file reupload",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)

    draft_document = next(
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    )

    assert draft_document["status"] == "draft"
    assert draft_document["file_available"] is True
    assert draft_document["download_available"] is False

    response = patch_multipart_admin_document(
        token=admin_token,
        document_id=draft_document["id"],
        fields={
            "status": "available",
        },
    )

    assert response.status_code == 200
    published_payload = response.json()
    assert published_payload["id"] == draft_document["id"]
    assert published_payload["status"] == "available"
    assert published_payload["file_available"] is True

    status, documents_after_publish = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents_after_publish, dict)

    published_document = next(
        item
        for item in documents_after_publish["items"]
        if item["id"] == draft_document["id"]
    )

    assert published_document["status"] == "available"
    assert published_document["file_available"] is True
    assert published_document["download_available"] is True

    request = Request(
        f'http://127.0.0.1:8000/api/v1/account/documents/{draft_document["id"]}/download',
        headers={"Authorization": f"Bearer {learner_token}"},
        method="GET",
    )

    with urlopen(request, timeout=20) as download_response:
        body = download_response.read()
        content_type = download_response.headers.get("Content-Type", "")
        disposition = download_response.headers.get("Content-Disposition", "")

    assert body.startswith(b"%PDF-")
    assert b"%%EOF" in body
    assert len(body) > 2_500
    assert "application/pdf" in content_type
    assert draft_document["document_number"].lower() in disposition.lower()


def test_public_can_verify_published_generated_completion_pdf() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    slug = unique_course_slug()

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": slug,
            "title": "Generated PDF Public Verify Course",
            "description": "Generated completion PDF should be visible in public registry after publish",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )

    assert status == 201
    assert isinstance(created_course, dict)

    status, enrolled = request_json(
        "POST",
        f'/api/v1/account/courses/{created_course["id"]}/enroll',
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrolled, dict)
    enrollment_id = enrolled["enrollment_id"]

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/complete",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(documents, dict)

    draft_document = next(
        item
        for item in documents["items"]
        if item["enrollment_id"] == enrollment_id
    )

    assert draft_document["status"] == "draft"
    assert draft_document["file_available"] is True
    assert draft_document["download_available"] is False
    assert draft_document["document_number"].startswith("AUTO-")
    assert draft_document["verification_code"].startswith("DOCV-")

    draft_verify_status, draft_verify_payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={draft_document["document_number"]}',
    )

    assert draft_verify_status == 404
    assert isinstance(draft_verify_payload, dict)

    response = patch_multipart_admin_document(
        token=admin_token,
        document_id=draft_document["id"],
        fields={
            "status": "available",
        },
    )

    assert response.status_code == 200
    published_document = response.json()
    assert published_document["id"] == draft_document["id"]
    assert published_document["status"] == "available"
    assert published_document["file_available"] is True

    status, verify_by_number = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={draft_document["document_number"]}',
    )

    assert status == 200
    assert isinstance(verify_by_number, dict)
    assert verify_by_number["document_number"] == draft_document["document_number"]
    assert verify_by_number["verification_code"] == draft_document["verification_code"]
    assert verify_by_number["document_type"] == "Сертификат"
    assert verify_by_number["title"] == draft_document["title"]
    assert verify_by_number["course_title"] == created_course["title"]
    assert verify_by_number["course_hours"] == created_course["hours"]
    assert verify_by_number["course_format"] == created_course["format"]
    assert verify_by_number["completed_at"] is not None
    assert verify_by_number["issuer_name"]
    assert verify_by_number["issuer_short_name"]
    assert verify_by_number["issuer_address"]
    assert verify_by_number["issuer_license"]
    assert "issuer_inn" in verify_by_number
    assert "issuer_kpp" in verify_by_number
    assert "issuer_ogrn" in verify_by_number
    assert verify_by_number["registry_status"] == "available"
    assert verify_by_number["verification_status"] == "Документ подтверждён"

    status, verify_by_code = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={draft_document["verification_code"]}',
    )

    assert status == 200
    assert isinstance(verify_by_code, dict)
    assert verify_by_code["document_number"] == draft_document["document_number"]
    assert verify_by_code["verification_code"] == draft_document["verification_code"]
    assert verify_by_code["registry_status"] == "available"
    assert verify_by_code["verification_status"] == "Документ подтверждён"


def test_admin_document_download_detects_pdf_content_when_storage_suffix_is_bin() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Generated PDF stored with bin suffix",
        storage_content=b"%PDF-1.4\n% generated test pdf content",
        storage_extension=".bin",
    )

    response = get_admin_document_download_response(
        token=token,
        document_id=document["id"],
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    content_disposition = response.headers.get("content-disposition", "")
    assert ".pdf" in content_disposition
    assert ".bin" not in content_disposition


def test_account_document_download_detects_pdf_content_when_storage_suffix_is_bin() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Account generated PDF stored with bin suffix",
        storage_content=b"%PDF-1.4\n% generated account test pdf content",
        storage_extension=".bin",
    )

    response = get_account_document_download_response(
        token=token,
        document_id=document["id"],
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    content_disposition = response.headers.get("content-disposition", "")
    assert ".pdf" in content_disposition
    assert ".bin" not in content_disposition


def test_admin_revoke_document_sets_revocation_metadata() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Revocation metadata certificate",
        document_type="Certificate",
        status="available",
        storage_content=b"revocation metadata certificate",
        storage_extension=".pdf",
    )

    response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "status": "revoked",
            "revocation_reason": "Incorrect document data",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == document["id"]
    assert payload["status"] == "revoked"
    assert payload["revoked_at"] is not None
    assert payload["revoked_by_user_id"] == user_id
    assert payload["revocation_reason"] == "Incorrect document data"


def test_admin_unrevoke_document_clears_revocation_metadata() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Unrevoke metadata certificate",
        document_type="Certificate",
        status="available",
        storage_content=b"unrevoke metadata certificate",
        storage_extension=".pdf",
    )

    revoke_response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "status": "revoked",
            "revocation_reason": "Temporary revoke",
        },
    )

    assert revoke_response.status_code == 200
    revoked_payload = revoke_response.json()
    assert revoked_payload["status"] == "revoked"
    assert revoked_payload["revoked_at"] is not None
    assert revoked_payload["revoked_by_user_id"] == user_id
    assert revoked_payload["revocation_reason"] == "Temporary revoke"

    restore_response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "status": "available",
        },
    )

    assert restore_response.status_code == 200
    restored_payload = restore_response.json()
    assert restored_payload["id"] == document["id"]
    assert restored_payload["status"] == "available"
    assert restored_payload["revoked_at"] is None
    assert restored_payload["revoked_by_user_id"] is None
    assert restored_payload["revocation_reason"] is None


def test_admin_rejects_revocation_reason_for_available_document() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)

    document = create_test_document_record_in_db(
        user_id=str(me_payload["id"]),
        title="Invalid revocation reason certificate",
        document_type="Certificate",
        status="available",
        storage_content=b"invalid revocation reason certificate",
        storage_extension=".pdf",
    )

    response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "status": "available",
            "revocation_reason": "Reason without revoked status",
        },
    )

    assert response.status_code == 422


def test_admin_document_revocation_writes_specific_audit_events() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, me_payload = request_json("GET", "/api/v1/auth/me", token=token)
    assert status == 200
    assert isinstance(me_payload, dict)
    user_id = str(me_payload["id"])

    document = create_test_document_record_in_db(
        user_id=user_id,
        title="Audit revocation certificate",
        document_type="Certificate",
        status="available",
        storage_content=b"audit revocation certificate",
        storage_extension=".pdf",
    )

    revoke_response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "status": "revoked",
            "revocation_reason": "Audit revoke reason",
        },
    )
    assert revoke_response.status_code == 200

    restore_response = patch_multipart_admin_document(
        token=token,
        document_id=document["id"],
        fields={
            "status": "available",
        },
    )
    assert restore_response.status_code == 200

    status, audit_events = request_json(
        "GET",
        f"/api/v1/admin/audit-events?entity_type=document&entity_id={document['id']}&limit=20",
        token=token,
    )
    assert status == 200
    assert isinstance(audit_events, list)

    revoked_event = next(
        event
        for event in audit_events
        if event["action"] == "admin.document_revoked"
    )
    restored_event = next(
        event
        for event in audit_events
        if event["action"] == "admin.document_restored"
    )

    assert revoked_event["entity_type"] == "document"
    assert revoked_event["entity_id"] == document["id"]
    assert revoked_event["payload"]["before"]["status"] == "available"
    assert revoked_event["payload"]["after"]["status"] == "revoked"
    assert revoked_event["payload"]["after"]["revoked_at"] is not None
    assert revoked_event["payload"]["after"]["revoked_by_user_id"] == user_id
    assert revoked_event["payload"]["after"]["revocation_reason"] == "Audit revoke reason"
    assert revoked_event["payload"]["status_transition"] == {
        "from": "available",
        "to": "revoked",
    }
    assert "status" in revoked_event["payload"]["changed_fields"]
    assert "revoked_at" in revoked_event["payload"]["changed_fields"]
    assert "revoked_by_user_id" in revoked_event["payload"]["changed_fields"]
    assert "revocation_reason" in revoked_event["payload"]["changed_fields"]

    assert restored_event["entity_type"] == "document"
    assert restored_event["entity_id"] == document["id"]
    assert restored_event["payload"]["before"]["status"] == "revoked"
    assert restored_event["payload"]["after"]["status"] == "available"
    assert restored_event["payload"]["after"]["revoked_at"] is None
    assert restored_event["payload"]["after"]["revoked_by_user_id"] is None
    assert restored_event["payload"]["after"]["revocation_reason"] is None
    assert restored_event["payload"]["status_transition"] == {
        "from": "revoked",
        "to": "available",
    }
    assert "status" in restored_event["payload"]["changed_fields"]
    assert "revoked_at" in restored_event["payload"]["changed_fields"]
    assert "revoked_by_user_id" in restored_event["payload"]["changed_fields"]
    assert "revocation_reason" in restored_event["payload"]["changed_fields"]


def test_learner_account_documents_include_revocation_metadata() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    learner_user_id = get_user_id_by_email(admin_token, LEARNER_EMAIL)

    reason = "Learner account revoked metadata"

    document = create_test_document_record_in_db(
        user_id=learner_user_id,
        title="Learner revoked certificate",
        document_type="Certificate",
        status="available",
        storage_content=b"learner revoked certificate",
        storage_extension=".pdf",
    )

    response = patch_multipart_admin_document(
        token=admin_token,
        document_id=document["id"],
        fields={
            "status": "revoked",
            "revocation_reason": reason,
        },
    )
    assert response.status_code == 200

    status, account_documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert status == 200
    assert isinstance(account_documents, dict)

    matches = [
        item
        for item in account_documents["items"]
        if item["id"] == document["id"]
    ]

    assert len(matches) == 1

    item = matches[0]
    assert item["status"] == "revoked"
    assert item["file_available"] is True
    assert item["download_available"] is False
    assert item["revoked_at"] is not None
    assert item["revocation_reason"] == reason



def test_org_profile_scope_for_admin_org_rep_and_unscoped_user() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    first_group_code = unique_group_code()
    status, first_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": first_organization_id,
            "name": f"Org profile first group {first_group_code}",
            "code": first_group_code,
            "description": "Org profile scoped group",
            "is_active": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(first_group, dict)
    first_group_id = str(first_group["id"])

    second_group_code = unique_group_code()
    status, second_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": second_organization_id,
            "name": f"Org profile second group {second_group_code}",
            "code": second_group_code,
            "description": "Org profile foreign scoped group",
            "is_active": False,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(second_group, dict)

    org_rep_email = f"org_profile_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgProfileRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org profile representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)
    org_rep_user_id = str(org_rep_user["id"])

    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    status, scoped_user = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user_id}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200
    assert isinstance(scoped_user, dict)

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{first_group_id}/members",
        {"user_id": org_rep_user_id},
        token=admin_token,
    )
    assert status == 201
    assert isinstance(member, dict)

    status, admin_profile = request_json(
        "GET",
        "/api/v1/org/profile",
        token=admin_token,
    )
    assert status == 200
    assert isinstance(admin_profile, dict)
    admin_organization_ids = {
        str(organization["id"])
        for organization in admin_profile["organizations"]
    }
    assert first_organization_id in admin_organization_ids
    assert second_organization_id in admin_organization_ids
    assert admin_profile["summary"]["organizations_count"] >= 2
    assert admin_profile["summary"]["groups_count"] >= 2

    org_rep_token = login(org_rep_email, org_rep_password)

    status, org_rep_profile = request_json(
        "GET",
        "/api/v1/org/profile",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(org_rep_profile, dict)
    assert org_rep_profile["summary"] == {
        "organizations_count": 1,
        "groups_count": 1,
        "active_groups_count": 1,
        "members_count": 1,
    }
    assert len(org_rep_profile["organizations"]) == 1
    assert org_rep_profile["organizations"][0]["id"] == first_organization_id
    assert org_rep_profile["organizations"][0]["name"]

    unscoped_email = f"org_profile_unscoped_{uuid4().hex[:12]}@example.com"
    unscoped_password = "OrgProfileNoRole123!"

    status, unscoped_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": unscoped_email,
            "password": unscoped_password,
            "full_name": "Org profile unscoped user",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(unscoped_user, dict)

    unscoped_token = login(unscoped_email, unscoped_password)

    status, forbidden_payload = request_json(
        "GET",
        "/api/v1/org/profile",
        token=unscoped_token,
    )
    assert status == 403
    assert isinstance(forbidden_payload, dict)



def test_org_profile_update_is_limited_to_assigned_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    org_rep_email = f"org_profile_update_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgProfileUpdate123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org profile update representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    status, scoped_user = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200
    assert isinstance(scoped_user, dict)

    org_rep_token = login(org_rep_email, org_rep_password)

    status, updated = request_json(
        "PATCH",
        f"/api/v1/org/profile/{first_organization_id}",
        {
            "kpp": "  123456789  ",
            "ogrn": "  1234567890123  ",
            "legal_address": "  Test legal address  ",
            "actual_address": "  Test actual address  ",
        },
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == first_organization_id
    assert updated["kpp"] == "123456789"
    assert updated["ogrn"] == "1234567890123"
    assert updated["legal_address"] == "Test legal address"
    assert updated["actual_address"] == "Test actual address"

    status, profile = request_json(
        "GET",
        "/api/v1/org/profile",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(profile, dict)
    assert len(profile["organizations"]) == 1
    assert profile["organizations"][0]["id"] == first_organization_id
    assert profile["organizations"][0]["legal_address"] == "Test legal address"

    status, foreign_update = request_json(
        "PATCH",
        f"/api/v1/org/profile/{second_organization_id}",
        {"actual_address": "Forbidden foreign update"},
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_update, dict)

    status, too_long_payload = request_json(
        "PATCH",
        f"/api/v1/org/profile/{first_organization_id}",
        {"kpp": "1234567890"},
        token=org_rep_token,
    )
    assert status == 422
    assert isinstance(too_long_payload, dict)

    status, missing_update = request_json(
        "PATCH",
        "/api/v1/org/profile/00000000-0000-0000-0000-000000000000",
        {"actual_address": "Missing organization"},
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(missing_update, dict)

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, forbidden_payload = request_json(
        "PATCH",
        f"/api/v1/org/profile/{first_organization_id}",
        {"actual_address": "Learner forbidden update"},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(forbidden_payload, dict)



def test_org_user_search_is_limited_to_assigned_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    learner_role_id = get_role_id_by_code(admin_token, "learner_fl")
    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    first_user_email = f"org_search_first_{uuid4().hex[:12]}@example.com"
    second_user_email = f"org_search_second_{uuid4().hex[:12]}@example.com"

    status, first_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": first_user_email,
            "password": "OrgSearchFirst123!",
            "full_name": "Org Search First User",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(first_user, dict)

    status, second_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": second_user_email,
            "password": "OrgSearchSecond123!",
            "full_name": "Org Search Second User",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(second_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{first_user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{second_user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": second_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_email = f"org_search_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgSearchRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org Search Representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_token = login(org_rep_email, org_rep_password)

    status, scoped_results = request_json(
        "GET",
        f"/api/v1/org/users?q={first_user_email}",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(scoped_results, list)
    assert [item["id"] for item in scoped_results] == [first_user["id"]]
    assert scoped_results[0]["organization_ids"] == [first_organization_id]
    assert scoped_results[0]["organizations"][0]["id"] == first_organization_id
    assert any(role["code"] == "learner_fl" for role in scoped_results[0]["roles"])

    status, foreign_results = request_json(
        "GET",
        f"/api/v1/org/users?q={second_user_email}",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(foreign_results, list)
    assert foreign_results == []

    status, visible_results = request_json(
        "GET",
        "/api/v1/org/users?limit=20",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(visible_results, list)
    visible_ids = {item["id"] for item in visible_results}
    assert first_user["id"] in visible_ids
    assert second_user["id"] not in visible_ids

    status, admin_results = request_json(
        "GET",
        f"/api/v1/org/users?q={second_user_email}",
        token=admin_token,
    )
    assert status == 200
    assert isinstance(admin_results, list)
    assert [item["id"] for item in admin_results] == [second_user["id"]]

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, forbidden_payload = request_json(
        "GET",
        "/api/v1/org/users",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(forbidden_payload, dict)



def test_org_group_member_add_rejects_user_from_foreign_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    learner_role_id = get_role_id_by_code(admin_token, "learner_fl")
    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    first_user_email = f"org_member_first_{uuid4().hex[:12]}@example.com"
    second_user_email = f"org_member_second_{uuid4().hex[:12]}@example.com"

    status, first_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": first_user_email,
            "password": "OrgMemberFirst123!",
            "full_name": "Org Member First User",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(first_user, dict)

    status, second_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": second_user_email,
            "password": "OrgMemberSecond123!",
            "full_name": "Org Member Second User",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(second_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{first_user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{second_user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": second_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    group_code = unique_group_code()
    status, group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": first_organization_id,
            "name": f"Foreign member guard group {group_code}",
            "code": group_code,
            "description": "Group member foreign organization guard",
            "is_active": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(group, dict)

    status, first_member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": first_user["id"]},
        token=admin_token,
    )
    assert status == 201
    assert isinstance(first_member, dict)
    assert first_member["user_id"] == first_user["id"]
    assert any(item["id"] == first_organization_id for item in first_member["user_organizations"])
    assert any(role["code"] == "learner_fl" for role in first_member["user_roles"])

    status, foreign_member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": second_user["id"]},
        token=admin_token,
    )
    assert status == 404
    assert isinstance(foreign_member, dict)

    org_rep_email = f"org_member_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgMemberRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org Member Representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_token = login(org_rep_email, org_rep_password)

    status, scoped_foreign_member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": second_user["id"]},
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(scoped_foreign_member, dict)



def test_org_user_search_excludes_existing_group_members() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    learner_role_id = get_role_id_by_code(admin_token, "learner_fl")
    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    user_email = f"org_search_exclude_{uuid4().hex[:12]}@example.com"

    status, user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": user_email,
            "password": "OrgSearchExclude123!",
            "full_name": "Org Search Exclude User",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    group_code = unique_group_code()
    status, group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": first_organization_id,
            "name": f"User search exclude group {group_code}",
            "code": group_code,
            "description": "User search exclude existing members",
            "is_active": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(group, dict)

    foreign_group_code = unique_group_code()
    status, foreign_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": second_organization_id,
            "name": f"User search foreign exclude group {foreign_group_code}",
            "code": foreign_group_code,
            "description": "Foreign exclude group",
            "is_active": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(foreign_group, dict)

    org_rep_email = f"org_search_exclude_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgSearchExcludeRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org Search Exclude Representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_token = login(org_rep_email, org_rep_password)

    status, before_add = request_json(
        "GET",
        f"/api/v1/org/users?q={user_email}&exclude_group_id={group['id']}",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(before_add, list)
    assert [item["id"] for item in before_add] == [user["id"]]

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": user["id"]},
        token=admin_token,
    )
    assert status == 201
    assert isinstance(member, dict)

    status, after_add = request_json(
        "GET",
        f"/api/v1/org/users?q={user_email}&exclude_group_id={group['id']}",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(after_add, list)
    assert after_add == []

    status, foreign_exclude = request_json(
        "GET",
        f"/api/v1/org/users?q={user_email}&exclude_group_id={foreign_group['id']}",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_exclude, dict)



def test_org_rep_can_create_group_enrollments_for_assigned_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    learner_role_id = get_role_id_by_code(admin_token, "learner_fl")
    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    learner_email = f"org_group_enrollment_learner_{uuid4().hex[:12]}@example.com"
    status, learner_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": learner_email,
            "password": "OrgGroupEnrollmentLearner123!",
            "full_name": "Org Group Enrollment Learner",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(learner_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    group_code = unique_group_code()
    status, group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": first_organization_id,
            "name": f"Org enrollment group {group_code}",
            "code": group_code,
            "description": "Org group enrollment test",
            "is_active": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(group, dict)

    foreign_group_code = unique_group_code()
    status, foreign_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": second_organization_id,
            "name": f"Foreign org enrollment group {foreign_group_code}",
            "code": foreign_group_code,
            "description": "Foreign org group enrollment test",
            "is_active": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(foreign_group, dict)

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": learner_user["id"]},
        token=admin_token,
    )
    assert status == 201
    assert isinstance(member, dict)

    course = create_test_course_in_db(
        title=f"Org Group Enrollment Course {uuid4().hex[:8]}",
    )

    org_rep_email = f"org_group_enrollment_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgGroupEnrollmentRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org Group Enrollment Representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_token = login(org_rep_email, org_rep_password)

    status, created = request_json(
        "POST",
        "/api/v1/org/enrollments/group",
        {
            "learning_group_id": group["id"],
            "course_id": course["id"],
            "status": "assigned",
        },
        token=org_rep_token,
    )
    assert status == 201
    assert isinstance(created, dict)
    assert created["status"] == "ok"
    assert created["learning_group_id"] == group["id"]
    assert created["course_id"] == course["id"]
    assert created["organization_id"] == first_organization_id
    assert created["created_count"] == 1
    assert created["skipped_count"] == 0
    assert len(created["created"]) == 1
    assert created["created"][0]["user_id"] == learner_user["id"]
    assert created["created"][0]["learning_group_id"] == group["id"]

    status, repeated = request_json(
        "POST",
        "/api/v1/org/enrollments/group",
        {
            "learning_group_id": group["id"],
            "course_id": course["id"],
            "status": "assigned",
        },
        token=org_rep_token,
    )
    assert status == 201
    assert isinstance(repeated, dict)
    assert repeated["created_count"] == 0
    assert repeated["skipped_count"] == 1
    assert repeated["skipped"][0]["reason"] == "already_enrolled"

    status, foreign_group_payload = request_json(
        "POST",
        "/api/v1/org/enrollments/group",
        {
            "learning_group_id": foreign_group["id"],
            "course_id": course["id"],
            "status": "assigned",
        },
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_group_payload, dict)

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, forbidden = request_json(
        "POST",
        "/api/v1/org/enrollments/group",
        {
            "learning_group_id": group["id"],
            "course_id": course["id"],
            "status": "assigned",
        },
        token=learner_token,
    )
    assert status == 403
    assert isinstance(forbidden, dict)



def test_org_rep_can_list_group_enrollments_in_assigned_organization() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    first_organization_id = create_test_organization(admin_token)
    second_organization_id = create_test_organization(admin_token)

    learner_role_id = get_role_id_by_code(admin_token, "learner_fl")
    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    learner_email = f"org_group_enrollment_list_{uuid4().hex[:12]}@example.com"

    status, learner = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": learner_email,
            "password": "OrgGroupEnrollmentList123!",
            "full_name": "Org Group Enrollment List Learner",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(learner, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    group = create_test_learning_group(admin_token, first_organization_id)
    foreign_group = create_test_learning_group(admin_token, second_organization_id)
    course = create_test_course_in_db(title=f"Org Group Enrollment List Course {uuid4().hex[:8]}")

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": learner["id"]},
        token=admin_token,
    )
    assert status == 201
    assert isinstance(member, dict)

    status, bulk_result = request_json(
        "POST",
        "/api/v1/org/enrollments/group",
        {
            "learning_group_id": group["id"],
            "course_id": course["id"],
            "status": "assigned",
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(bulk_result, dict)
    assert bulk_result["created_count"] == 1

    org_rep_email = f"org_group_enrollment_list_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgGroupEnrollmentListRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org Group Enrollment List Representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": first_organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_token = login(org_rep_email, org_rep_password)

    status, enrollments = request_json(
        "GET",
        f"/api/v1/org/groups/{group['id']}/enrollments",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(enrollments, list)
    assert len(enrollments) == 1
    assert enrollments[0]["user_id"] == learner["id"]
    assert enrollments[0]["course_id"] == course["id"]
    assert enrollments[0]["learning_group_id"] == group["id"]
    assert enrollments[0]["organization_id"] == first_organization_id

    status, foreign_payload = request_json(
        "GET",
        f"/api/v1/org/groups/{foreign_group['id']}/enrollments",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_payload, dict)

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, forbidden_payload = request_json(
        "GET",
        f"/api/v1/org/groups/{group['id']}/enrollments",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(forbidden_payload, dict)



def test_org_rep_can_delete_assigned_group_enrollment() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    organization_id = create_test_organization(admin_token)
    foreign_organization_id = create_test_organization(admin_token)

    learner_role_id = get_role_id_by_code(admin_token, "learner_fl")
    org_rep_role_id = get_role_id_by_code(admin_token, "org_rep")

    learner_email = f"org_delete_enrollment_learner_{uuid4().hex[:12]}@example.com"

    status, learner_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": learner_email,
            "password": "OrgDeleteEnrollmentLearner123!",
            "full_name": "Org Delete Enrollment Learner",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(learner_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user['id']}/roles",
        {
            "role_id": learner_role_id,
            "organization_id": organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    group = create_test_learning_group(admin_token, organization_id)
    foreign_group = create_test_learning_group(admin_token, foreign_organization_id)

    status, member = request_json(
        "POST",
        f"/api/v1/org/groups/{group['id']}/members",
        {"user_id": learner_user["id"]},
        token=admin_token,
    )
    assert status == 201
    assert isinstance(member, dict)

    course = create_test_course_in_db(title=f"Org Delete Group Enrollment {uuid4().hex[:8]}")

    org_rep_email = f"org_delete_enrollment_rep_{uuid4().hex[:12]}@example.com"
    org_rep_password = "OrgDeleteEnrollmentRep123!"

    status, org_rep_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": org_rep_email,
            "password": org_rep_password,
            "full_name": "Org Delete Enrollment Representative",
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert status == 201
    assert isinstance(org_rep_user, dict)

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{org_rep_user['id']}/roles",
        {
            "role_id": org_rep_role_id,
            "organization_id": organization_id,
        },
        token=admin_token,
    )
    assert status == 200

    org_rep_token = login(org_rep_email, org_rep_password)

    status, bulk_result = request_json(
        "POST",
        "/api/v1/org/enrollments/group",
        {
            "learning_group_id": group["id"],
            "course_id": course["id"],
            "status": "assigned",
        },
        token=org_rep_token,
    )
    assert status == 201
    assert isinstance(bulk_result, dict)
    assert bulk_result["created_count"] == 1
    assert len(bulk_result["created"]) == 1

    enrollment_id = bulk_result["created"][0]["id"]

    status, foreign_delete_payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{foreign_group['id']}/enrollments/{enrollment_id}",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(foreign_delete_payload, dict)

    status, delete_payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group['id']}/enrollments/{enrollment_id}",
        token=org_rep_token,
    )
    assert status == 204

    status, enrollments_after_delete = request_json(
        "GET",
        f"/api/v1/org/groups/{group['id']}/enrollments",
        token=org_rep_token,
    )
    assert status == 200
    assert isinstance(enrollments_after_delete, list)
    assert all(item["id"] != enrollment_id for item in enrollments_after_delete)

    status, repeated_delete_payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group['id']}/enrollments/{enrollment_id}",
        token=org_rep_token,
    )
    assert status == 404
    assert isinstance(repeated_delete_payload, dict)
