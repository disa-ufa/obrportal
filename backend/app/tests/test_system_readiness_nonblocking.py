"""Non-blocking FastAPI readiness regression tests.

No real PostgreSQL, Redis or S3 connections are made.
"""

from __future__ import annotations

import asyncio
import threading
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1 import system
from app.main import app


class FakeConnection:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, statement):
        return 1


class FakeEngine:
    def connect(self):
        return FakeConnection()


class FakeRedis:
    async def ping(self):
        return True

    async def aclose(self):
        return None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "storage_fails",
    [False, True],
    ids=["s3_available", "s3_unavailable"],
)
async def test_readiness_s3_does_not_block_event_loop(
    monkeypatch,
    storage_fails,
):
    entered = threading.Event()
    release = threading.Event()
    observed = {}

    event_loop_thread = threading.get_ident()

    class FakeS3:
        def list_buckets(self):
            observed["worker_thread"] = threading.get_ident()
            entered.set()

            if not release.wait(timeout=8.0):
                raise TimeoutError("S3 test was not released")

            if storage_fails:
                raise ConnectionError("Simulated S3 failure")

            return {"Buckets": []}

    def fake_boto3_client(service_name, **kwargs):
        assert service_name == "s3"
        observed["config"] = kwargs["config"]
        return FakeS3()

    monkeypatch.setattr(system, "engine", FakeEngine())

    monkeypatch.setattr(
        system,
        "redis",
        SimpleNamespace(
            from_url=lambda *args, **kwargs: FakeRedis()
        ),
    )

    monkeypatch.setattr(
        system,
        "boto3",
        SimpleNamespace(client=fake_boto3_client),
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        timeout=10.0,
    ) as client:
        ready_task = asyncio.create_task(
            client.get("/api/v1/ready")
        )

        try:
            started = await asyncio.wait_for(
                asyncio.to_thread(entered.wait, 3.0),
                timeout=4.0,
            )

            assert started, "S3 test operation did not start"
            assert not ready_task.done(), (
                "Readiness finished before concurrent check"
            )

            health = await asyncio.wait_for(
                client.get("/health"),
                timeout=2.0,
            )

            assert health.status_code == 200
            assert health.json()["status"] == "ok"

            # S3 remains blocked until the finally block.
            assert not ready_task.done()

            # A blocking S3 call must execute on a worker thread.
            assert observed["worker_thread"] != event_loop_thread

            config = observed["config"]

            assert config.connect_timeout == 3
            assert config.read_timeout == 3
            assert config.retries["total_max_attempts"] == 1

        finally:
            release.set()

        response = await asyncio.wait_for(
            ready_task,
            timeout=10.0,
        )

    assert response.status_code == 200

    payload = response.json()

    assert payload["database"] == "ok"
    assert payload["redis"] == "ok"

    if storage_fails:
        assert payload["status"] == "degraded"
        assert payload["storage"] == "error: ConnectionError"
    else:
        assert payload["status"] == "ok"
        assert payload["storage"] == "ok"
