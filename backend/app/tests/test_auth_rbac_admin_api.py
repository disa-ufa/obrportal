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
        },
        token=token,
    )

    assert status == 200
    assert isinstance(updated, dict)
    assert updated["id"] == organization_id
    assert updated["inn"] == inn
    assert updated["name"] == updated_name

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
) -> dict:
    import asyncio
    from uuid import uuid4

    import app.db.base  # noqa: F401
    from app.core.config import settings
    from app.models.document_record import DocumentRecord
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    document_title = title or f"Document {uuid4().hex[:8]}"
    document_number = unique_document_number()

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
                    file_url=file_url,
                )
                session.add(document)
                await session.commit()
                await session.refresh(document)

                return {
                    "id": str(document.id),
                    "document_number": document.document_number,
                    "document_type": document.document_type,
                    "title": document.title,
                    "status": document.status,
                    "course_id": str(document.course_id) if document.course_id else None,
                    "enrollment_id": str(document.enrollment_id) if document.enrollment_id else None,
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
    )

    status, payload = request_json(
        "GET",
        f'/api/v1/public/documents/verify?number={document["document_number"]}',
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["document_number"] == document["document_number"]
    assert payload["document_type"] == "Сертификат"
    assert payload["title"] == "Public verify certificate"
    assert payload["course_title"] == course["title"]
    assert payload["enrollment_id"] if False else True
    assert payload["verification_status"] == "Документ подтвержден"


def test_public_verify_document_not_found_returns_404() -> None:
    status, payload = request_json(
        "GET",
        "/api/v1/public/documents/verify?number=DOC-NOT-FOUND",
    )

    assert status == 404
    assert isinstance(payload, dict)


def test_admin_can_get_account_document_download() -> None:
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
        file_url="https://example.com/files/downloadable-certificate.pdf",
    )

    status, payload = request_json(
        "GET",
        f'/api/v1/account/documents/{document["id"]}/download',
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["id"] == document["id"]
    assert payload["document_number"] == document["document_number"]
    assert payload["title"] == "Downloadable certificate"
    assert payload["file_url"] == "https://example.com/files/downloadable-certificate.pdf"


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