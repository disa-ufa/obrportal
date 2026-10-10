
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from pydantic import ValidationError

import app.api.v1.admin as admin
from app.schemas.admin import (
    AdminFrdoSubmissionBatchCreate,
)


def make_batch():
    now = datetime.now(timezone.utc)

    return SimpleNamespace(
        id="00000000-0000-4000-8000-000000000001",
        registry="frdo",
        status="exported",
        artifact_kind="portal-upload-artifact",
        transport="file",
        schema_version="frdo-po-working-reference-v1",
        obligation_count=2,
        record_count=2,
        artifact_path="generated/registry/frdo/batches/test.xlsx",
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


class FakeSession:
    def __init__(self, commit_failure=None):
        self.commit_failure = commit_failure
        self.commits = 0
        self.rollbacks = 0

    async def commit(self):
        self.commits += 1

        if self.commit_failure is not None:
            raise self.commit_failure

    async def rollback(self):
        self.rollbacks += 1


def setup_service(monkeypatch, batch, *, audit_failure=None):
    events = []

    async def fake_service(session, *, obligation_ids, generated_by_user_id):
        events.append(
            ("service", list(obligation_ids), generated_by_user_id)
        )
        return batch

    async def fake_audit(session, **kwargs):
        events.append(("audit", kwargs))

        if audit_failure is not None:
            raise audit_failure

    monkeypatch.setattr(
        admin,
        "create_frdo_registry_submission_batch",
        fake_service,
    )

    monkeypatch.setattr(
        admin,
        "create_admin_audit_event",
        fake_audit,
    )

    return events


def call_endpoint(session):
    return asyncio.run(
        admin.prepare_admin_frdo_submission_batch(
            payload=AdminFrdoSubmissionBatchCreate(
                obligation_ids=[
                    "obligation-2",
                    "obligation-1",
                ]
            ),
            request=object(),
            current_user=SimpleNamespace(id="actor-id"),
            session=session,
        )
    )


def test_frdo_batch_create_route_registered():
    matches = [
        route
        for route in admin.router.routes
        if isinstance(route, APIRoute)
        and route.path == "/admin/frdo/batches"
        and "POST" in route.methods
    ]

    assert len(matches) == 1
    assert matches[0].status_code == 201


def test_frdo_batch_create_input_limits():
    with pytest.raises(ValidationError):
        AdminFrdoSubmissionBatchCreate(
            obligation_ids=[]
        )

    with pytest.raises(ValidationError):
        AdminFrdoSubmissionBatchCreate(
            obligation_ids=["id"] * 1002
        )

    valid = AdminFrdoSubmissionBatchCreate(
        obligation_ids=["id"] * 1001
    )

    assert len(valid.obligation_ids) == 1001


def test_frdo_batch_create_success_and_audit(monkeypatch):
    batch = make_batch()
    events = setup_service(monkeypatch, batch)
    session = FakeSession()

    response = call_endpoint(session)

    assert response.id == batch.id
    assert response.registry == "frdo"
    assert response.status == "exported"
    assert response.record_count == 2
    assert response.has_artifact is True

    assert session.commits == 1
    assert session.rollbacks == 0

    assert events[0] == (
        "service",
        ["obligation-2", "obligation-1"],
        "actor-id",
    )

    assert events[1][0] == "audit"
    assert events[1][1]["action"] == (
        "admin.frdo_submission_batch_prepared"
    )
    assert events[1][1]["payload"]["external_registry_io"] is False


def test_frdo_batch_commit_failure_cleans_file(monkeypatch):
    batch = make_batch()
    setup_service(monkeypatch, batch)

    removed_paths = []

    def fake_delete(path):
        removed_paths.append(path)
        return True

    monkeypatch.setattr(
        admin,
        "delete_registry_submission_batch_artifact_safely",
        fake_delete,
    )

    session = FakeSession(
        commit_failure=RuntimeError("simulated commit failure")
    )

    with pytest.raises(
        RuntimeError,
        match="simulated commit failure",
    ):
        call_endpoint(session)

    assert session.commits == 1
    assert session.rollbacks == 1
    assert removed_paths == [batch.artifact_path]


def test_frdo_batch_audit_failure_cleans_file(monkeypatch):
    batch = make_batch()

    setup_service(
        monkeypatch,
        batch,
        audit_failure=ValueError("simulated audit failure"),
    )

    removed_paths = []

    def fake_delete(path):
        removed_paths.append(path)
        return True

    monkeypatch.setattr(
        admin,
        "delete_registry_submission_batch_artifact_safely",
        fake_delete,
    )

    session = FakeSession()

    with pytest.raises(
        ValueError,
        match="simulated audit failure",
    ):
        call_endpoint(session)

    assert session.commits == 0
    assert session.rollbacks == 1
    assert removed_paths == [batch.artifact_path]


def test_frdo_batch_service_rejection_returns_409(monkeypatch):
    async def reject(*args, **kwargs):
        raise admin.RegistrySubmissionBatchError(
            "stale approval"
        )

    monkeypatch.setattr(
        admin,
        "create_frdo_registry_submission_batch",
        reject,
    )

    session = FakeSession()

    with pytest.raises(HTTPException) as result:
        call_endpoint(session)

    assert result.value.status_code == 409
    assert "stale approval" in str(result.value.detail)
    assert session.commits == 0
    assert session.rollbacks == 1


def test_frdo_batch_cleanup_failure_is_not_silent(monkeypatch):
    batch = make_batch()
    setup_service(monkeypatch, batch)

    monkeypatch.setattr(
        admin,
        "delete_registry_submission_batch_artifact_safely",
        lambda path: False,
    )

    session = FakeSession(
        commit_failure=RuntimeError("simulated commit failure")
    )

    with pytest.raises(
        RuntimeError,
        match="cleanup could not be confirmed",
    ):
        call_endpoint(session)

    assert session.rollbacks == 1
