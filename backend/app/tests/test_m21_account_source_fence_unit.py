
from __future__ import annotations

import asyncio
from contextlib import nullcontext
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

import app.api.v1.account as account_api
from app.services.registry_action_lockset import RegistryActionLockError


def make_context(
    monkeypatch,
    *,
    scope_error=None,
    lookup_error=None,
    refresh_error=None,
    change_owner=False,
):
    events = []

    actor = SimpleNamespace(id=uuid4())

    enrollment = SimpleNamespace(
        id=uuid4(),
        user_id=actor.id,
        course_id=uuid4(),
    )

    class FakeSession:
        def __init__(self):
            self.no_autoflush = nullcontext()

        async def refresh(self, entity, *, with_for_update=False):
            events.append("refresh")

            assert entity is enrollment
            assert with_for_update is True

            if refresh_error is not None:
                raise refresh_error

            if change_owner:
                entity.user_id = uuid4()

        async def rollback(self):
            events.append("rollback")

        async def commit(self):
            events.append("commit")

    session = FakeSession()

    async def fake_lookup(
        enrollment_id,
        current_user,
        session,
        *,
        for_update=False,
    ):
        events.append("lookup")

        assert enrollment_id == str(enrollment.id)
        assert current_user is actor
        assert for_update is False

        if lookup_error is not None:
            raise lookup_error

        return enrollment

    async def fake_scope(*, session, roots):
        events.append("scope")

        assert len(roots) == 1
        assert roots[0].kind == "enrollment"
        assert roots[0].resource_id == str(enrollment.id)

        if scope_error is not None:
            raise scope_error

        return (), None

    monkeypatch.setattr(
        account_api,
        "get_account_enrollment_entity_or_404",
        fake_lookup,
    )

    monkeypatch.setattr(
        account_api,
        "acquire_discovered_registry_source_write_scope",
        fake_scope,
    )

    return actor, enrollment, session, events


def run_transaction(actor, enrollment, session, body=None):
    async def scenario():
        async with account_api._account_registry_source_write_transaction(
            enrollment_id=str(enrollment.id),
            current_user=actor,
            session=session,
        ) as locked_enrollment:
            assert locked_enrollment is enrollment

            if body is not None:
                await body()

    return scenario()


def test_source_scope_precedes_row_lock_and_does_not_commit(monkeypatch):
    actor, enrollment, session, events = make_context(monkeypatch)

    async def body():
        events.append("body")

    asyncio.run(
        run_transaction(actor, enrollment, session, body)
    )

    assert events == [
        "lookup",
        "scope",
        "refresh",
        "body",
    ]


def test_registry_lock_error_rolls_back_and_returns_409(monkeypatch):
    actor, enrollment, session, events = make_context(
        monkeypatch,
        scope_error=RegistryActionLockError(
            "registry.test_source_lock"
        ),
    )

    with pytest.raises(HTTPException) as captured:
        asyncio.run(run_transaction(actor, enrollment, session))

    assert captured.value.status_code == 409

    assert "registry.test_source_lock" in str(
        captured.value.detail
    )

    assert events == [
        "lookup",
        "scope",
        "rollback",
    ]


def test_cancel_during_lock_acquisition_rolls_back(monkeypatch):
    actor, enrollment, session, events = make_context(
        monkeypatch,
        scope_error=asyncio.CancelledError(),
    )

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(run_transaction(actor, enrollment, session))

    assert events == [
        "lookup",
        "scope",
        "rollback",
    ]


def test_changed_enrollment_owner_is_rejected_after_refresh(monkeypatch):
    actor, enrollment, session, events = make_context(
        monkeypatch,
        change_owner=True,
    )

    with pytest.raises(HTTPException) as captured:
        asyncio.run(run_transaction(actor, enrollment, session))

    assert captured.value.status_code == 404

    assert events == [
        "lookup",
        "scope",
        "refresh",
        "rollback",
    ]


def test_initial_lookup_404_rolls_back(monkeypatch):
    actor, enrollment, session, events = make_context(
        monkeypatch,
        lookup_error=HTTPException(
            status_code=404,
            detail="Enrollment not found",
        ),
    )

    with pytest.raises(HTTPException) as captured:
        asyncio.run(run_transaction(actor, enrollment, session))

    assert captured.value.status_code == 404

    assert events == [
        "lookup",
        "rollback",
    ]


def test_integrity_error_after_scope_rolls_back_and_propagates(
    monkeypatch,
):
    actor, enrollment, session, events = make_context(monkeypatch)

    async def body():
        events.append("body")

        raise IntegrityError(
            "INSERT INTO lesson_progress",
            (),
            RuntimeError("simulated constraint violation"),
        )

    with pytest.raises(IntegrityError):
        asyncio.run(
            run_transaction(actor, enrollment, session, body)
        )

    assert events == [
        "lookup",
        "scope",
        "refresh",
        "body",
        "rollback",
    ]


def test_cancellation_after_scope_rolls_back_and_propagates(
    monkeypatch,
):
    actor, enrollment, session, events = make_context(monkeypatch)

    async def body():
        events.append("body")
        raise asyncio.CancelledError()

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(
            run_transaction(actor, enrollment, session, body)
        )

    assert events == [
        "lookup",
        "scope",
        "refresh",
        "body",
        "rollback",
    ]


def test_unexpected_scope_failure_rolls_back_without_row_lock(
    monkeypatch,
):
    actor, enrollment, session, events = make_context(
        monkeypatch,
        scope_error=RuntimeError("unexpected scope failure"),
    )

    with pytest.raises(
        RuntimeError,
        match="unexpected scope failure",
    ):
        asyncio.run(run_transaction(actor, enrollment, session))

    assert events == [
        "lookup",
        "scope",
        "rollback",
    ]


def test_refresh_failure_rolls_back_without_entering_body(monkeypatch):
    actor, enrollment, session, events = make_context(
        monkeypatch,
        refresh_error=RuntimeError("refresh failed"),
    )

    with pytest.raises(RuntimeError, match="refresh failed"):
        asyncio.run(run_transaction(actor, enrollment, session))

    assert events == [
        "lookup",
        "scope",
        "refresh",
        "rollback",
    ]
