from __future__ import annotations

from app.services.quiz_attempts import (
    sanitize_quiz_content_for_learner,
)


FORBIDDEN_QUIZ_KEYS = {
    "is_correct",
    "isCorrect",
    "correct_value",
    "accepted_answers",
    "correct_number",
    "answer",
    "quiz_answer",
    "feedback",
    "feedback_correct",
    "feedback_incorrect",
}


def assert_no_forbidden_quiz_keys(value) -> None:
    if isinstance(value, dict):
        forbidden = FORBIDDEN_QUIZ_KEYS.intersection(
            value.keys()
        )

        assert not forbidden, (
            "learner quiz payload leaks secret keys: "
            + ", ".join(sorted(forbidden))
        )

        for nested in value.values():
            assert_no_forbidden_quiz_keys(nested)

    elif isinstance(value, list):
        for nested in value:
            assert_no_forbidden_quiz_keys(nested)


def build_quiz_payload() -> dict:
    return {
        "schema_version": 1,
        "title": "Safety quiz",
        "description": "Learner-safe payload test",
        "answer": "legacy-secret-answer",
        "quiz_answer": "legacy-quiz-secret-answer",
        "questions": [
            {
                "id": "q_single",
                "type": "single_choice",
                "title": "Single",
                "description": "",
                "points": 1,
                "required": True,
                "feedback_correct": "single correct secret",
                "feedback_incorrect": "single incorrect feedback",
                "options": [
                    {
                        "id": "o_1",
                        "text": "Visible option 1",
                        "is_correct": True,
                        "feedback": "correct option secret",
                    },
                    {
                        "id": "o_2",
                        "text": "Visible option 2",
                        "is_correct": False,
                        "feedback": "wrong option feedback",
                    },
                ],
            },
            {
                "id": "q_multi",
                "type": "multiple_choice",
                "title": "Multiple",
                "points": 2,
                "options": [
                    {
                        "id": "m_1",
                        "text": "Visible multi 1",
                        "isCorrect": True,
                    },
                    {
                        "id": "m_2",
                        "text": "Visible multi 2",
                        "is_correct": False,
                    },
                ],
                "scoring_mode": "all_or_nothing",
            },
            {
                "id": "q_bool",
                "type": "true_false",
                "title": "Boolean",
                "correct_value": True,
            },
            {
                "id": "q_text",
                "type": "short_text",
                "title": "Text",
                "accepted_answers": [
                    "secret-one",
                    "secret-two",
                ],
                "case_sensitive": False,
                "trim_spaces": True,
            },
            {
                "id": "q_number",
                "type": "number",
                "title": "Number",
                "correct_number": "42",
                "tolerance": 0.5,
            },
        ],
        "grading": {
            "mode": "points",
            "pass_score_percent": 70,
            "partial_credit": True,
            "negative_points": False,
        },
        "behavior": {
            "show_result": "after_submit",
            "show_correct_answers": "after_submit",
            "allow_retry": True,
            "max_attempts": 3,
            "shuffle_questions": False,
            "shuffle_answers": True,
        },
        "ui": {
            "display_mode": "all_questions",
            "show_progress": True,
            "show_question_points": True,
        },
    }


def test_learner_quiz_payload_preserves_renderable_questions() -> None:
    safe = sanitize_quiz_content_for_learner(
        build_quiz_payload()
    )

    assert safe["title"] == "Safety quiz"
    assert safe["grading"]["pass_score_percent"] == 70
    assert safe["behavior"]["max_attempts"] == 3
    assert safe["behavior"]["allow_retry"] is True
    assert safe["behavior"]["shuffle_answers"] is True

    questions = safe["questions"]

    assert [
        question["id"]
        for question in questions
    ] == [
        "q_single",
        "q_multi",
        "q_bool",
        "q_text",
        "q_number",
    ]

    assert questions[0]["options"] == [
        {
            "id": "o_1",
            "text": "Visible option 1",
        },
        {
            "id": "o_2",
            "text": "Visible option 2",
        },
    ]

    assert questions[1]["options"] == [
        {
            "id": "m_1",
            "text": "Visible multi 1",
        },
        {
            "id": "m_2",
            "text": "Visible multi 2",
        },
    ]

    assert questions[3]["case_sensitive"] is False
    assert questions[3]["trim_spaces"] is True
    assert questions[4]["tolerance"] == 0.5


def test_learner_quiz_payload_contains_no_answer_secrets() -> None:
    safe = sanitize_quiz_content_for_learner(
        build_quiz_payload()
    )

    assert_no_forbidden_quiz_keys(safe)


def test_legacy_quiz_answer_is_not_exposed() -> None:
    safe = sanitize_quiz_content_for_learner(
        {
            "question": "Legacy question",
            "answer": "legacy-answer",
            "quiz_answer": "legacy-quiz-answer",
        }
    )

    assert safe["questions"][0]["title"] == (
        "Legacy question"
    )

    assert_no_forbidden_quiz_keys(safe)


def test_quiz_correct_answers_hidden_while_retry_remains() -> None:
    from app.services.quiz_attempts import (
        sanitize_quiz_question_results_for_learner,
        should_reveal_quiz_correct_answers,
    )

    content = {
        "behavior": {
            "show_correct_answers": "after_submit",
            "allow_retry": True,
            "max_attempts": 3,
        }
    }

    reveal = should_reveal_quiz_correct_answers(
        content,
        passed=False,
        attempts_used=1,
        max_attempts=3,
    )

    assert reveal is False

    safe_results = (
        sanitize_quiz_question_results_for_learner(
            [
                {
                    "question_id": "q1",
                    "correct": False,
                    "correct_answer": "secret",
                    "user_answer": "wrong",
                }
            ],
            reveal_correct_answers=reveal,
        )
    )

    assert len(safe_results) == 1
    assert safe_results[0]["correct_answer"] is None
    assert safe_results[0]["user_answer"] == "wrong"
    assert safe_results[0]["correct"] is False


def test_quiz_correct_answers_revealed_after_attempts_exhausted() -> None:
    from app.services.quiz_attempts import (
        sanitize_quiz_question_results_for_learner,
        should_reveal_quiz_correct_answers,
    )

    content = {
        "behavior": {
            "show_correct_answers": "after_submit",
            "allow_retry": True,
            "max_attempts": 3,
        }
    }

    reveal = should_reveal_quiz_correct_answers(
        content,
        passed=False,
        attempts_used=3,
        max_attempts=3,
    )

    assert reveal is True

    safe_results = (
        sanitize_quiz_question_results_for_learner(
            [
                {
                    "question_id": "q1",
                    "correct_answer": "secret",
                }
            ],
            reveal_correct_answers=reveal,
        )
    )

    assert safe_results[0]["correct_answer"] == "secret"


def test_quiz_correct_answers_revealed_after_pass() -> None:
    from app.services.quiz_attempts import (
        should_reveal_quiz_correct_answers,
    )

    content = {
        "behavior": {
            "show_correct_answers": "after_submit",
            "allow_retry": True,
            "max_attempts": 3,
        }
    }

    assert (
        should_reveal_quiz_correct_answers(
            content,
            passed=True,
            attempts_used=1,
            max_attempts=3,
        )
        is True
    )


def test_quiz_correct_answers_never_mode_stays_hidden() -> None:
    from app.services.quiz_attempts import (
        should_reveal_quiz_correct_answers,
    )

    content = {
        "behavior": {
            "show_correct_answers": "never",
            "allow_retry": False,
            "max_attempts": 1,
        }
    }

    assert (
        should_reveal_quiz_correct_answers(
            content,
            passed=True,
            attempts_used=1,
            max_attempts=1,
        )
        is False
    )


def test_quiz_correct_answers_false_setting_stays_hidden() -> None:
    from app.services.quiz_attempts import (
        should_reveal_quiz_correct_answers,
    )

    content = {
        "behavior": {
            "show_correct_answers": False,
            "allow_retry": False,
            "max_attempts": 1,
        }
    }

    assert (
        should_reveal_quiz_correct_answers(
            content,
            passed=True,
            attempts_used=1,
            max_attempts=1,
        )
        is False
    )


def test_account_quiz_response_uses_post_submit_disclosure_guard() -> None:
    from pathlib import Path

    account_source = (
        Path(__file__).resolve().parents[1]
        / "api/v1/account.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "sanitize_quiz_question_results_for_learner("
        in account_source
    )

    assert (
        account_source.count(
            "should_reveal_quiz_correct_answers("
        )
        == 2
    )

    assert (
        "reveal_correct_answers=("
        in account_source
    )
