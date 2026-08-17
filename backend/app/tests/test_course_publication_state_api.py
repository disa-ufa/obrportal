from __future__ import annotations

from uuid import uuid4

from test_account_course_detail_api import (
    delete_admin_enrollment,
    register_learner,
)
from test_course_lessons_admin_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    delete_admin_course,
    login,
    request_json,
)


def create_unpublished_course(token: str) -> dict:
    slug = f"publication-state-{uuid4().hex[:12]}"

    status, course = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": slug,
            "title": f"Publication state test {slug}",
            "description": "Publication state API integration test",
            "hours": 8,
            "format": "online",
            "document_type": "Certificate",
            "is_active": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(course, dict)
    assert course["slug"] == slug
    assert course["is_active"] is True
    assert course["is_public"] is False

    return course


def test_course_publication_controls_public_visibility_and_self_enrollment() -> None:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    learner = register_learner(
        prefix="publication-state-learner"
    )
    learner_token = login(
        learner["email"],
        learner["password"],
    )

    course = create_unpublished_course(admin_token)
    course_id = str(course["id"])
    course_slug = str(course["slug"])
    enrollment_id: str | None = None

    try:
        status, public_list = request_json(
            "GET",
            f"/api/v1/public/courses?q={course_slug}",
        )

        assert status == 200
        assert isinstance(public_list, list)
        assert public_list == []

        status, payload = request_json(
            "GET",
            f"/api/v1/public/courses/{course_slug}",
        )

        assert status == 404

        status, payload = request_json(
            "POST",
            f"/api/v1/account/courses/{course_id}/enroll",
            token=learner_token,
        )

        assert status == 404

        status, published = request_json(
            "PATCH",
            f"/api/v1/admin/courses/{course_id}",
            {
                "is_public": True,
            },
            token=admin_token,
        )

        assert status == 200
        assert isinstance(published, dict)
        assert published["is_active"] is True
        assert published["is_public"] is True

        status, public_detail = request_json(
            "GET",
            f"/api/v1/public/courses/{course_slug}",
        )

        assert status == 200
        assert isinstance(public_detail, dict)
        assert public_detail["id"] == course_id

        status, enrollment = request_json(
            "POST",
            f"/api/v1/account/courses/{course_id}/enroll",
            token=learner_token,
        )

        assert status == 201
        assert isinstance(enrollment, dict)

        enrollment_id = str(
            enrollment["enrollment_id"]
        )

        status, unpublished = request_json(
            "PATCH",
            f"/api/v1/admin/courses/{course_id}",
            {
                "is_public": False,
            },
            token=admin_token,
        )

        assert status == 200
        assert isinstance(unpublished, dict)
        assert unpublished["is_active"] is True
        assert unpublished["is_public"] is False

        status, payload = request_json(
            "GET",
            f"/api/v1/public/courses/{course_slug}",
        )

        assert status == 404

        status, account_detail = request_json(
            "GET",
            f"/api/v1/account/courses/{enrollment_id}",
            token=learner_token,
        )

        assert status == 200
        assert isinstance(account_detail, dict)
        assert account_detail["enrollment_id"] == enrollment_id
        assert account_detail["course_id"] == course_id

        status, account_courses = request_json(
            "GET",
            "/api/v1/account/courses",
            token=learner_token,
        )

        assert status == 200
        assert isinstance(account_courses, dict)

        matching = [
            item
            for item in account_courses.get("items", [])
            if item.get("enrollment_id") == enrollment_id
        ]

        assert len(matching) == 1
        assert matching[0]["course_id"] == course_id

    finally:
        if enrollment_id is not None:
            delete_admin_enrollment(
                admin_token,
                enrollment_id,
            )

        delete_admin_course(
            admin_token,
            course_id,
        )
