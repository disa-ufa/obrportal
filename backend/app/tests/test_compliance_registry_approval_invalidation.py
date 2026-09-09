from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.compliance_registry_approval import (
    APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
)
from app.services.compliance_registry_approval_invalidation import (
    invalidate_registry_approvals_for_course,
    invalidate_registry_approvals_for_learner_profile,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


INVALIDATED_AT = datetime(
    2026,
    9,
    9,
    9,
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
        return FakeScalarResult(
            self.rows
        )


class FakeSession:
    def __init__(self, rows):
        self.rows = list(rows)
        self.execute_count = 0

    async def execute(self, statement):
        self.execute_count += 1

        assert statement is not None

        return FakeExecuteResult(
            self.rows
        )


def build_approved_obligation(
    obligation_id,
    registry,
):
    return SimpleNamespace(
        id=obligation_id,
        registry=registry,
        status=OBLIGATION_STATUS_APPROVED,
        approval_invalidated_at=None,
        approval_invalidation_reason=None,
    )


def test_unrelated_profile_change_skips_session_query():
    result = asyncio.run(
        invalidate_registry_approvals_for_learner_profile(
            None,
            user_id="user-1",
            changed_fields={
                "phone",
                "middle_name",
            },
            invalidated_at=INVALIDATED_AT,
        )
    )

    assert result == ()


def test_course_change_invalidates_all_approved_registry_rows():
    frdo = build_approved_obligation(
        "obligation-frdo",
        REGISTRY_FRDO,
    )

    mintrud = build_approved_obligation(
        "obligation-mintrud",
        REGISTRY_MINTRUD,
    )

    session = FakeSession(
        [
            frdo,
            mintrud,
        ]
    )

    result = asyncio.run(
        invalidate_registry_approvals_for_course(
            session,
            course_id="course-1",
            invalidated_at=INVALIDATED_AT,
        )
    )

    assert session.execute_count == 1

    assert [
        (
            item.obligation_id,
            item.registry,
            item.reason,
        )
        for item in result
    ] == [
        (
            "obligation-frdo",
            REGISTRY_FRDO,
            APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
        ),
        (
            "obligation-mintrud",
            REGISTRY_MINTRUD,
            APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
        ),
    ]

    assert frdo.status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )

    assert mintrud.status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )

    assert (
        frdo.approval_invalidated_at
        == INVALIDATED_AT
    )

    assert (
        mintrud.approval_invalidated_at
        == INVALIDATED_AT
    )

    assert (
        frdo.approval_invalidation_reason
        == APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED
    )

    assert (
        mintrud.approval_invalidation_reason
        == APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED
    )
