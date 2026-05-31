from __future__ import annotations

import json
import os
import statistics
import time
from dataclasses import dataclass
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("MEASURE_BASE_URL", os.getenv("SMOKE_BASE_URL", "http://localhost:8000")).rstrip("/")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@obrportal.local")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "Admin123Local2026!")
REQUEST_TIMEOUT = int(os.getenv("STAGE32_REQUEST_TIMEOUT", "60"))
ROUNDS = int(os.getenv("STAGE32_MEASURE_ROUNDS", "10"))

ENDPOINTS = [
    "/api/v1/admin/users",
    "/api/v1/admin/users?limit=20",
    "/api/v1/admin/users?limit=20&q=admin",
    "/api/v1/admin/audit-events",
    "/api/v1/admin/audit-events?limit=20",
    "/api/v1/admin/audit-events?limit=50",
]


@dataclass
class Measurement:
    endpoint: str
    status: int
    elapsed_ms: float


def request_json(method: str, path: str, *, body: dict | None = None, token: str | None = None) -> tuple[int, object | None]:
    headers = {"Accept": "application/json"}

    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(
        url=f"{BASE_URL}{path}",
        method=method,
        headers=headers,
        data=data,
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else None
    except HTTPError as exc:
        raw = exc.read().decode("utf-8")
        return exc.code, json.loads(raw) if raw else None


def login() -> str:
    status, payload = request_json(
        "POST",
        "/api/v1/auth/login",
        body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )

    if status != 200:
        raise AssertionError(f"admin login failed: status={status}, payload={payload}")

    if not isinstance(payload, dict) or not isinstance(payload.get("access_token"), str):
        raise AssertionError(f"admin login did not return access_token: {payload}")

    return payload["access_token"]


def measure_endpoint(endpoint: str, token: str) -> Measurement:
    started = time.perf_counter()
    status, payload = request_json("GET", endpoint, token=token)
    elapsed_ms = (time.perf_counter() - started) * 1000

    if status != 200:
        raise AssertionError(f"{endpoint} returned status={status}, payload={payload}")

    if not isinstance(payload, list):
        raise AssertionError(f"{endpoint} must return list payload, got={type(payload).__name__}")

    return Measurement(endpoint=endpoint, status=status, elapsed_ms=elapsed_ms)


def summarize(endpoint: str, values: list[float]) -> str:
    return (
        f"{endpoint}: "
        f"count={len(values)}, "
        f"min_ms={min(values):.2f}, "
        f"median_ms={statistics.median(values):.2f}, "
        f"max_ms={max(values):.2f}, "
        f"avg_ms={statistics.mean(values):.2f}"
    )


def main() -> int:
    token = login()
    results: dict[str, list[float]] = {endpoint: [] for endpoint in ENDPOINTS}

    for round_index in range(1, ROUNDS + 1):
        print(f"stage32 admin endpoint measurement round {round_index}/{ROUNDS}")
        for endpoint in ENDPOINTS:
            measurement = measure_endpoint(endpoint, token)
            results[endpoint].append(measurement.elapsed_ms)
            print(f" - {endpoint} -> {measurement.status} in {measurement.elapsed_ms:.2f} ms")

    print("Stage 32 admin endpoint stability measurement summary:")
    for endpoint, values in results.items():
        print(" - " + summarize(endpoint, values))

    print(
        "stage32 admin endpoint stability measurements passed: "
        f"endpoints={len(ENDPOINTS)}, "
        f"rounds={ROUNDS}, "
        "timeouts=0, "
        "failures=0"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
