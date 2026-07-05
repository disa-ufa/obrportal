from app.models.assignment_submission import AssignmentSubmission


def test_assignment_submission_table_contract():
    assert AssignmentSubmission.__tablename__ == "assignment_submissions"

    columns = AssignmentSubmission.__table__.columns

    expected_columns = {
        "id",
        "enrollment_id",
        "user_id",
        "lesson_id",
        "block_id",
        "status",
        "answer_text",
        "attachments_json",
        "score",
        "max_score",
        "review_comment",
        "reviewed_by_user_id",
        "submitted_at",
        "reviewed_at",
        "created_at",
        "updated_at",
    }

    assert expected_columns.issubset(set(columns.keys()))

    constraints = {
        constraint.name
        for constraint in AssignmentSubmission.__table__.constraints
        if constraint.name
    }

    assert "uq_assignment_submission_enrollment_block" in constraints


def test_assignment_submission_default_payload():
    submission = AssignmentSubmission(
        enrollment_id="enrollment-id",
        user_id="user-id",
        lesson_id="lesson-id",
        block_id="block-id",
        status="completed",
        attachments_json={},
    )

    assert submission.enrollment_id == "enrollment-id"
    assert submission.user_id == "user-id"
    assert submission.lesson_id == "lesson-id"
    assert submission.block_id == "block-id"
    assert submission.status == "completed"
    assert submission.attachments_json == {}
