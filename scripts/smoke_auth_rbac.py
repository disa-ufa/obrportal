from __future__ import annotations

import json
import os
from uuid import uuid4
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


BASE_URL = os.getenv("SMOKE_BASE_URL", "http://localhost:8000")
FRONTEND_BASE_URL = os.getenv("SMOKE_FRONTEND_BASE_URL", "http://localhost:5173")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "Admin123Local2026!")
LEARNER_EMAIL = os.getenv("SMOKE_LEARNER_EMAIL", "learner@obrportal.local")
LEARNER_PASSWORD = os.getenv("SMOKE_LEARNER_PASSWORD", "Learner123Local2026!")
REQUEST_TIMEOUT = int(os.getenv("SMOKE_REQUEST_TIMEOUT", "60"))


def unique_inn() -> str:
    return f"8{uuid4().int % 1_000_000_000:09d}"


def unique_phone() -> str:
    return f"+7888{uuid4().int % 10_000_000:07d}"


def unique_role_code() -> str:
    return f"smoke_custom_{uuid4().hex[:10]}"


def unique_group_code() -> str:
    return f"smoke_group_{uuid4().hex[:10]}"


def find_user_role_id(
    user_detail: dict,
    *,
    role_code: str,
    organization_id: str | None = None,
) -> str:
    roles = user_detail.get("roles", [])
    if not isinstance(roles, list):
        raise AssertionError("user roles must be a list")

    for role in roles:
        if role["code"] == role_code and role.get("organization_id") == organization_id:
            return str(role["id"])

    raise AssertionError(f"User role not found: {role_code} / {organization_id}")


def find_role_permission_id(
    role_detail: dict,
    *,
    permission_code: str,
    required: bool = True,
) -> str | None:
    permissions = role_detail.get("permissions", [])
    if not isinstance(permissions, list):
        raise AssertionError("role permissions must be a list")

    for permission in permissions:
        if permission["code"] == permission_code:
            return str(permission["role_permission_id"])

    if required:
        raise AssertionError(f"Role permission not found: {permission_code}")

    return None



def request_frontend_direct_route(path: str) -> tuple[int, str]:
    frontend_base_url = (
        os.environ.get("FRONTEND_URL")
        or os.environ.get("VITE_FRONTEND_URL")
        or "http://localhost:5173"
    ).rstrip("/")

    frontend_request = Request(f"{frontend_base_url}{path}", method="GET")

    try:
        with urlopen(frontend_request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, body
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body


def assert_frontend_shell(body: str, label: str) -> None:
    normalized_body = body.lower()

    if "<html" not in normalized_body and 'id="root"' not in normalized_body:
        raise AssertionError(f"{label}: frontend shell was not returned")


def request_json(
    method: str,
    path: str,
    body: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict | list | None]:
    headers = {"Accept": "application/json"}

    data = None
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
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload



def request_form(
    method: str,
    path: str,
    fields: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict | list | None]:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = urlencode(fields or {}).encode("utf-8")

    request = Request(
        url=f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def request_multipart(
    method: str,
    path: str,
    fields: dict[str, str] | None = None,
    files: dict[str, tuple[str, str, bytes]] | None = None,
    token: str | None = None,
) -> tuple[int, dict | list | None]:
    boundary = f"----obrportal-smoke-{uuid4().hex}"
    headers = {
        "Accept": "application/json",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = bytearray()

    for name, value in (fields or {}).items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")

    for name, file_data in (files or {}).items():
        filename, content_type, content = file_data
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            (
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                f"Content-Type: {content_type}\r\n\r\n"
            ).encode("utf-8")
        )
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    request = Request(
        url=f"{BASE_URL}{path}",
        data=bytes(body),
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def request_binary(
    method: str,
    path: str,
    token: str | None = None,
) -> tuple[int, bytes, dict]:
    headers = {"Accept": "application/octet-stream"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            return response.status, response.read(), dict(response.headers)
    except HTTPError as error:
        return error.code, error.read(), dict(error.headers)




def request_frontend_text(path: str) -> tuple[int, str, dict]:
    request = Request(
        url=f"{FRONTEND_BASE_URL}{path}",
        headers={"Accept": "text/html"},
        method="GET",
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return response.status, response.read().decode("utf-8", errors="replace"), dict(response.headers)
    except HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace"), dict(error.headers)



def assert_status(actual: int, expected: int, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected status {expected}, got {actual}")


def login(email: str, password: str) -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": email, "password": password},
    )

    assert_status(status, 200, f"login {email}")

    if not isinstance(payload, dict) or not payload.get("access_token"):
        raise AssertionError(f"login {email}: access_token missing")

    return str(payload["access_token"])


def main() -> int:
    checks: list[str] = []

    status, health = request_json("GET", "/health")
    assert_status(status, 200, "health")
    assert isinstance(health, dict)
    assert health["status"] == "ok"
    checks.append("health ok")

    status, ready = request_json("GET", "/api/v1/ready")
    assert_status(status, 200, "ready")
    assert isinstance(ready, dict)
    assert ready["status"] == "ok"
    checks.append("ready ok")

    status, anonymous_dashboard_summary = request_json(
        "GET",
        "/api/v1/admin/dashboard-summary",
    )
    assert_status(status, 401, "admin dashboard summary requires auth")
    assert isinstance(anonymous_dashboard_summary, dict)
    checks.append("admin dashboard summary requires auth")

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    checks.append("admin login ok")

    status, me = request_json("GET", "/api/v1/auth/me", token=admin_token)
    assert_status(status, 200, "admin /auth/me")
    assert isinstance(me, dict)
    assert me["email"] == ADMIN_EMAIL
    checks.append("admin /auth/me ok")

    learner_import_csv = (
        "full name;email;phone;program\n"
        "Ivanov Ivan Ivanovich;smoke-import-learner@mail.ru;89171234567;Smoke import course\n"
        ";bad-email;;Smoke import course\n"
    ).encode("utf-8-sig")

    status, anonymous_learner_import = request_multipart(
        "POST",
        "/api/v1/admin/learner-imports",
        files={
            "file": ("smoke-learners.csv", "text/csv", learner_import_csv),
        },
    )
    assert_status(status, 401, "admin learner import requires auth")
    assert isinstance(anonymous_learner_import, dict)
    checks.append("admin learner import requires auth")

    status, learner_import = request_multipart(
        "POST",
        "/api/v1/admin/learner-imports",
        fields={
            "notes": "Smoke learner import",
        },
        files={
            "file": ("smoke-learners.csv", "text/csv", learner_import_csv),
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin learner import upload")
    assert isinstance(learner_import, dict)
    assert learner_import["id"]
    assert learner_import["import_type"] == "learner_roster"
    assert learner_import["source_filename"] == "smoke-learners.csv"
    assert learner_import["source_content_type"] == "text/csv"
    assert learner_import["status"] == "parsed"
    assert learner_import["total_rows"] == 2
    assert learner_import["valid_rows"] == 1
    assert learner_import["invalid_rows"] == 1
    assert learner_import["created_users_count"] == 0
    assert learner_import["created_profiles_count"] == 0
    assert learner_import["created_enrollments_count"] == 0
    assert learner_import["uploaded_by_user_id"] == me["id"]
    assert learner_import["notes"] == "Smoke learner import"
    assert isinstance(learner_import["rows"], list)
    assert len(learner_import["rows"]) == 2

    learner_import_rows = sorted(learner_import["rows"], key=lambda item: item["row_number"])
    assert learner_import_rows[0]["status"] == "valid"
    assert learner_import_rows[0]["normalized_data_json"]["email"] == "smoke-import-learner@mail.ru"
    assert learner_import_rows[0]["normalized_data_json"]["phone"] == "+79171234567"
    assert learner_import_rows[0]["validation_errors_json"] == []
    assert learner_import_rows[1]["status"] == "invalid"
    assert "full_name is required." in learner_import_rows[1]["validation_errors_json"]
    assert "email is invalid." in learner_import_rows[1]["validation_errors_json"]
    checks.append("admin learner import upload ok")

    status, learner_imports_list = request_json(
        "GET",
        "/api/v1/admin/learner-imports?status=parsed&q=smoke-learners.csv&limit=20",
        token=admin_token,
    )
    assert_status(status, 200, "admin learner imports list")
    assert isinstance(learner_imports_list, list)

    matching_imports = [
        item
        for item in learner_imports_list
        if item.get("id") == learner_import["id"]
    ]
    if len(matching_imports) != 1:
        raise AssertionError("admin learner imports list does not include uploaded import")

    learner_import_item = matching_imports[0]
    assert learner_import_item["id"] == learner_import["id"]
    assert learner_import_item["import_type"] == "learner_roster"
    assert learner_import_item["source_filename"] == "smoke-learners.csv"
    assert learner_import_item["source_content_type"] == "text/csv"
    assert learner_import_item["status"] == "parsed"
    assert learner_import_item["total_rows"] == 2
    assert learner_import_item["valid_rows"] == 1
    assert learner_import_item["invalid_rows"] == 1
    assert "rows" not in learner_import_item
    checks.append("admin learner imports list ok")

    status, learner_import_detail = request_json(
        "GET",
        f"/api/v1/admin/learner-imports/{learner_import['id']}",
        token=admin_token,
    )
    assert_status(status, 200, "admin learner import detail")
    assert isinstance(learner_import_detail, dict)
    assert learner_import_detail["id"] == learner_import["id"]
    assert learner_import_detail["import_type"] == "learner_roster"
    assert learner_import_detail["source_filename"] == "smoke-learners.csv"
    assert learner_import_detail["status"] == "parsed"
    assert learner_import_detail["total_rows"] == 2
    assert learner_import_detail["valid_rows"] == 1
    assert learner_import_detail["invalid_rows"] == 1
    assert isinstance(learner_import_detail["rows"], list)
    assert len(learner_import_detail["rows"]) == 2

    learner_import_detail_rows = sorted(
        learner_import_detail["rows"],
        key=lambda item: item["row_number"],
    )
    assert learner_import_detail_rows[0]["status"] == "valid"
    assert learner_import_detail_rows[0]["normalized_data_json"]["email"] == "smoke-import-learner@mail.ru"
    assert learner_import_detail_rows[1]["status"] == "invalid"
    assert "full_name is required." in learner_import_detail_rows[1]["validation_errors_json"]
    assert "email is invalid." in learner_import_detail_rows[1]["validation_errors_json"]
    checks.append("admin learner import detail ok")

    status, missing_learner_import_detail = request_json(
        "GET",
        "/api/v1/admin/learner-imports/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing learner import detail")
    assert isinstance(missing_learner_import_detail, dict)
    checks.append("admin missing learner import detail returns 404")

    status, applied_learner_import = request_json(
        "POST",
        f"/api/v1/admin/learner-imports/{learner_import['id']}/apply",
        token=admin_token,
    )
    assert_status(status, 200, "admin learner import apply")
    assert isinstance(applied_learner_import, dict)
    assert applied_learner_import["id"] == learner_import["id"]
    assert applied_learner_import["status"] == "applied"
    assert applied_learner_import["created_users_count"] + applied_learner_import["updated_users_count"] == 1
    assert applied_learner_import["created_profiles_count"] + applied_learner_import["updated_profiles_count"] == 1
    assert applied_learner_import["created_enrollments_count"] == 0

    applied_learner_import_rows = sorted(
        applied_learner_import["rows"],
        key=lambda item: item["row_number"],
    )
    assert applied_learner_import_rows[0]["status"] == "applied"
    assert applied_learner_import_rows[0]["user_id"]
    assert applied_learner_import_rows[0]["learner_profile_id"]
    assert applied_learner_import_rows[0]["enrollment_id"] is None
    assert applied_learner_import_rows[1]["status"] == "invalid"
    checks.append("admin learner import apply ok")

    status, repeated_learner_import_apply = request_json(
        "POST",
        f"/api/v1/admin/learner-imports/{learner_import['id']}/apply",
        token=admin_token,
    )
    assert_status(status, 400, "admin learner import repeat apply")
    assert isinstance(repeated_learner_import_apply, dict)
    checks.append("admin learner import repeat apply returns 400")

    status, admin_dashboard_summary = request_json(
        "GET",
        "/api/v1/admin/dashboard-summary",
        token=admin_token,
    )
    assert_status(status, 200, "admin dashboard summary")
    assert isinstance(admin_dashboard_summary, dict)

    expected_dashboard_summary_keys = {
        "users_total",
        "users_inactive",
        "organizations_total",
        "groups_total",
        "groups_inactive",
        "courses_total",
        "courses_inactive",
        "enrollments_total",
        "enrollments_assigned",
        "enrollments_active",
        "enrollments_completed",
        "enrollments_action_required",
        "documents_total",
        "documents_available",
        "documents_draft",
        "documents_revoked",
        "documents_action_required",
        "roles_total",
        "permissions_total",
        "audit_events_total",
    }

    missing_dashboard_summary_keys = expected_dashboard_summary_keys - set(admin_dashboard_summary)
    if missing_dashboard_summary_keys:
        raise AssertionError(
            f"admin dashboard summary missing keys: {sorted(missing_dashboard_summary_keys)}"
        )

    for key in expected_dashboard_summary_keys:
        value = admin_dashboard_summary[key]
        if not isinstance(value, int) or value < 0:
            raise AssertionError(f"admin dashboard summary invalid value for {key}: {value!r}")

    assert admin_dashboard_summary["users_total"] >= admin_dashboard_summary["users_inactive"]
    assert admin_dashboard_summary["groups_total"] >= admin_dashboard_summary["groups_inactive"]
    assert admin_dashboard_summary["courses_total"] >= admin_dashboard_summary["courses_inactive"]
    assert admin_dashboard_summary["enrollments_total"] >= admin_dashboard_summary["enrollments_action_required"]
    assert admin_dashboard_summary["documents_total"] >= admin_dashboard_summary["documents_action_required"]
    checks.append("admin dashboard summary ok")

    status, anonymous_worklist_summary = request_json(
        "GET",
        "/api/v1/admin/worklist-summary",
    )
    assert_status(status, 401, "admin worklist summary requires auth")
    assert isinstance(anonymous_worklist_summary, dict)
    checks.append("admin worklist summary requires auth")

    status, admin_worklist_summary = request_json(
        "GET",
        "/api/v1/admin/worklist-summary",
        token=admin_token,
    )
    assert_status(status, 200, "admin worklist summary")
    assert isinstance(admin_worklist_summary, dict)

    expected_worklist_summary_keys = {
        "documents",
        "enrollments",
    }

    missing_worklist_summary_keys = expected_worklist_summary_keys - set(admin_worklist_summary)
    if missing_worklist_summary_keys:
        raise AssertionError(
            f"admin worklist summary missing keys: {sorted(missing_worklist_summary_keys)}"
        )

    documents_summary = admin_worklist_summary["documents"]
    enrollments_summary = admin_worklist_summary["enrollments"]

    expected_documents_summary_keys = {
        "total",
        "available",
        "draft",
        "revoked",
        "action_required",
    }
    expected_enrollments_summary_keys = {
        "total",
        "assigned",
        "active",
        "completed",
        "cancelled",
        "action_required",
    }

    if expected_documents_summary_keys - set(documents_summary):
        raise AssertionError("admin worklist documents summary missing keys")

    if expected_enrollments_summary_keys - set(enrollments_summary):
        raise AssertionError("admin worklist enrollments summary missing keys")

    for section_name, section in (
        ("documents", documents_summary),
        ("enrollments", enrollments_summary),
    ):
        for key, value in section.items():
            if not isinstance(value, int) or value < 0:
                raise AssertionError(
                    f"admin worklist {section_name} summary invalid value for {key}: {value!r}"
                )

    if documents_summary["action_required"] > documents_summary["total"]:
        raise AssertionError("admin worklist documents action_required exceeds total")

    if enrollments_summary["action_required"] != (
        enrollments_summary["assigned"] + enrollments_summary["completed"]
    ):
        raise AssertionError("admin worklist enrollments action_required mismatch")

    checks.append("admin worklist summary ok")

    status, filtered_worklist_summary = request_json(
        "GET",
        (
            "/api/v1/admin/worklist-summary"
            "?documents_q=__missing_smoke_worklist_query__"
            "&enrollments_q=__missing_smoke_worklist_query__"
        ),
        token=admin_token,
    )
    assert_status(status, 200, "admin filtered worklist summary")
    assert isinstance(filtered_worklist_summary, dict)

    filtered_documents_summary = filtered_worklist_summary["documents"]
    filtered_enrollments_summary = filtered_worklist_summary["enrollments"]

    for key in expected_documents_summary_keys:
        if filtered_documents_summary[key] != 0:
            raise AssertionError(
                f"admin filtered worklist documents summary expected 0 for {key}, got {filtered_documents_summary[key]!r}"
            )

    for key in expected_enrollments_summary_keys:
        if filtered_enrollments_summary[key] != 0:
            raise AssertionError(
                f"admin filtered worklist enrollments summary expected 0 for {key}, got {filtered_enrollments_summary[key]!r}"
            )

    checks.append("admin filtered worklist summary ok")

    public_email = f"public_{uuid4().hex[:12]}@example.com"
    public_password = "Public123Local2026!"
    public_phone = f"+7999{uuid4().int % 10_000_000:07d}"

    status, public_register = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": public_email.upper(),
            "password": public_password,
            "full_name": "Public Smoke User",
            "phone": public_phone,
        },
    )
    assert_status(status, 201, "public register")
    assert isinstance(public_register, dict)
    assert public_register["access_token"]
    checks.append("public register ok")

    public_token = str(public_register["access_token"])

    status, public_me = request_json("GET", "/api/v1/auth/me", token=public_token)
    assert_status(status, 200, "public register /auth/me")
    assert isinstance(public_me, dict)
    assert public_me["email"] == public_email
    assert public_me["full_name"] == "Public Smoke User"
    assert public_me["roles"] == []
    checks.append("public register /auth/me ok")

    status, public_login = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": public_email, "password": public_password},
    )
    assert_status(status, 200, "public register login")
    assert isinstance(public_login, dict)
    assert public_login["access_token"]
    checks.append("public register login ok")

    status, duplicate_register = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": public_email,
            "password": public_password,
            "full_name": "Duplicate Public Smoke User",
        },
    )
    assert_status(status, 409, "public register duplicate email")
    assert isinstance(duplicate_register, dict)
    checks.append("public register duplicate email returns 409")

    status, duplicate_phone_register = request_json(
        "POST",
        "/api/v1/auth/register",
        {
            "email": f"public_phone_{uuid4().hex[:12]}@example.com",
            "password": public_password,
            "full_name": "Duplicate Phone Public Smoke User",
            "phone": public_phone,
        },
    )
    assert_status(status, 409, "public register duplicate phone")
    assert isinstance(duplicate_phone_register, dict)
    checks.append("public register duplicate phone returns 409")
    status, public_courses = request_json(
        "GET",
        "/api/v1/public/courses?limit=5",
    )
    assert_status(status, 200, "public courses")
    assert isinstance(public_courses, list)
    checks.append("public courses list ok")

    public_frontend_routes = [
        ("/", "home"),
        ("/catalog", "catalog"),
        ("/verify-document", "verify-document"),
        ("/account", "account"),
    ]

    for route, label in public_frontend_routes:
        status, frontend_body, frontend_headers = request_frontend_text(route)
        assert_status(status, 200, f"frontend public route {route}")
        assert_frontend_shell(frontend_body, f"frontend public route {route}")
        checks.append(f"frontend public route {label} ok")

    status, missing_public_course = request_json(
        "GET",
        "/api/v1/public/courses/missing-public-course",
    )
    assert_status(status, 404, "public missing course")
    assert isinstance(missing_public_course, dict)
    checks.append("public missing course returns 404")

    status, admin_account_summary = request_json(
        "GET",
        "/api/v1/account/summary",
        token=admin_token,
    )
    assert_status(status, 200, "admin account summary")
    assert isinstance(admin_account_summary, dict)
    assert isinstance(admin_account_summary["enrollments_count"], int)
    assert admin_account_summary["enrollments_count"] >= 0
    assert isinstance(admin_account_summary["active_courses_count"], int)
    assert admin_account_summary["active_courses_count"] >= 0
    assert admin_account_summary["active_courses_count"] <= admin_account_summary["enrollments_count"]
    assert isinstance(admin_account_summary["documents_count"], int)
    assert admin_account_summary["documents_count"] >= 0
    assert isinstance(admin_account_summary["profile"], dict)
    assert admin_account_summary["profile"]["email"] == ADMIN_EMAIL
    checks.append("admin account summary ok")

    status, admin_account_documents = request_json(
        "GET",
        "/api/v1/account/documents",
        token=admin_token,
    )
    assert_status(status, 200, "admin account documents")
    assert isinstance(admin_account_documents, dict)
    assert isinstance(admin_account_documents["total"], int)
    assert admin_account_documents["total"] >= 0
    assert isinstance(admin_account_documents["items"], list)
    checks.append("admin account documents ok")

    status, missing_admin_document_download = request_json(
        "GET",
        "/api/v1/account/documents/00000000-0000-0000-0000-000000000000/download",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing account document download")
    assert isinstance(missing_admin_document_download, dict)
    checks.append("admin missing account document download returns 404")

    status, admin_documents = request_json(
        "GET",
        "/api/v1/admin/documents",
        token=admin_token,
    )
    assert_status(status, 200, "admin documents")
    assert isinstance(admin_documents, list)
    checks.append("admin documents list ok")

    status, filtered_admin_documents = request_json(
        "GET",
        "/api/v1/admin/documents?status=available&limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin documents filters")
    assert isinstance(filtered_admin_documents, list)
    checks.append("admin documents filters ok")

    status, admin_courses = request_json(
        "GET",
        "/api/v1/admin/courses?limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin courses")
    assert isinstance(admin_courses, list)
    checks.append("admin courses list ok")

    status, missing_admin_course = request_json(
        "GET",
        "/api/v1/admin/courses/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing course")
    assert isinstance(missing_admin_course, dict)
    checks.append("admin missing course returns 404")

    course_crud_slug = f"smoke-course-crud-{uuid4().hex[:12]}"

    status, created_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        body={
            "slug": course_crud_slug,
            "title": "Smoke CRUD Course",
            "description": "Smoke course for admin CRUD coverage",
            "hours": 72,
            "format": "online",
            "document_type": "Certificate",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin course create")
    assert isinstance(created_course, dict)
    assert created_course["id"]
    assert created_course["slug"] == course_crud_slug
    assert created_course["title"] == "Smoke CRUD Course"
    assert created_course["hours"] == 72
    assert created_course["is_active"] is True
    course_crud_id = str(created_course["id"])
    checks.append("admin course create ok")

    status, duplicate_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        body={
            "slug": course_crud_slug,
            "title": "Smoke Duplicate CRUD Course",
            "description": "Duplicate smoke course",
            "hours": 72,
            "format": "online",
            "document_type": "Certificate",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate course create")
    assert isinstance(duplicate_course, dict)
    checks.append("admin duplicate course create returns 409")

    status, course_detail = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_crud_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin course detail")
    assert isinstance(course_detail, dict)
    assert course_detail["id"] == course_crud_id
    assert course_detail["slug"] == course_crud_slug
    checks.append("admin course detail ok")

    updated_course_slug = f"{course_crud_slug}-updated"
    status, updated_course = request_json(
        "PATCH",
        f"/api/v1/admin/courses/{course_crud_id}",
        body={
            "slug": updated_course_slug,
            "title": "Smoke CRUD Course Updated",
            "description": None,
            "hours": 96,
            "format": "mixed",
            "document_type": "Diploma",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin course update")
    assert isinstance(updated_course, dict)
    assert updated_course["id"] == course_crud_id
    assert updated_course["slug"] == updated_course_slug
    assert updated_course["title"] == "Smoke CRUD Course Updated"
    assert updated_course["description"] is None
    assert updated_course["hours"] == 96
    assert updated_course["format"] == "mixed"
    assert updated_course["document_type"] == "Diploma"
    checks.append("admin course update ok")

    status, deactivated_course = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_crud_id}/deactivate",
        token=admin_token,
    )
    assert_status(status, 200, "admin course deactivate")
    assert isinstance(deactivated_course, dict)
    assert deactivated_course["id"] == course_crud_id
    assert deactivated_course["is_active"] is False
    checks.append("admin course deactivate ok")

    status, activated_course = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_crud_id}/activate",
        token=admin_token,
    )
    assert_status(status, 200, "admin course activate")
    assert isinstance(activated_course, dict)
    assert activated_course["id"] == course_crud_id
    assert activated_course["is_active"] is True
    checks.append("admin course activate ok")

    status, initial_course_modules = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_crud_id}/modules",
        token=admin_token,
    )
    assert_status(status, 200, "admin course modules initial list")
    assert isinstance(initial_course_modules, list)
    assert len(initial_course_modules) == 0
    checks.append("admin course modules initial list ok")

    status, created_course_module = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_crud_id}/modules",
        {
            "title": "Smoke Course Module 1",
            "description": "Smoke course module for admin CRUD coverage",
            "position": 1,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin course module create")
    assert isinstance(created_course_module, dict)
    assert created_course_module["id"]
    assert created_course_module["course_id"] == course_crud_id
    assert created_course_module["title"] == "Smoke Course Module 1"
    assert created_course_module["position"] == 1
    assert created_course_module["is_active"] is True
    course_module_id = str(created_course_module["id"])
    checks.append("admin course module create ok")

    status, listed_course_modules = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_crud_id}/modules",
        token=admin_token,
    )
    assert_status(status, 200, "admin course modules list")
    assert isinstance(listed_course_modules, list)
    assert any(
        isinstance(module, dict) and str(module.get("id")) == course_module_id
        for module in listed_course_modules
    )
    checks.append("admin course modules list ok")

    status, active_course_modules = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_crud_id}/modules?is_active=true",
        token=admin_token,
    )
    assert_status(status, 200, "admin course modules active filter")
    assert isinstance(active_course_modules, list)
    assert any(
        isinstance(module, dict) and str(module.get("id")) == course_module_id
        for module in active_course_modules
    )
    checks.append("admin course modules active filter ok")

    status, course_module_detail = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin course module detail")
    assert isinstance(course_module_detail, dict)
    assert course_module_detail["id"] == course_module_id
    assert course_module_detail["course_id"] == course_crud_id
    checks.append("admin course module detail ok")

    status, updated_course_module = request_json(
        "PATCH",
        f"/api/v1/admin/course-modules/{course_module_id}",
        {
            "title": "Smoke Course Module 1 Updated",
            "description": "Updated smoke course module",
            "position": 2,
            "is_active": False,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin course module update")
    assert isinstance(updated_course_module, dict)
    assert updated_course_module["id"] == course_module_id
    assert updated_course_module["title"] == "Smoke Course Module 1 Updated"
    assert updated_course_module["position"] == 2
    assert updated_course_module["is_active"] is False
    checks.append("admin course module update ok")

    status, inactive_course_modules = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_crud_id}/modules?is_active=false",
        token=admin_token,
    )
    assert_status(status, 200, "admin course modules inactive filter")
    assert isinstance(inactive_course_modules, list)
    assert any(
        isinstance(module, dict) and str(module.get("id")) == course_module_id
        for module in inactive_course_modules
    )
    checks.append("admin course modules inactive filter ok")

    status, duplicate_course_module = request_json(
        "POST",
        f"/api/v1/admin/courses/{course_crud_id}/modules",
        {
            "title": "Smoke Duplicate Course Module Position",
            "description": "Duplicate position should be rejected",
            "position": 2,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate course module position")
    assert isinstance(duplicate_course_module, dict)
    checks.append("admin duplicate course module position returns 409")

    status, empty_course_module_update = request_json(
        "PATCH",
        f"/api/v1/admin/course-modules/{course_module_id}",
        {},
        token=admin_token,
    )
    assert_status(status, 400, "admin course module empty update")
    assert isinstance(empty_course_module_update, dict)
    checks.append("admin course module empty update returns 400")

    status, initial_course_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lessons initial list")
    assert isinstance(initial_course_lessons, list)
    assert len(initial_course_lessons) == 0
    checks.append("admin course lessons initial list ok")

    status, created_course_lesson = request_json(
        "POST",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons",
        {
            "title": "  Smoke Course Lesson 1  ",
            "description": "  Smoke course lesson for admin CRUD coverage  ",
            "content_type": "Text",
            "content_url": "",
            "content_text": "  Smoke lesson text content  ",
            "position": 1,
            "is_required": True,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin course lesson create")
    assert isinstance(created_course_lesson, dict)
    assert created_course_lesson["id"]
    assert created_course_lesson["module_id"] == course_module_id
    assert created_course_lesson["title"] == "Smoke Course Lesson 1"
    assert created_course_lesson["description"] == "Smoke course lesson for admin CRUD coverage"
    assert created_course_lesson["content_type"] == "text"
    assert created_course_lesson["content_url"] is None
    assert created_course_lesson["content_text"] == "Smoke lesson text content"
    assert created_course_lesson["position"] == 1
    assert created_course_lesson["is_required"] is True
    assert created_course_lesson["is_active"] is True
    course_lesson_id = str(created_course_lesson["id"])
    checks.append("admin course lesson create ok")

    status, listed_course_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lessons list")
    assert isinstance(listed_course_lessons, list)
    assert any(
        isinstance(lesson, dict) and str(lesson.get("id")) == course_lesson_id
        for lesson in listed_course_lessons
    )
    checks.append("admin course lessons list ok")

    status, active_course_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons?is_active=true",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lessons active filter")
    assert isinstance(active_course_lessons, list)
    assert any(
        isinstance(lesson, dict) and str(lesson.get("id")) == course_lesson_id
        for lesson in active_course_lessons
    )
    checks.append("admin course lessons active filter ok")

    status, text_course_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons?content_type=text",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lessons content type filter")
    assert isinstance(text_course_lessons, list)
    assert any(
        isinstance(lesson, dict) and str(lesson.get("id")) == course_lesson_id
        for lesson in text_course_lessons
    )
    checks.append("admin course lessons content type filter ok")

    status, course_lesson_detail = request_json(
        "GET",
        f"/api/v1/admin/course-lessons/{course_lesson_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lesson detail")
    assert isinstance(course_lesson_detail, dict)
    assert course_lesson_detail["id"] == course_lesson_id
    assert course_lesson_detail["module_id"] == course_module_id
    checks.append("admin course lesson detail ok")

    status, updated_course_lesson = request_json(
        "PATCH",
        f"/api/v1/admin/course-lessons/{course_lesson_id}",
        {
            "title": "Smoke Course Lesson 1 Updated",
            "description": "Updated smoke course lesson",
            "content_type": "link",
            "content_url": "  https://example.com/smoke-lesson  ",
            "content_text": "",
            "position": 2,
            "is_required": False,
            "is_active": False,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin course lesson update")
    assert isinstance(updated_course_lesson, dict)
    assert updated_course_lesson["id"] == course_lesson_id
    assert updated_course_lesson["title"] == "Smoke Course Lesson 1 Updated"
    assert updated_course_lesson["description"] == "Updated smoke course lesson"
    assert updated_course_lesson["content_type"] == "link"
    assert updated_course_lesson["content_url"] == "https://example.com/smoke-lesson"
    assert updated_course_lesson["content_text"] is None
    assert updated_course_lesson["position"] == 2
    assert updated_course_lesson["is_required"] is False
    assert updated_course_lesson["is_active"] is False
    checks.append("admin course lesson update ok")

    status, inactive_course_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons?is_active=false",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lessons inactive filter")
    assert isinstance(inactive_course_lessons, list)
    assert any(
        isinstance(lesson, dict) and str(lesson.get("id")) == course_lesson_id
        for lesson in inactive_course_lessons
    )
    checks.append("admin course lessons inactive filter ok")

    status, link_course_lessons = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons?content_type=link",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lessons updated content type filter")
    assert isinstance(link_course_lessons, list)
    assert any(
        isinstance(lesson, dict) and str(lesson.get("id")) == course_lesson_id
        for lesson in link_course_lessons
    )
    checks.append("admin course lessons updated content type filter ok")

    status, duplicate_course_lesson = request_json(
        "POST",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons",
        {
            "title": "Smoke Duplicate Course Lesson Position",
            "description": "Duplicate position should be rejected",
            "content_type": "text",
            "position": 2,
            "is_required": True,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate course lesson position")
    assert isinstance(duplicate_course_lesson, dict)
    checks.append("admin duplicate course lesson position returns 409")

    status, invalid_course_lesson_type = request_json(
        "POST",
        f"/api/v1/admin/course-modules/{course_module_id}/lessons",
        {
            "title": "Smoke Invalid Course Lesson Type",
            "description": "Unsupported content type should be rejected",
            "content_type": "unsupported",
            "position": 3,
            "is_required": True,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 422, "admin invalid course lesson content type")
    assert isinstance(invalid_course_lesson_type, dict)
    checks.append("admin invalid course lesson content type returns 422")

    status, empty_course_lesson_update = request_json(
        "PATCH",
        f"/api/v1/admin/course-lessons/{course_lesson_id}",
        {},
        token=admin_token,
    )
    assert_status(status, 400, "admin course lesson empty update")
    assert isinstance(empty_course_lesson_update, dict)
    checks.append("admin course lesson empty update returns 400")

    status, deleted_course_lesson = request_json(
        "DELETE",
        f"/api/v1/admin/course-lessons/{course_lesson_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin course lesson delete")
    assert isinstance(deleted_course_lesson, dict)
    assert deleted_course_lesson["status"] == "deleted"
    assert deleted_course_lesson["id"] == course_lesson_id
    checks.append("admin course lesson delete ok")

    status, deleted_course_lesson_detail = request_json(
        "GET",
        f"/api/v1/admin/course-lessons/{course_lesson_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted course lesson detail")
    assert isinstance(deleted_course_lesson_detail, dict)
    checks.append("admin deleted course lesson detail returns 404")

    status, missing_course_lesson_delete = request_json(
        "DELETE",
        "/api/v1/admin/course-lessons/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin course lesson delete 404")
    assert isinstance(missing_course_lesson_delete, dict)
    checks.append("admin course lesson delete 404 ok")

    status, deleted_course_module = request_json(
        "DELETE",
        f"/api/v1/admin/course-modules/{course_module_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin course module delete")
    assert isinstance(deleted_course_module, dict)
    assert deleted_course_module["status"] == "deleted"
    assert deleted_course_module["id"] == course_module_id
    checks.append("admin course module delete ok")

    status, deleted_course_module_detail = request_json(
        "GET",
        f"/api/v1/admin/course-modules/{course_module_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted course module detail")
    assert isinstance(deleted_course_module_detail, dict)
    checks.append("admin deleted course module detail returns 404")

    status, missing_course_module_delete = request_json(
        "DELETE",
        "/api/v1/admin/course-modules/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin course module delete 404")
    assert isinstance(missing_course_module_delete, dict)
    checks.append("admin course module delete 404 ok")


    status, deleted_course = request_json(
        "DELETE",
        f"/api/v1/admin/courses/{course_crud_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin course delete")
    assert isinstance(deleted_course, dict)
    assert deleted_course["status"] == "deleted"
    assert deleted_course["id"] == course_crud_id
    checks.append("admin course delete ok")

    status, deleted_course_detail = request_json(
        "GET",
        f"/api/v1/admin/courses/{course_crud_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted course detail")
    assert isinstance(deleted_course_detail, dict)
    checks.append("admin deleted course detail returns 404")

    status, admin_enrollments = request_json(
        "GET",
        "/api/v1/admin/enrollments?limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin enrollments")
    assert isinstance(admin_enrollments, list)
    checks.append("admin enrollments list ok")

    status, missing_admin_enrollment = request_json(
        "GET",
        "/api/v1/admin/enrollments/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing enrollment")
    assert isinstance(missing_admin_enrollment, dict)
    checks.append("admin missing enrollment returns 404")

    status, missing_admin_document_update = request_json(
        "PATCH",
        "/api/v1/admin/documents/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing document update")
    assert isinstance(missing_admin_document_update, dict)
    checks.append("admin missing document update returns 404")

    status, missing_admin_document_delete = request_json(
        "DELETE",
        "/api/v1/admin/documents/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing document delete")
    assert isinstance(missing_admin_document_delete, dict)
    checks.append("admin missing document delete returns 404")

    status, missing_admin_document_download = request_json(
        "GET",
        "/api/v1/admin/documents/00000000-0000-0000-0000-000000000000/download",
        token=admin_token,
    )
    assert_status(status, 404, "admin missing document download")
    assert isinstance(missing_admin_document_download, dict)
    checks.append("admin missing document download returns 404")

    status, rbac = request_json("GET", "/api/v1/admin/rbac-check", token=admin_token)
    assert_status(status, 200, "admin rbac-check")
    assert isinstance(rbac, dict)
    assert rbac["status"] == "ok"
    assert rbac["has_permission"] is True
    checks.append("admin rbac-check ok")

    admin_direct_frontend_routes = [
        ("/admin", "dashboard"),
        ("/admin/users", "users"),
        ("/admin/organizations", "organizations"),
        ("/admin/groups", "groups"),
        ("/admin/courses", "courses"),
        ("/admin/enrollments", "enrollments"),
        ("/admin/learner-imports", "learner-imports"),
        ("/admin/documents", "documents"),
        ("/admin/roles", "roles"),
        ("/admin/permissions", "permissions"),
        ("/admin/audit-events", "audit-events"),
    ]

    for route, label in admin_direct_frontend_routes:
        status, frontend_body, frontend_headers = request_frontend_text(route)
        assert_status(status, 200, f"frontend direct admin route {route}")
        assert_frontend_shell(frontend_body, f"frontend direct admin route {route}")
        checks.append(f"frontend direct admin route {label} ok")

    status, unknown_admin_body, unknown_admin_headers = request_frontend_text("/admin/unknown-route")
    assert_status(status, 200, "frontend unknown admin route shell")
    assert_frontend_shell(unknown_admin_body, "frontend unknown admin route shell")
    checks.append("frontend unknown admin route shell ok")

    admin_filtered_frontend_routes = [
        ("/admin/users?q=admin", "users search"),
        ("/admin/users?activity=active", "users active"),
        ("/admin/users?role_id=00000000-0000-0000-0000-000000000000", "users role"),
        ("/admin/organizations?q=smoke", "organizations search"),
        ("/admin/organizations?scope=with_kpp", "organizations with kpp"),
        ("/admin/groups?q=smoke", "groups search"),
        ("/admin/groups?organization_id=00000000-0000-0000-0000-000000000000", "groups organization"),
        ("/admin/groups?status=active", "groups active"),
        ("/admin/courses?q=smoke", "courses search"),
        ("/admin/courses?is_active=true", "courses active"),
        ("/admin/courses?is_active=false", "courses inactive"),
        ("/admin/enrollments?status=assigned", "enrollments status"),
        ("/admin/enrollments?course_id=00000000-0000-0000-0000-000000000000", "enrollments course"),
        ("/admin/enrollments?organization_id=00000000-0000-0000-0000-000000000000", "enrollments organization"),
        ("/admin/learner-imports?status=parsed&q=smoke", "learner imports parsed search"),
        ("/admin/documents?status=available", "documents status"),
        ("/admin/documents?status=draft", "documents draft"),
        ("/admin/documents?status=revoked", "documents revoked"),
        ("/admin/documents?document_type=certificate", "documents type"),
        ("/admin/documents?enrollment_id=00000000-0000-0000-0000-000000000000", "documents enrollment"),
        ("/admin/documents?organization_id=00000000-0000-0000-0000-000000000000", "documents organization"),
        ("/admin/roles?q=admin", "roles search"),
        ("/admin/roles?type=system", "roles system"),
        ("/admin/roles?type=custom", "roles custom"),
        ("/admin/roles?type=admin", "roles admin"),
        ("/admin/permissions?q=admin", "permissions search"),
        ("/admin/permissions?group=admin", "permissions admin group"),
        ("/admin/permissions?group=audit", "permissions audit group"),
        ("/admin/audit-events?action=admin.user_created", "audit action"),
        ("/admin/audit-events?action=admin.document_regenerated", "audit document regenerated"),
        ("/admin/audit-events?action=admin.document_created", "audit document created"),
        ("/admin/audit-events?action=admin.document_revoked", "audit document revoked"),
        ("/admin/audit-events?action=admin.document_restored", "audit document restored"),
        ("/admin/audit-events?entity_type=user", "audit entity type"),
        ("/admin/audit-events?entity_type=document", "audit document entity type"),
        ("/admin/audit-events?entity_type=enrollment", "audit enrollment entity type"),
        ("/admin/audit-events?entity_type=organization", "audit organization entity type"),
        ("/admin/audit-events?entity_type=role", "audit role entity type"),
        ("/admin/roles?type=system", "rbac operations roles system"),
        ("/admin/roles?type=custom", "rbac operations roles custom"),
        ("/admin/roles?q=admin", "rbac operations roles admin search"),
        ("/admin/permissions?group=admin", "rbac operations permissions admin"),
        ("/admin/permissions?group=audit", "rbac operations permissions audit"),
        ("/admin/users?role=admin", "rbac operations users admin role"),
        ("/admin/audit-events?entity_type=role", "rbac operations audit roles"),
        ("/admin/audit-events?entity_type=permission", "rbac operations audit permissions"),
        ("/admin/audit-events?actor_user_id=00000000-0000-0000-0000-000000000000", "audit actor"),
        ("/admin/audit-events?limit=25", "audit limit"),
        ("/admin/audit-events?limit=200", "audit max limit"),
        ("/admin/audit-events?limit=25", "audit investigations limit 25"),
        ("/admin/audit-events?limit=200", "audit investigations limit 200"),
        ("/admin/audit-events?entity_type=user", "audit investigations users"),
        ("/admin/audit-events?entity_type=document", "audit investigations documents"),
        ("/admin/audit-events?entity_type=enrollment", "audit investigations enrollments"),
        ("/admin/audit-events?entity_type=organization", "audit investigations organizations"),
        ("/admin/audit-events?entity_type=role", "audit investigations roles"),
        ("/admin/audit-events?entity_type=permission", "audit investigations permissions"),
        ("/admin/audit-events?action=admin.user_created", "audit investigations user created"),
        ("/admin/audit-events?action=admin.document_regenerated", "audit investigations document regenerated"),
        ("/admin/audit-events?actor_user_id=00000000-0000-0000-0000-000000000000", "audit investigations actor user"),
        ("/admin/users?activity=inactive", "dashboard users inactive"),
        ("/admin/users?activity=active", "user operations active"),
        ("/admin/users?activity=inactive", "user operations inactive"),
        ("/admin/enrollments?user_id=00000000-0000-0000-0000-000000000000&action_required=true", "user operations action required enrollments"),
        ("/admin/documents?user_id=00000000-0000-0000-0000-000000000000", "user operations documents"),
        ("/admin/audit-events?entity_type=user", "user operations audit"),
        ("/admin/audit-events?entity_type=user&entity_id=00000000-0000-0000-0000-000000000000", "user operations audit entity"),
        ("/admin/organizations?scope=with_kpp", "organization operations with kpp"),
        ("/admin/groups?organization_id=00000000-0000-0000-0000-000000000000", "organization operations groups"),
        ("/admin/groups?status=active", "group operations active"),
        ("/admin/groups?status=inactive", "group operations inactive"),
        ("/admin/groups?organization_id=00000000-0000-0000-0000-000000000000&status=active", "group operations organization active"),
        ("/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000&action_required=true", "group operations action required enrollments"),
        ("/admin/documents?learning_group_id=00000000-0000-0000-0000-000000000000&action_required=true", "group operations action required documents"),
        ("/admin/enrollments?organization_id=00000000-0000-0000-0000-000000000000&action_required=true", "organization operations action required enrollments"),
        ("/admin/documents?organization_id=00000000-0000-0000-0000-000000000000&action_required=true", "organization operations action required documents"),
        ("/admin/audit-events?entity_type=organization", "organization operations audit"),
        ("/admin/documents?status=draft", "dashboard documents draft"),
        ("/admin/documents?status=revoked", "dashboard documents revoked"),
        ("/admin/enrollments?status=active", "dashboard enrollments active"),
        ("/admin/enrollments?status=completed", "dashboard enrollments completed"),
        ("/admin/enrollments?action_required=true", "enrollments action required"),
        ("/admin/enrollments?action_required=true&status=assigned", "enrollments action required assigned"),
        ("/admin/enrollments?action_required=true&status=completed", "enrollments action required completed"),
        ("/admin/enrollments?action_required=true&organization_id=00000000-0000-0000-0000-000000000000", "enrollments action required organization"),
        ("/admin/enrollments?action_required=true&learning_group_id=00000000-0000-0000-0000-000000000000", "enrollments action required learning group"),
        ("/admin/audit-events?entity_type=enrollment", "dashboard audit enrollments"),
        ("/admin/documents?action_required=true", "documents action required"),
        ("/admin/documents?action_required=true&status=draft", "documents action required draft"),
        ("/admin/documents?action_required=true&status=revoked", "documents action required revoked"),
        ("/admin/documents?action_required=true&document_type=certificate", "documents action required type"),
        ("/admin/documents?action_required=true&organization_id=00000000-0000-0000-0000-000000000000", "documents action required organization"),
        ("/admin/documents?enrollment_id=00000000-0000-0000-0000-000000000000&action_required=true", "documents enrollment action required"),
        ("/admin/documents?q=__missing_smoke_worklist_query__", "documents missing worklist query"),
        ("/admin/enrollments?q=__missing_smoke_worklist_query__", "enrollments missing worklist query"),
        ("/admin/audit-events?entity_type=document", "dashboard audit documents"),
        ("/account", "account access account page"),
        ("/catalog", "account access catalog page"),
        ("/verify-document", "account access verify document page"),
        ("/admin/enrollments?status=active", "account access active enrollments"),
        ("/admin/enrollments?status=completed", "account access completed enrollments"),
        ("/admin/documents?status=available", "account access available documents"),
        ("/admin/documents?status=draft", "account access draft documents"),
        ("/admin/documents?status=revoked", "account access revoked documents"),
        ("/admin/audit-events?entity_type=user", "account access audit users"),
        ("/admin/audit-events?entity_type=document", "account access audit documents"),
        ("/verify-document", "public verification page"),
        ("/verify-document?number=SMOKE-NOT-FOUND", "public verification number query"),
        ("/verify-document?code=SMOKE-NOT-FOUND", "public verification code query"),
        ("/admin/documents?status=available", "public verification available documents"),
        ("/admin/documents?status=draft", "public verification draft documents"),
        ("/admin/documents?status=revoked", "public verification revoked documents"),
        ("/admin/documents?action_required=true", "public verification documents action required"),
        ("/admin/audit-events?entity_type=document", "public verification audit documents"),
        ("/admin/audit-events?action=admin.document_revoked", "public verification audit revoked"),
        ("/admin/audit-events?action=admin.document_restored", "public verification audit restored"),
        ("/admin/audit-events?action=admin.document_regenerated", "public verification audit regenerated"),
        ("/catalog", "public catalog page"),
        ("/courses/SMOKE-NOT-FOUND", "public catalog missing course page"),
        ("/admin/courses?is_active=true", "public catalog active courses"),
        ("/admin/courses?is_active=false", "public catalog inactive courses"),
        ("/admin/enrollments", "public catalog enrollments"),
        ("/admin/enrollments?status=active", "public catalog active enrollments"),
        ("/admin/enrollments?status=completed", "public catalog completed enrollments"),
        ("/admin/documents?status=available", "public catalog available documents"),
        ("/admin/audit-events?entity_type=course", "public catalog audit courses"),
        ("/catalog", "course self-enrollment catalog page"),
        ("/courses/SMOKE-NOT-FOUND", "course self-enrollment missing course page"),
        ("/register", "course self-enrollment register page"),
        ("/account", "course self-enrollment account page"),
        ("/verify-document", "course self-enrollment verify document page"),
        ("/admin/courses?is_active=true", "course self-enrollment active courses"),
        ("/admin/courses?is_active=false", "course self-enrollment inactive courses"),
        ("/admin/enrollments?status=assigned", "course self-enrollment assigned enrollments"),
        ("/admin/enrollments?status=active", "course self-enrollment active enrollments"),
        ("/admin/enrollments?status=completed", "course self-enrollment completed enrollments"),
        ("/admin/documents?status=available", "course self-enrollment available documents"),
        ("/admin/audit-events?entity_type=course", "course self-enrollment audit courses"),
        ("/admin/audit-events?entity_type=enrollment", "course self-enrollment audit enrollments"),
        ("/account", "learning progress account page"),
        ("/catalog", "learning progress catalog page"),
        ("/verify-document", "learning progress verify document page"),
        ("/admin/enrollments?status=assigned", "learning progress assigned enrollments"),
        ("/admin/enrollments?status=active", "learning progress active enrollments"),
        ("/admin/enrollments?status=completed", "learning progress completed enrollments"),
        ("/admin/enrollments?action_required=true", "learning progress action required enrollments"),
        ("/admin/documents?status=draft", "learning progress draft documents"),
        ("/admin/documents?status=available", "learning progress available documents"),
        ("/admin/documents?action_required=true", "learning progress action required documents"),
        ("/admin/audit-events?entity_type=enrollment", "learning progress audit enrollments"),
        ("/admin/audit-events?entity_type=document", "learning progress audit documents"),
        ("/account", "completion documents account page"),
        ("/verify-document", "completion documents verify document page"),
        ("/admin/enrollments?status=completed", "completion documents completed enrollments"),
        ("/admin/enrollments?action_required=true", "completion documents action required enrollments"),
        ("/admin/documents?status=draft", "completion documents draft documents"),
        ("/admin/documents?status=available", "completion documents available documents"),
        ("/admin/documents?status=revoked", "completion documents revoked documents"),
        ("/admin/documents?action_required=true", "completion documents action required documents"),
        ("/admin/documents?document_type=certificate", "completion documents certificates"),
        ("/admin/audit-events?entity_type=document", "completion documents audit documents"),
        ("/admin/audit-events?action=admin.document_regenerated", "completion documents audit regenerated"),
        ("/admin/audit-events?action=admin.document_revoked", "completion documents audit revoked"),
        ("/admin/audit-events?action=admin.document_restored", "completion documents audit restored"),
        ("/verify-document", "public verification QR page"),
        ("/verify-document?number=SMOKE-NOT-FOUND", "public verification QR number query"),
        ("/verify-document?code=SMOKE-NOT-FOUND", "public verification QR code query"),
        ("/account", "public verification QR account page"),
        ("/catalog", "public verification QR catalog page"),
        ("/admin/documents?status=available", "public verification QR available documents"),
        ("/admin/documents?status=draft", "public verification QR draft documents"),
        ("/admin/documents?status=revoked", "public verification QR revoked documents"),
        ("/admin/documents?action_required=true", "public verification QR action required documents"),
        ("/admin/documents?document_type=certificate", "public verification QR certificates"),
        ("/admin/audit-events?entity_type=document", "public verification QR audit documents"),
        ("/admin/audit-events?action=admin.document_regenerated", "public verification QR audit regenerated"),
        ("/admin/audit-events?action=admin.document_revoked", "public verification QR audit revoked"),
        ("/admin/audit-events?action=admin.document_restored", "public verification QR audit restored"),
        ("/admin/documents", "admin document registry page"),
        ("/admin/documents?status=draft", "admin document registry draft documents"),
        ("/admin/documents?status=available", "admin document registry available documents"),
        ("/admin/documents?status=revoked", "admin document registry revoked documents"),
        ("/admin/documents?action_required=true", "admin document registry action required documents"),
        ("/admin/documents?document_type=certificate", "admin document registry certificates"),
        ("/admin/documents?q=__missing_smoke_worklist_query__", "admin document registry search query"),
        ("/admin/documents?user_id=00000000-0000-0000-0000-000000000000", "admin document registry user filter"),
        ("/admin/documents?organization_id=00000000-0000-0000-0000-000000000000", "admin document registry organization filter"),
        ("/admin/documents?enrollment_id=00000000-0000-0000-0000-000000000000", "admin document registry enrollment filter"),
        ("/admin/documents?status=draft&action_required=true", "admin document registry draft action required"),
        ("/admin/documents?status=revoked&action_required=true", "admin document registry revoked action required"),
        ("/admin/enrollments?status=completed", "admin document registry completed enrollments"),
        ("/verify-document", "admin document registry public verification"),
        ("/admin/audit-events?entity_type=document", "admin document registry audit documents"),
        ("/admin/audit-events?action=admin.document_created", "admin document registry audit created"),
        ("/admin/audit-events?action=admin.document_regenerated", "admin document registry audit regenerated"),
        ("/admin/audit-events?action=admin.document_revoked", "admin document registry audit revoked"),
        ("/admin/audit-events?action=admin.document_restored", "admin document registry audit restored"),
        ("/admin/courses", "admin course catalog page"),
        ("/admin/courses?is_active=true", "admin course catalog active courses"),
        ("/admin/courses?is_active=false", "admin course catalog inactive courses"),
        ("/admin/courses?q=__missing_smoke_course_query__", "admin course catalog search query"),
        ("/catalog", "admin course catalog public catalog"),
        ("/courses/SMOKE-NOT-FOUND", "admin course catalog missing public course"),
        ("/register", "admin course catalog register page"),
        ("/account", "admin course catalog account page"),
        ("/admin/enrollments", "admin course catalog all enrollments"),
        ("/admin/enrollments?status=assigned", "admin course catalog assigned enrollments"),
        ("/admin/enrollments?status=active", "admin course catalog active enrollments"),
        ("/admin/enrollments?status=completed", "admin course catalog completed enrollments"),
        ("/admin/enrollments?action_required=true", "admin course catalog action required enrollments"),
        ("/admin/documents?status=draft", "admin course catalog draft documents"),
        ("/admin/documents?status=available", "admin course catalog available documents"),
        ("/admin/documents?document_type=certificate", "admin course catalog certificates"),
        ("/admin/audit-events?entity_type=course", "admin course catalog audit courses"),
        ("/admin/audit-events?entity_type=enrollment", "admin course catalog audit enrollments"),
        ("/admin/audit-events?entity_type=document", "admin course catalog audit documents"),
        ("/admin/enrollments", "admin enrollment operations page"),
        ("/admin/enrollments?status=assigned", "admin enrollment operations assigned"),
        ("/admin/enrollments?status=active", "admin enrollment operations active"),
        ("/admin/enrollments?status=completed", "admin enrollment operations completed"),
        ("/admin/enrollments?status=cancelled", "admin enrollment operations cancelled"),
        ("/admin/enrollments?action_required=true", "admin enrollment operations action required"),
        ("/admin/enrollments?q=__missing_smoke_enrollment_query__", "admin enrollment operations search query"),
        ("/admin/enrollments?user_id=00000000-0000-0000-0000-000000000000", "admin enrollment operations user filter"),
        ("/admin/enrollments?course_id=00000000-0000-0000-0000-000000000000", "admin enrollment operations course filter"),
        ("/admin/enrollments?organization_id=00000000-0000-0000-0000-000000000000", "admin enrollment operations organization filter"),
        ("/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000", "admin enrollment operations group filter"),
        ("/admin/enrollments?status=assigned&action_required=true", "admin enrollment operations assigned action required"),
        ("/admin/enrollments?status=completed&action_required=true", "admin enrollment operations completed action required"),
        ("/admin/courses?is_active=true", "admin enrollment operations active courses"),
        ("/admin/groups", "admin enrollment operations groups"),
        ("/admin/groups?active=true", "admin enrollment operations active groups"),
        ("/admin/users", "admin enrollment operations users"),
        ("/admin/organizations", "admin enrollment operations organizations"),
        ("/admin/documents?status=draft", "admin enrollment operations draft documents"),
        ("/admin/documents?status=available", "admin enrollment operations available documents"),
        ("/admin/documents?action_required=true", "admin enrollment operations action required documents"),
        ("/admin/audit-events?entity_type=enrollment", "admin enrollment operations audit enrollments"),
        ("/admin/audit-events?entity_type=document", "admin enrollment operations audit documents"),
        ("/admin/groups", "learning group operations page"),
        ("/admin/groups?status=active", "learning group operations active groups"),
        ("/admin/groups?status=inactive", "learning group operations inactive groups"),
        ("/admin/groups?q=__missing_smoke_group_query__", "learning group operations search query"),
        ("/admin/groups?organization_id=00000000-0000-0000-0000-000000000000", "learning group operations organization filter"),
        ("/admin/groups?status=active&organization_id=00000000-0000-0000-0000-000000000000", "learning group operations active organization filter"),
        ("/admin/groups?status=inactive&organization_id=00000000-0000-0000-0000-000000000000", "learning group operations inactive organization filter"),
        ("/admin/organizations", "learning group operations organizations"),
        ("/admin/organizations?q=__missing_smoke_group_org_query__", "learning group operations organization search"),
        ("/admin/users", "learning group operations users"),
        ("/admin/users?q=__missing_smoke_group_user_query__", "learning group operations user search"),
        ("/admin/enrollments?status=assigned", "learning group operations assigned enrollments"),
        ("/admin/enrollments?status=active", "learning group operations active enrollments"),
        ("/admin/enrollments?status=completed", "learning group operations completed enrollments"),
        ("/admin/enrollments?action_required=true", "learning group operations action required enrollments"),
        ("/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000", "learning group operations group enrollments"),
        ("/admin/enrollments?learning_group_id=00000000-0000-0000-0000-000000000000&action_required=true", "learning group operations group action required enrollments"),
        ("/admin/courses?is_active=true", "learning group operations active courses"),
        ("/admin/documents?status=draft", "learning group operations draft documents"),
        ("/admin/documents?action_required=true", "learning group operations action required documents"),
        ("/admin/documents?learning_group_id=00000000-0000-0000-0000-000000000000&action_required=true", "learning group operations group action required documents"),
        ("/admin/audit-events?entity_type=learning_group", "learning group operations audit groups"),
        ("/admin/audit-events?entity_type=enrollment", "learning group operations audit enrollments"),
        ("/admin/audit-events?entity_type=organization", "learning group operations audit organizations"),
        ("/admin/audit-events", "audit investigation operations page"),
        ("/admin/audit-events?limit=25", "audit investigation operations limit 25"),
        ("/admin/audit-events?limit=200", "audit investigation operations limit 200"),
        ("/admin/audit-events?action=admin.user_created", "audit investigation operations user created"),
        ("/admin/audit-events?action=admin.document_created", "audit investigation operations document created"),
        ("/admin/audit-events?action=admin.document_regenerated", "audit investigation operations document regenerated"),
        ("/admin/audit-events?action=admin.document_revoked", "audit investigation operations document revoked"),
        ("/admin/audit-events?action=admin.document_restored", "audit investigation operations document restored"),
        ("/admin/audit-events?entity_type=user", "audit investigation operations users"),
        ("/admin/audit-events?entity_type=organization", "audit investigation operations organizations"),
        ("/admin/audit-events?entity_type=learning_group", "audit investigation operations learning groups"),
        ("/admin/audit-events?entity_type=course", "audit investigation operations courses"),
        ("/admin/audit-events?entity_type=enrollment", "audit investigation operations enrollments"),
        ("/admin/audit-events?entity_type=document", "audit investigation operations documents"),
        ("/admin/audit-events?entity_type=role", "audit investigation operations roles"),
        ("/admin/audit-events?entity_type=permission", "audit investigation operations permissions"),
        ("/admin/audit-events?actor_user_id=00000000-0000-0000-0000-000000000000", "audit investigation operations actor filter"),
        ("/admin/audit-events?entity_id=00000000-0000-0000-0000-000000000000", "audit investigation operations entity id filter"),
        ("/admin/audit-events?entity_type=document&entity_id=00000000-0000-0000-0000-000000000000", "audit investigation operations document entity history"),
        ("/admin/audit-events?entity_type=user&actor_user_id=00000000-0000-0000-0000-000000000000", "audit investigation operations user actor investigation"),
        ("/admin/users", "audit investigation operations users registry"),
        ("/admin/roles", "audit investigation operations roles registry"),
        ("/admin/permissions", "audit investigation operations permissions registry"),
        ("/admin/organizations", "audit investigation operations organizations registry"),
        ("/admin/groups", "audit investigation operations groups registry"),
        ("/admin/courses", "audit investigation operations courses registry"),
        ("/admin/enrollments", "audit investigation operations enrollments registry"),
        ("/admin/documents", "audit investigation operations documents registry"),
        ("/admin/documents?action_required=true", "audit investigation operations action required documents"),
        ("/admin/enrollments?action_required=true", "audit investigation operations action required enrollments"),
        ("/admin", "frontend shell navigation admin shell"),
        ("/admin/__missing_shell_route__", "frontend shell navigation admin fallback"),
        ("/admin/users?from=shell-navigation", "frontend shell navigation users"),
        ("/admin/organizations?from=shell-navigation", "frontend shell navigation organizations"),
        ("/admin/groups?from=shell-navigation", "frontend shell navigation groups"),
        ("/admin/courses?from=shell-navigation", "frontend shell navigation courses"),
        ("/admin/enrollments?from=shell-navigation", "frontend shell navigation enrollments"),
        ("/admin/documents?from=shell-navigation", "frontend shell navigation documents"),
        ("/admin/roles?from=shell-navigation", "frontend shell navigation roles"),
        ("/admin/permissions?from=shell-navigation", "frontend shell navigation permissions"),
        ("/admin/audit-events?from=shell-navigation", "frontend shell navigation audit"),
        ("/", "frontend shell navigation public home"),
        ("/catalog?from=shell-navigation", "frontend shell navigation catalog"),
        ("/courses/__missing_shell_navigation_course__", "frontend shell navigation missing course"),
        ("/organization-info?from=shell-navigation", "frontend shell navigation organization info"),
        ("/organization?from=shell-navigation", "frontend shell navigation organization cabinet"),
        ("/verify-document?from=shell-navigation", "frontend shell navigation verify document"),
        ("/verify/__missing_shell_navigation_code__", "frontend shell navigation verify code"),
        ("/contacts?from=shell-navigation", "frontend shell navigation contacts"),
        ("/faq?from=shell-navigation", "frontend shell navigation faq"),
        ("/privacy?from=shell-navigation", "frontend shell navigation privacy"),
        ("/offer?from=shell-navigation", "frontend shell navigation offer"),
        ("/login?from=shell-navigation", "frontend shell navigation login"),
        ("/register?from=shell-navigation", "frontend shell navigation register"),
        ("/account?from=shell-navigation", "frontend shell navigation account"),
        ("/__missing_public_shell_route__", "frontend shell navigation public fallback"),
        ("/admin", "frontend routes builders meta admin registry"),
        ("/admin/users?activity=inactive", "frontend routes builders meta users inactive"),
        ("/admin/users?q=__routes_meta_user__", "frontend routes builders meta users q"),
        ("/admin/organizations?scope=with_kpp", "frontend routes builders meta organizations with kpp"),
        ("/admin/organizations?q=__routes_meta_org__", "frontend routes builders meta organizations q"),
        ("/admin/groups?status=active&organization_id=00000000-0000-0000-0000-000000000000", "frontend routes builders meta groups active organization"),
        ("/admin/groups?q=__routes_meta_group__", "frontend routes builders meta groups q"),
        ("/admin/courses?is_active=true&q=__routes_meta_course__", "frontend routes builders meta courses builder"),
        ("/admin/courses?q=__routes_meta_course__", "frontend routes builders meta courses q"),
        ("/admin/enrollments?status=completed&action_required=true", "frontend routes builders meta enrollments completed action required"),
        ("/admin/enrollments?q=__routes_meta_enrollment__", "frontend routes builders meta enrollments q"),
        ("/admin/documents?status=available&type=certificate", "frontend routes builders meta documents certificate"),
        ("/admin/documents?q=__routes_meta_document__", "frontend routes builders meta documents q"),
        ("/admin/roles?type=system", "frontend routes builders meta roles system"),
        ("/admin/roles?q=__routes_meta_role__", "frontend routes builders meta roles q"),
        ("/admin/permissions?group=audit", "frontend routes builders meta permissions audit"),
        ("/admin/permissions?q=__routes_meta_permission__", "frontend routes builders meta permissions q"),
        ("/admin/audit-events?entity_type=document&limit=25", "frontend routes builders meta audit document limit"),
        ("/", "frontend routes builders meta public home"),
        ("/catalog?from=routes-builders-meta", "frontend routes builders meta public catalog"),
        ("/courses/__missing_routes_meta_course__", "frontend routes builders meta public course fallback"),
        ("/organization-info?from=routes-builders-meta", "frontend routes builders meta organization info"),
        ("/organization?from=routes-builders-meta", "frontend routes builders meta organization cabinet"),
        ("/verify-document?from=routes-builders-meta", "frontend routes builders meta verify document"),
        ("/verify/__missing_routes_meta_code__", "frontend routes builders meta verify code fallback"),
        ("/contacts?from=routes-builders-meta", "frontend routes builders meta contacts"),
        ("/faq?from=routes-builders-meta", "frontend routes builders meta faq"),
        ("/privacy?from=routes-builders-meta", "frontend routes builders meta privacy"),
        ("/offer?from=routes-builders-meta", "frontend routes builders meta offer"),
        ("/login?from=routes-builders-meta", "frontend routes builders meta login"),
        ("/register?from=routes-builders-meta", "frontend routes builders meta register"),
        ("/account?from=routes-builders-meta", "frontend routes builders meta account"),
        ("/__missing_routes_meta_public__", "frontend routes builders meta public not found"),
        ("/admin?from=smoke-guards-coverage", "frontend smoke guards coverage admin shell"),
        ("/admin/__missing_smoke_guards_route__", "frontend smoke guards coverage admin fallback"),
        ("/admin/users?activity=inactive&from=smoke-guards-coverage", "frontend smoke guards coverage users inactive"),
        ("/admin/organizations?scope=with_kpp&from=smoke-guards-coverage", "frontend smoke guards coverage organizations with kpp"),
        ("/admin/groups?status=active&from=smoke-guards-coverage", "frontend smoke guards coverage active groups"),
        ("/admin/courses?is_active=true&from=smoke-guards-coverage", "frontend smoke guards coverage active courses"),
        ("/admin/enrollments?action_required=true&from=smoke-guards-coverage", "frontend smoke guards coverage action required enrollments"),
        ("/admin/documents?action_required=true&from=smoke-guards-coverage", "frontend smoke guards coverage action required documents"),
        ("/admin/documents?status=available&type=certificate&from=smoke-guards-coverage", "frontend smoke guards coverage available certificates"),
        ("/admin/audit-events?entity_type=document&limit=25&from=smoke-guards-coverage", "frontend smoke guards coverage audit documents"),
        ("/admin/roles?type=system&from=smoke-guards-coverage", "frontend smoke guards coverage system roles"),
        ("/admin/permissions?group=audit&from=smoke-guards-coverage", "frontend smoke guards coverage audit permissions"),
        ("/", "frontend smoke guards coverage public home"),
        ("/catalog?from=smoke-guards-coverage", "frontend smoke guards coverage public catalog"),
        ("/courses/__missing_smoke_guards_course__", "frontend smoke guards coverage course fallback"),
        ("/organization-info?from=smoke-guards-coverage", "frontend smoke guards coverage organization info"),
        ("/organization?from=smoke-guards-coverage", "frontend smoke guards coverage organization cabinet"),
        ("/verify-document?from=smoke-guards-coverage", "frontend smoke guards coverage verify document"),
        ("/verify/__missing_smoke_guards_code__", "frontend smoke guards coverage verify code fallback"),
        ("/contacts?from=smoke-guards-coverage", "frontend smoke guards coverage contacts"),
        ("/faq?from=smoke-guards-coverage", "frontend smoke guards coverage faq"),
        ("/privacy?from=smoke-guards-coverage", "frontend smoke guards coverage privacy"),
        ("/offer?from=smoke-guards-coverage", "frontend smoke guards coverage offer"),
        ("/login?from=smoke-guards-coverage", "frontend smoke guards coverage login"),
        ("/register?from=smoke-guards-coverage", "frontend smoke guards coverage register"),
        ("/account?from=smoke-guards-coverage", "frontend smoke guards coverage account"),
        ("/__missing_smoke_guards_public__", "frontend smoke guards coverage public fallback"),
        ("/admin?from=ci-local-gate", "ci local gate admin shell"),
        ("/admin/__missing_ci_gate_route__", "ci local gate admin fallback"),
        ("/admin/users?activity=inactive&from=ci-local-gate", "ci local gate users inactive"),
        ("/admin/organizations?scope=with_kpp&from=ci-local-gate", "ci local gate organizations with kpp"),
        ("/admin/groups?status=active&from=ci-local-gate", "ci local gate active groups"),
        ("/admin/courses?is_active=true&from=ci-local-gate", "ci local gate active courses"),
        ("/admin/enrollments?action_required=true&from=ci-local-gate", "ci local gate action required enrollments"),
        ("/admin/documents?action_required=true&from=ci-local-gate", "ci local gate action required documents"),
        ("/admin/documents?status=available&type=certificate&from=ci-local-gate", "ci local gate available certificates"),
        ("/admin/audit-events?entity_type=document&limit=25&from=ci-local-gate", "ci local gate audit documents"),
        ("/admin/audit-events?entity_type=user&limit=25&from=ci-local-gate", "ci local gate audit users"),
        ("/admin/roles?type=system&from=ci-local-gate", "ci local gate system roles"),
        ("/admin/permissions?group=audit&from=ci-local-gate", "ci local gate audit permissions"),
        ("/", "ci local gate public home"),
        ("/catalog?from=ci-local-gate", "ci local gate public catalog"),
        ("/courses/__missing_ci_gate_course__", "ci local gate course fallback"),
        ("/organization-info?from=ci-local-gate", "ci local gate organization info"),
        ("/organization?from=ci-local-gate", "ci local gate organization cabinet"),
        ("/verify-document?from=ci-local-gate", "ci local gate verify document"),
        ("/verify/__missing_ci_gate_code__", "ci local gate verify code fallback"),
        ("/contacts?from=ci-local-gate", "ci local gate contacts"),
        ("/faq?from=ci-local-gate", "ci local gate faq"),
        ("/privacy?from=ci-local-gate", "ci local gate privacy"),
        ("/offer?from=ci-local-gate", "ci local gate offer"),
        ("/login?from=ci-local-gate", "ci local gate login"),
        ("/register?from=ci-local-gate", "ci local gate register"),
        ("/account?from=ci-local-gate", "ci local gate account"),
        ("/__missing_ci_gate_public__", "ci local gate public fallback"),
        ("/admin?from=production-readiness", "production readiness admin shell"),
        ("/admin/__missing_release_route__", "production readiness admin fallback"),
        ("/admin/users?activity=inactive&from=production-readiness", "production readiness users inactive"),
        ("/admin/organizations?scope=with_kpp&from=production-readiness", "production readiness organizations with kpp"),
        ("/admin/groups?status=active&from=production-readiness", "production readiness active groups"),
        ("/admin/courses?is_active=true&from=production-readiness", "production readiness active courses"),
        ("/admin/enrollments?action_required=true&from=production-readiness", "production readiness action required enrollments"),
        ("/admin/documents?action_required=true&from=production-readiness", "production readiness action required documents"),
        ("/admin/documents?status=available&type=certificate&from=production-readiness", "production readiness available certificates"),
        ("/admin/audit-events?entity_type=document&limit=25&from=production-readiness", "production readiness audit documents"),
        ("/admin/audit-events?entity_type=user&limit=25&from=production-readiness", "production readiness audit users"),
        ("/admin/audit-events?entity_type=organization&limit=25&from=production-readiness", "production readiness audit organizations"),
        ("/admin/roles?type=system&from=production-readiness", "production readiness system roles"),
        ("/admin/permissions?group=audit&from=production-readiness", "production readiness audit permissions"),
        ("/", "production readiness public home"),
        ("/catalog?from=production-readiness", "production readiness public catalog"),
        ("/courses/__missing_release_course__", "production readiness course fallback"),
        ("/organization-info?from=production-readiness", "production readiness organization info"),
        ("/organization?from=production-readiness", "production readiness organization cabinet"),
        ("/verify-document?from=production-readiness", "production readiness verify document"),
        ("/verify/__missing_release_code__", "production readiness verify code fallback"),
        ("/contacts?from=production-readiness", "production readiness contacts"),
        ("/faq?from=production-readiness", "production readiness faq"),
        ("/privacy?from=production-readiness", "production readiness privacy"),
        ("/offer?from=production-readiness", "production readiness offer"),
        ("/login?from=production-readiness", "production readiness login"),
        ("/register?from=production-readiness", "production readiness register"),
        ("/account?from=production-readiness", "production readiness account"),
        ("/__missing_release_public__", "production readiness public fallback"),
        ("/admin?from=release-versioning", "release versioning admin shell"),
        ("/admin/__missing_release_version_route__", "release versioning admin fallback"),
        ("/admin/users?activity=inactive&from=release-versioning", "release versioning users inactive"),
        ("/admin/organizations?scope=with_kpp&from=release-versioning", "release versioning organizations with kpp"),
        ("/admin/groups?status=active&from=release-versioning", "release versioning active groups"),
        ("/admin/courses?is_active=true&from=release-versioning", "release versioning active courses"),
        ("/admin/enrollments?action_required=true&from=release-versioning", "release versioning action required enrollments"),
        ("/admin/documents?action_required=true&from=release-versioning", "release versioning action required documents"),
        ("/admin/documents?status=available&type=certificate&from=release-versioning", "release versioning available certificates"),
        ("/admin/audit-events?entity_type=document&limit=25&from=release-versioning", "release versioning audit documents"),
        ("/admin/audit-events?entity_type=user&limit=25&from=release-versioning", "release versioning audit users"),
        ("/admin/audit-events?entity_type=organization&limit=25&from=release-versioning", "release versioning audit organizations"),
        ("/admin/roles?type=system&from=release-versioning", "release versioning system roles"),
        ("/admin/permissions?group=audit&from=release-versioning", "release versioning audit permissions"),
        ("/", "release versioning public home"),
        ("/catalog?from=release-versioning", "release versioning public catalog"),
        ("/courses/__missing_release_version_course__", "release versioning course fallback"),
        ("/organization-info?from=release-versioning", "release versioning organization info"),
        ("/organization?from=release-versioning", "release versioning organization cabinet"),
        ("/verify-document?from=release-versioning", "release versioning verify document"),
        ("/verify/__missing_release_version_code__", "release versioning verify code fallback"),
        ("/contacts?from=release-versioning", "release versioning contacts"),
        ("/faq?from=release-versioning", "release versioning faq"),
        ("/privacy?from=release-versioning", "release versioning privacy"),
        ("/offer?from=release-versioning", "release versioning offer"),
        ("/login?from=release-versioning", "release versioning login"),
        ("/register?from=release-versioning", "release versioning register"),
        ("/account?from=release-versioning", "release versioning account"),
        ("/__missing_release_version_public__", "release versioning public fallback"),
        ("/admin?from=release-candidate", "release candidate admin shell"),
        ("/admin/__missing_release_candidate_route__", "release candidate admin fallback"),
        ("/admin/users?activity=inactive&from=release-candidate", "release candidate users inactive"),
        ("/admin/organizations?scope=with_kpp&from=release-candidate", "release candidate organizations with kpp"),
        ("/admin/groups?status=active&from=release-candidate", "release candidate active groups"),
        ("/admin/courses?is_active=true&from=release-candidate", "release candidate active courses"),
        ("/admin/enrollments?action_required=true&from=release-candidate", "release candidate action required enrollments"),
        ("/admin/documents?action_required=true&from=release-candidate", "release candidate action required documents"),
        ("/admin/documents?status=available&type=certificate&from=release-candidate", "release candidate available certificates"),
        ("/admin/audit-events?entity_type=document&limit=25&from=release-candidate", "release candidate audit documents"),
        ("/admin/audit-events?entity_type=user&limit=25&from=release-candidate", "release candidate audit users"),
        ("/admin/audit-events?entity_type=organization&limit=25&from=release-candidate", "release candidate audit organizations"),
        ("/admin/roles?type=system&from=release-candidate", "release candidate system roles"),
        ("/admin/permissions?group=audit&from=release-candidate", "release candidate audit permissions"),
        ("/", "release candidate public home"),
        ("/catalog?from=release-candidate", "release candidate public catalog"),
        ("/courses/__missing_release_candidate_course__", "release candidate course fallback"),
        ("/organization-info?from=release-candidate", "release candidate organization info"),
        ("/organization?from=release-candidate", "release candidate organization cabinet"),
        ("/verify-document?from=release-candidate", "release candidate verify document"),
        ("/verify/__missing_release_candidate_code__", "release candidate verify code fallback"),
        ("/contacts?from=release-candidate", "release candidate contacts"),
        ("/faq?from=release-candidate", "release candidate faq"),
        ("/privacy?from=release-candidate", "release candidate privacy"),
        ("/offer?from=release-candidate", "release candidate offer"),
        ("/login?from=release-candidate", "release candidate login"),
        ("/register?from=release-candidate", "release candidate register"),
        ("/account?from=release-candidate", "release candidate account"),
        ("/__missing_release_candidate_public__", "release candidate public fallback"),
        ("/admin?from=release-tag", "release tag admin shell"),
        ("/admin/__missing_release_tag_route__", "release tag admin fallback"),
        ("/admin/users?activity=inactive&from=release-tag", "release tag users inactive"),
        ("/admin/organizations?scope=with_kpp&from=release-tag", "release tag organizations with kpp"),
        ("/admin/groups?status=active&from=release-tag", "release tag active groups"),
        ("/admin/courses?is_active=true&from=release-tag", "release tag active courses"),
        ("/admin/enrollments?action_required=true&from=release-tag", "release tag action required enrollments"),
        ("/admin/documents?action_required=true&from=release-tag", "release tag action required documents"),
        ("/admin/documents?status=available&type=certificate&from=release-tag", "release tag available certificates"),
        ("/admin/audit-events?entity_type=document&limit=25&from=release-tag", "release tag audit documents"),
        ("/admin/audit-events?entity_type=user&limit=25&from=release-tag", "release tag audit users"),
        ("/admin/audit-events?entity_type=organization&limit=25&from=release-tag", "release tag audit organizations"),
        ("/admin/roles?type=system&from=release-tag", "release tag system roles"),
        ("/admin/permissions?group=audit&from=release-tag", "release tag audit permissions"),
        ("/", "release tag public home"),
        ("/catalog?from=release-tag", "release tag public catalog"),
        ("/courses/__missing_release_tag_course__", "release tag course fallback"),
        ("/organization-info?from=release-tag", "release tag organization info"),
        ("/organization?from=release-tag", "release tag organization cabinet"),
        ("/verify-document?from=release-tag", "release tag verify document"),
        ("/verify/__missing_release_tag_code__", "release tag verify code fallback"),
        ("/contacts?from=release-tag", "release tag contacts"),
        ("/faq?from=release-tag", "release tag faq"),
        ("/privacy?from=release-tag", "release tag privacy"),
        ("/offer?from=release-tag", "release tag offer"),
        ("/login?from=release-tag", "release tag login"),
        ("/register?from=release-tag", "release tag register"),
        ("/account?from=release-tag", "release tag account"),
        ("/__missing_release_tag_public__", "release tag public fallback"),
    ]

    for route, label in admin_filtered_frontend_routes:
        status, frontend_body, frontend_headers = request_frontend_text(route)
        assert_status(status, 200, f"frontend direct filtered admin route {route}")
        assert_frontend_shell(frontend_body, f"frontend direct filtered admin route {route}")
        checks.append(f"frontend direct filtered admin route {label} ok")

    status, users = request_json("GET", "/api/v1/admin/users", token=admin_token)
    assert_status(status, 200, "admin users")
    assert isinstance(users, list)
    assert len(users) >= 2
    admin_user = next(
        (item for item in users if isinstance(item, dict) and item.get("email") == ADMIN_EMAIL),
        None,
    )
    if admin_user is None:
        raise AssertionError("admin user not found in admin users list")
    if not admin_user.get("id"):
        raise AssertionError("admin user id missing in admin users list")
    checks.append("admin users ok")

    status, frontend_admin_users_html, frontend_admin_users_headers = request_frontend_text("/admin/users")
    assert_status(status, 200, "frontend direct admin users route")
    assert isinstance(frontend_admin_users_html, str)
    checks.append("frontend direct admin users route ok")


    learner_user = next(
        (item for item in users if isinstance(item, dict) and item.get("email") == LEARNER_EMAIL),
        None,
    )
    if learner_user is None:
        raise AssertionError("learner user not found")

    learner_user_id = str(learner_user["id"])

    user_id = str(admin_user["id"])
    status, user_detail = request_json(
        "GET",
        f"/api/v1/admin/users/{user_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin user detail")
    assert isinstance(user_detail, dict)
    assert user_detail["id"] == user_id
    assert user_detail["email"]
    assert "created_at" in user_detail
    assert "updated_at" in user_detail
    assert isinstance(user_detail["roles"], list)
    checks.append("admin user detail ok")

    status, missing_user = request_json(
        "GET",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin user detail 404")
    assert isinstance(missing_user, dict)
    checks.append("admin user detail 404 ok")

    created_user_suffix = uuid4().hex[:10]
    created_user_email = f"smoke-created-{created_user_suffix}@obrportal.local"
    created_user_password = "SmokeCreated123!"
    created_user_phone = unique_phone()
    status, created_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": created_user_email,
            "password": created_user_password,
            "full_name": f"Smoke created user {created_user_suffix}",
            "phone": created_user_phone,
            "is_active": True,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin user create")
    assert isinstance(created_user, dict)
    assert created_user["email"] == created_user_email
    assert created_user["phone"] == created_user_phone
    assert created_user["roles"] == []
    checks.append("admin user create ok")

    created_user_token = login(created_user_email, created_user_password)
    if not created_user_token:
        raise AssertionError("created user login failed")
    checks.append("created user login ok")

    created_user_new_password = "SmokeReset123!"
    status, reset_password_user = request_json(
        "POST",
        f"/api/v1/admin/users/{created_user['id']}/password",
        {"password": created_user_new_password},
        token=admin_token,
    )
    assert_status(status, 200, "admin user password reset")
    assert isinstance(reset_password_user, dict)
    assert reset_password_user["id"] == created_user["id"]
    if "password" in reset_password_user or "hashed_password" in reset_password_user:
        raise AssertionError("password fields leaked in user password reset response")
    checks.append("admin user password reset ok")

    status, old_password_login = request_json(
        "POST",
        "/api/v1/auth/login",
        {"email": created_user_email, "password": created_user_password},
    )
    assert_status(status, 401, "created user old password rejected")
    assert isinstance(old_password_login, dict)
    checks.append("created user old password rejected")

    created_user_reset_token = login(created_user_email, created_user_new_password)
    if not created_user_reset_token:
        raise AssertionError("created user reset password login failed")
    checks.append("created user reset password login ok")

    status, duplicate_created_user = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": created_user_email,
            "password": created_user_password,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate user create")
    assert isinstance(duplicate_created_user, dict)
    checks.append("admin duplicate user create returns 409")

    user_update_phone = unique_phone()
    status, updated_user = request_json(
        "PATCH",
        f"/api/v1/admin/users/{learner_user_id}",
        {
            "full_name": f"Smoke learner {user_update_phone}",
            "phone": user_update_phone,
            "is_email_verified": True,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin user update")
    assert isinstance(updated_user, dict)
    assert updated_user["id"] == learner_user_id
    assert updated_user["phone"] == user_update_phone
    checks.append("admin user update ok")

    status, deactivated_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/deactivate",
        token=admin_token,
    )
    assert_status(status, 200, "admin user deactivate")
    assert isinstance(deactivated_user, dict)
    assert deactivated_user["id"] == learner_user_id
    assert deactivated_user["is_active"] is False
    checks.append("admin user deactivate ok")

    status, activated_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/activate",
        token=admin_token,
    )
    assert_status(status, 200, "admin user activate")
    assert isinstance(activated_user, dict)
    assert activated_user["id"] == learner_user_id
    assert activated_user["is_active"] is True
    checks.append("admin user activate ok")

    status, missing_user_update = request_json(
        "PATCH",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000",
        {"full_name": "Missing user"},
        token=admin_token,
    )
    assert_status(status, 404, "admin user update 404")
    assert isinstance(missing_user_update, dict)
    checks.append("admin user update 404 ok")

    status, missing_user_password_reset = request_json(
        "POST",
        "/api/v1/admin/users/00000000-0000-0000-0000-000000000000/password",
        {"password": "MissingSmoke123!"},
        token=admin_token,
    )
    assert_status(status, 404, "admin user password reset 404")
    assert isinstance(missing_user_password_reset, dict)
    checks.append("admin user password reset 404 ok")

    status, last_admin_deactivate = request_json(
        "POST",
        f"/api/v1/admin/users/{user_id}/deactivate",
        token=admin_token,
    )
    assert_status(status, 400, "admin last admin deactivate 400")
    assert isinstance(last_admin_deactivate, dict)
    checks.append("admin last admin deactivate returns 400")

    status, organizations = request_json(
        "GET",
        "/api/v1/admin/organizations",
        token=admin_token,
    )
    assert_status(status, 200, "admin organizations")
    assert isinstance(organizations, list)
    assert len(organizations) >= 1
    first_org = organizations[0]
    assert isinstance(first_org, dict)
    assert first_org.get("id")
    assert first_org.get("inn")
    checks.append("admin organizations ok")

    status, frontend_admin_organizations_html, frontend_admin_organizations_headers = request_frontend_text("/admin/organizations")
    assert_status(status, 200, "frontend direct admin organizations route")
    assert isinstance(frontend_admin_organizations_html, str)
    checks.append("frontend direct admin organizations route ok")

    organization_id = str(first_org["id"])
    status, organization_detail = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin organization detail")
    assert isinstance(organization_detail, dict)
    assert organization_detail["id"] == organization_id
    assert organization_detail["inn"]
    assert "created_at" in organization_detail
    assert "updated_at" in organization_detail
    checks.append("admin organization detail ok")

    status, missing_org = request_json(
        "GET",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin organization detail 404")
    assert isinstance(missing_org, dict)
    checks.append("admin organization detail 404 ok")

    created_org_inn = unique_inn()
    status, created_org = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": created_org_inn,
            "kpp": "027801001",
            "ogrn": "1020200000000",
            "name": f"Smoke organization {created_org_inn}",
            "legal_address": "Smoke legal address",
            "actual_address": "Smoke actual address",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin organization create")
    assert isinstance(created_org, dict)
    assert created_org["id"]
    assert created_org["inn"] == created_org_inn
    checks.append("admin organization create ok")

    created_organization_id = str(created_org["id"])
    status, updated_org = request_json(
        "PATCH",
        f"/api/v1/admin/organizations/{created_organization_id}",
        {
            "name": f"Smoke organization updated {created_org_inn}",
            "actual_address": "Smoke updated actual address",
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin organization update")
    assert isinstance(updated_org, dict)
    assert updated_org["id"] == created_organization_id
    assert updated_org["name"].startswith("Smoke organization updated")
    checks.append("admin organization update ok")

    status, missing_org_update = request_json(
        "PATCH",
        "/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000",
        {"name": "Missing organization"},
        token=admin_token,
    )
    assert_status(status, 404, "admin organization update 404")
    assert isinstance(missing_org_update, dict)
    checks.append("admin organization update 404 ok")

    delete_org_inn = unique_inn()
    status, deletable_org = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": delete_org_inn,
            "name": f"Smoke deletable organization {delete_org_inn}",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin organization create for delete")
    assert isinstance(deletable_org, dict)
    deletable_org_id = str(deletable_org["id"])

    status, deleted_org = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{deletable_org_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin organization delete")
    assert isinstance(deleted_org, dict)
    assert deleted_org["status"] == "deleted"
    assert deleted_org["id"] == deletable_org_id
    checks.append("admin organization delete ok")

    status, deleted_org_detail = request_json(
        "GET",
        f"/api/v1/admin/organizations/{deletable_org_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted organization detail")
    assert isinstance(deleted_org_detail, dict)
    checks.append("admin deleted organization detail returns 404")

    created_group_code = unique_group_code()
    status, created_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": created_organization_id,
            "name": f"Smoke group {created_group_code}",
            "code": created_group_code,
            "description": "Smoke learning group",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin learning group create")
    assert isinstance(created_group, dict)
    assert created_group["organization_id"] == created_organization_id
    assert created_group["code"] == created_group_code
    created_group_id = str(created_group["id"])
    checks.append("admin learning group create ok")

    status, learning_groups = request_json(
        "GET",
        "/api/v1/org/groups",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning groups")
    assert isinstance(learning_groups, list)
    assert any(
        isinstance(group, dict) and str(group.get("id")) == created_group_id
        for group in learning_groups
    )
    checks.append("admin learning groups ok")

    status, filtered_learning_groups = request_json(
        "GET",
        f"/api/v1/org/groups?organization_id={created_organization_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning groups filter")
    assert isinstance(filtered_learning_groups, list)
    assert any(
        isinstance(group, dict) and str(group.get("id")) == created_group_id
        for group in filtered_learning_groups
    )
    assert all(
        isinstance(group, dict) and group.get("organization_id") == created_organization_id
        for group in filtered_learning_groups
    )
    checks.append("admin learning groups filter ok")

    status, learning_group_detail = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group detail")
    assert isinstance(learning_group_detail, dict)
    assert learning_group_detail["id"] == created_group_id
    assert learning_group_detail["organization_id"] == created_organization_id
    checks.append("admin learning group detail ok")

    status, updated_learning_group = request_json(
        "PATCH",
        f"/api/v1/org/groups/{created_group_id}",
        {
            "name": f"Smoke group updated {created_group_code}",
            "description": None,
            "is_active": False,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group update")
    assert isinstance(updated_learning_group, dict)
    assert updated_learning_group["id"] == created_group_id
    assert updated_learning_group["is_active"] is False
    checks.append("admin learning group update ok")


    status, initial_group_members = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group members list")
    assert isinstance(initial_group_members, list)
    checks.append("admin learning group members list ok")

    status, created_group_member = request_json(
        "POST",
        f"/api/v1/org/groups/{created_group_id}/members",
        {"user_id": learner_user_id},
        token=admin_token,
    )
    assert_status(status, 201, "admin learning group member add")
    assert isinstance(created_group_member, dict)
    assert created_group_member["id"]
    assert created_group_member["learning_group_id"] == created_group_id
    assert created_group_member["user_id"] == learner_user_id
    assert created_group_member["user_email"] == LEARNER_EMAIL
    assert "user_full_name" in created_group_member
    assert isinstance(created_group_member["user_is_active"], bool)
    assert "created_at" in created_group_member
    assert "updated_at" in created_group_member
    checks.append("admin learning group member add ok")

    status, duplicate_group_member = request_json(
        "POST",
        f"/api/v1/org/groups/{created_group_id}/members",
        {"user_id": learner_user_id},
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate learning group member")
    assert isinstance(duplicate_group_member, dict)
    checks.append("admin duplicate learning group member returns 409")

    grouped_enrollment_course_slug_suffix = "".join(
        character.lower() if character.isalnum() else "-"
        for character in str(created_group_code)
    )
    grouped_enrollment_course_slug = (
        f"smoke-grouped-enrollment-{grouped_enrollment_course_slug_suffix}"
    )

    status, grouped_enrollment_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": grouped_enrollment_course_slug,
            "title": "Smoke Grouped Enrollment Course",
            "description": "Smoke course for grouped enrollment assignment",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin grouped enrollment course create")
    assert isinstance(grouped_enrollment_course, dict)
    checks.append("admin grouped enrollment course create ok")

    status, grouped_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        {
            "user_id": learner_user_id,
            "course_id": grouped_enrollment_course["id"],
            "organization_id": created_organization_id,
            "learning_group_id": created_group_id,
            "status": "assigned",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin grouped enrollment create")
    assert isinstance(grouped_enrollment, dict)
    assert grouped_enrollment["user_id"] == learner_user_id
    assert grouped_enrollment["course_id"] == grouped_enrollment_course["id"]
    assert grouped_enrollment["organization_id"] == created_organization_id
    assert grouped_enrollment["learning_group_id"] == created_group_id
    grouped_enrollment_id = str(grouped_enrollment["id"])
    checks.append("admin grouped enrollment create ok")

    status, filtered_grouped_enrollments = request_json(
        "GET",
        f"/api/v1/admin/enrollments?learning_group_id={created_group_id}&limit=300",
        token=admin_token,
    )
    assert_status(status, 200, "admin grouped enrollments filter")
    assert isinstance(filtered_grouped_enrollments, list)
    assert any(
        isinstance(enrollment, dict) and enrollment.get("id") == grouped_enrollment_id
        for enrollment in filtered_grouped_enrollments
    )
    assert all(
        not isinstance(enrollment, dict)
        or enrollment.get("learning_group_id") == created_group_id
        for enrollment in filtered_grouped_enrollments
    )
    checks.append("admin grouped enrollment filter ok")

    status, deleted_grouped_enrollment = request_json(
        "DELETE",
        f"/api/v1/admin/enrollments/{grouped_enrollment_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin grouped enrollment cleanup delete")
    assert isinstance(deleted_grouped_enrollment, dict)
    assert deleted_grouped_enrollment["status"] == "deleted"
    assert deleted_grouped_enrollment["id"] == grouped_enrollment_id
    checks.append("admin grouped enrollment cleanup delete ok")

    bulk_grouped_enrollment_course_slug_suffix = "".join(
        character.lower() if character.isalnum() else "-"
        for character in str(created_group_code)
    )
    bulk_grouped_enrollment_course_slug = (
        f"smoke-bulk-grouped-enrollment-{bulk_grouped_enrollment_course_slug_suffix}"
    )

    status, bulk_grouped_enrollment_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        {
            "slug": bulk_grouped_enrollment_course_slug,
            "title": "Smoke Bulk Grouped Enrollment Course",
            "description": "Smoke course for bulk grouped enrollment assignment",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin bulk grouped enrollment course create")
    assert isinstance(bulk_grouped_enrollment_course, dict)
    bulk_grouped_enrollment_course_id = str(bulk_grouped_enrollment_course["id"])
    checks.append("admin bulk grouped enrollment course create ok")

    status, bulk_grouped_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        {
            "learning_group_id": created_group_id,
            "course_id": bulk_grouped_enrollment_course_id,
            "status": "assigned",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin bulk grouped enrollment create")
    assert isinstance(bulk_grouped_enrollment, dict)
    assert bulk_grouped_enrollment["status"] == "completed"
    assert bulk_grouped_enrollment["learning_group_id"] == created_group_id
    assert bulk_grouped_enrollment["course_id"] == bulk_grouped_enrollment_course_id
    assert bulk_grouped_enrollment["organization_id"] == created_organization_id
    assert bulk_grouped_enrollment["created_count"] >= 1
    assert bulk_grouped_enrollment["skipped_count"] == 0
    assert isinstance(bulk_grouped_enrollment["created"], list)
    assert isinstance(bulk_grouped_enrollment["skipped"], list)
    assert bulk_grouped_enrollment["skipped"] == []

    bulk_created_enrollment_ids = [
        str(enrollment["id"])
        for enrollment in bulk_grouped_enrollment["created"]
        if isinstance(enrollment, dict) and enrollment.get("id")
    ]
    assert bulk_created_enrollment_ids
    assert all(
        enrollment["learning_group_id"] == created_group_id
        for enrollment in bulk_grouped_enrollment["created"]
    )
    assert all(
        enrollment["course_id"] == bulk_grouped_enrollment_course_id
        for enrollment in bulk_grouped_enrollment["created"]
    )
    checks.append("admin bulk grouped enrollment create ok")

    status, repeated_bulk_grouped_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments/group",
        {
            "learning_group_id": created_group_id,
            "course_id": bulk_grouped_enrollment_course_id,
            "status": "assigned",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin bulk grouped enrollment repeat")
    assert isinstance(repeated_bulk_grouped_enrollment, dict)
    assert repeated_bulk_grouped_enrollment["status"] == "completed"
    assert repeated_bulk_grouped_enrollment["created_count"] == 0
    assert repeated_bulk_grouped_enrollment["skipped_count"] >= 1
    assert repeated_bulk_grouped_enrollment["created"] == []
    assert isinstance(repeated_bulk_grouped_enrollment["skipped"], list)
    assert all(
        skipped.get("reason") == "Enrollment already exists for this user and course"
        for skipped in repeated_bulk_grouped_enrollment["skipped"]
        if isinstance(skipped, dict)
    )
    assert all(
        skipped.get("existing_enrollment_id")
        for skipped in repeated_bulk_grouped_enrollment["skipped"]
        if isinstance(skipped, dict)
    )
    checks.append("admin bulk grouped enrollment repeat skips duplicates ok")

    status, filtered_bulk_grouped_enrollments = request_json(
        "GET",
        (
            "/api/v1/admin/enrollments"
            f"?learning_group_id={created_group_id}"
            f"&course_id={bulk_grouped_enrollment_course_id}"
            "&limit=300"
        ),
        token=admin_token,
    )
    assert_status(status, 200, "admin bulk grouped enrollments filter")
    assert isinstance(filtered_bulk_grouped_enrollments, list)
    assert all(
        not isinstance(enrollment, dict)
        or enrollment.get("learning_group_id") == created_group_id
        for enrollment in filtered_bulk_grouped_enrollments
    )
    assert all(
        not isinstance(enrollment, dict)
        or enrollment.get("course_id") == bulk_grouped_enrollment_course_id
        for enrollment in filtered_bulk_grouped_enrollments
    )
    assert any(
        isinstance(enrollment, dict)
        and str(enrollment.get("id")) in bulk_created_enrollment_ids
        for enrollment in filtered_bulk_grouped_enrollments
    )
    checks.append("admin bulk grouped enrollment filter ok")

    for bulk_created_enrollment_id in bulk_created_enrollment_ids:
        status, deleted_bulk_grouped_enrollment = request_json(
            "DELETE",
            f"/api/v1/admin/enrollments/{bulk_created_enrollment_id}",
            token=admin_token,
        )
        assert_status(status, 200, "admin bulk grouped enrollment cleanup delete")
        assert isinstance(deleted_bulk_grouped_enrollment, dict)
        assert deleted_bulk_grouped_enrollment["status"] == "deleted"
        assert deleted_bulk_grouped_enrollment["id"] == bulk_created_enrollment_id

    checks.append("admin bulk grouped enrollment cleanup delete ok")

    status, frontend_admin_groups_body = request_frontend_direct_route("/admin/groups")
    assert_status(status, 200, "frontend direct admin groups route")
    assert_frontend_shell(frontend_admin_groups_body, "frontend direct admin groups route")
    checks.append("frontend direct admin groups route ok")

    status, frontend_filtered_enrollments_body = request_frontend_direct_route(
        f"/admin/enrollments?learning_group_id={created_group_id}"
    )
    assert_status(status, 200, "frontend direct filtered enrollments route")
    assert_frontend_shell(
        frontend_filtered_enrollments_body,
        "frontend direct filtered enrollments route",
    )
    checks.append("frontend direct filtered enrollments route ok")

    status, group_members_after_add = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group members after add")
    assert isinstance(group_members_after_add, list)
    assert any(
        isinstance(member, dict) and member.get("user_id") == learner_user_id
        for member in group_members_after_add
    )
    checks.append("admin learning group members after add ok")

    if "learner_token" not in locals():
        learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)

    status, learner_group_members = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=learner_token,
    )
    assert_status(status, 403, "learner learning group members list forbidden")
    assert isinstance(learner_group_members, dict)
    checks.append("learner learning group members list forbidden")

    status, learner_add_group_member = request_json(
        "POST",
        f"/api/v1/org/groups/{created_group_id}/members",
        {"user_id": learner_user_id},
        token=learner_token,
    )
    assert_status(status, 403, "learner learning group member add forbidden")
    assert isinstance(learner_add_group_member, dict)
    checks.append("learner learning group member add forbidden")

    status, learner_delete_group_member = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}/members/{learner_user_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner learning group member delete forbidden")
    assert isinstance(learner_delete_group_member, dict)
    checks.append("learner learning group member delete forbidden")

    status, deleted_group_member = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}/members/{learner_user_id}",
        token=admin_token,
    )
    assert_status(status, 204, "admin learning group member delete")
    assert deleted_group_member is None
    checks.append("admin learning group member delete ok")

    status, group_members_after_delete = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}/members",
        token=admin_token,
    )
    assert_status(status, 200, "admin learning group members after delete")
    assert isinstance(group_members_after_delete, list)
    assert all(
        not isinstance(member, dict) or member.get("user_id") != learner_user_id
        for member in group_members_after_delete
    )
    checks.append("admin learning group members after delete ok")

    status, missing_group_member_delete = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}/members/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin learning group member delete 404")
    assert isinstance(missing_group_member_delete, dict)
    checks.append("admin learning group member delete 404 ok")


    status, duplicate_learning_group = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": created_organization_id,
            "name": updated_learning_group["name"],
            "code": unique_group_code(),
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate learning group create")
    assert isinstance(duplicate_learning_group, dict)
    checks.append("admin duplicate learning group create returns 409")

    status, deleted_learning_group = request_json(
        "DELETE",
        f"/api/v1/org/groups/{created_group_id}",
        token=admin_token,
    )
    assert_status(status, 204, "admin learning group delete")
    assert deleted_learning_group is None
    checks.append("admin learning group delete ok")

    status, deleted_learning_group_detail = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted learning group detail")
    assert isinstance(deleted_learning_group_detail, dict)
    checks.append("admin deleted learning group detail returns 404")

    status, missing_learning_group_delete = request_json(
        "DELETE",
        "/api/v1/org/groups/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin learning group delete 404")
    assert isinstance(missing_learning_group_delete, dict)
    checks.append("admin learning group delete 404 ok")

    status, roles = request_json("GET", "/api/v1/admin/roles", token=admin_token)
    assert_status(status, 200, "admin roles")
    assert isinstance(roles, list)
    assert len(roles) >= 1
    first_role = roles[0]
    assert isinstance(first_role, dict)
    assert first_role.get("id")
    checks.append("admin roles ok")

    status, frontend_admin_roles_html, frontend_admin_roles_headers = request_frontend_text("/admin/roles")
    assert_status(status, 200, "frontend direct admin roles route")
    assert isinstance(frontend_admin_roles_html, str)
    checks.append("frontend direct admin roles route ok")

    created_role_code = unique_role_code()
    status, created_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": created_role_code.upper(),
            "name": "Smoke custom role",
            "description": "Smoke custom role description",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin role create")
    assert isinstance(created_role, dict)
    assert created_role["code"] == created_role_code
    assert created_role["permissions"] == []
    created_role_id = str(created_role["id"])
    checks.append("admin role create ok")

    status, duplicate_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": created_role_code, "name": "Duplicate smoke custom role"},
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate role create")
    assert isinstance(duplicate_role, dict)
    checks.append("admin duplicate role create returns 409")

    status, updated_role = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{created_role_id}",
        {"name": "Smoke custom role updated", "description": None},
        token=admin_token,
    )
    assert_status(status, 200, "admin role update")
    assert isinstance(updated_role, dict)
    assert updated_role["id"] == created_role_id
    assert updated_role["code"] == created_role_code
    assert updated_role["name"] == "Smoke custom role updated"
    assert updated_role["description"] is None
    checks.append("admin role update ok")

    admin_role_for_metadata = next(
        (item for item in roles if isinstance(item, dict) and item.get("code") == "admin"),
        None,
    )
    if admin_role_for_metadata is None:
        raise AssertionError("admin role not found")

    status, protected_role_update = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{admin_role_for_metadata['id']}",
        {"name": "Forbidden admin rename"},
        token=admin_token,
    )
    assert_status(status, 400, "admin system role update protected")
    assert isinstance(protected_role_update, dict)
    checks.append("admin system role update protected returns 400")

    status, missing_role_update = request_json(
        "PATCH",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        {"name": "Missing role"},
        token=admin_token,
    )
    assert_status(status, 404, "admin role update 404")
    assert isinstance(missing_role_update, dict)
    checks.append("admin role update 404 ok")

    deletable_role_code = unique_role_code()
    status, deletable_role = request_json(
        "POST",
        "/api/v1/admin/roles",
        {
            "code": deletable_role_code,
            "name": "Smoke deletable role",
            "description": "Role for delete smoke check",
        },
        token=admin_token,
    )
    assert_status(status, 201, "admin role create for delete")
    assert isinstance(deletable_role, dict)
    deletable_role_id = str(deletable_role["id"])

    status, deleted_role = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{deletable_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin role delete")
    assert isinstance(deleted_role, dict)
    assert deleted_role["status"] == "deleted"
    assert deleted_role["id"] == deletable_role_id
    checks.append("admin role delete ok")

    status, deleted_role_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{deletable_role_id}",
        token=admin_token,
    )
    assert_status(status, 404, "admin deleted role detail 404")
    assert isinstance(deleted_role_detail, dict)
    checks.append("admin deleted role detail returns 404")

    status, protected_role_delete = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{admin_role_for_metadata['id']}",
        token=admin_token,
    )
    assert_status(status, 400, "admin system role delete protected")
    assert isinstance(protected_role_delete, dict)
    checks.append("admin system role delete protected returns 400")


    teacher_role = next(
        (item for item in roles if isinstance(item, dict) and item.get("code") == "teacher"),
        None,
    )
    if teacher_role is None:
        raise AssertionError("teacher role not found")

    teacher_role_id = str(teacher_role["id"])

    role_id = str(first_role["id"])
    status, role_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin role detail")
    assert isinstance(role_detail, dict)
    assert role_detail["id"] == role_id
    assert role_detail["code"]
    assert role_detail["name"]
    assert "created_at" in role_detail
    assert "updated_at" in role_detail
    assert isinstance(role_detail["permissions"], list)
    checks.append("admin role detail ok")

    status, assigned_role_user = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": created_organization_id,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin user role assign")
    assert isinstance(assigned_role_user, dict)
    assert assigned_role_user["id"] == learner_user_id
    assigned_user_role_id = find_user_role_id(
        assigned_role_user,
        role_code="teacher",
        organization_id=created_organization_id,
    )
    checks.append("admin user role assign ok")

    status, duplicate_role_assign = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": created_organization_id,
        },
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate user role assign")
    assert isinstance(duplicate_role_assign, dict)
    checks.append("admin duplicate user role assign returns 409")

    status, assigned_organization_delete = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{created_organization_id}",
        token=admin_token,
    )
    assert_status(status, 400, "admin assigned organization delete protected")
    assert isinstance(assigned_organization_delete, dict)
    checks.append("admin assigned organization delete protected returns 400")

    status, last_admin_role_remove = request_json(
        "DELETE",
        f"/api/v1/admin/users/{user_id}/roles/{find_user_role_id(user_detail, role_code='admin')}",
        token=admin_token,
    )
    assert_status(status, 400, "admin last admin role remove 400")
    assert isinstance(last_admin_role_remove, dict)
    checks.append("admin last admin role remove returns 400")

    status, missing_role = request_json(
        "GET",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin role detail 404")
    assert isinstance(missing_role, dict)
    checks.append("admin role detail 404 ok")

    status, permissions = request_json("GET", "/api/v1/admin/permissions", token=admin_token)
    assert_status(status, 200, "admin permissions")
    assert isinstance(permissions, list)
    assert len(permissions) >= 1
    first_permission = permissions[0]
    assert isinstance(first_permission, dict)
    assert first_permission.get("id")
    checks.append("admin permissions ok")

    status, frontend_admin_permissions_html, frontend_admin_permissions_headers = request_frontend_text("/admin/permissions")
    assert_status(status, 200, "frontend direct admin permissions route")
    assert isinstance(frontend_admin_permissions_html, str)
    checks.append("frontend direct admin permissions route ok")

    payments_permission = next(
        (item for item in permissions if isinstance(item, dict) and item.get("code") == "payments.write"),
        None,
    )
    if payments_permission is None:
        raise AssertionError("payments.write permission not found")

    payments_permission_id = str(payments_permission["id"])

    admin_role = next(
        (item for item in roles if isinstance(item, dict) and item.get("code") == "admin"),
        None,
    )
    if admin_role is None:
        raise AssertionError("admin role not found")

    status, teacher_role_detail = request_json(
        "GET",
        f"/api/v1/admin/roles/{teacher_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin teacher role detail")
    assert isinstance(teacher_role_detail, dict)

    existing_role_permission_id = find_role_permission_id(
        teacher_role_detail,
        permission_code="payments.write",
        required=False,
    )
    if existing_role_permission_id:
        status, cleanup_role_permission = request_json(
            "DELETE",
            f"/api/v1/admin/roles/{teacher_role_id}/permissions/{existing_role_permission_id}",
            token=admin_token,
        )
        assert_status(status, 200, "admin stale role permission cleanup")
        assert isinstance(cleanup_role_permission, dict)

    status, assigned_role_permission = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 200, "admin role permission assign")
    assert isinstance(assigned_role_permission, dict)
    assigned_role_permission_id = find_role_permission_id(
        assigned_role_permission,
        permission_code="payments.write",
    )
    checks.append("admin role permission assign ok")

    status, duplicate_role_permission = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 409, "admin duplicate role permission assign")
    assert isinstance(duplicate_role_permission, dict)
    checks.append("admin duplicate role permission assign returns 409")

    status, admin_role_permission_protected = request_json(
        "POST",
        f"/api/v1/admin/roles/{admin_role['id']}/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 400, "admin role permissions protected")
    assert isinstance(admin_role_permission_protected, dict)
    checks.append("admin role permissions protected returns 400")

    status, missing_role_permission_assign = request_json(
        "POST",
        "/api/v1/admin/roles/00000000-0000-0000-0000-000000000000/permissions",
        {"permission_id": payments_permission_id},
        token=admin_token,
    )
    assert_status(status, 404, "admin role permission assign missing role")
    assert isinstance(missing_role_permission_assign, dict)
    checks.append("admin role permission assign 404 ok")

    status, missing_permission_assign = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": "00000000-0000-0000-0000-000000000000"},
        token=admin_token,
    )
    assert_status(status, 404, "admin role permission assign missing permission")
    assert isinstance(missing_permission_assign, dict)
    checks.append("admin role permission missing permission returns 404")

    permission_id = str(first_permission["id"])
    status, permission_detail = request_json(
        "GET",
        f"/api/v1/admin/permissions/{permission_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin permission detail")
    assert isinstance(permission_detail, dict)
    assert permission_detail["id"] == permission_id
    assert permission_detail["code"]
    assert permission_detail["name"]
    assert "created_at" in permission_detail
    assert "updated_at" in permission_detail
    assert isinstance(permission_detail["roles"], list)
    checks.append("admin permission detail ok")

    status, missing_permission = request_json(
        "GET",
        "/api/v1/admin/permissions/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin permission detail 404")
    assert isinstance(missing_permission, dict)
    checks.append("admin permission detail 404 ok")

    status, audit_events = request_json("GET", "/api/v1/admin/audit-events", token=admin_token)
    assert_status(status, 200, "admin audit-events")
    assert isinstance(audit_events, list)
    assert len(audit_events) >= 1
    first_audit_event = audit_events[0]
    assert isinstance(first_audit_event, dict)
    assert first_audit_event.get("id")
    checks.append("admin audit-events ok")

    audit_event_id = str(first_audit_event["id"])
    status, audit_event_detail = request_json(
        "GET",
        f"/api/v1/admin/audit-events/{audit_event_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin audit event detail")
    assert isinstance(audit_event_detail, dict)
    assert audit_event_detail["id"] == audit_event_id
    assert audit_event_detail["action"]
    assert "payload" in audit_event_detail
    assert "created_at" in audit_event_detail
    checks.append("admin audit event detail ok")

    filtered_audit_path = f"/api/v1/admin/audit-events?action={audit_event_detail['action']}&limit=5"
    status, filtered_audit_events = request_json(
        "GET",
        filtered_audit_path,
        token=admin_token,
    )
    assert_status(status, 200, "admin audit-events filter")
    assert isinstance(filtered_audit_events, list)
    if len(filtered_audit_events) > 5:
        raise AssertionError("admin audit-events filter returned too many events")
    if not filtered_audit_events:
        raise AssertionError("admin audit-events filter returned no events")
    if any(event["action"] != audit_event_detail["action"] for event in filtered_audit_events):
        raise AssertionError("admin audit-events filter returned wrong action")
    checks.append("admin audit-events filter ok")

    status, frontend_audit_html, frontend_audit_headers = request_frontend_text("/admin/audit-events")
    assert_status(status, 200, "frontend direct admin audit-events route")
    assert isinstance(frontend_audit_html, str)
    checks.append("frontend direct admin audit-events route ok")

    status, missing_audit_event = request_json(
        "GET",
        "/api/v1/admin/audit-events/00000000-0000-0000-0000-000000000000",
        token=admin_token,
    )
    assert_status(status, 404, "admin audit event detail 404")
    assert isinstance(missing_audit_event, dict)
    checks.append("admin audit event detail 404 ok")

    status, _ = request_json("GET", "/api/v1/admin/users")
    assert_status(status, 401, "no token admin users")
    checks.append("no token returns 401")

    learner_token = login(LEARNER_EMAIL, LEARNER_PASSWORD)
    checks.append("learner login ok")
    self_enroll_slug = f"smoke-self-enroll-{uuid4().hex[:12]}"

    status, self_enroll_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": self_enroll_slug,
            "title": "Smoke Self Enrollment Course",
            "description": "Smoke course for learner self enrollment",
            "hours": 72,
            "format": "online",
            "document_type": "Сертификат",
            "is_active": True,
        },
    )
    assert_status(status, 201, "self enroll course create")
    assert isinstance(self_enroll_course, dict)
    checks.append("self enrollment course create ok")

    status, self_enroll_module = request_json(
        "POST",
        "/api/v1/admin/courses/" + str(self_enroll_course["id"]) + "/modules",
        {
            "title": "Smoke Self Enrollment Module",
            "description": "Smoke module for required learner progress",
            "position": 1,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "self enrollment module create")
    assert isinstance(self_enroll_module, dict)
    assert self_enroll_module["course_id"] == self_enroll_course["id"]
    self_enroll_module_id = str(self_enroll_module["id"])
    checks.append("self enrollment module create ok")

    status, self_enroll_lesson = request_json(
        "POST",
        f"/api/v1/admin/course-modules/{self_enroll_module_id}/lessons",
        {
            "title": "Smoke Required Account Lesson",
            "description": "Smoke required lesson for account progress",
            "content_type": "text",
            "content_text": "Smoke required lesson content",
            "position": 1,
            "is_required": True,
            "is_active": True,
        },
        token=admin_token,
    )
    assert_status(status, 201, "self enrollment required lesson create")
    assert isinstance(self_enroll_lesson, dict)
    assert self_enroll_lesson["module_id"] == self_enroll_module_id
    assert self_enroll_lesson["is_required"] is True
    assert self_enroll_lesson["is_active"] is True
    self_enroll_lesson_id = str(self_enroll_lesson["id"])
    checks.append("self enrollment required lesson create ok")

    frontend_self_enroll_course_path = "/courses/" + quote(str(self_enroll_course["slug"]), safe="")
    status, frontend_self_enroll_course_html, frontend_self_enroll_course_headers = request_frontend_text(
        frontend_self_enroll_course_path
    )
    assert_status(status, 200, "frontend public course detail route")
    assert_frontend_shell(
        frontend_self_enroll_course_html,
        "frontend public course detail route",
    )
    checks.append("frontend public course detail route ok")

    self_enroll_url = "/api/v1/account/courses/" + str(self_enroll_course["id"]) + "/enroll"

    status, self_enrollment = request_json(
        "POST",
        self_enroll_url,
        token=learner_token,
    )
    assert_status(status, 201, "learner self enrollment")
    assert isinstance(self_enrollment, dict)
    assert self_enrollment["course_id"] == self_enroll_course["id"]
    assert self_enrollment["course_slug"] == self_enroll_slug
    checks.append("learner self enrollment ok")

    status, duplicate_self_enrollment = request_json(
        "POST",
        self_enroll_url,
        token=learner_token,
    )
    assert_status(status, 409, "learner duplicate self enrollment")
    assert isinstance(duplicate_self_enrollment, dict)
    checks.append("learner duplicate self enrollment returns 409")

    status, learner_account_courses = request_json(
        "GET",
        "/api/v1/account/courses",
        token=learner_token,
    )
    assert_status(status, 200, "learner account courses after self enrollment")
    assert isinstance(learner_account_courses, dict)
    assert any(
        item["course_id"] == self_enroll_course["id"]
        for item in learner_account_courses["items"]
    )
    checks.append("learner account courses include self enrollment")

    status, learner_course_detail = request_json(
        "GET",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]),
        token=learner_token,
    )
    assert_status(status, 200, "learner account course detail")
    assert isinstance(learner_course_detail, dict)
    assert learner_course_detail["enrollment_id"] == self_enrollment["enrollment_id"]
    assert learner_course_detail["course_id"] == self_enroll_course["id"]
    assert learner_course_detail["lessons_total"] == 1
    assert learner_course_detail["lessons_completed"] == 0
    assert learner_course_detail["required_lessons_total"] == 1
    assert learner_course_detail["required_lessons_completed"] == 0
    assert learner_course_detail["progress_percent"] == 0
    assert learner_course_detail["required_progress_percent"] == 0
    assert len(learner_course_detail["modules"]) == 1

    self_enroll_detail_module = learner_course_detail["modules"][0]
    assert self_enroll_detail_module["id"] == self_enroll_module_id
    assert len(self_enroll_detail_module["lessons"]) == 1

    self_enroll_detail_lesson = self_enroll_detail_module["lessons"][0]
    assert self_enroll_detail_lesson["id"] == self_enroll_lesson_id
    assert self_enroll_detail_lesson["is_required"] is True
    assert self_enroll_detail_lesson["is_completed"] is False
    checks.append("learner account course detail includes required lesson")

    status, blocked_self_completion = request_json(
        "POST",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]) + "/complete",
        token=learner_token,
    )
    assert_status(status, 400, "learner complete self enrolled course before required lesson")
    assert isinstance(blocked_self_completion, dict)
    assert blocked_self_completion["detail"] == "Complete required lessons before completing course"
    checks.append("learner course completion requires required lesson")

    status, detail_after_required_lesson = request_json(
        "POST",
        "/api/v1/account/courses/"
        + str(self_enrollment["enrollment_id"])
        + "/lessons/"
        + self_enroll_lesson_id
        + "/complete",
        token=learner_token,
    )
    assert_status(status, 200, "learner complete required account lesson")
    assert isinstance(detail_after_required_lesson, dict)
    assert detail_after_required_lesson["lessons_total"] == 1
    assert detail_after_required_lesson["lessons_completed"] == 1
    assert detail_after_required_lesson["required_lessons_total"] == 1
    assert detail_after_required_lesson["required_lessons_completed"] == 1
    assert detail_after_required_lesson["progress_percent"] == 100
    assert detail_after_required_lesson["required_progress_percent"] == 100
    assert detail_after_required_lesson["modules"][0]["lessons"][0]["is_completed"] is True
    checks.append("learner complete required account lesson ok")

    status, completed_self_enrollment = request_json(
        "POST",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]) + "/complete",
        token=learner_token,
    )
    assert_status(status, 200, "learner complete self enrolled course")
    assert isinstance(completed_self_enrollment, dict)
    assert completed_self_enrollment["status"] == "completed"
    checks.append("learner complete self enrolled course ok")

    status, completed_course_detail = request_json(
        "GET",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]),
        token=learner_token,
    )
    assert_status(status, 200, "learner completed account course detail")
    assert isinstance(completed_course_detail, dict)
    assert completed_course_detail["status"] == "completed"
    assert completed_course_detail["required_lessons_completed"] == 1
    assert completed_course_detail["modules"][0]["lessons"][0]["is_completed"] is True
    checks.append("learner completed account course detail ok")

    status, completed_course_lesson_update = request_json(
        "POST",
        "/api/v1/account/courses/"
        + str(self_enrollment["enrollment_id"])
        + "/lessons/"
        + self_enroll_lesson_id
        + "/complete",
        token=learner_token,
    )
    assert_status(status, 400, "learner completed course lesson update blocked")
    assert isinstance(completed_course_lesson_update, dict)
    assert completed_course_lesson_update["detail"] == "Completed course cannot be changed"
    checks.append("learner completed course lesson update blocked")

    status, learner_documents_after_completion = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after course completion")
    assert isinstance(learner_documents_after_completion, dict)

    completion_documents = [
        item
        for item in learner_documents_after_completion["items"]
        if item["enrollment_id"] == self_enrollment["enrollment_id"]
    ]

    assert len(completion_documents) == 1
    assert completion_documents[0]["status"] == "draft"
    assert completion_documents[0]["course_id"] == self_enroll_course["id"]
    assert completion_documents[0]["course_slug"] == self_enroll_slug
    assert completion_documents[0]["file_available"] is True
    assert completion_documents[0]["download_available"] is False
    checks.append("learner course completion creates draft document")

    status, filtered_completion_admin_documents = request_json(
        "GET",
        "/api/v1/admin/documents?enrollment_id=" + quote(str(self_enrollment["enrollment_id"]), safe=""),
        token=admin_token,
    )
    assert_status(status, 200, "admin documents filter by enrollment")
    assert isinstance(filtered_completion_admin_documents, list)
    assert len(filtered_completion_admin_documents) == 1
    assert str(filtered_completion_admin_documents[0]["id"]) == str(completion_documents[0]["id"])
    assert filtered_completion_admin_documents[0]["enrollment_id"] == self_enrollment["enrollment_id"]
    checks.append("admin documents filter by enrollment ok")

    frontend_filtered_documents_path = "/admin/documents?enrollment_id=" + quote(
        str(self_enrollment["enrollment_id"]),
        safe="",
    )
    status, frontend_filtered_documents_html, frontend_filtered_documents_headers = request_frontend_text(
        frontend_filtered_documents_path
    )
    assert_status(status, 200, "frontend direct filtered documents route")
    frontend_filtered_documents_content_type = next(
        (
            value
            for key, value in frontend_filtered_documents_headers.items()
            if key.lower() == "content-type"
        ),
        "",
    )
    assert "html" in frontend_filtered_documents_content_type.lower()
    assert "root" in frontend_filtered_documents_html
    checks.append("frontend direct filtered documents route ok")

    admin_completion_suffix = uuid4().hex[:12]
    admin_completion_user_id = filtered_completion_admin_documents[0]["user_id"]

    status, admin_completion_course = request_json(
        "POST",
        "/api/v1/admin/courses",
        token=admin_token,
        body={
            "slug": f"admin-completion-{admin_completion_suffix}",
            "title": "Admin Completion Auto Document",
            "description": "Smoke course for admin completion document generation",
            "hours": 16,
            "format": "online",
            "document_type": "Удостоверение",
            "is_active": True,
        },
    )
    assert_status(status, 201, "admin completion course create")
    assert isinstance(admin_completion_course, dict)

    status, admin_completion_enrollment = request_json(
        "POST",
        "/api/v1/admin/enrollments",
        token=admin_token,
        body={
            "user_id": admin_completion_user_id,
            "course_id": admin_completion_course["id"],
            "status": "assigned",
        },
    )
    assert_status(status, 201, "admin completion enrollment create")
    assert isinstance(admin_completion_enrollment, dict)

    status, completed_admin_enrollment = request_json(
        "PATCH",
        "/api/v1/admin/enrollments/" + str(admin_completion_enrollment["id"]),
        token=admin_token,
        body={
            "status": "completed",
        },
    )
    assert_status(status, 200, "admin complete enrollment")
    assert isinstance(completed_admin_enrollment, dict)
    assert completed_admin_enrollment["status"] == "completed"
    assert completed_admin_enrollment["started_at"]
    assert completed_admin_enrollment["completed_at"]

    status, admin_completion_documents = request_json(
        "GET",
        "/api/v1/admin/documents?enrollment_id="
        + quote(str(admin_completion_enrollment["id"]), safe=""),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion documents filter")
    assert isinstance(admin_completion_documents, list)
    assert len(admin_completion_documents) == 1
    assert admin_completion_documents[0]["enrollment_id"] == admin_completion_enrollment["id"]
    assert admin_completion_documents[0]["status"] == "draft"
    assert admin_completion_documents[0]["file_available"] is True
    checks.append("admin completion creates draft document ok")

    status, deleted_admin_completion_document = request_json(
        "DELETE",
        "/api/v1/admin/documents/" + str(admin_completion_documents[0]["id"]),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion document cleanup delete")
    assert isinstance(deleted_admin_completion_document, dict)

    status, deleted_admin_completion_enrollment = request_json(
        "DELETE",
        "/api/v1/admin/enrollments/" + str(admin_completion_enrollment["id"]),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion enrollment cleanup delete")
    assert isinstance(deleted_admin_completion_enrollment, dict)

    status, deleted_admin_completion_course = request_json(
        "DELETE",
        "/api/v1/admin/courses/" + str(admin_completion_course["id"]),
        token=admin_token,
    )
    assert_status(status, 200, "admin completion course cleanup delete")
    assert isinstance(deleted_admin_completion_course, dict)
    checks.append("admin completion draft document cleanup ok")

    status, draft_download_payload = request_json(
        "GET",
        "/api/v1/account/documents/" + str(completion_documents[0]["id"]) + "/download",
        token=learner_token,
    )
    assert_status(status, 409, "learner draft document download blocked")
    assert isinstance(draft_download_payload, dict)
    checks.append("learner draft document download blocked")

    completion_document_id = str(completion_documents[0]["id"])

    status, published_completion_document = request_form(
        "PATCH",
        f"/api/v1/admin/documents/{completion_document_id}",
        {"status": "available"},
        token=admin_token,
    )
    assert_status(status, 200, "admin publish generated completion document")
    assert isinstance(published_completion_document, dict)
    assert published_completion_document["id"] == completion_document_id
    assert published_completion_document["status"] == "available"
    assert published_completion_document["file_available"] is True
    checks.append("admin publish generated completion document ok")

    status, learner_documents_after_publish = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after generated PDF publish")
    assert isinstance(learner_documents_after_publish, dict)

    published_completion_documents = [
        item
        for item in learner_documents_after_publish["items"]
        if item["id"] == completion_document_id
    ]

    assert len(published_completion_documents) == 1
    assert published_completion_documents[0]["status"] == "available"
    assert published_completion_documents[0]["file_available"] is True
    assert published_completion_documents[0]["download_available"] is True
    checks.append("learner generated completion document becomes downloadable")

    status, generated_pdf_body, generated_pdf_headers = request_binary(
        "GET",
        f"/api/v1/account/documents/{completion_document_id}/download",
        token=learner_token,
    )
    assert_status(status, 200, "learner generated completion PDF download")
    assert generated_pdf_body.startswith(b"%PDF-")
    assert b"%%EOF" in generated_pdf_body
    assert len(generated_pdf_body) > 2_500

    generated_pdf_content_type = (
        generated_pdf_headers.get("Content-Type", "")
        or generated_pdf_headers.get("content-type", "")
    )
    generated_pdf_disposition = (
        generated_pdf_headers.get("Content-Disposition", "")
        or generated_pdf_headers.get("content-disposition", "")
    )

    assert "application/pdf" in generated_pdf_content_type.lower()
    assert completion_documents[0]["document_number"].lower() in generated_pdf_disposition.lower()
    assert ".pdf" in generated_pdf_disposition.lower()
    assert ".bin" not in generated_pdf_disposition.lower()
    checks.append("learner generated completion PDF download ok")

    status, admin_generated_pdf_body, admin_generated_pdf_headers = request_binary(
        "GET",
        f"/api/v1/admin/documents/{completion_document_id}/download",
        token=admin_token,
    )
    assert_status(status, 200, "admin generated completion PDF download")
    assert admin_generated_pdf_body.startswith(b"%PDF-")
    assert b"%%EOF" in admin_generated_pdf_body
    assert len(admin_generated_pdf_body) > 2_500

    admin_generated_pdf_content_type = (
        admin_generated_pdf_headers.get("Content-Type", "")
        or admin_generated_pdf_headers.get("content-type", "")
    )
    admin_generated_pdf_disposition = (
        admin_generated_pdf_headers.get("Content-Disposition", "")
        or admin_generated_pdf_headers.get("content-disposition", "")
    )

    assert "application/pdf" in admin_generated_pdf_content_type.lower()
    assert completion_documents[0]["document_number"].lower() in admin_generated_pdf_disposition.lower()
    assert ".pdf" in admin_generated_pdf_disposition.lower()
    assert ".bin" not in admin_generated_pdf_disposition.lower()
    checks.append("admin generated completion PDF download ok")

    status, generated_public_verify_by_number = request_json(
        "GET",
        f"/api/v1/public/documents/verify?number={completion_documents[0]['document_number']}",
    )
    assert_status(status, 200, "public verify generated completion document by number")
    assert isinstance(generated_public_verify_by_number, dict)
    assert generated_public_verify_by_number["document_number"] == completion_documents[0]["document_number"]
    assert generated_public_verify_by_number["verification_code"] == completion_documents[0]["verification_code"]
    assert generated_public_verify_by_number["course_title"] == self_enroll_course["title"]
    assert generated_public_verify_by_number["course_hours"] == self_enroll_course["hours"]
    assert generated_public_verify_by_number["course_format"] == self_enroll_course["format"]
    assert generated_public_verify_by_number["completed_at"] is not None
    assert generated_public_verify_by_number["issuer_name"]
    assert generated_public_verify_by_number["issuer_short_name"]
    assert generated_public_verify_by_number["issuer_address"]
    assert generated_public_verify_by_number["issuer_license"]
    assert "issuer_inn" in generated_public_verify_by_number
    assert "issuer_kpp" in generated_public_verify_by_number
    assert "issuer_ogrn" in generated_public_verify_by_number
    assert generated_public_verify_by_number["registry_status"] == "available"
    assert generated_public_verify_by_number["verification_status"] == "Документ подтверждён"
    checks.append("public verify generated completion document by number ok")

    status, generated_public_verify_by_code = request_json(
        "GET",
        f"/api/v1/public/documents/verify?number={completion_documents[0]['verification_code']}",
    )
    assert_status(status, 200, "public verify generated completion document by code")
    assert isinstance(generated_public_verify_by_code, dict)
    assert generated_public_verify_by_code["document_number"] == completion_documents[0]["document_number"]
    assert generated_public_verify_by_code["verification_code"] == completion_documents[0]["verification_code"]
    assert generated_public_verify_by_code["registry_status"] == "available"
    assert generated_public_verify_by_code["verification_status"] == "Документ подтверждён"
    checks.append("public verify generated completion document by code ok")


    status, revocation_actor = request_json(
        "GET",
        "/api/v1/auth/me",
        token=admin_token,
    )
    assert_status(status, 200, "admin revocation actor /auth/me")
    assert isinstance(revocation_actor, dict)
    revocation_actor_id = str(revocation_actor["id"])

    revocation_reason = "Smoke revocation lifecycle check"

    status, revoked_completion_document = request_form(
        "PATCH",
        f"/api/v1/admin/documents/{completion_document_id}",
        {
            "status": "revoked",
            "revocation_reason": revocation_reason,
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin revoke generated completion document")
    assert isinstance(revoked_completion_document, dict)
    assert revoked_completion_document["id"] == completion_document_id
    assert revoked_completion_document["status"] == "revoked"
    assert revoked_completion_document["revoked_at"] is not None
    assert str(revoked_completion_document["revoked_by_user_id"]) == revocation_actor_id
    assert revoked_completion_document["revocation_reason"] == revocation_reason
    checks.append("admin revoke generated completion document ok")

    status, revoked_public_verify = request_json(
        "GET",
        f"/api/v1/public/documents/verify?number={completion_documents[0]['verification_code']}",
    )
    assert_status(status, 200, "public verify revoked generated completion document")
    assert isinstance(revoked_public_verify, dict)
    assert revoked_public_verify["document_number"] == completion_documents[0]["document_number"]
    assert revoked_public_verify["verification_code"] == completion_documents[0]["verification_code"]
    assert revoked_public_verify["registry_status"] == "revoked"
    assert revoked_public_verify["revoked_at"] is not None
    assert revoked_public_verify["revocation_reason"] == revocation_reason
    checks.append("public verify revoked generated completion document ok")

    status, document_revoked_audit_events = request_json(
        "GET",
        f"/api/v1/admin/audit-events?action=admin.document_revoked&entity_type=document&entity_id={completion_document_id}&limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin document revoked audit event")
    assert isinstance(document_revoked_audit_events, list)
    assert len(document_revoked_audit_events) >= 1
    document_revoked_audit_event = document_revoked_audit_events[0]
    assert document_revoked_audit_event["action"] == "admin.document_revoked"
    assert document_revoked_audit_event["entity_type"] == "document"
    assert document_revoked_audit_event["entity_id"] == completion_document_id
    assert document_revoked_audit_event["payload"]["before"]["status"] == "available"
    assert document_revoked_audit_event["payload"]["after"]["status"] == "revoked"
    assert document_revoked_audit_event["payload"]["status_transition"] == {
        "from": "available",
        "to": "revoked",
    }
    checks.append("admin document revoked audit event ok")

    status, learner_documents_after_revoke = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after generated document revoke")
    assert isinstance(learner_documents_after_revoke, dict)

    revoked_learner_documents = [
        item
        for item in learner_documents_after_revoke["items"]
        if item["id"] == completion_document_id
    ]

    assert len(revoked_learner_documents) == 1
    assert revoked_learner_documents[0]["status"] == "revoked"
    assert revoked_learner_documents[0]["download_available"] is False
    assert revoked_learner_documents[0]["revoked_at"] is not None
    assert revoked_learner_documents[0]["revocation_reason"] == revocation_reason
    checks.append("learner revoked generated document becomes non-downloadable")

    status, revoked_download_payload = request_json(
        "GET",
        f"/api/v1/account/documents/{completion_document_id}/download",
        token=learner_token,
    )
    assert_status(status, 409, "learner revoked generated document download blocked")
    assert isinstance(revoked_download_payload, dict)
    checks.append("learner revoked generated document download blocked")

    status, restored_completion_document = request_form(
        "PATCH",
        f"/api/v1/admin/documents/{completion_document_id}",
        {
            "status": "available",
        },
        token=admin_token,
    )
    assert_status(status, 200, "admin restore generated completion document")
    assert isinstance(restored_completion_document, dict)
    assert restored_completion_document["id"] == completion_document_id
    assert restored_completion_document["status"] == "available"
    assert restored_completion_document["revoked_at"] is None
    assert restored_completion_document["revoked_by_user_id"] is None
    assert restored_completion_document["revocation_reason"] is None
    checks.append("admin restore generated completion document ok")

    status, document_restored_audit_events = request_json(
        "GET",
        f"/api/v1/admin/audit-events?action=admin.document_restored&entity_type=document&entity_id={completion_document_id}&limit=5",
        token=admin_token,
    )
    assert_status(status, 200, "admin document restored audit event")
    assert isinstance(document_restored_audit_events, list)
    assert len(document_restored_audit_events) >= 1
    document_restored_audit_event = document_restored_audit_events[0]
    assert document_restored_audit_event["action"] == "admin.document_restored"
    assert document_restored_audit_event["entity_type"] == "document"
    assert document_restored_audit_event["entity_id"] == completion_document_id
    assert document_restored_audit_event["payload"]["before"]["status"] == "revoked"
    assert document_restored_audit_event["payload"]["after"]["status"] == "available"
    assert document_restored_audit_event["payload"]["status_transition"] == {
        "from": "revoked",
        "to": "available",
    }
    checks.append("admin document restored audit event ok")

    status, restored_public_verify = request_json(
        "GET",
        f"/api/v1/public/documents/verify?number={completion_documents[0]['verification_code']}",
    )
    assert_status(status, 200, "public verify restored generated completion document")
    assert isinstance(restored_public_verify, dict)
    assert restored_public_verify["document_number"] == completion_documents[0]["document_number"]
    assert restored_public_verify["verification_code"] == completion_documents[0]["verification_code"]
    assert restored_public_verify["registry_status"] == "available"
    assert restored_public_verify["verification_status"] == "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d"
    assert restored_public_verify["revoked_at"] is None
    assert restored_public_verify["revocation_reason"] is None
    checks.append("public verify restored generated completion document ok")

    status, learner_documents_after_restore = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after generated document restore")
    assert isinstance(learner_documents_after_restore, dict)

    restored_learner_documents = [
        item
        for item in learner_documents_after_restore["items"]
        if item["id"] == completion_document_id
    ]

    assert len(restored_learner_documents) == 1
    assert restored_learner_documents[0]["status"] == "available"
    assert restored_learner_documents[0]["download_available"] is True
    assert restored_learner_documents[0]["revoked_at"] is None
    assert restored_learner_documents[0]["revocation_reason"] is None
    checks.append("learner restored generated document becomes downloadable")

    status, restored_generated_pdf_body, restored_generated_pdf_headers = request_binary(
        "GET",
        f"/api/v1/account/documents/{completion_document_id}/download",
        token=learner_token,
    )
    assert_status(status, 200, "learner restored generated completion PDF download")
    assert restored_generated_pdf_body.startswith(b"%PDF-")
    assert b"%%EOF" in restored_generated_pdf_body
    assert len(restored_generated_pdf_body) > 2_500
    checks.append("learner restored generated completion PDF download ok")

    frontend_verify_path = "/verify/" + quote(str(completion_documents[0]["verification_code"]), safe="")
    status, frontend_verify_html, frontend_verify_headers = request_frontend_text(frontend_verify_path)
    assert_status(status, 200, "frontend direct generated document verification route")

    frontend_content_type = (
        frontend_verify_headers.get("Content-Type", "")
        or frontend_verify_headers.get("content-type", "")
    )

    assert "text/html" in frontend_content_type.lower()
    assert '<div id="root">' in frontend_verify_html
    assert (
        'src="/src/main.jsx"' in frontend_verify_html
        or "/assets/index-" in frontend_verify_html
        or 'type="module"' in frontend_verify_html
    )
    checks.append("frontend direct generated document verification route ok")

    status, completed_self_enrollment_again = request_json(
        "POST",
        "/api/v1/account/courses/" + str(self_enrollment["enrollment_id"]) + "/complete",
        token=learner_token,
    )
    assert_status(status, 200, "learner repeat complete self enrolled course")
    assert isinstance(completed_self_enrollment_again, dict)

    status, learner_documents_after_repeat_completion = request_json(
        "GET",
        "/api/v1/account/documents",
        token=learner_token,
    )
    assert_status(status, 200, "learner documents after repeat completion")
    assert isinstance(learner_documents_after_repeat_completion, dict)

    completion_documents_after_repeat = [
        item
        for item in learner_documents_after_repeat_completion["items"]
        if item["enrollment_id"] == self_enrollment["enrollment_id"]
    ]

    assert len(completion_documents_after_repeat) == 1
    checks.append("learner repeat completion does not duplicate completion document")

    status, _ = request_json("GET", "/api/v1/admin/users", token=learner_token)
    assert_status(status, 403, "learner admin API")
    checks.append("learner admin API returns 403")

    status, _ = request_json("GET", "/api/v1/admin/courses", token=learner_token)
    assert_status(status, 403, "learner admin courses")
    checks.append("learner courses returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/courses/{self_enroll_course['id']}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin course detail")
    checks.append("learner course detail returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/admin/courses",
        body={
            "slug": f"forbidden-course-{uuid4().hex[:10]}",
            "title": "Forbidden learner course",
            "description": "Forbidden learner course create",
            "hours": 16,
            "format": "online",
            "document_type": "Certificate",
            "is_active": True,
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin course create")
    checks.append("learner course create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/courses/{self_enroll_course['id']}",
        body={"title": "Forbidden learner course update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin course update")
    checks.append("learner course update returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/courses/{self_enroll_course['id']}/deactivate",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin course deactivate")
    checks.append("learner course deactivate returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/courses/{self_enroll_course['id']}/activate",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin course activate")
    checks.append("learner course activate returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/courses/{self_enroll_course['id']}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin course delete")
    checks.append("learner course delete returns 403")

    status, _ = request_json("GET", f"/api/v1/admin/users/{user_id}", token=learner_token)
    assert_status(status, 403, "learner admin user detail")
    checks.append("learner user detail returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/users/{learner_user_id}",
        {"full_name": "Forbidden learner update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user update")
    checks.append("learner user update returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/admin/users",
        {
            "email": f"forbidden-smoke-{uuid4().hex[:10]}@obrportal.local",
            "password": "ForbiddenSmoke123!",
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user create")
    checks.append("learner user create returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/password",
        {"password": "ForbiddenResetSmoke123!"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user password reset")
    checks.append("learner user password reset returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/deactivate",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user deactivate")
    checks.append("learner user deactivate returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/activate",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user activate")
    checks.append("learner user activate returns 403")

    status, _ = request_json(
        "POST",
        f"/api/v1/admin/users/{learner_user_id}/roles",
        {
            "role_id": teacher_role_id,
            "organization_id": created_organization_id,
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user role assign")
    checks.append("learner user role assign returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{assigned_user_role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin user role remove")
    checks.append("learner user role remove returns 403")

    status, removed_role_user = request_json(
        "DELETE",
        f"/api/v1/admin/users/{learner_user_id}/roles/{assigned_user_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin user role remove")
    assert isinstance(removed_role_user, dict)
    assert removed_role_user["id"] == learner_user_id
    checks.append("admin user role remove ok")

    status, _ = request_json("GET", "/api/v1/admin/organizations", token=learner_token)
    assert_status(status, 403, "learner admin organizations")
    checks.append("learner organizations returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/organizations/{organization_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization detail")
    checks.append("learner organization detail returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/admin/organizations",
        {
            "inn": unique_inn(),
            "name": "Forbidden learner organization",
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization create")
    checks.append("learner organization create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/organizations/{created_organization_id}",
        {"name": "Forbidden learner update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization update")
    checks.append("learner organization update returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{created_organization_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin organization delete")
    checks.append("learner organization delete returns 403")

    status, _ = request_json(
        "GET",
        "/api/v1/org/groups",
        token=learner_token,
    )
    assert_status(status, 403, "learner org groups")
    checks.append("learner learning groups returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/org/groups/{created_group_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner org group detail")
    checks.append("learner learning group detail returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/org/groups",
        {
            "organization_id": created_organization_id,
            "name": "Forbidden learner group",
            "code": unique_group_code(),
        },
        token=learner_token,
    )
    assert_status(status, 403, "learner org group create")
    checks.append("learner learning group create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/org/groups/{created_group_id}",
        {"name": "Forbidden learner group update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner org group update")
    checks.append("learner learning group update returns 403")

    status, deleted_created_org = request_json(
        "DELETE",
        f"/api/v1/admin/organizations/{created_organization_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin created organization cleanup delete")
    assert isinstance(deleted_created_org, dict)
    checks.append("admin created organization cleanup delete ok")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/roles/{role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role detail")
    checks.append("learner role detail returns 403")

    status, _ = request_json(
        "POST",
        "/api/v1/admin/roles",
        {"code": unique_role_code(), "name": "Forbidden learner role"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role create")
    checks.append("learner role create returns 403")

    status, _ = request_json(
        "PATCH",
        f"/api/v1/admin/roles/{created_role_id}",
        {"name": "Forbidden learner role update"},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role update")
    checks.append("learner role update returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{created_role_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role delete")
    checks.append("learner role delete returns 403")

    status, deleted_created_role = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{created_role_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin created role cleanup delete")
    assert isinstance(deleted_created_role, dict)
    checks.append("admin created role cleanup delete ok")


    status, _ = request_json(
        "POST",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions",
        {"permission_id": payments_permission_id},
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role permission assign")
    checks.append("learner role permission assign returns 403")

    status, _ = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions/{assigned_role_permission_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin role permission remove")
    checks.append("learner role permission remove returns 403")

    status, removed_role_permission = request_json(
        "DELETE",
        f"/api/v1/admin/roles/{teacher_role_id}/permissions/{assigned_role_permission_id}",
        token=admin_token,
    )
    assert_status(status, 200, "admin role permission remove")
    assert isinstance(removed_role_permission, dict)
    checks.append("admin role permission remove ok")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/permissions/{permission_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin permission detail")
    checks.append("learner permission detail returns 403")

    status, _ = request_json(
        "GET",
        f"/api/v1/admin/audit-events/{audit_event_id}",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin audit event detail")
    checks.append("learner audit event detail returns 403")

    status, _ = request_json(
        "GET",
        "/api/v1/admin/audit-events?action=admin.user_created&limit=5",
        token=learner_token,
    )
    assert_status(status, 403, "learner admin audit-events filter")
    checks.append("learner audit-events filter returns 403")

    print("Smoke auth/RBAC/admin/org API passed:")
    for check in checks:
        print(f" - {check}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
