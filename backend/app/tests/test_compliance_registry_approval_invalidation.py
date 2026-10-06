from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.compliance_registry_approval import (
    APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
    APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED,
)
from app.services.compliance_registry_approval_invalidation import (
    FRDO_EXTENDED_APPROVAL_PROGRAM_TYPES,
    _learner_profile_change_scope,
    _learner_profile_registry_condition,
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
                "email",
            },
            invalidated_at=INVALIDATED_AT,
        )
    )

    assert result == ()


def test_middle_name_change_invalidates_mintrud_approval():
    mintrud = build_approved_obligation(
        "obligation-mintrud",
        REGISTRY_MINTRUD,
    )

    session = FakeSession(
        [
            mintrud,
        ]
    )

    result = asyncio.run(
        invalidate_registry_approvals_for_learner_profile(
            session,
            user_id="user-1",
            changed_fields={
                "middle_name",
            },
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
            "obligation-mintrud",
            REGISTRY_MINTRUD,
            APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED,
        ),
    ]

    assert mintrud.status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )

    assert (
        mintrud.approval_invalidated_at
        == INVALIDATED_AT
    )

    assert (
        mintrud.approval_invalidation_reason
        == APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED
    )


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



def test_middle_name_change_scope_adds_contextual_frdo() -> None:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        {
            "middle_name",
        }
    )

    assert registries == (
        REGISTRY_MINTRUD,
    )

    assert include_extended_frdo is True


def test_snils_change_scope_adds_contextual_frdo() -> None:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        {
            "snils",
        }
    )

    assert registries == (
        REGISTRY_MINTRUD,
    )

    assert include_extended_frdo is True


def test_birth_date_change_keeps_normal_frdo_scope() -> None:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        {
            "birth_date",
        }
    )

    assert registries == (
        REGISTRY_FRDO,
    )

    assert include_extended_frdo is False


def test_unrelated_change_has_no_invalidation_scope() -> None:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        {
            "phone",
        }
    )

    assert registries == ()
    assert include_extended_frdo is False


def test_contextual_frdo_program_types_are_exact() -> None:
    assert (
        FRDO_EXTENDED_APPROVAL_PROGRAM_TYPES
        == {
            "vocational_training",
        }
    )


def test_contextual_registry_condition_is_created_for_middle_name() -> None:
    (
        registries,
        include_extended_frdo,
    ) = _learner_profile_change_scope(
        {
            "middle_name",
        }
    )

    condition = (
        _learner_profile_registry_condition(
            registries=registries,
            include_extended_frdo=(
                include_extended_frdo
            ),
        )
    )

    assert condition is not None

    compiled = condition.compile()

    values = list(
        compiled.params.values()
    )

    flattened = set()

    for value in values:
        if isinstance(
            value,
            (
                tuple,
                list,
                set,
                frozenset,
            ),
        ):
            flattened.update(
                str(item)
                for item in value
            )
        else:
            flattened.add(
                str(value)
            )

    assert "mintrud" in flattened
    assert "vocational_training" in flattened

    assert (
        "dpo_advanced_training"
        not in flattened
    )

    assert (
        "dpo_professional_retraining"
        not in flattened
    )
