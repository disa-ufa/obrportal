from __future__ import annotations

import sys
from urllib.parse import urlencode

import requests


BASE_URL = "http://127.0.0.1:8000"


def assert_status(response: requests.Response, expected: int, label: str) -> None:
    if response.status_code != expected:
        raise AssertionError(
            f"{label}: expected {expected}, got {response.status_code}, body={response.text}"
        )


def main() -> int:
    not_found = requests.get(
        f"{BASE_URL}/api/v1/public/documents/verify?{urlencode({'number': 'DOC-NOT-FOUND'})}",
        timeout=20,
    )
    assert_status(not_found, 404, "public verify not found")

    print("Smoke public verify API passed:")
    print(" - public verify not found returns 404")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())