from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.compliance_registry_approval import (
    APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED,
    APPROVAL_INVALIDATION_REASONS,
)
from app.services.compliance_registry_approval_invalidation import (
    invalidate_mintrud_registry_approvals_for_course,
    lock_mintrud_registry_approvals_for_course,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    REGISTRY_MINTRUD,
)


INVALIDATED_AT = datetime(
    2026,
    9,
    17,
    12,
    0,
    tzinfo=timezone.utc,
)


class FakeScalarResult:
    def __init__(self, rows):
        self.rows = list(rows)

    def all(self):
        return list(self.rows)


class FakeExecuteResult:
    def __init__(self, rows):
        self.rows = list(rows)

    def scalars(self):
        return FakeScalarResult(self.rows)


class FakeNoAutoflush:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, traceback):
        return False


class FakeSession:
    def __init__(self, rows):
        self.rows = list(rows)
        self.statement = None
        self.no_autoflush = FakeNoAutoflush()

    async def execute(self, statement):
        self.statement = statement
        return FakeExecuteResult(self.rows)


def obligation(obligation_id):
    return SimpleNamespace(
        id=obligation_id,
        registry=REGISTRY_MINTRUD,
        status=OBLIGATION_STATUS_APPROVED,
        approval_snapshot_json={"registry": REGISTRY_MINTRUD},
        approval_fingerprint="fingerprint",
        approved_by_user_id="user-1",
        approved_at=INVALIDATED_AT,
        approval_invalidated_at=None,
        approval_invalidation_reason=None,
    )


def assert_query_is_mintrud_only(statement):
    compiled = statement.compile()
    values = list(compiled.params.values())

    assert REGISTRY_MINTRUD in values
    assert "registry_obligations.registry" in str(statement)


def test_program_change_reason_is_registered():
    assert (
        APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED
        == "mintrud_programs_changed"
    )
    assert (
        APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED
        in APPROVAL_INVALIDATION_REASONS
    )


def test_program_change_invalidates_mintrud_approval():
    row = obligation("obligation-mintrud")
    session = FakeSession([row])

    result = asyncio.run(
        invalidate_mintrud_registry_approvals_for_course(
            session,
            course_id="course-1",
            invalidated_at=INVALIDATED_AT,
        )
    )

    assert len(result) == 1
    assert result[0].obligation_id == "obligation-mintrud"
    assert result[0].registry == REGISTRY_MINTRUD
    assert (
        result[0].reason
        == APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED
    )

    assert row.status == OBLIGATION_STATUS_NEEDS_APPROVAL
    assert (
        row.approval_invalidation_reason
        == APPROVAL_INVALIDATION_MINTRUD_PROGRAMS_CHANGED
    )
    assert row.approval_invalidated_at == INVALIDATED_AT

    assert_query_is_mintrud_only(session.statement)


def test_program_change_lock_is_mintrud_only():
    row = obligation("obligation-mintrud")
    session = FakeSession([row])

    locked = asyncio.run(
        lock_mintrud_registry_approvals_for_course(
            session,
            course_id="course-1",
        )
    )

    assert locked == ("obligation-mintrud",)
    assert_query_is_mintrud_only(session.statement)
