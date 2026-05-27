from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv()

API_BASE_URL = os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
FRONTEND_BASE_URL = os.getenv("SMOKE_FRONTEND_BASE_URL", "http://127.0.0.1:5173").rstrip("/")

LEARNER_EMAIL = os.getenv("SMOKE_LEARNER_EMAIL") or os.getenv("SEED_DEMO_EMAIL")
LEARNER_PASSWORD = os.getenv("SMOKE_LEARNER_PASSWORD") or os.getenv("SEED_DEMO_PASSWORD")


def assert_required_env() -> None:
    missing = []

    if not LEARNER_EMAIL:
        missing.append("SMOKE_LEARNER_EMAIL or SEED_DEMO_EMAIL")

    if not LEARNER_PASSWORD:
        missing.append("SMOKE_LEARNER_PASSWORD or SEED_DEMO_PASSWORD")

    if missing:
        raise AssertionError(
            "missing required smoke environment variables: " + ", ".join(missing)
        )


def build_url(base_url: str, path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path

    if not path.startswith("/"):
        path = "/" + path

    return base_url + path


def parse_json_bytes(raw: bytes) -> Any:
    if not raw:
        return None

    return json.loads(raw.decode("utf-8"))


def request_json(
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    token: str | None = None,
) -> tuple[int, Any, dict[str, str]]:
    data = None

    headers = {
        "Accept": "application/json",
    }

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        build_url(API_BASE_URL, path),
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read()
            return response.status, parse_json_bytes(raw), dict(response.headers)
    except HTTPError as error:
        raw = error.read()
        try:
            payload = parse_json_bytes(raw)
        except Exception:
            payload = raw.decode("utf-8", errors="replace")
        return error.code, payload, dict(error.headers)
    except URLError as error:
        raise AssertionError(f"request failed for {method} {path}: {error}") from error


def request_text(path: str) -> tuple[int, str, dict[str, str]]:
    request = Request(
        build_url(FRONTEND_BASE_URL, path),
        headers={"Accept": "text/html"},
        method="GET",
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read()
            return response.status, raw.decode("utf-8", errors="replace"), dict(response.headers)
    except HTTPError as error:
        raw = error.read()
        return error.code, raw.decode("utf-8", errors="replace"), dict(error.headers)
    except URLError as error:
        raise AssertionError(f"frontend request failed for {path}: {error}") from error


def request_binary(
    method: str,
    path: str,
    token: str | None = None,
) -> tuple[int, bytes, dict[str, str]]:
    headers = {"Accept": "*/*"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        build_url(API_BASE_URL, path),
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            return response.status, response.read(), dict(response.headers)
    except HTTPError as error:
        return error.code, error.read(), dict(error.headers)
    except URLError as error:
        raise AssertionError(f"binary request failed for {method} {path}: {error}") from error


def assert_status(actual: int, expected: int, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected HTTP {expected}, got {actual}")


def assert_no_secret_fields(payload: dict[str, Any], label: str) -> None:
    forbidden_keys = {
        "password",
        "hashed_password",
        "token",
        "access_token",
        "refresh_token",
        "permissions",
        "storage_path",
    }

    leaked = sorted(key for key in forbidden_keys if key in payload)

    if leaked:
        raise AssertionError(f"{label}: forbidden fields leaked: {', '.join(leaked)}")


def login(email: str, password: str) -> str:
    status, payload, _ = request_json(
        "POST",
        "/api/v1/auth/login",
        {
            "email": email,
            "password": password,
        },
    )

    assert_status(status, 200, "learner login")

    if not isinstance(payload, dict):
        raise AssertionError("learner login returned non-object payload")

    token = payload.get("access_token") or payload.get("token")

    if not token or not isinstance(token, str):
        raise AssertionError("learner login did not return access token")

    return token


def assert_frontend_shell(path: str, label: str) -> None:
    status, body, headers = request_text(path)

    assert_status(status, 200, label)

    content_type = headers.get("Content-Type", "") or headers.get("content-type", "")

    if "html" not in content_type.lower():
        raise AssertionError(f"{label}: expected html content type, got {content_type!r}")

    if '<div id="root">' not in body and 'id="root"' not in body:
        raise AssertionError(f"{label}: frontend root element not found")

    if "/assets/index-" not in body and "/src/main.jsx" not in body and 'type="module"' not in body:
        raise AssertionError(f"{label}: frontend shell script marker not found")


def assert_account_summary(token: str, checks: list[str]) -> None:
    status, payload, _ = request_json("GET", "/api/v1/account/summary")
    assert_status(status, 401, "account summary without token")
    checks.append("account summary without token returns 401")

    status, payload, _ = request_json("GET", "/api/v1/account/summary", token=token)
    assert_status(status, 200, "account summary")

    if not isinstance(payload, dict):
        raise AssertionError("account summary returned non-object payload")

    for key in ["profile", "enrollments_count", "active_courses_count", "documents_count"]:
        if key not in payload:
            raise AssertionError(f"account summary missing key: {key}")

    profile = payload["profile"]

    if not isinstance(profile, dict):
        raise AssertionError("account summary profile is not object")

    assert_no_secret_fields(profile, "account summary profile")

    if str(profile.get("email", "")).lower() != str(LEARNER_EMAIL).lower():
        raise AssertionError("account summary returned unexpected profile email")

    for count_key in ["enrollments_count", "active_courses_count", "documents_count"]:
        if not isinstance(payload[count_key], int):
            raise AssertionError(f"account summary {count_key} is not int")

    checks.append("account summary ok")


def assert_account_courses(token: str, checks: list[str]) -> None:
    status, payload, _ = request_json("GET", "/api/v1/account/courses")
    assert_status(status, 401, "account courses without token")
    checks.append("account courses without token returns 401")

    status, payload, _ = request_json("GET", "/api/v1/account/courses", token=token)
    assert_status(status, 200, "account courses")

    if not isinstance(payload, dict):
        raise AssertionError("account courses returned non-object payload")

    if not isinstance(payload.get("total"), int):
        raise AssertionError("account courses total is not int")

    items = payload.get("items")

    if not isinstance(items, list):
        raise AssertionError("account courses items is not list")

    for item in items:
        if not isinstance(item, dict):
            raise AssertionError("account courses item is not object")

        for key in ["enrollment_id", "course_id", "course_slug", "course_title", "status"]:
            if key not in item:
                raise AssertionError(f"account course item missing key: {key}")

        assert_no_secret_fields(item, "account course item")

    checks.append("account courses ok")

    if not items:
        checks.append("account course detail skipped because no learner courses")
        return

    first_item = items[0]
    enrollment_id = quote(str(first_item["enrollment_id"]), safe="")

    status, detail, _ = request_json(
        "GET",
        f"/api/v1/account/courses/{enrollment_id}",
        token=token,
    )
    assert_status(status, 200, "account course detail")

    if not isinstance(detail, dict):
        raise AssertionError("account course detail returned non-object payload")

    if detail.get("enrollment_id") != first_item["enrollment_id"]:
        raise AssertionError("account course detail enrollment_id mismatch")

    for key in [
        "lessons_total",
        "lessons_completed",
        "required_lessons_total",
        "required_lessons_completed",
        "progress_percent",
        "required_progress_percent",
        "modules",
    ]:
        if key not in detail:
            raise AssertionError(f"account course detail missing key: {key}")

    if not isinstance(detail["modules"], list):
        raise AssertionError("account course detail modules is not list")

    assert_no_secret_fields(detail, "account course detail")
    checks.append("account course detail ok")

    status, missing_detail, _ = request_json(
        "GET",
        "/api/v1/account/courses/00000000-0000-0000-0000-000000000000",
        token=token,
    )
    assert_status(status, 404, "account missing course detail")
    checks.append("account missing course detail returns 404")


def assert_account_documents(token: str, checks: list[str]) -> None:
    status, payload, _ = request_json("GET", "/api/v1/account/documents")
    assert_status(status, 401, "account documents without token")
    checks.append("account documents without token returns 401")

    status, payload, _ = request_json("GET", "/api/v1/account/documents", token=token)
    assert_status(status, 200, "account documents")

    if not isinstance(payload, dict):
        raise AssertionError("account documents returned non-object payload")

    if not isinstance(payload.get("total"), int):
        raise AssertionError("account documents total is not int")

    items = payload.get("items")

    if not isinstance(items, list):
        raise AssertionError("account documents items is not list")

    for item in items:
        if not isinstance(item, dict):
            raise AssertionError("account document item is not object")

        for key in [
            "id",
            "document_number",
            "verification_code",
            "document_type",
            "title",
            "status",
            "file_available",
            "download_available",
        ]:
            if key not in item:
                raise AssertionError(f"account document item missing key: {key}")

        assert_no_secret_fields(item, "account document item")

    checks.append("account documents ok")

    status, missing_download_payload, _ = request_json(
        "GET",
        "/api/v1/account/documents/00000000-0000-0000-0000-000000000000/download",
        token=token,
    )
    assert_status(status, 404, "account missing document download")
    checks.append("account missing document download returns 404")

    downloadable = next(
        (
            item
            for item in items
            if isinstance(item, dict)
            and item.get("status") == "available"
            and item.get("download_available") is True
        ),
        None,
    )

    if downloadable is None:
        checks.append("account document download skipped because no available downloadable documents")
        return

    document_id = quote(str(downloadable["id"]), safe="")
    status, body, headers = request_binary(
        "GET",
        f"/api/v1/account/documents/{document_id}/download",
        token=token,
    )
    assert_status(status, 200, "account available document download")

    if not body:
        raise AssertionError("account available document download returned empty body")

    content_type = headers.get("Content-Type", "") or headers.get("content-type", "")

    if not content_type:
        raise AssertionError("account available document download missing content type")

    checks.append("account available document download ok")


def assert_frontend_routes(checks: list[str]) -> None:
    routes = [
        ("/account", "frontend account route"),
        ("/login", "frontend login route"),
        ("/catalog", "frontend catalog route"),
        ("/verify-document", "frontend verify document route"),
    ]

    for route, label in routes:
        assert_frontend_shell(route, label)
        checks.append(f"{label} ok")


def main() -> int:
    assert_required_env()

    checks: list[str] = []

    token = login(str(LEARNER_EMAIL), str(LEARNER_PASSWORD))
    checks.append("learner login ok")

    assert_account_summary(token, checks)
    assert_account_courses(token, checks)
    assert_account_documents(token, checks)
    assert_frontend_routes(checks)

    print("Stage 12.1 account workflow smoke passed:")
    for check in checks:
        print(f" - {check}")

    print("secrets_printed=no")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
