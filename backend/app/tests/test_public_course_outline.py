from __future__ import annotations

from test_course_lessons_admin_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    create_admin_course,
    delete_admin_course,
    login,
    request_json,
)


def create_course_module(
    token: str,
    course_id: str,
    *,
    title: str,
    position: int,
    is_active: bool,
) -> dict:
    status, module = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_id}/modules",
        {
            "title": title,
            "description": f"Description for {title}",
            "position": position,
            "is_active": is_active,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(module, dict)
    assert module["title"] == title
    assert module["position"] == position
    assert module["is_active"] is is_active

    return module


def create_course_lesson(
    token: str,
    module_id: str,
    *,
    title: str,
    position: int,
    content_type: str = "text",
    is_required: bool = True,
    is_active: bool = True,
) -> dict:
    status, lesson = request_json(
        "POST",
        f"/api/v1/admin/course-modules/{module_id}/lessons",
        {
            "title": title,
            "description": f"Description for {title}",
            "content_type": content_type,
            "content_url": "https://example.com/material" if content_type in {"video", "link"} else None,
            "content_text": f"Content for {title}" if content_type == "text" else None,
            "position": position,
            "is_required": is_required,
            "is_active": is_active,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(lesson, dict)
    assert lesson["title"] == title
    assert lesson["position"] == position
    assert lesson["content_type"] == content_type
    assert lesson["is_required"] is is_required
    assert lesson["is_active"] is is_active

    return lesson


def test_public_course_detail_returns_active_outline_only_sorted_by_position() -> None:
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    course = create_admin_course(token)
    course_id = str(course["id"])

    try:
        visible_module_2 = create_course_module(
            token,
            course_id,
            title="Visible module second",
            position=2,
            is_active=True,
        )
        hidden_module = create_course_module(
            token,
            course_id,
            title="Hidden inactive module",
            position=3,
            is_active=False,
        )
        visible_module_1 = create_course_module(
            token,
            course_id,
            title="Visible module first",
            position=1,
            is_active=True,
        )

        first_module_lesson = create_course_lesson(
            token,
            str(visible_module_1["id"]),
            title="First module visible lesson",
            position=1,
            content_type="text",
            is_required=True,
            is_active=True,
        )

        visible_lesson_2 = create_course_lesson(
            token,
            str(visible_module_2["id"]),
            title="Visible lesson second",
            position=2,
            content_type="video",
            is_required=False,
            is_active=True,
        )
        hidden_lesson = create_course_lesson(
            token,
            str(visible_module_2["id"]),
            title="Hidden inactive lesson",
            position=3,
            content_type="text",
            is_required=True,
            is_active=False,
        )
        visible_lesson_1 = create_course_lesson(
            token,
            str(visible_module_2["id"]),
            title="Visible lesson first",
            position=1,
            content_type="link",
            is_required=True,
            is_active=True,
        )

        status, detail = request_json(
            "GET",
            f"/api/v1/public/courses/{course['slug']}",
        )

        assert status == 200
        assert isinstance(detail, dict)
        assert detail["id"] == course_id
        assert detail["slug"] == course["slug"]
        assert isinstance(detail["modules"], list)

        modules = detail["modules"]
        module_ids = [module["id"] for module in modules]

        assert module_ids == [
            visible_module_1["id"],
            visible_module_2["id"],
        ]
        assert hidden_module["id"] not in module_ids

        assert modules[0]["position"] == 1
        assert modules[0]["title"] == "Visible module first"
        assert "is_active" not in modules[0]
        assert [lesson["id"] for lesson in modules[0]["lessons"]] == [
            first_module_lesson["id"],
        ]

        assert modules[1]["position"] == 2
        assert modules[1]["title"] == "Visible module second"

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
        delete_admin_course(token, course_id)
