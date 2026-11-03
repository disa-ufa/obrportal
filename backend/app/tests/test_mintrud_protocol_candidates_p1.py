from app.services.mintrud_protocol_candidates import summarize_protocol_candidate


def test_no_quiz_is_not_commission_confirmed():
    item = summarize_protocol_candidate(
        quiz_attempts=0, passed_quiz_attempts=0,
        knowledge_check_date=None, protocol_number=None,
        applicability_decision="required",
    )
    assert item["review_status"] == "knowledge_check_required"
    assert item["commission_confirmed"] is False


def test_passed_quiz_is_not_signed_protocol():
    item = summarize_protocol_candidate(
        quiz_attempts=3, passed_quiz_attempts=1,
        knowledge_check_date=None, protocol_number=None,
        applicability_decision="required",
    )
    assert item["review_status"] == "quiz_evidence_only"
    assert item["commission_confirmed"] is False


def test_previous_manual_requisites_are_not_commission_evidence():
    item = summarize_protocol_candidate(
        quiz_attempts=1, passed_quiz_attempts=1,
        knowledge_check_date="2026-11-02", protocol_number="123",
        applicability_decision="required",
    )
    assert item["review_status"] == "existing_requisites_unverified"
    assert item["commission_confirmed"] is False


def test_needs_review_takes_priority():
    item = summarize_protocol_candidate(
        quiz_attempts=2, passed_quiz_attempts=2,
        knowledge_check_date="2026-11-02", protocol_number="123",
        applicability_decision="needs_review",
    )
    assert item["review_status"] == "applicability_review"
    assert item["commission_confirmed"] is False


def test_missing_protocol_number_does_not_make_protocol():
    item = summarize_protocol_candidate(
        quiz_attempts=0, passed_quiz_attempts=0,
        knowledge_check_date="2026-11-02", protocol_number="  ",
        applicability_decision=None,
    )
    assert item["review_status"] == "knowledge_check_required"
