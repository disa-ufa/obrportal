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


def test_learner_cannot_create_or_update_role() -> None:
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

