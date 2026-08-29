from __future__ import annotations

from urllib.parse import quote

from test_account_course_detail_api import (
    delete_admin_enrollment,
    enroll_learner_to_course,
    register_learner,
)
from test_account_lesson_progress_api import (
    create_course_with_module_and_lesson,
    delete_admin_documents_for_enrollment,
)
from test_course_lessons_admin_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    delete_admin_course,
    login,
    request_json,
)


def complete_course_and_get_document() -> tuple[str, str, str, dict, dict]:
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    learner = register_learner(prefix="documents-contract-owner")
    learner_token = login(learner["email"], learner["password"])

    created = create_course_with_module_and_lesson(admin_token)
    course_id = str(created["course"]["id"])
    lesson_id = str(created["lesson"]["id"])

    enrollment = enroll_learner_to_course(learner_token, course_id)
    enrollment_id = str(enrollment["enrollment_id"])

    status, started = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/start",
        token=learner_token,
    )

    assert status == 200
    assert isinstance(started, dict)
    assert started["enrollment_id"] == enrollment_id
    assert started["status"] == "active"

    status, completed = request_json(
        "POST",
        f"/api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
        token=learner_token,
    )
    assert status == 200
    assert isinstance(completed, dict)
    assert completed["status"] == "completed"
    assert completed["completed_at"] is not None

    status, documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert status == 200
    assert isinstance(documents, dict)
    assert documents["total"] >= 1

    document = documents["items"][0]

    return admin_token, learner_token, course_id, {"id": enrollment_id}, document


def test_learner_documents_contract_fields_filters_and_public_verification() -> None:
    admin_token: str | None = None
    course_id: str | None = None
    enrollment_id: str | None = None

    try:
        admin_token, learner_token, course_id, enrollment, document = complete_course_and_get_document()
        enrollment_id = str(enrollment["id"])

        expected_fields = {
            "id",
            "enrollment_id",
            "course_id",
            "title",
            "document_type",
            "status",
            "file_available",
            "download_available",
            "download_url",
            "document_number",
            "verification_code",
            "created_at",
            "issued_at",
            "course_title",
        }

        assert expected_fields <= set(document)
        assert document["enrollment_id"] == enrollment_id
        assert document["course_id"] == course_id
        assert document["status"]

        if document["download_available"]:
            assert document["file_available"] is True
            assert document["download_url"] == f"/api/v1/account/documents/{document['id']}/download"
        else:
            assert document["download_url"] is None

        assert document["created_at"]
        assert document["issued_at"]

        status, filtered = request_json(
            "GET",
            (
                "/api/v1/account/documents"
                f"?status={quote(document['status'])}&course_id={course_id}&enrollment_id={enrollment_id}"
            ),
            token=learner_token,
        )

        assert status == 200
        assert isinstance(filtered, dict)
        assert filtered["total"] >= 1
        assert filtered["items"][0]["id"] == document["id"]
        assert filtered["items"][0]["status"] == document["status"]

        status, verified_by_value = request_json(
            "GET",
            f"/api/v1/public/documents/verify?value={quote(document['verification_code'])}",
        )

        assert isinstance(verified_by_value, dict)

        status_by_number, verified_by_number = request_json(
            "GET",
            f"/api/v1/public/documents/verify?number={quote(document['document_number'])}",
        )

        assert isinstance(verified_by_number, dict)

        if document["status"] == "available" and document["file_available"]:
            assert status == 200
            assert verified_by_value["verification_code"] == document["verification_code"]
            assert verified_by_value["status"] == document["status"]
            assert verified_by_value["organization_name"]
            assert verified_by_value["message"]

            assert status_by_number == 200
            assert verified_by_number["document_number"] == document["document_number"]
        else:
            assert status == 404
            assert status_by_number == 404
    finally:
        if admin_token is not None and enrollment_id is not None:
            delete_admin_documents_for_enrollment(admin_token, enrollment_id)
            delete_admin_enrollment(admin_token, enrollment_id)
        if admin_token is not None and course_id is not None:
            delete_admin_course(admin_token, course_id)


def test_learner_document_download_rejects_foreign_learner() -> None:
    admin_token: str | None = None
    course_id: str | None = None
    enrollment_id: str | None = None

    try:
        admin_token, _, course_id, enrollment, document = complete_course_and_get_document()
        enrollment_id = str(enrollment["id"])

        stranger = register_learner(prefix="documents-contract-stranger")
        stranger_token = login(stranger["email"], stranger["password"])

        status, payload = request_json(
            "GET",
            f"/api/v1/account/documents/{document['id']}/download",
            token=stranger_token,
        )

        assert status == 404
        assert isinstance(payload, dict)
    finally:
        if admin_token is not None and enrollment_id is not None:
            delete_admin_documents_for_enrollment(admin_token, enrollment_id)
            delete_admin_enrollment(admin_token, enrollment_id)
        if admin_token is not None and course_id is not None:
            delete_admin_course(admin_token, course_id)
