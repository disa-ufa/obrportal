from __future__ import annotations

import json
import os
from uuid import uuid4
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("TEST_LEARNER_EMAIL", "learner@obrportal.local")


def request_json(
    method: str,
    path: str,
    body: dict | None = None,
    *,
    token: str | None = None,
) -> tuple[int, object | None]:
    data = None
    headers = {"Accept": "application/json"}

    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def request_multipart(
    path: str,
    fields: dict[str, str | None],
    *,
    file_field: str | None = None,
    filename: str | None = None,
    content_type: str = "application/octet-stream",
    content: bytes | None = None,
    token: str | None = None,
) -> tuple[int, object | None]:
    boundary = f"----ObrPortalBoundary{uuid4().hex}"
    chunks: list[bytes] = []

    for name, value in fields.items():
        if value is None:
            continue

        chunks.append(
            (
                f"--{boundary}\r\n"
                f"Content-Disposition: form-data; name=\"{name}\"\r\n\r\n"
                f"{value}\r\n"
            ).encode("utf-8")
        )

    if file_field and filename and content is not None:
        chunks.append(
            (
                f"--{boundary}\r\n"
                f"Content-Disposition: form-data; name=\"{file_field}\"; filename=\"{filename}\"\r\n"
                f"Content-Type: {content_type}\r\n\r\n"
            ).encode("utf-8")
        )
        chunks.append(content)
        chunks.append(b"\r\n")

    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    data = b"".join(chunks)

    headers = {
        "Accept": "application/json",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def login() -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    assert status == 200
    assert isinstance(payload, dict)

    return str(payload["access_token"])


def get_user_id_by_email(token: str, email: str) -> str:
    status, users = request_json("GET", "/api/v1/admin/users", token=token)

    assert status == 200
    assert isinstance(users, list)

    for user in users:
        if user["email"] == email:
            return str(user["id"])

    raise AssertionError(f"User not found: {email}")


def create_document(
    token: str,
    *,
    user_id: str,
    title: str,
    status: str,
    with_file: bool = False,
) -> dict:
    fields = {
        "user_id": user_id,
        "title": title,
        "document_type": "Сертификат",
        "document_number": f"DOC-{uuid4().hex[:16].upper()}",
        "status": status,
    }

    if status == "revoked":
        fields["revocation_reason"] = "Тестовая причина отзыва"

    http_status, payload = request_multipart(
        "/api/v1/admin/documents",
        fields,
        file_field="file" if with_file else None,
        filename="certificate.pdf" if with_file else None,
        content_type="application/pdf",
        content=b"%PDF-1.4\n% test document\n" if with_file else None,
        token=token,
    )

    assert http_status == 201
    assert isinstance(payload, dict)

    return payload


def create_course(token: str, *, title: str) -> dict:
    slug = f"action-required-{uuid4().hex[:20]}"

    status, payload = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": slug,
            "title": title,
            "description": "Course for action_required filter test",
            "hours": 16,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(payload, dict)

    return payload


def create_enrollment(
    token: str,
    *,
    user_id: str,
    course_id: str,
    status_value: str,
) -> dict:
    status, payload = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        {
            "user_id": user_id,
            "course_id": course_id,
            "status": status_value,
        },
        token=token,
    )

    assert status == 201
    assert isinstance(payload, dict)

    return payload


def delete_ignore(token: str, path: str) -> None:
    status, _ = request_json("DELETE", path, token=token)
    assert status in {200, 204, 404}


def delete_admin_documents_for_enrollment(
    token: str,
    enrollment_id: str,
) -> None:
    status, documents = request_json(
        "GET",
        (
            "/api/v1/admin/documents"
            f"?enrollment_id={enrollment_id}"
        ),
        token=token,
    )

    assert status == 200
    assert isinstance(documents, list)

    for document in documents:
        status, payload = request_json(
            "DELETE",
            (
                "/api/v1/admin/documents/"
                f"{document['id']}"
            ),
            token=token,
        )

        assert status == 200
        assert isinstance(payload, dict)
        assert payload["status"] == "deleted"


def test_admin_documents_action_required_filter() -> None:
    token = login()
    user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    prefix = f"Action Required Documents {uuid4().hex[:10]}"
    created_documents: list[dict] = []

    try:
        created_documents.append(
            create_document(
                token,
                user_id=user_id,
                title=f"{prefix} draft",
                status="draft",
            )
        )
        created_documents.append(
            create_document(
                token,
                user_id=user_id,
                title=f"{prefix} revoked",
                status="revoked",
            )
        )
        created_documents.append(
            create_document(
                token,
                user_id=user_id,
                title=f"{prefix} available with file",
                status="available",
                with_file=True,
            )
        )

        query = urlencode({"q": prefix, "limit": 50})
        status, all_documents = request_json(
            "GET",
            f"/api/v1/admin/documents?{query}",
            token=token,
        )

        assert status == 200
        assert isinstance(all_documents, list)
        assert len(all_documents) == 3

        required_query = urlencode({"q": prefix, "action_required": "true", "limit": 50})
        status, required_documents = request_json(
            "GET",
            f"/api/v1/admin/documents?{required_query}",
            token=token,
        )

        assert status == 200
        assert isinstance(required_documents, list)

        required_titles = {item["title"] for item in required_documents}
        assert required_titles == {
            f"{prefix} draft",
            f"{prefix} revoked",
        }

        non_required_query = urlencode({"q": prefix, "action_required": "false", "limit": 50})
        status, non_required_documents = request_json(
            "GET",
            f"/api/v1/admin/documents?{non_required_query}",
            token=token,
        )

        assert status == 200
        assert isinstance(non_required_documents, list)
        assert {item["title"] for item in non_required_documents} == {
            f"{prefix} available with file",
        }
    finally:
        for document in created_documents:
            delete_ignore(token, f"/api/v1/admin/documents/{document['id']}")


def test_admin_enrollments_action_required_filter() -> None:
    token = login()
    user_id = get_user_id_by_email(token, LEARNER_EMAIL)

    prefix = f"Action Required Enrollments {uuid4().hex[:10]}"
    created_courses: list[dict] = []
    created_enrollments: list[dict] = []

    try:
        for status_value in ["assigned", "active", "completed", "cancelled"]:
            course = create_course(token, title=f"{prefix} {status_value}")
            created_courses.append(course)
            created_enrollments.append(
                create_enrollment(
                    token,
                    user_id=user_id,
                    course_id=course["id"],
                    status_value=status_value,
                )
            )

        query = urlencode({"q": prefix, "limit": 50})
        status, all_enrollments = request_json(
            "GET",
            f"/api/v1/admin/enrollments?{query}",
            token=token,
        )

        assert status == 200
        assert isinstance(all_enrollments, list)
        assert len(all_enrollments) == 4

        required_query = urlencode({"q": prefix, "action_required": "true", "limit": 50})
        status, required_enrollments = request_json(
            "GET",
            f"/api/v1/admin/enrollments?{required_query}",
            token=token,
        )

        assert status == 200
        assert isinstance(required_enrollments, list)
        assert {item["status"] for item in required_enrollments} == {"assigned", "completed"}

        non_required_query = urlencode({"q": prefix, "action_required": "false", "limit": 50})
        status, non_required_enrollments = request_json(
            "GET",
            f"/api/v1/admin/enrollments?{non_required_query}",
            token=token,
        )

        assert status == 200
        assert isinstance(non_required_enrollments, list)
        assert {item["status"] for item in non_required_enrollments} == {"active", "cancelled"}
    finally:
        for enrollment in created_enrollments:
            delete_admin_documents_for_enrollment(
                token,
                str(enrollment["id"]),
            )
            delete_ignore(
                token,
                f"/api/v1/admin/enrollments/{enrollment['id']}",
            )

        for course in created_courses:
            delete_ignore(token, f"/api/v1/admin/courses/{course['id']}")
