from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from httpx import ASGITransport, AsyncClient

import app.api.v1.admin as admin
from app.main import app


def make_batch(registry="frdo"):
    now = datetime.now(timezone.utc)

    return SimpleNamespace(
        id="00000000-0000-4000-8000-000000000001",
        registry=registry,
        status="exported",
        artifact_kind="portal-upload-artifact",
        transport="file",
        schema_version=(
            "frdo-po-working-reference-v1"
            if registry == "frdo"
            else "1.0.9"
        ),
        obligation_count=2,
        record_count=2,
        artifact_path="private/generated/frdo/test.xlsx",
        artifact_sha256="a" * 64,
        generated_by_user_id="actor-id",
        generated_at=now,
        submitted_by_user_id=None,
        submitted_at=None,
        external_reference=None,
        reconciled_by_user_id=None,
        reconciled_at=None,
        created_at=now,
        updated_at=now,
    )


def make_item(position):
    return SimpleNamespace(
        id=f"00000000-0000-4000-8000-{position + 1:012d}",
        obligation_id=f"obligation-{position}",
        position=position,
        record_count=1,
        approval_snapshot_json={
            "course": {"test_position": position}
        },
        approval_fingerprint="b" * 64,
    )


class FakeSession:
    def __init__(self, batch=None, items=None, rows=None):
        self.batch = batch
        self.items = items or []
        self.rows = rows
        self.queries = []

    def remember(self, statement):
        compiled = str(
            statement.compile(
                compile_kwargs={"literal_binds": True}
            )
        )
        self.queries.append(compiled)

    async def scalar(self, statement):
        self.remember(statement)
        return self.batch

    async def scalars(self, statement):
        self.remember(statement)
        rows = (
            self.rows
            if self.rows is not None
            else self.items
        )
        return SimpleNamespace(all=lambda: list(rows))


def test_frdo_batch_read_routes_registered():
    expected = {
        "/admin/frdo/batches",
        "/admin/frdo/batches/{batch_id}",
        "/admin/frdo/batches/{batch_id}/download",
    }

    routes = [
        route
        for route in admin.router.routes
        if isinstance(route, APIRoute)
        and "GET" in route.methods
        and route.path in expected
    ]

    assert {route.path for route in routes} == expected
    assert len(routes) == 3


def test_frdo_batch_read_list_filter_and_pagination():
    session = FakeSession(rows=[make_batch()])

    result = asyncio.run(
        admin.list_admin_frdo_submission_batches(
            limit=25,
            offset=5,
            _=None,
            session=session,
        )
    )

    assert len(result) == 1
    assert result[0].registry == "frdo"
    assert "artifact_path" not in result[0].model_dump()

    query = session.queries[0]

    assert "'frdo'" in query
    assert "ORDER BY" in query
    assert "LIMIT 25" in query
    assert "OFFSET 5" in query


def test_frdo_batch_read_detail_frozen_snapshots():
    batch = make_batch()
    items = [make_item(0), make_item(1)]
    session = FakeSession(batch=batch, items=items)

    result = asyncio.run(
        admin.get_admin_frdo_submission_batch_detail(
            batch_id=batch.id,
            _=None,
            session=session,
        )
    )

    assert result.registry == "frdo"
    assert len(result.items) == 2
    assert [item.position for item in result.items] == [0, 1]

    assert result.items[1].approval_snapshot_json == {
        "course": {"test_position": 1}
    }
    assert result.items[0].approval_fingerprint == "b" * 64

    assert "ORDER BY" in session.queries[1]
    assert "position" in session.queries[1]
    assert "artifact_path" not in result.model_dump()


def test_frdo_batch_read_detail_not_found():
    session = FakeSession(batch=None)

    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            admin.get_admin_frdo_submission_batch_detail(
                batch_id="missing",
                _=None,
                session=session,
            )
        )

    assert captured.value.status_code == 404


def test_frdo_batch_read_other_registry_is_hidden():
    session = FakeSession(batch=make_batch("mintrud"))

    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            admin.get_admin_frdo_submission_batch_detail(
                batch_id=session.batch.id,
                _=None,
                session=session,
            )
        )

    assert captured.value.status_code == 404
    assert "'frdo'" in session.queries[0]


def test_frdo_batch_read_download_xlsx(monkeypatch):
    batch = make_batch()
    session = FakeSession(batch=batch)
    content = b"PK-fake-xlsx-content"
    observed = []

    def fake_reader(value):
        observed.append(value.id)
        return content

    monkeypatch.setattr(
        admin,
        "read_registry_submission_batch_artifact",
        fake_reader,
    )

    response = asyncio.run(
        admin.download_admin_frdo_submission_batch(
            batch_id=batch.id,
            _=None,
            session=session,
        )
    )

    assert response.status_code == 200
    assert response.body == content
    assert response.media_type == (
        "application/vnd.openxmlformats-officedocument."
        "spreadsheetml.sheet"
    )
    assert "attachment;" in response.headers[
        "content-disposition"
    ]
    assert "frdo-po-batch-" in response.headers[
        "content-disposition"
    ]
    assert batch.artifact_path not in response.headers[
        "content-disposition"
    ]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert observed == [batch.id]


def test_frdo_batch_read_download_integrity_conflict(monkeypatch):
    batch = make_batch()

    def broken_reader(value):
        raise admin.RegistrySubmissionBatchError(
            "FRDO artifact digest mismatch"
        )

    monkeypatch.setattr(
        admin,
        "read_registry_submission_batch_artifact",
        broken_reader,
    )

    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            admin.download_admin_frdo_submission_batch(
                batch_id=batch.id,
                _=None,
                session=FakeSession(batch=batch),
            )
        )

    assert captured.value.status_code == 409
    assert "digest mismatch" in str(captured.value.detail)


def test_frdo_batch_read_download_not_found():
    with pytest.raises(HTTPException) as captured:
        asyncio.run(
            admin.download_admin_frdo_submission_batch(
                batch_id="missing",
                _=None,
                session=FakeSession(),
            )
        )

    assert captured.value.status_code == 404


def test_frdo_batch_read_anonymous_http_is_denied():
    async def check():
        transport = ASGITransport(
            app=app,
            raise_app_exceptions=False,
        )

        async with AsyncClient(
            transport=transport,
            base_url="http://frdo-test.local",
        ) as client:
            for path in (
                "/api/v1/admin/frdo/batches",
                "/api/v1/admin/frdo/batches/missing",
                "/api/v1/admin/frdo/batches/missing/download",
            ):
                response = await client.get(path)
                assert response.status_code == 401, (
                    path,
                    response.status_code,
                    response.text[:300],
                )

    asyncio.run(check())
