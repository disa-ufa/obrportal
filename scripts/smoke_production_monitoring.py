from __future__ import annotations

import json
import ssl
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "https://portal.rcdo02.ru"
TIMEOUT_SECONDS = 10


@dataclass(frozen=True)
class HttpResult:
    url: str
    status: int
    body: str
    content_type: str


def fetch(path: str, *, method: str = "GET") -> HttpResult:
    url = f"{BASE_URL}{path}"
    request = Request(
        url,
        method=method,
        headers={
            "User-Agent": "ObrPortal-production-monitoring-smoke/1.0",
            "Accept": "application/json,text/html,*/*",
        },
    )

    context = ssl.create_default_context()

    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS, context=context) as response:
            body = response.read(20_000).decode("utf-8", errors="replace")
            content_type = response.headers.get("content-type", "")
            return HttpResult(
                url=url,
                status=int(response.status),
                body=body,
                content_type=content_type,
            )
    except HTTPError as exc:
        body = exc.read(20_000).decode("utf-8", errors="replace")
        content_type = exc.headers.get("content-type", "")
        return HttpResult(
            url=url,
            status=int(exc.code),
            body=body,
            content_type=content_type,
        )
    except URLError as exc:
        raise RuntimeError(f"request failed for {url}: {exc}") from exc


def expect_status(result: HttpResult, expected: int) -> None:
    if result.status != expected:
        raise AssertionError(
            f"unexpected status for {result.url}: expected {expected}, got {result.status}"
        )


def parse_json(result: HttpResult) -> dict[str, Any]:
    try:
        data = json.loads(result.body)
    except json.JSONDecodeError as exc:
        raise AssertionError(f"invalid JSON from {result.url}: {exc}") from exc

    if not isinstance(data, dict):
        raise AssertionError(f"expected JSON object from {result.url}, got {type(data).__name__}")

    return data


def check_frontend_route(path: str) -> None:
    result = fetch(path)
    expect_status(result, 200)

    body_lower = result.body.lower()
    if "<html" not in body_lower and "<!doctype html" not in body_lower:
        raise AssertionError(f"frontend route {result.url} did not return HTML-like body")

    print(f"[ok] frontend route {path} -> {result.status}")


def check_health() -> None:
    result = fetch("/health")
    expect_status(result, 200)
    data = parse_json(result)

    expected = {
        "status": "ok",
        "app": "ObrPortal",
        "version": "0.1.0-stage6",
    }

    for key, value in expected.items():
        if data.get(key) != value:
            raise AssertionError(
                f"unexpected /health field {key}: expected {value!r}, got {data.get(key)!r}"
            )

    print("[ok] backend health /health -> 200")


def check_ready() -> None:
    result = fetch("/api/v1/ready")
    expect_status(result, 200)
    data = parse_json(result)

    expected = {
        "status": "ok",
        "database": "ok",
        "redis": "ok",
        "storage": "ok",
    }

    for key, value in expected.items():
        if data.get(key) != value:
            raise AssertionError(
                f"unexpected /api/v1/ready field {key}: expected {value!r}, got {data.get(key)!r}"
            )

    print("[ok] backend readiness /api/v1/ready -> 200")


def main() -> None:
    print("production monitoring smoke started")
    print(f"base_url={BASE_URL}")

    for route in ["/", "/login", "/admin", "/catalog"]:
        check_frontend_route(route)

    check_health()
    check_ready()

    print("production monitoring smoke passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("production monitoring smoke failed")
        print(str(exc))
        sys.exit(1)
