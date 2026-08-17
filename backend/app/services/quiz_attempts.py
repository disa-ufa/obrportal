from __future__ import annotations

from typing import Any


def _as_bool(value: Any, fallback: bool = False) -> bool:
    return value if isinstance(value, bool) else fallback


def _as_float(value: Any, fallback: float = 0) -> float:
    try:
        number = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return fallback

    return number if number == number else fallback


def _as_int(value: Any, fallback: int = 0) -> int:
    try:
        number = int(float(str(value).replace(",", ".")))
    except (TypeError, ValueError):
        return fallback

    return number


def _as_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback

    return str(value)


def _to_comparable_text(value: Any, question: dict[str, Any]) -> str:
    text = _as_text(value)

    if question.get("trim_spaces") is not False:
        text = text.strip()

    if not question.get("case_sensitive"):
        text = text.lower()

    return text


def _normalize_number_value(value: Any) -> float | None:
    if value in ("", None):
        return None

    try:
        number = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None

    return number if number == number else None


def _arrays_equal_as_sets(left: Any, right: Any) -> bool:
    if not isinstance(left, list) or not isinstance(right, list):
        return False

    left_set = {str(item) for item in left}
    right_set = {str(item) for item in right}

    return left_set == right_set


def _normalize_options(options: Any) -> list[dict[str, Any]]:
    if not isinstance(options, list):
        return [
            {"id": "o_1", "text": "Option 1", "is_correct": True, "feedback": ""},
            {"id": "o_2", "text": "Option 2", "is_correct": False, "feedback": ""},
        ]

    normalized: list[dict[str, Any]] = []

    for index, option in enumerate(options):
        source = option if isinstance(option, dict) else {}

        normalized.append(
            {
                "id": _as_text(source.get("id") or f"o_{index + 1}"),
                "text": _as_text(source.get("text") if source.get("text") is not None else source.get("label"), f"Option {index + 1}"),
                "is_correct": _as_bool(source.get("is_correct", source.get("isCorrect")), False),
                "feedback": _as_text(source.get("feedback")),
            }
        )

    return normalized


def normalize_quiz_question(question: Any, index: int = 0) -> dict[str, Any]:
    source = question if isinstance(question, dict) else {}
    question_type = _as_text(source.get("type") or "single_choice") or "single_choice"
    points = max(0, _as_float(source.get("points"), 1))

    base: dict[str, Any] = {
        **source,
        "id": _as_text(source.get("id") or f"q_{index + 1}"),
        "type": question_type,
        "title": _as_text(source.get("title") if source.get("title") is not None else source.get("question")),
        "description": _as_text(source.get("description")),
        "points": points,
        "required": _as_bool(source.get("required"), True),
        "shuffle_options": _as_bool(source.get("shuffle_options"), False),
        "feedback_correct": _as_text(source.get("feedback_correct"), "Correct."),
        "feedback_incorrect": _as_text(source.get("feedback_incorrect"), "Incorrect."),
    }

    if question_type in ("single_choice", "multiple_choice"):
        return {
            **base,
            "options": _normalize_options(source.get("options")),
            "scoring_mode": _as_text(source.get("scoring_mode") or "all_or_nothing"),
        }

    if question_type == "true_false":
        return {
            **base,
            "correct_value": _as_bool(source.get("correct_value"), True),
        }

    if question_type == "short_text":
        accepted_answers = source.get("accepted_answers")

        if isinstance(accepted_answers, list):
            normalized_answers = [_as_text(item) for item in accepted_answers]
        else:
            normalized_answers = [_as_text(source.get("answer") if source.get("answer") is not None else source.get("quiz_answer"))]

        return {
            **base,
            "accepted_answers": normalized_answers,
            "case_sensitive": _as_bool(source.get("case_sensitive"), False),
            "trim_spaces": _as_bool(source.get("trim_spaces"), True),
        }

    if question_type == "number":
        return {
            **base,
            "correct_number": _as_text(source.get("correct_number")),
            "tolerance": max(0, _as_float(source.get("tolerance"), 0)),
        }

    return normalize_quiz_question({**source, "type": "single_choice"}, index=index)


def normalize_quiz_content(content: Any) -> dict[str, Any]:
    source = content if isinstance(content, dict) else {}
    legacy_question = source.get("question") or source.get("quiz_question")
    legacy_answer = source.get("answer") or source.get("quiz_answer")

    if isinstance(source.get("questions"), list):
        questions = [
            normalize_quiz_question(question, index=index)
            for index, question in enumerate(source.get("questions") or [])
        ]
    elif legacy_question:
        questions = [
            normalize_quiz_question(
                {
                    "type": "short_text",
                    "title": legacy_question,
                    "accepted_answers": [legacy_answer or ""],
                },
                index=0,
            )
        ]
    else:
        questions = [
            normalize_quiz_question(
                {
                    "id": "q_1",
                    "type": "single_choice",
                    "title": "",
                    "points": 1,
                    "options": [
                        {"id": "o_1", "text": "Option 1", "is_correct": True},
                        {"id": "o_2", "text": "Option 2", "is_correct": False},
                    ],
                },
                index=0,
            )
        ]

    grading_source = source.get("grading") if isinstance(source.get("grading"), dict) else {}
    behavior_source = source.get("behavior") if isinstance(source.get("behavior"), dict) else {}
    ui_source = source.get("ui") if isinstance(source.get("ui"), dict) else {}

    return {
        **source,
        "schema_version": source.get("schema_version") or 1,
        "title": _as_text(source.get("title"), "Quiz"),
        "description": _as_text(source.get("description")),
        "questions": questions,
        "grading": {
            "mode": grading_source.get("mode") or "points",
            "pass_score_percent": _as_int(grading_source.get("pass_score_percent"), 70),
            "partial_credit": _as_bool(grading_source.get("partial_credit"), True),
            "negative_points": _as_bool(grading_source.get("negative_points"), False),
            **grading_source,
        },
        "behavior": {
            "show_result": behavior_source.get("show_result") or "after_submit",
            "show_correct_answers": behavior_source.get("show_correct_answers") or "after_submit",
            "allow_retry": _as_bool(behavior_source.get("allow_retry"), True),
            "max_attempts": _as_int(behavior_source.get("max_attempts"), 3),
            "shuffle_questions": _as_bool(behavior_source.get("shuffle_questions"), False),
            "shuffle_answers": _as_bool(behavior_source.get("shuffle_answers"), False),
            **behavior_source,
        },
        "ui": {
            "display_mode": ui_source.get("display_mode") or "all_questions",
            "show_progress": _as_bool(ui_source.get("show_progress"), True),
            "show_question_points": _as_bool(ui_source.get("show_question_points"), True),
            **ui_source,
        },
    }



def sanitize_quiz_content_for_learner(
    content: Any,
) -> dict[str, Any]:
    quiz = normalize_quiz_content(content)

    safe_questions: list[dict[str, Any]] = []

    for question in quiz.get("questions", []):
        question_type = _as_text(
            question.get("type") or "single_choice"
        )

        safe_question: dict[str, Any] = {
            "id": _as_text(question.get("id")),
            "type": question_type,
            "title": _as_text(question.get("title")),
            "description": _as_text(
                question.get("description")
            ),
            "points": max(
                0,
                _as_float(question.get("points"), 1),
            ),
            "required": _as_bool(
                question.get("required"),
                True,
            ),
            "shuffle_options": _as_bool(
                question.get("shuffle_options"),
                False,
            ),
        }

        if question_type in {
            "single_choice",
            "multiple_choice",
        }:
            safe_question["options"] = [
                {
                    "id": _as_text(option.get("id")),
                    "text": _as_text(option.get("text")),
                }
                for option in (
                    question.get("options") or []
                )
                if isinstance(option, dict)
            ]

            safe_question["scoring_mode"] = _as_text(
                question.get("scoring_mode")
                or "all_or_nothing"
            )

        elif question_type == "short_text":
            safe_question["case_sensitive"] = _as_bool(
                question.get("case_sensitive"),
                False,
            )
            safe_question["trim_spaces"] = _as_bool(
                question.get("trim_spaces"),
                True,
            )

        elif question_type == "number":
            safe_question["tolerance"] = max(
                0,
                _as_float(
                    question.get("tolerance"),
                    0,
                ),
            )

        safe_questions.append(safe_question)

    grading = quiz.get("grading")
    grading = grading if isinstance(grading, dict) else {}

    behavior = quiz.get("behavior")
    behavior = (
        behavior
        if isinstance(behavior, dict)
        else {}
    )

    ui = quiz.get("ui")
    ui = ui if isinstance(ui, dict) else {}

    return {
        "schema_version": quiz.get(
            "schema_version"
        ) or 1,
        "title": _as_text(
            quiz.get("title"),
            "Quiz",
        ),
        "description": _as_text(
            quiz.get("description")
        ),
        "questions": safe_questions,
        "grading": {
            "mode": grading.get("mode") or "points",
            "pass_score_percent": _as_int(
                grading.get("pass_score_percent"),
                70,
            ),
            "partial_credit": _as_bool(
                grading.get("partial_credit"),
                True,
            ),
            "negative_points": _as_bool(
                grading.get("negative_points"),
                False,
            ),
        },
        "behavior": {
            "show_result": (
                behavior.get("show_result")
                or "after_submit"
            ),
            "show_correct_answers": (
                behavior.get("show_correct_answers")
                or "after_submit"
            ),
            "allow_retry": _as_bool(
                behavior.get("allow_retry"),
                True,
            ),
            "max_attempts": _as_int(
                behavior.get("max_attempts"),
                3,
            ),
            "shuffle_questions": _as_bool(
                behavior.get("shuffle_questions"),
                False,
            ),
            "shuffle_answers": _as_bool(
                behavior.get("shuffle_answers"),
                False,
            ),
        },
        "ui": {
            "display_mode": (
                ui.get("display_mode")
                or "all_questions"
            ),
            "show_progress": _as_bool(
                ui.get("show_progress"),
                True,
            ),
            "show_question_points": _as_bool(
                ui.get("show_question_points"),
                True,
            ),
        },
    }



def grade_quiz_question(question: dict[str, Any], answer: Any) -> dict[str, Any]:
    question_type = _as_text(question.get("type")).lower()
    points = max(0, _as_float(question.get("points"), 0))

    if question_type == "single_choice":
        correct_option = None

        for option in question.get("options") or []:
            if option.get("is_correct"):
                correct_option = option
                break

        correct = bool(correct_option and str(answer) == str(correct_option.get("id")))

        return {
            "question_id": question.get("id"),
            "type": question_type,
            "points": points,
            "earned_points": points if correct else 0,
            "correct": correct,
            "correct_answer": correct_option.get("text") if correct_option else "",
            "user_answer": answer,
        }

    if question_type == "multiple_choice":
        correct_option_ids = [
            option.get("id")
            for option in question.get("options") or []
            if option.get("is_correct")
        ]
        selected_ids = answer if isinstance(answer, list) else []
        correct = _arrays_equal_as_sets(selected_ids, correct_option_ids)

        earned_points = 0.0

        if correct:
            earned_points = points
        elif question.get("scoring_mode") != "all_or_nothing" and correct_option_ids:
            correct_selected = len([item for item in selected_ids if item in correct_option_ids])
            wrong_selected = len([item for item in selected_ids if item not in correct_option_ids])
            raw_score = max(0, correct_selected - wrong_selected) / len(correct_option_ids)
            earned_points = round(points * raw_score, 2)

        return {
            "question_id": question.get("id"),
            "type": question_type,
            "points": points,
            "earned_points": earned_points,
            "correct": correct,
            "correct_answer": correct_option_ids,
            "user_answer": selected_ids,
        }

    if question_type == "true_false":
        correct = isinstance(answer, bool) and answer == bool(question.get("correct_value"))

        return {
            "question_id": question.get("id"),
            "type": question_type,
            "points": points,
            "earned_points": points if correct else 0,
            "correct": correct,
            "correct_answer": bool(question.get("correct_value")),
            "user_answer": answer,
        }

    if question_type == "short_text":
        accepted_answers = question.get("accepted_answers") if isinstance(question.get("accepted_answers"), list) else []
        user_text = _to_comparable_text(answer, question)
        correct = any(_to_comparable_text(item, question) == user_text for item in accepted_answers)

        return {
            "question_id": question.get("id"),
            "type": question_type,
            "points": points,
            "earned_points": points if correct else 0,
            "correct": correct,
            "correct_answer": accepted_answers,
            "user_answer": answer,
        }

    if question_type == "number":
        correct_number = _normalize_number_value(question.get("correct_number"))
        user_number = _normalize_number_value(answer)
        tolerance = max(0, _as_float(question.get("tolerance"), 0))
        correct = (
            correct_number is not None
            and user_number is not None
            and abs(user_number - correct_number) <= tolerance
        )

        return {
            "question_id": question.get("id"),
            "type": question_type,
            "points": points,
            "earned_points": points if correct else 0,
            "correct": correct,
            "correct_answer": question.get("correct_number"),
            "user_answer": answer,
        }

    return {
        "question_id": question.get("id"),
        "type": question_type,
        "points": points,
        "earned_points": 0,
        "correct": False,
        "correct_answer": None,
        "user_answer": answer,
    }


def grade_quiz_attempt(content: Any, answers: dict[str, Any] | None) -> dict[str, Any]:
    quiz = normalize_quiz_content(content)
    safe_answers = answers if isinstance(answers, dict) else {}
    question_results = [
        grade_quiz_question(question, safe_answers.get(question.get("id")))
        for question in quiz.get("questions", [])
    ]

    total_points = round(sum(_as_float(result.get("points"), 0) for result in question_results), 2)
    earned_points = round(sum(_as_float(result.get("earned_points"), 0) for result in question_results), 2)
    percent = int(round((earned_points / total_points) * 100)) if total_points > 0 else 0
    pass_score_percent = _as_int(quiz.get("grading", {}).get("pass_score_percent"), 0)
    passed = percent >= pass_score_percent if pass_score_percent >= 0 else False

    return {
        "quiz": quiz,
        "question_results": question_results,
        "total_points": total_points,
        "earned_points": earned_points,
        "percent": percent,
        "pass_score_percent": pass_score_percent,
        "passed": passed,
        "correct_count": len([result for result in question_results if result.get("correct")]),
        "question_count": len(question_results),
    }


def get_quiz_max_attempts(content: Any) -> int | None:
    quiz = normalize_quiz_content(content)
    behavior = quiz.get("behavior") if isinstance(quiz.get("behavior"), dict) else {}

    if behavior.get("allow_retry") is False:
        return 1

    max_attempts = _as_int(behavior.get("max_attempts"), 0)

    return max_attempts if max_attempts > 0 else None


def should_reveal_quiz_correct_answers(
    content: Any,
    *,
    passed: bool,
    attempts_used: int,
    max_attempts: int | None,
) -> bool:
    source = content if isinstance(content, dict) else {}
    raw_behavior = source.get("behavior")
    raw_behavior = (
        raw_behavior
        if isinstance(raw_behavior, dict)
        else {}
    )
    raw_setting = raw_behavior.get(
        "show_correct_answers"
    )

    if raw_setting is False:
        return False

    quiz = normalize_quiz_content(content)
    behavior = quiz.get("behavior")
    behavior = (
        behavior
        if isinstance(behavior, dict)
        else {}
    )

    setting = _as_text(
        behavior.get("show_correct_answers"),
        "after_submit",
    ).strip().lower()

    if setting in {
        "never",
        "none",
        "hidden",
        "false",
        "off",
        "disabled",
    }:
        return False

    attempts_exhausted = bool(
        max_attempts is not None
        and int(attempts_used or 0) >= max_attempts
    )

    return bool(
        passed
        or attempts_exhausted
    )


def sanitize_quiz_question_results_for_learner(
    question_results: Any,
    *,
    reveal_correct_answers: bool,
) -> list[dict[str, Any]]:
    if not isinstance(question_results, list):
        return []

    safe_results: list[dict[str, Any]] = []

    for result in question_results:
        if not isinstance(result, dict):
            continue

        safe_result = dict(result)

        if not reveal_correct_answers:
            safe_result["correct_answer"] = None

        safe_results.append(
            safe_result
        )

    return safe_results
