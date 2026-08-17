from __future__ import annotations

from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
ACCOUNT_API = BACKEND_ROOT / "app" / "api" / "v1" / "account.py"


def read_account_api() -> str:
    assert ACCOUNT_API.exists()
    return ACCOUNT_API.read_text(encoding="utf-8")


def get_mutation_guard_body(text: str) -> str:
    start_marker = (
        "async def ensure_account_learning_mutation_allowed("
    )
    end_marker = (
        '@router.post("/courses/{enrollment_id}/start"'
    )

    start = text.index(start_marker)
    end = text.index(end_marker, start)

    return text[start:end]


def test_learning_mutations_use_one_shared_guard() -> None:
    text = read_account_api()

    assert (
        text.count(
            "await ensure_account_learning_mutation_allowed("
        )
        == 6
    )

    assert (
        text.count(
            'if enrollment.status == "completed":'
        )
        == 1
    )

    assert (
        'if enrollment.status not in '
        '{"assigned", "active", "completed"}:'
        not in text
    )


def test_mutation_guard_blocks_cancelled_and_completed() -> None:
    text = read_account_api()
    guard = get_mutation_guard_body(text)

    assert 'if enrollment.status == "completed":' in guard
    assert "detail=completed_detail" in guard

    assert 'if enrollment.status == "cancelled":' in guard
    assert (
        'detail="Cancelled enrollment cannot be changed"'
        in guard
    )

    assert (
        'if enrollment.status not in {"assigned", "active"}:'
        in guard
    )


def test_mutation_guard_requires_active_course_only() -> None:
    text = read_account_api()
    guard = get_mutation_guard_body(text)

    assert "select(Course.is_active)" in guard
    assert "Course.id == enrollment.course_id" in guard
    assert 'detail="Course is inactive"' in guard
    assert "HTTP_409_CONFLICT" in guard

    assert "Course.is_public" not in guard


def test_completed_start_error_contract_is_preserved() -> None:
    text = read_account_api()

    assert (
        'completed_detail="Completed course cannot be started"'
        in text
    )


def test_learning_reads_are_not_guarded() -> None:
    text = read_account_api()

    detail_start = text.index(
        '@router.get("/courses/{enrollment_id}"'
    )
    detail_end = text.index(
        "@router.get(",
        detail_start + 1,
    )

    detail_endpoint = text[
        detail_start:detail_end
    ]

    assert (
        "ensure_account_learning_mutation_allowed"
        not in detail_endpoint
    )


def test_self_enrollment_still_requires_public_active_course() -> None:
    text = read_account_api()

    start = text.index(
        '@router.post("/courses/{course_id}/enroll"'
    )
    end = text.index(
        "async def get_account_enrollment_entity_or_404",
        start,
    )

    enrollment_endpoint = text[start:end]

    assert "Course.is_active.is_(True)" in enrollment_endpoint
    assert "Course.is_public.is_(True)" in enrollment_endpoint


def test_assignment_resubmission_clears_stale_review_state_contract() -> None:
    account_path = (
        Path(__file__).resolve().parents[1]
        / "api"
        / "v1"
        / "account.py"
    )

    source = account_path.read_text(
        encoding="utf-8"
    )

    reset_block = """        submission.score = None
        submission.max_score = None
        submission.review_comment = None
        submission.reviewed_at = None
        submission.reviewed_by_user_id = None
"""

    assert source.count(reset_block) == 1

    submit_start = source.index(
        "async def submit_account_course_lesson_assignment_answer("
    )

    complete_start = source.index(
        "async def complete_account_course_lesson_assignment_submission("
    )

    submit_source = source[
        submit_start:complete_start
    ]

    assert reset_block in submit_source
    assert "submission.answer_text = answer_text" in submit_source
    assert 'target_status = "completed" if review_mode == "self_check" else "submitted"' in submit_source
