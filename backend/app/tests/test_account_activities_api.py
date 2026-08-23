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
from test_public_course_outline import (
    create_course_lesson,
    create_course_module,
)


def create_lesson_block(
    token: str,
    lesson_id: str,
    *,
    block_type: str,
    position: int,
    title: str,
    content_json: dict,
    is_required: bool = True,
) -> dict:
    status, block = request_json(
        "POST",
        f"/api/v1/admin/course-lessons/{lesson_id}/blocks",
        {
            "block_type": block_type,
            "position": position,
            "title": title,
            "content_json": content_json,
            "settings_json": {},
            "is_required": is_required,
            "is_active": True,
        },
        token=token,
    )

    assert status in {200, 201}
    assert isinstance(block, dict)
    assert block["block_type"] == block_type
    assert block["title"] == title

    return block


def get_activities(token: str) -> dict:
    status, payload = request_json(
        "GET",
        "/api/v1/account/activities",
        token=token,
    )

    assert status == 200
    assert isinstance(payload, dict)
    assert isinstance(payload["items"], list)

    return payload


def activity_by_type(
    payload: dict,
    activity_type: str,
) -> dict:
    return next(
        item
        for item in payload["items"]
        if item["activity_type"] == activity_type
    )


def start_learner_course(token: str, enrollment_id: str) -> dict:
    status, started = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/start",
        token=token,
    )

    assert status == 200
    assert isinstance(started, dict)
    assert started["enrollment_id"] == enrollment_id
    assert started["status"] == "active"

    return started


def test_account_activities_aggregate_quiz_and_assignment_state() -> None:
    admin_token = login(
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
    )

    learner = register_learner(
        prefix="activities-learner"
    )
    learner_token = login(
        learner["email"],
        learner["password"],
    )

    course = create_admin_course(admin_token)
    course_id = str(course["id"])
    enrollment_id: str | None = None

    try:
        module = create_course_module(
            admin_token,
            course_id,
            title="Activities module",
            position=1,
            is_active=True,
        )

        lesson = create_course_lesson(
            admin_token,
            str(module["id"]),
            title="Activities lesson",
            position=1,
            content_type="text",
            is_required=True,
            is_active=True,
        )

        lesson_id = str(lesson["id"])

        quiz = create_lesson_block(
            admin_token,
            lesson_id,
            block_type="quiz",
            position=1,
            title="Required activity quiz",
            content_json={
                "title": "Required activity quiz",
                "questions": [
                    {
                        "id": "q1",
                        "type": "true_false",
                        "title": "The answer is true",
                        "correct_value": True,
                        "points": 1,
                    }
                ],
                "grading": {
                    "pass_score_percent": 100,
                },
                "behavior": {
                    "allow_retry": True,
                    "max_attempts": 2,
                },
            },
        )

        assignment = create_lesson_block(
            admin_token,
            lesson_id,
            block_type="assignment",
            position=2,
            title="Manual review activity",
            content_json={
                "review_mode": "manual_review",
                "prompt": "Provide an answer",
            },
        )

        enrollment = enroll_learner_to_course(
            learner_token,
            course_id,
        )
        enrollment_id = str(
            enrollment["enrollment_id"]
        )

        # -----------------------------------------------
        # Initial aggregate
        # -----------------------------------------------

        initial = get_activities(learner_token)

        assert initial["total"] == 2

        quiz_item = activity_by_type(
            initial,
            "quiz",
        )
        assignment_item = activity_by_type(
            initial,
            "assignment",
        )

        assert quiz_item["enrollment_id"] == enrollment_id
        assert quiz_item["course_id"] == course_id
        assert quiz_item["course_title"] == course["title"]
        assert quiz_item["lesson_id"] == lesson_id
        assert quiz_item["block_id"] == str(quiz["id"])
        assert quiz_item["block_title"] == "Required activity quiz"
        assert quiz_item["status"] == "not_started"
        assert quiz_item["requires_action"] is True
        assert quiz_item["quiz_passed"] is False
        assert quiz_item["attempts_used"] == 0
        assert quiz_item["max_attempts"] == 2
        assert quiz_item["remaining_attempts"] == 2
        assert quiz_item["last_attempt_percent"] is None
        assert quiz_item["best_percent"] is None
        assert "content_json" not in quiz_item

        assert assignment_item["block_id"] == str(
            assignment["id"]
        )
        assert assignment_item["review_mode"] == "manual_review"
        assert assignment_item["submission_status"] == "not_started"
        assert assignment_item["status"] == "not_started"
        assert assignment_item["requires_action"] is True
        assert "content_json" not in assignment_item

        start_learner_course(learner_token, enrollment_id)

        # -----------------------------------------------
        # Failed quiz attempt -> in_progress
        # -----------------------------------------------

        status, failed_attempt = request_json(
            "POST",
            (
                f"/api/v1/account/courses/{enrollment_id}"
                f"/lessons/{lesson_id}"
                f"/quiz-attempts/{quiz['id']}"
            ),
            {
                "answers": {
                    "q1": False,
                },
            },
            token=learner_token,
        )

        assert status == 200
        assert isinstance(failed_attempt, dict)
        assert failed_attempt["passed"] is False
        assert failed_attempt["percent"] == 0

        after_failed_quiz = get_activities(
            learner_token
        )
        quiz_item = activity_by_type(
            after_failed_quiz,
            "quiz",
        )

        assert quiz_item["status"] == "in_progress"
        assert quiz_item["requires_action"] is True
        assert quiz_item["attempts_used"] == 1
        assert quiz_item["remaining_attempts"] == 1
        assert quiz_item["last_attempt_percent"] == 0
        assert quiz_item["best_percent"] == 0

        # -----------------------------------------------
        # Manual assignment -> review
        # -----------------------------------------------

        status, submitted = request_json(
            "POST",
            (
                f"/api/v1/account/courses/{enrollment_id}"
                f"/lessons/{lesson_id}"
                f"/assignment-submissions/{assignment['id']}"
                "/submit"
            ),
            {
                "answer_text": "Learner activity answer",
            },
            token=learner_token,
        )

        assert status == 200
        assert isinstance(submitted, dict)
        assert submitted["status"] == "submitted"

        after_assignment = get_activities(
            learner_token
        )
        assignment_item = activity_by_type(
            after_assignment,
            "assignment",
        )

        assert assignment_item["status"] == "review"
        assert assignment_item["requires_action"] is False
        assert assignment_item["submission_status"] == "submitted"
        assert assignment_item["submitted_at"] is not None

        # -----------------------------------------------
        # Passing attempt -> completed
        # -----------------------------------------------

        status, passed_attempt = request_json(
            "POST",
            (
                f"/api/v1/account/courses/{enrollment_id}"
                f"/lessons/{lesson_id}"
                f"/quiz-attempts/{quiz['id']}"
            ),
            {
                "answers": {
                    "q1": True,
                },
            },
            token=learner_token,
        )

        assert status == 200
        assert isinstance(passed_attempt, dict)
        assert passed_attempt["passed"] is True
        assert passed_attempt["percent"] == 100

        final = get_activities(learner_token)
        quiz_item = activity_by_type(
            final,
            "quiz",
        )

        assert quiz_item["status"] == "completed"
        assert quiz_item["requires_action"] is False
        assert quiz_item["quiz_passed"] is True
        assert quiz_item["attempts_used"] == 2
        assert quiz_item["remaining_attempts"] == 0
        assert quiz_item["last_attempt_percent"] == 100
        assert quiz_item["best_percent"] == 100

        # -----------------------------------------------
        # Authentication is required
        # -----------------------------------------------

        status, _ = request_json(
            "GET",
            "/api/v1/account/activities",
        )
        assert status == 401

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
