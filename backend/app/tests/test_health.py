from __future__ import annotations

import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")


def request_json(path: str) -> tuple[int, dict | None]:
    request = Request(
        url=f"{BASE_URL}{path}",
        headers={"Accept": "application/json"},
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return response.status, payload
    except HTTPError as error:
        raw = error.read().decode("utf-8")
        payload = json.loads(raw) if raw else None
        return error.code, payload


def test_health_endpoint_is_ok() -> None:
    status, payload = request_json("/health")

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["status"] == "ok"
    assert payload["app"] == "ObrPortal"


def test_ready_endpoint_is_ok() -> None:
    status, payload = request_json("/api/v1/ready")

    assert status == 200
    assert isinstance(payload, dict)
    assert payload["status"] == "ok"
    assert payload["database"] == "ok"
    assert payload["redis"] == "ok"
    assert payload["storage"] == "ok"
