"""Read-only preliminary candidate summaries for Mintrud protocols (P1).

A passed OBRPORTAL quiz is evidence about one quiz block, NOT confirmation of
knowledge verification by a legally authorized commission. No workflow state
is changed by this module.
"""

from __future__ import annotations


def summarize_protocol_candidate(
    *,
    quiz_attempts: int,
    passed_quiz_attempts: int,
    knowledge_check_date: object | None,
    protocol_number: str | None,
    applicability_decision: str | None,
) -> dict[str, str | bool]:
    has_entered_protocol = bool(
        knowledge_check_date is not None and (protocol_number or "").strip()
    )
    if applicability_decision == "needs_review":
        return {
            "review_status": "applicability_review",
            "review_label": "Проверить применимость Минтруда",
            "commission_confirmed": False,
        }
    if has_entered_protocol:
        return {
            "review_status": "existing_requisites_unverified",
            "review_label": "Реквизиты введены; проверить исходный протокол",
            "commission_confirmed": False,
        }
    if passed_quiz_attempts > 0:
        return {
            "review_status": "quiz_evidence_only",
            "review_label": "Тест сдан; проверка комиссией не подтверждена",
            "commission_confirmed": False,
        }
    return {
        "review_status": "knowledge_check_required",
        "review_label": (
            "Нет подтверждённого результата проверки знаний"
            if quiz_attempts else "Нет результатов онлайн-тестов"
        ),
        "commission_confirmed": False,
    }
