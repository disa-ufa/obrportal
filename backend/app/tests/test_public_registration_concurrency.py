from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.api.v1 import auth as auth_api


class FakeSession:
    def __init__(
        self,
        *,
        fail_first_commit: bool = False,
    ) -> None:
        self.fail_first_commit = fail_first_commit
        self.commit_calls = 0
        self.rollback_calls = 0

    async def commit(self) -> None:
        self.commit_calls += 1

        if (
            self.fail_first_commit
            and self.commit_calls == 1
        ):
            raise IntegrityError(
                "COMMIT",
                {},
                RuntimeError("duplicate key"),
            )

    async def rollback(self) -> None:
        self.rollback_calls += 1


def registration_data() -> SimpleNamespace:
    return SimpleNamespace(
        email="race@example.test",
    )


def prepared_registration() -> SimpleNamespace:
    return SimpleNamespace(
        outcome="user_created",
        user=SimpleNamespace(id="user-1"),
    )


@pytest.mark.asyncio
async def test_registration_transaction_commits_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession()
    audit_calls: list[dict] = []
    prepared = prepared_registration()

    async def fake_prepare(session_arg, *, data):
        assert session_arg is session
        assert data.email == "race@example.test"
        return prepared

    async def fake_audit(session_arg, **kwargs):
        assert session_arg is session
        audit_calls.append(kwargs)

    monkeypatch.setattr(
        auth_api,
        "prepare_public_registration",
        fake_prepare,
    )
    monkeypatch.setattr(
        auth_api,
        "write_audit_event",
        fake_audit,
    )

    result = (
        await auth_api
        ._prepare_public_registration_transaction(
            session,
            data=registration_data(),
            request=object(),
        )
    )

    assert result is prepared
    assert session.commit_calls == 1
    assert session.rollback_calls == 0
    assert [
        call["action"]
        for call in audit_calls
    ] == [
        "public_registration.requested",
        "public_registration.user_created",
    ]


@pytest.mark.asyncio
async def test_registration_transaction_neutralizes_flush_race(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession()
    audit_calls: list[dict] = []

    async def fake_prepare(session_arg, *, data):
        assert session_arg is session
        raise IntegrityError(
            "INSERT INTO users",
            {},
            RuntimeError("duplicate key"),
        )

    async def fake_audit(session_arg, **kwargs):
        assert session_arg is session
        audit_calls.append(kwargs)

    monkeypatch.setattr(
        auth_api,
        "prepare_public_registration",
        fake_prepare,
    )
    monkeypatch.setattr(
        auth_api,
        "write_audit_event",
        fake_audit,
    )

    result = (
        await auth_api
        ._prepare_public_registration_transaction(
            session,
            data=registration_data(),
            request=object(),
        )
    )

    assert result is None
    assert session.rollback_calls == 1
    assert session.commit_calls == 1
    assert audit_calls[-1]["action"] == (
        "public_registration.identity_conflict"
    )
    assert audit_calls[-1]["payload"] == {
        "email": "race@example.test",
        "reason": "concurrent_integrity_conflict",
    }


@pytest.mark.asyncio
async def test_registration_transaction_neutralizes_commit_race(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession(
        fail_first_commit=True,
    )
    audit_calls: list[dict] = []
    prepared = prepared_registration()

    async def fake_prepare(session_arg, *, data):
        assert session_arg is session
        return prepared

    async def fake_audit(session_arg, **kwargs):
        assert session_arg is session
        audit_calls.append(kwargs)

    monkeypatch.setattr(
        auth_api,
        "prepare_public_registration",
        fake_prepare,
    )
    monkeypatch.setattr(
        auth_api,
        "write_audit_event",
        fake_audit,
    )

    result = (
        await auth_api
        ._prepare_public_registration_transaction(
            session,
            data=registration_data(),
            request=object(),
        )
    )

    assert result is None
    assert session.rollback_calls == 1
    assert session.commit_calls == 2
    assert audit_calls[-1]["action"] == (
        "public_registration.identity_conflict"
    )
    assert audit_calls[-1]["payload"]["reason"] == (
        "concurrent_integrity_conflict"
    )
