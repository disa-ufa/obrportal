from __future__ import annotations

from test_account_course_detail_api import (
    delete_admin_enrollment,
    enroll_learner_to_course,
    register_learner,
)
from test_course_lessons_admin_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    create_admin_course,
    delete_admin_course,
    login,
    request_json,
)
from test_public_course_outline import create_course_lesson, create_course_module


def create_course_with_module_and_lesson(admin_token: str) -> dict:
    course = create_admin_course(admin_token)
    course_id = str(course["id"])

    module = create_course_module(
        admin_token,
        course_id,
        title="Progress module",
        position=1,
        is_active=True,
    )
    lesson = create_course_lesson(
        admin_token,
        str(module["id"]),
        title="Progress lesson",
        position=1,
        content_type="text",
        is_required=True,
        is_active=True,
    )

    return {
        "course": course,
        "module": module,
        "lesson": lesson,
    }


def find_lesson(detail: dict, lesson_id: str) -> dict:
    for module in detail["modules"]:
        for lesson in module["lessons"]:
            if lesson["id"] == lesson_id:
                return lesson

    raise AssertionError(f"lesson {lesson_id} not found in detail response")


def delete_admin_documents_for_enrollment(token: str, enrollment_id: str) -> None:
    status, documents = request_json(
        "GET",
        f"/api/v1/admin/documents?enrollment_id={enrollment_id}",
        token=token,
    )

    assert status == 200
    assert isinstance(documents, list)

    for document in documents:
        status, payload = request_json(
            "DELETE",
            f"/api/v1/admin/documents/{document['id']}",
            token=token,
        )

        assert status == 200
        assert isinstance(payload, dict)
        assert payload["status"] == "deleted"


def test_learner_can_complete_lesson_and_detail_returns_progress() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner = register_learner(prefix="lesson-progress")
    learner_token = login(learner["email"], learner["password"])

    created = create_course_with_module_and_lesson(admin_token)
    course_id = str(created["course"]["id"])
    lesson_id = str(created["lesson"]["id"])
    enrollment_id: str | None = None

    try:
        enrollment = enroll_learner_to_course(learner_token, course_id)
        enrollment_id = str(enrollment["enrollment_id"])
        assert enrollment["status"] == "assigned"
        assert enrollment["started_at"] is None

        status, detail_before = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
            token=learner_token,
        )

        assert status == 200
        assert detail_before["lessons_total"] == 1
        assert detail_before["lessons_completed"] == 0
        assert detail_before["required_lessons_total"] == 1
        assert detail_before["required_lessons_completed"] == 0
        assert detail_before["progress_percent"] == 0
        assert detail_before["required_progress_percent"] == 0

        lesson_before = find_lesson(detail_before, lesson_id)
        assert lesson_before["is_completed"] is False
        assert lesson_before["completed_at"] is None

        status, detail_after = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
            token=learner_token,
        )

        assert status == 200
        assert isinstance(detail_after, dict)
        assert detail_after["enrollment_id"] == enrollment_id
        assert detail_after["status"] == "active"
        assert detail_after["started_at"] is not None
        assert detail_after["completed_at"] is None
        assert detail_after["lessons_total"] == 1
        assert detail_after["lessons_completed"] == 1
        assert detail_after["required_lessons_total"] == 1
        assert detail_after["required_lessons_completed"] == 1
        assert detail_after["progress_percent"] == 100
        assert detail_after["required_progress_percent"] == 100

        lesson_after = find_lesson(detail_after, lesson_id)
        assert lesson_after["is_completed"] is True
        assert lesson_after["completed_at"] is not None

        status, detail_after_get = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
            token=learner_token,
        )

        assert status == 200
        assert detail_after_get["lessons_total"] == 1
        assert detail_after_get["lessons_completed"] == 1
        assert detail_after_get["required_lessons_total"] == 1
        assert detail_after_get["required_lessons_completed"] == 1
        assert detail_after_get["progress_percent"] == 100
        assert detail_after_get["required_progress_percent"] == 100

        lesson_after_get = find_lesson(detail_after_get, lesson_id)
        assert lesson_after_get["is_completed"] is True
        assert lesson_after_get["completed_at"] == lesson_after["completed_at"]
    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, course_id)


def test_lesson_complete_is_idempotent() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner = register_learner(prefix="lesson-progress-repeat")
    learner_token = login(learner["email"], learner["password"])

    created = create_course_with_module_and_lesson(admin_token)
    course_id = str(created["course"]["id"])
    lesson_id = str(created["lesson"]["id"])
    enrollment_id: str | None = None

    try:
        enrollment = enroll_learner_to_course(learner_token, course_id)
        enrollment_id = str(enrollment["enrollment_id"])

        status, first_detail = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
            token=learner_token,
        )
        assert status == 200

        first_lesson = find_lesson(first_detail, lesson_id)
        first_completed_at = first_lesson["completed_at"]
        assert first_lesson["is_completed"] is True
        assert first_completed_at is not None

        status, second_detail = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
            token=learner_token,
        )
        assert status == 200

        second_lesson = find_lesson(second_detail, lesson_id)
        assert second_lesson["is_completed"] is True
        assert second_lesson["completed_at"] == first_completed_at
    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, course_id)


def test_lesson_complete_rejects_foreign_enrollment_foreign_lesson_and_guest() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    owner = register_learner(prefix="lesson-progress-owner")
    stranger = register_learner(prefix="lesson-progress-stranger")

    owner_token = login(owner["email"], owner["password"])
    stranger_token = login(stranger["email"], stranger["password"])

    first = create_course_with_module_and_lesson(admin_token)
    second = create_course_with_module_and_lesson(admin_token)

    first_course_id = str(first["course"]["id"])
    first_lesson_id = str(first["lesson"]["id"])
    second_course_id = str(second["course"]["id"])
    second_lesson_id = str(second["lesson"]["id"])
    enrollment_id: str | None = None

    try:
        enrollment = enroll_learner_to_course(owner_token, first_course_id)
        enrollment_id = str(enrollment["enrollment_id"])

        status, _ = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{first_lesson_id}/complete",
            token=stranger_token,
        )
        assert status == 404

        status, _ = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{second_lesson_id}/complete",
            token=owner_token,
        )
        assert status == 404

        status, _ = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{first_lesson_id}/complete",
        )
        assert status == 401
    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, first_course_id)
        delete_admin_course(admin_token, second_course_id)


def test_course_completion_requires_required_lessons() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner = register_learner(prefix="lesson-progress-required")
    learner_token = login(learner["email"], learner["password"])

    created = create_course_with_module_and_lesson(admin_token)
    course_id = str(created["course"]["id"])
    enrollment_id: str | None = None

    try:
        enrollment = enroll_learner_to_course(learner_token, course_id)
        enrollment_id = str(enrollment["enrollment_id"])

        status, payload = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/complete",
            token=learner_token,
        )

        assert status == 400
        assert payload["detail"] == "Complete required lessons before completing course"

        status, detail = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
            token=learner_token,
        )

        assert status == 200
        assert detail["status"] == "assigned"
        assert detail["completed_at"] is None
        assert detail["required_lessons_total"] == 1
        assert detail["required_lessons_completed"] == 0
    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, course_id)


def test_lesson_complete_rejects_completed_course() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner = register_learner(prefix="lesson-progress-completed")
    learner_token = login(learner["email"], learner["password"])

    created = create_course_with_module_and_lesson(admin_token)
    course_id = str(created["course"]["id"])
    lesson_id = str(created["lesson"]["id"])
    enrollment_id: str | None = None

    try:
        enrollment = enroll_learner_to_course(learner_token, course_id)
        enrollment_id = str(enrollment["enrollment_id"])

        status, detail_after_lesson = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
            token=learner_token,
        )
        assert status == 200
        assert detail_after_lesson["required_lessons_completed"] == 1

        status, completed = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/complete",
            token=learner_token,
        )
        assert status == 200
        assert completed["status"] == "completed"

        status, payload = request_json(
            "POST",
            f"/api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
            token=learner_token,
        )
        assert status == 400
        assert payload["detail"] == "Completed course cannot be changed"
    finally:
        if enrollment_id is not None:
            delete_admin_documents_for_enrollment(admin_token, enrollment_id)
            delete_admin_enrollment(admin_token, enrollment_id)
        delete_admin_course(admin_token, course_id)
