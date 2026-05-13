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


def unique_inn() -> str:
    return f"8{uuid4().int % 1_000_000_000:09d}"


def unique_group_code() -> str:
    return f"members_{uuid4().hex[:12]}"


def create_test_organization(token: str) -> str:
    inn = unique_inn()

    status, organization = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": inn,
            "name": f"Learning group members test organization {inn}",
        },
        token=token,
    )

    assert status == 201
    assert isinstance(organization, dict)

    return str(organization["id"])


def create_test_learning_group(token: str, organization_id: str) -> dict:
    group_code = unique_group_code()

    status, group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": organization_id,
            "name": f"Learning group members test {group_code}",
            "code": group_code,
            "description": "Autotest group for members API",
            "is_active": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(group, dict)

    return group


def get_user_id_by_email(token: str, email: str) -> str:
    status, users = request_json("GET", "/api/v1/admin/users", token=token)

    assert status == 200
    assert isinstance(users, list)

    for user in users:
        if user["email"] == email:
            return str(user["id"])

    raise AssertionError(f"User not found: {email}")


def assert_member_shape(member: dict, *, group_id: str, user_id: str) -> None:
    assert member["id"]
    assert member["learning_group_id"] == group_id
    assert member["user_id"] == user_id
    assert member["user_email"]
    assert "user_full_name" in member
    assert isinstance(member["user_is_active"], bool)
    assert "created_at" in member
    assert "updated_at" in member


def test_admin_can_add_list_and_remove_learning_group_member() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    status, initial_members = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}/members",
        token=token,
    )

    assert status == 200
    assert isinstance(initial_members, list)
    assert all(member["user_id"] != learner_user_id for member in initial_members)

    status, created_member = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        {"user_id": learner_user_id},
        token=token,
    )

    assert status == 201
    assert isinstance(created_member, dict)
    assert_member_shape(created_member, group_id=group_id, user_id=learner_user_id)

    status, members_after_add = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}/members",
        token=token,
    )

    assert status == 200
    assert isinstance(members_after_add, list)
    assert any(member["user_id"] == learner_user_id for member in members_after_add)

    status, delete_payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group_id}/members/{learner_user_id}",
        token=token,
    )

    assert status == 204
    assert delete_payload is None

    status, members_after_delete = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}/members",
        token=token,
    )

    assert status == 200
    assert isinstance(members_after_delete, list)
    assert all(member["user_id"] != learner_user_id for member in members_after_delete)


def test_duplicate_learning_group_member_returns_409() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    status, first_member = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        {"user_id": learner_user_id},
        token=token,
    )

    assert status == 201
    assert isinstance(first_member, dict)

    status, duplicate = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        {"user_id": learner_user_id},
        token=token,
    )

    assert status == 409
    assert isinstance(duplicate, dict)
    assert duplicate["detail"] == "User is already a member of this learning group"


def test_learning_group_member_missing_references_return_404() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])

    missing_id = "00000000-0000-0000-0000-000000000000"

    status, payload = request_json(
        "GET",
        f"/api/v1/org/groups/{missing_id}/members",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/org/groups/{missing_id}/members",
        {"user_id": missing_id},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        {"user_id": missing_id},
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group_id}/members/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(payload, dict)


def test_learner_cannot_read_or_manage_learning_group_members() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    organization_id = create_test_organization(admin_token)
    group = create_test_learning_group(admin_token, organization_id)
    group_id = str(group["id"])
    learner_user_id = get_user_id_by_email(admin_token, LEARNER_EMAIL)

    status, payload = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}/members",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        {"user_id": learner_user_id},
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group_id}/members/{learner_user_id}",
        token=learner_token,
    )
    assert status == 403
    assert isinstance(payload, dict)


def test_no_token_returns_401_for_learning_group_members_api() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    organization_id = create_test_organization(token)
    group = create_test_learning_group(token, organization_id)
    group_id = str(group["id"])
    learner_user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    status, payload = request_json(
        "GET",
        f"/api/v1/org/groups/{group_id}/members",
    )
    assert status == 401
    assert isinstance(payload, dict)

    status, payload = request_json(
        "POST",
        f"/api/v1/org/groups/{group_id}/members",
        {"user_id": learner_user_id},
    )
    assert status == 401
    assert isinstance(payload, dict)

    status, payload = request_json(
        "DELETE",
        f"/api/v1/org/groups/{group_id}/members/{learner_user_id}",
    )
    assert status == 401
    assert isinstance(payload, dict)
