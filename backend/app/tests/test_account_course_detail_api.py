from __future__ import annotations

import uuid

from test_course_lessons_admin_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    create_admin_course,
    delete_admin_course,
    login,
    request_json,
)
from test_public_course_outline import create_course_lesson, create_course_module


def unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}@example.test"


def unique_phone() -> str:
    return f"+7999{uuid.uuid4().int % 10_000_000:07d}"


def register_learner(*, prefix: str = "learner") -> dict:
    email = unique_email(prefix)
    learner_plain_value = "LearnerPassword123!"
    phone = unique_phone()

    status, data = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": email,
            "password": learner_plain_value,
            "full_name": f"{prefix} user",
            "phone": phone,
        },
    )

    assert status == 201
    assert isinstance(data, dict)

    return {
        "email": email,
        "password": learner_plain_value,
        "phone": phone,
        "response": data,
    }


def enroll_learner_to_course(learner_token: str, course_id: str) -> dict:
    status, enrollment = request_json(
        "POST",
        f"/api/v1/account/courses/{course_id}/enroll",
        token=learner_token,
    )

    assert status == 201
    assert isinstance(enrollment, dict)
    assert enrollment["course_id"] == course_id

    return enrollment


def delete_admin_enrollment(token: str, enrollment_id: str) -> None:
    status, payload = request_json(
        "DELETE",
        f"/api/v1/admin/enrollments/{enrollment_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["status"] == "deleted"
    assert payload["id"] == enrollment_id


def test_account_course_detail_returns_own_active_outline_only_sorted() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner = register_learner(prefix="outline-learner")
    learner_token = login(learner["email"], learner["password"])

    course = create_admin_course(admin_token)
    course_id = str(course["id"])
    enrollment_id: str | None = None

    try:
        visible_module_2 = create_course_module(
            admin_token,
            course_id,
            title="Account visible module second",
            position=2,
            is_active=True,
        )
        hidden_module = create_course_module(
            admin_token,
            course_id,
            title="Account hidden module",
            position=3,
            is_active=False,
        )
        visible_module_1 = create_course_module(
            admin_token,
            course_id,
            title="Account visible module first",
            position=1,
            is_active=True,
        )

        first_module_lesson = create_course_lesson(
            admin_token,
            str(visible_module_1["id"]),
            title="Account first module lesson",
            position=1,
            content_type="text",
            is_required=True,
            is_active=True,
        )

        visible_lesson_2 = create_course_lesson(
            admin_token,
            str(visible_module_2["id"]),
            title="Account visible lesson second",
            position=2,
            content_type="video",
            is_required=False,
            is_active=True,
        )
        hidden_lesson = create_course_lesson(
            admin_token,
            str(visible_module_2["id"]),
            title="Account hidden inactive lesson",
            position=3,
            content_type="text",
            is_required=True,
            is_active=False,
        )
        visible_lesson_1 = create_course_lesson(
            admin_token,
            str(visible_module_2["id"]),
            title="Account visible lesson first",
            position=1,
            content_type="link",
            is_required=True,
            is_active=True,
        )

        enrollment = enroll_learner_to_course(learner_token, course_id)
        enrollment_id = str(enrollment["enrollment_id"])

        status, detail = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
            token=learner_token,
        )

        assert status == 200
        assert isinstance(detail, dict)
        assert detail["enrollment_id"] == enrollment_id
        assert detail["course_id"] == course_id
        assert detail["course_slug"] == course["slug"]
        assert detail["course_title"] == course["title"]
        assert isinstance(detail["modules"], list)

        modules = detail["modules"]
        module_ids = [module["id"] for module in modules]

        assert module_ids == [
            visible_module_1["id"],
            visible_module_2["id"],
        ]
        assert hidden_module["id"] not in module_ids

        assert modules[0]["position"] == 1
        assert modules[0]["title"] == "Account visible module first"
        assert "is_active" not in modules[0]
        assert [lesson["id"] for lesson in modules[0]["lessons"]] == [
            first_module_lesson["id"],
        ]

        second_module_lessons = modules[1]["lessons"]
        second_module_lesson_ids = [lesson["id"] for lesson in second_module_lessons]

        assert second_module_lesson_ids == [
            visible_lesson_1["id"],
            visible_lesson_2["id"],
        ]
        assert hidden_lesson["id"] not in second_module_lesson_ids

        assert second_module_lessons[0]["position"] == 1
        assert second_module_lessons[0]["content_type"] == "link"
        assert second_module_lessons[0]["is_required"] is True
        assert "is_active" not in second_module_lessons[0]

        assert second_module_lessons[1]["position"] == 2
        assert second_module_lessons[1]["content_type"] == "video"
        assert second_module_lessons[1]["is_required"] is False
    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, course_id)


def test_account_course_detail_rejects_foreign_enrollment_and_missing_token() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    owner = register_learner(prefix="outline-owner")
    stranger = register_learner(prefix="outline-stranger")

    owner_token = login(owner["email"], owner["password"])
    stranger_token = login(stranger["email"], stranger["password"])

    course = create_admin_course(admin_token)
    course_id = str(course["id"])
    enrollment_id: str | None = None

    try:
        enrollment = enroll_learner_to_course(owner_token, course_id)
        enrollment_id = str(enrollment["enrollment_id"])

        status, _ = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
            token=stranger_token,
        )
        assert status == 404

        status, _ = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
        )
        assert status == 401
    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, course_id)
