from __future__ import annotations

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("TEST_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("TEST_LEARNER_PASSWORD", "Learner123Local2026!")


def unique_course_slug() -> str:
    return f"course-modules-{uuid4().hex[:12]}"


def request_json(
    method: str,
    path: str,
    body: dict | None = None,
    *,
    token: str | None = None,
) -> tuple[int, object | None]:
    data = None
    headers = {"Accept": "application/json"}

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read()
            if not raw:
                return response.status, None
            return response.status, json.loads(raw.decode("utf-8"))
    except HTTPError as error:
        raw = error.read()
        if not raw:
            return error.code, None
        return error.code, json.loads(raw.decode("utf-8"))


def login(email: str, password: str) -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {
            "email": email,
            "password": password,
        },
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["access_token"]

    return str(payload["access_token"])


def create_admin_course(token: str) -> dict:
    slug = unique_course_slug()

    status, course = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": slug,
            "title": f"Course modules API test {slug}",
            "description": "Course for CourseModule admin API tests",
            "hours": 24,
            "format": "online",
            "document_type": "Certificate",
            "is_active": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(course, dict)
    assert course["id"]
    assert course["slug"] == slug

    return course


def delete_admin_course(token: str, course_id: str) -> None:
    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/courses/{course_id}",
        token=token,
    )

    assert status in {200, 404}
    if status == 200:
        assert isinstance(payload, dict)
        assert payload["status"] == "deleted"


def test_admin_can_create_list_filter_update_and_delete_course_modules() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    course = create_admin_course(token)
    course_id = str(course["id"])

    try:
        status, initial_modules = request_json(
            "GET",
            f"/api/v1/admin/courses/{course_id}/modules",
            token=token,
        )
        assert status == 200
        assert isinstance(initial_modules, list)
        assert initial_modules == []

        status, first_module = request_json(
            "POST",
            f"/api/v1/admin/courses/{course_id}/modules",
            {
                "title": "  Module 1  ",
                "description": "  Initial module description  ",
                "position": 1,
                "is_active": True,
            },
            token=token,
        )
        assert status == 201
        assert isinstance(first_module, dict)
        assert first_module["course_id"] == course_id
        assert first_module["title"] == "Module 1"
        assert first_module["description"] == "Initial module description"
        assert first_module["position"] == 1
        assert first_module["is_active"] is True
        first_module_id = str(first_module["id"])

        status, second_module = request_json(
            "POST",
            f"/api/v1/admin/courses/{course_id}/modules",
            {
                "title": "Module 2",
                "description": None,
                "position": 2,
                "is_active": False,
            },
            token=token,
        )
        assert status == 201
        assert isinstance(second_module, dict)
        assert second_module["course_id"] == course_id
        assert second_module["position"] == 2
        assert second_module["is_active"] is False
        second_module_id = str(second_module["id"])

        status, listed_modules = request_json(
            "GET",
            f"/api/v1/admin/courses/{course_id}/modules",
            token=token,
        )
        assert status == 200
        assert isinstance(listed_modules, list)
        assert [module["id"] for module in listed_modules[:2]] == [
            first_module_id,
            second_module_id,
        ]

        status, active_modules = request_json(
            "GET",
            f"/api/v1/admin/courses/{course_id}/modules?is_active=true",
            token=token,
        )
        assert status == 200
        assert isinstance(active_modules, list)
        assert any(module["id"] == first_module_id for module in active_modules)
        assert all(module["is_active"] is True for module in active_modules)

        status, inactive_modules = request_json(
            "GET",
            f"/api/v1/admin/courses/{course_id}/modules?is_active=false",
            token=token,
        )
        assert status == 200
        assert isinstance(inactive_modules, list)
        assert any(module["id"] == second_module_id for module in inactive_modules)
        assert all(module["is_active"] is False for module in inactive_modules)

        status, detail = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{first_module_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(detail, dict)
        assert detail["id"] == first_module_id
        assert detail["course_id"] == course_id
        assert detail["created_at"]
        assert detail["updated_at"]

        status, updated = request_json(
            "PATCH",
            f"/api/v1/admin/course-modules/{first_module_id}",
            {
                "title": "Module 1 Updated",
                "description": "",
                "position": 3,
                "is_active": False,
            },
            token=token,
        )
        assert status == 200
        assert isinstance(updated, dict)
        assert updated["id"] == first_module_id
        assert updated["title"] == "Module 1 Updated"
        assert updated["description"] is None
        assert updated["position"] == 3
        assert updated["is_active"] is False

        status, duplicate_create = request_json(
            "POST",
            f"/api/v1/admin/courses/{course_id}/modules",
            {
                "title": "Duplicate position",
                "position": 2,
                "is_active": True,
            },
            token=token,
        )
        assert status == 409
        assert isinstance(duplicate_create, dict)

        status, duplicate_update = request_json(
            "PATCH",
            f"/api/v1/admin/course-modules/{first_module_id}",
            {
                "position": 2,
            },
            token=token,
        )
        assert status == 409
        assert isinstance(duplicate_update, dict)

        status, empty_update = request_json(
            "PATCH",
            f"/api/v1/admin/course-modules/{first_module_id}",
            {},
            token=token,
        )
        assert status == 400
        assert isinstance(empty_update, dict)

        status, deleted = request_json(
            "DELETE",
            f"/api/v1/admin/course-modules/{first_module_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(deleted, dict)
        assert deleted["status"] == "deleted"
        assert deleted["id"] == first_module_id

        status, deleted_detail = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{first_module_id}",
            token=token,
        )
        assert status == 404
        assert isinstance(deleted_detail, dict)

        status, second_deleted = request_json(
            "DELETE",
            f"/api/v1/admin/course-modules/{second_module_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(second_deleted, dict)
        assert second_deleted["status"] == "deleted"
    finally:
        delete_admin_course(token, course_id)


def test_course_module_admin_api_returns_404_for_missing_records() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    missing_id = "00000000-0000-0000-0000-000000000000"

    status, missing_course_modules = request_json(
        "GET",
        f"/api/v1/admin/courses/{missing_id}/modules",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_course_modules, dict)

    status, missing_course_module_create = request_json(
        "POST",
        f"/api/v1/admin/courses/{missing_id}/modules",
        {
            "title": "Missing course module",
            "position": 1,
            "is_active": True,
        },
        token=token,
    )
    assert status == 404
    assert isinstance(missing_course_module_create, dict)

    status, missing_detail = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_detail, dict)

    status, missing_update = request_json(
        "PATCH",
        f"/api/v1/admin/course-modules/{missing_id}",
        {
            "title": "Missing update",
        },
        token=token,
    )
    assert status == 404
    assert isinstance(missing_update, dict)

    status, missing_delete = request_json(
        "DELETE",
        f"/api/v1/admin/course-modules/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_delete, dict)


def test_learner_cannot_manage_course_modules_admin_api() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    course = create_admin_course(admin_token)
    course_id = str(course["id"])

    try:
        status, created_module = request_json(
            "POST",
            f"/api/v1/admin/courses/{course_id}/modules",
            {
                "title": "Forbidden target module",
                "position": 1,
                "is_active": True,
            },
            token=admin_token,
        )
        assert status == 201
        assert isinstance(created_module, dict)
        module_id = str(created_module["id"])

        status, list_payload = request_json(
            "GET",
            f"/api/v1/admin/courses/{course_id}/modules",
            token=learner_token,
        )
        assert status == 403
        assert isinstance(list_payload, dict)

        status, create_payload = request_json(
            "POST",
            f"/api/v1/admin/courses/{course_id}/modules",
            {
                "title": "Learner forbidden module",
                "position": 2,
                "is_active": True,
            },
            token=learner_token,
        )
        assert status == 403
        assert isinstance(create_payload, dict)

        status, detail_payload = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{module_id}",
            token=learner_token,
        )
        assert status == 403
        assert isinstance(detail_payload, dict)

        status, update_payload = request_json(
            "PATCH",
            f"/api/v1/admin/course-modules/{module_id}",
            {
                "title": "Learner forbidden update",
            },
            token=learner_token,
        )
        assert status == 403
        assert isinstance(update_payload, dict)

        status, delete_payload = request_json(
            "DELETE",
            f"/api/v1/admin/course-modules/{module_id}",
            token=learner_token,
        )
        assert status == 403
        assert isinstance(delete_payload, dict)

        status, admin_deleted = request_json(
            "DELETE",
            f"/api/v1/admin/course-modules/{module_id}",
            token=admin_token,
        )
        assert status == 200
        assert isinstance(admin_deleted, dict)
    finally:
        delete_admin_course(admin_token, course_id)
