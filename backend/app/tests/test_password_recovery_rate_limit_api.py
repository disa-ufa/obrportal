import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4


BASE_URL = os.getenv(
    "TEST_BASE_URL",
    "http://127.0.0.1:8000",
).rstrip("/")

NEUTRAL_MESSAGE = (
    "Если учетная запись существует, инструкции "
    "по восстановлению пароля отправлены "
    "на указанный адрес."
)


def request_json(
    path: str,
    *,
    email: str,
    forwarded_for: str,
) -> tuple[int, dict | None, dict[str, str]]:
    request = Request(
        f"{BASE_URL}{path}",
        data=json.dumps({"email": email}).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Forwarded-For": forwarded_for,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            headers = {
                key.lower(): value
                for key, value in response.headers.items()
            }
            return response.status, payload, headers
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        headers = {
            key.lower(): value
            for key, value in error.headers.items()
        }
        return error.code, payload, headers


def test_forgot_password_rate_limit_keeps_success_neutral() -> None:
    email = (
        f"recovery-neutral-{uuid4().hex}"
        "@example.com"
    )

    status, payload, _ = request_json(
        "/api/v1/auth/forgot-password",
        email=email,
        forwarded_for="203.0.113.61",
    )

    assert status == 202
    assert payload == {
        "status": "accepted",
        "message": NEUTRAL_MESSAGE,
    }


def test_forgot_password_rate_limits_normalized_email() -> None:
    local_part = f"recovery-email-{uuid4().hex}"
    email = f"{local_part}@example.com"
    client = "203.0.113.62"

    first_status, _, _ = request_json(
        "/api/v1/auth/forgot-password",
        email=email,
        forwarded_for=client,
    )
    second_status, _, _ = request_json(
        "/api/v1/auth/forgot-password",
        email=email.upper(),
        forwarded_for=client,
    )
    third_status, third_payload, third_headers = (
        request_json(
            "/api/v1/auth/forgot-password",
            email=f"{local_part}@example.com",
            forwarded_for=client,
        )
    )

    assert first_status == 202
    assert second_status == 202
    assert third_status == 429
    assert third_payload == {
        "detail": (
            "Too many password recovery attempts. "
            "Please try again later."
        )
    }
    assert int(third_headers["retry-after"]) >= 1


def test_forgot_password_rate_limits_client_identifier() -> None:
    client = "203.0.113.63"

    statuses = []

    for index in range(3):
        status, _, headers = request_json(
            "/api/v1/auth/forgot-password",
            email=(
                f"recovery-client-{index}-"
                f"{uuid4().hex}@example.com"
            ),
            forwarded_for=client,
        )
        statuses.append((status, headers))

    assert [status for status, _ in statuses] == [
        202,
        202,
        429,
    ]
    assert int(statuses[-1][1]["retry-after"]) >= 1
