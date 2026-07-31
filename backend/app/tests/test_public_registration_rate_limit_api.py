import json
import os
import urllib.error
import urllib.request
from uuid import uuid4


BASE_URL = os.getenv(
    "TEST_BASE_URL",
    "http://127.0.0.1:8000",
).rstrip("/")

RATE_LIMIT_DETAIL = (
    "Too many registration attempts. "
    "Please try again later."
)


def registration_payload(email: str) -> dict:
    return {
        "last_name": "Rate",
        "first_name": "Limit",
        "middle_name": None,
        "email": email,
        "phone": None,
        "personal_data_consent": True,
        "terms_accepted": True,
    }


def post_registration(
    *,
    email: str,
    forwarded_for: str,
) -> tuple[int, dict, dict[str, str]]:
    request = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/register",
        data=json.dumps(
            registration_payload(email)
        ).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Forwarded-For": forwarded_for,
        },
        method="POST",
    )

    try:
        response = urllib.request.urlopen(
            request,
            timeout=10,
        )
    except urllib.error.HTTPError as error:
        payload = json.loads(
            error.read().decode("utf-8")
        )
        headers = {
            key.lower(): value
            for key, value in error.headers.items()
        }
        return error.code, payload, headers

    with response:
        payload = json.load(response)
        headers = {
            key.lower(): value
            for key, value in response.headers.items()
        }
        return response.status, payload, headers


def assert_neutral_accepted(
    status_code: int,
    payload: dict,
) -> None:
    assert status_code == 202
    assert payload["status"] == "accepted"
    assert "message" in payload
    assert "access_token" not in payload
    assert "user_id" not in payload


def test_public_registration_rate_limit_keeps_success_neutral() -> None:
    suffix = uuid4().hex
    status_code, payload, _ = post_registration(
        email=f"rate-ok-{suffix}@example.test",
        forwarded_for=f"2001:db8:1::{suffix[:4]}",
    )

    assert_neutral_accepted(status_code, payload)


def test_public_registration_rate_limits_normalized_email() -> None:
    from app.core.config import settings

    suffix = uuid4().hex
    email = f"rate-email-{suffix}@example.test"
    limit = settings.public_registration_rate_limit_email_max_attempts
    assert limit >= 1

    email_variants = [email.upper(), f"  {email}  "]
    accepted_results = []

    for index in range(limit):
        candidate = (
            email_variants[index]
            if index < len(email_variants)
            else email
        )
        accepted_results.append(
            post_registration(
                email=candidate,
                forwarded_for=(
                    f"2001:db8:2:{index + 1}::{suffix[:4]}"
                ),
            )
        )

    for status_code, payload, _ in accepted_results:
        assert_neutral_accepted(status_code, payload)

    status_code, payload, headers = post_registration(
        email=email,
        forwarded_for=f"2001:db8:2:ffff::{suffix[:4]}",
    )

    assert status_code == 429
    assert payload == {"detail": RATE_LIMIT_DETAIL}
    assert int(headers["retry-after"]) >= 1
    assert email not in json.dumps(payload)


def test_public_registration_rate_limits_client_identifier() -> None:
    from app.core.config import settings

    suffix = uuid4().hex
    forwarded_for = f"2001:db8:5::{suffix[:4]}"
    limit = settings.public_registration_rate_limit_client_max_attempts
    assert limit >= 1

    accepted_results = []

    for index in range(limit):
        accepted_results.append(
            post_registration(
                email=(
                    f"rate-client-{index}-{suffix}"
                    "@example.test"
                ),
                forwarded_for=forwarded_for,
            )
        )

    for status_code, payload, _ in accepted_results:
        assert_neutral_accepted(status_code, payload)

    blocked_email = f"rate-client-blocked-{suffix}@example.test"
    status_code, payload, headers = post_registration(
        email=blocked_email,
        forwarded_for=forwarded_for,
    )

    assert status_code == 429
    assert payload == {"detail": RATE_LIMIT_DETAIL}
    assert int(headers["retry-after"]) >= 1
    assert blocked_email not in json.dumps(payload)
    assert forwarded_for not in json.dumps(payload)
