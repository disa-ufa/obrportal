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
    return f"course-lessons-{uuid4().hex[:12]}"


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
            "title": f"Course lessons API test {slug}",
            "description": "Course for CourseLesson admin API tests",
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


def create_admin_course_module(token: str, course_id: str, *, position: int = 1) -> dict:
    status, module = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_id}/modules",
        {
            "title": f"Course lesson test module {position}",
            "description": "Module for CourseLesson admin API tests",
            "position": position,
            "is_active": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(module, dict)
    assert module["id"]
    assert module["course_id"] == course_id
    assert module["position"] == position

    return module


def test_admin_can_create_list_filter_update_and_delete_course_lessons() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    course = create_admin_course(token)
    course_id = str(course["id"])

    try:
        module = create_admin_course_module(token, course_id)
        module_id = str(module["id"])

        status, initial_lessons = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            token=token,
        )
        assert status == 200
        assert isinstance(initial_lessons, list)
        assert initial_lessons == []

        status, first_lesson = request_json(
            "POST",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            {
                "title": "  Lesson 1  ",
                "description": "  Initial lesson description  ",
                "content_type": "Text",
                "content_url": "",
                "content_text": "  Initial text content  ",
                "position": 1,
                "is_required": True,
                "is_active": True,
            },
            token=token,
        )
        assert status == 201
        assert isinstance(first_lesson, dict)
        assert first_lesson["module_id"] == module_id
        assert first_lesson["title"] == "Lesson 1"
        assert first_lesson["description"] == "Initial lesson description"
        assert first_lesson["content_type"] == "text"
        assert first_lesson["content_url"] is None
        assert first_lesson["content_text"] == "Initial text content"
        assert first_lesson["position"] == 1
        assert first_lesson["is_required"] is True
        assert first_lesson["is_active"] is True
        first_lesson_id = str(first_lesson["id"])

        status, second_lesson = request_json(
            "POST",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            {
                "title": "Lesson 2",
                "description": None,
                "content_type": "video",
                "content_url": "https://example.com/video",
                "content_text": None,
                "position": 2,
                "is_required": False,
                "is_active": False,
            },
            token=token,
        )
        assert status == 201
        assert isinstance(second_lesson, dict)
        assert second_lesson["module_id"] == module_id
        assert second_lesson["content_type"] == "video"
        assert second_lesson["position"] == 2
        assert second_lesson["is_required"] is False
        assert second_lesson["is_active"] is False
        second_lesson_id = str(second_lesson["id"])

        status, listed_lessons = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            token=token,
        )
        assert status == 200
        assert isinstance(listed_lessons, list)
        assert [lesson["id"] for lesson in listed_lessons[:2]] == [
            first_lesson_id,
            second_lesson_id,
        ]

        status, active_lessons = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{module_id}/lessons?is_active=true",
            token=token,
        )
        assert status == 200
        assert isinstance(active_lessons, list)
        assert any(lesson["id"] == first_lesson_id for lesson in active_lessons)
        assert all(lesson["is_active"] is True for lesson in active_lessons)

        status, video_lessons = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{module_id}/lessons?content_type=video",
            token=token,
        )
        assert status == 200
        assert isinstance(video_lessons, list)
        assert any(lesson["id"] == second_lesson_id for lesson in video_lessons)
        assert all(lesson["content_type"] == "video" for lesson in video_lessons)

        status, detail = request_json(
            "GET",
            f"/api/v1/admin/course-lessons/{first_lesson_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(detail, dict)
        assert detail["id"] == first_lesson_id
        assert detail["module_id"] == module_id
        assert detail["created_at"]
        assert detail["updated_at"]

        status, updated = request_json(
            "PATCH",
            f"/api/v1/admin/course-lessons/{first_lesson_id}",
            {
                "title": "Lesson 1 Updated",
                "description": "",
                "content_type": "link",
                "content_url": "  https://example.com/lesson  ",
                "content_text": "",
                "position": 3,
                "is_required": False,
                "is_active": False,
            },
            token=token,
        )
        assert status == 200
        assert isinstance(updated, dict)
        assert updated["id"] == first_lesson_id
        assert updated["title"] == "Lesson 1 Updated"
        assert updated["description"] is None
        assert updated["content_type"] == "link"
        assert updated["content_url"] == "https://example.com/lesson"
        assert updated["content_text"] is None
        assert updated["position"] == 3
        assert updated["is_required"] is False
        assert updated["is_active"] is False

        status, duplicate_create = request_json(
            "POST",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            {
                "title": "Duplicate position",
                "content_type": "text",
                "position": 2,
                "is_required": True,
                "is_active": True,
            },
            token=token,
        )
        assert status == 409
        assert isinstance(duplicate_create, dict)

        status, duplicate_update = request_json(
            "PATCH",
            f"/api/v1/admin/course-lessons/{first_lesson_id}",
            {
                "position": 2,
            },
            token=token,
        )
        assert status == 409
        assert isinstance(duplicate_update, dict)

        status, invalid_type = request_json(
            "POST",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            {
                "title": "Invalid content type",
                "content_type": "unknown",
                "position": 4,
                "is_required": True,
                "is_active": True,
            },
            token=token,
        )
        assert status == 422
        assert isinstance(invalid_type, dict)

        status, empty_update = request_json(
            "PATCH",
            f"/api/v1/admin/course-lessons/{first_lesson_id}",
            {},
            token=token,
        )
        assert status == 400
        assert isinstance(empty_update, dict)

        status, deleted = request_json(
            "DELETE",
            f"/api/v1/admin/course-lessons/{first_lesson_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(deleted, dict)
        assert deleted["status"] == "deleted"
        assert deleted["id"] == first_lesson_id

        status, deleted_detail = request_json(
            "GET",
            f"/api/v1/admin/course-lessons/{first_lesson_id}",
            token=token,
        )
        assert status == 404
        assert isinstance(deleted_detail, dict)

        status, second_deleted = request_json(
            "DELETE",
            f"/api/v1/admin/course-lessons/{second_lesson_id}",
            token=token,
        )
        assert status == 200
        assert isinstance(second_deleted, dict)
        assert second_deleted["status"] == "deleted"
    finally:
        delete_admin_course(token, course_id)


def test_course_lesson_admin_api_returns_404_for_missing_records() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    missing_id = "00000000-0000-0000-0000-000000000000"

    status, missing_module_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{missing_id}/lessons",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_module_lessons, dict)

    status, missing_module_lesson_create = request_json(
        "POST",
        f"/api/v1/admin/course-modules/{missing_id}/lessons",
        {
            "title": "Missing module lesson",
            "content_type": "text",
            "position": 1,
            "is_required": True,
            "is_active": True,
        },
        token=token,
    )
    assert status == 404
    assert isinstance(missing_module_lesson_create, dict)

    status, missing_detail = request_json(
        "GET",
        f"/api/v1/admin/course-lessons/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_detail, dict)

    status, missing_update = request_json(
        "PATCH",
        f"/api/v1/admin/course-lessons/{missing_id}",
        {
            "title": "Missing update",
        },
        token=token,
    )
    assert status == 404
    assert isinstance(missing_update, dict)

    status, missing_delete = request_json(
        "DELETE",
        f"/api/v1/admin/course-lessons/{missing_id}",
        token=token,
    )
    assert status == 404
    assert isinstance(missing_delete, dict)


def test_learner_cannot_manage_course_lessons_admin_api() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    course = create_admin_course(admin_token)
    course_id = str(course["id"])

    try:
        module = create_admin_course_module(admin_token, course_id)
        module_id = str(module["id"])

        status, created_lesson = request_json(
            "POST",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            {
                "title": "Forbidden target lesson",
                "content_type": "text",
                "position": 1,
                "is_required": True,
                "is_active": True,
            },
            token=admin_token,
        )
        assert status == 201
        assert isinstance(created_lesson, dict)
        lesson_id = str(created_lesson["id"])

        status, list_payload = request_json(
            "GET",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            token=learner_token,
        )
        assert status == 403
        assert isinstance(list_payload, dict)

        status, create_payload = request_json(
            "POST",
            f"/api/v1/admin/course-modules/{module_id}/lessons",
            {
                "title": "Learner forbidden lesson",
                "content_type": "text",
                "position": 2,
                "is_required": True,
                "is_active": True,
            },
            token=learner_token,
        )
        assert status == 403
        assert isinstance(create_payload, dict)

        status, detail_payload = request_json(
            "GET",
            f"/api/v1/admin/course-lessons/{lesson_id}",
            token=learner_token,
        )
        assert status == 403
        assert isinstance(detail_payload, dict)

        status, update_payload = request_json(
            "PATCH",
            f"/api/v1/admin/course-lessons/{lesson_id}",
            {
                "title": "Learner forbidden update",
            },
            token=learner_token,
        )
        assert status == 403
        assert isinstance(update_payload, dict)

        status, delete_payload = request_json(
            "DELETE",
            f"/api/v1/admin/course-lessons/{lesson_id}",
            token=learner_token,
        )
        assert status == 403
        assert isinstance(delete_payload, dict)

        status, admin_deleted = request_json(
            "DELETE",
            f"/api/v1/admin/course-lessons/{lesson_id}",
            token=admin_token,
        )
        assert status == 200
        assert isinstance(admin_deleted, dict)
    finally:
        delete_admin_course(admin_token, course_id)
