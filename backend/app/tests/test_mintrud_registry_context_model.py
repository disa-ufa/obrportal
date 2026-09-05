from __future__ import annotations

from sqlalchemy import (
    CheckConstraint,
    UniqueConstraint,
)

import app.db.base  # noqa: F401
from app.models.base import Base
from app.models.mintrud_registry_context import (
    MINTRUD_KNOWLEDGE_CHECK_RESULTS,
    MINTRUD_KNOWLEDGE_CHECK_RESULT_SATISFACTORY,
    MINTRUD_KNOWLEDGE_CHECK_RESULT_UNSATISFACTORY,
    MintrudRegistryContext,
)


def test_mintrud_registry_context_model_contract() -> None:
    assert (
        MintrudRegistryContext.__tablename__
        == "mintrud_registry_contexts"
    )

    table = (
        MintrudRegistryContext.__table__
    )

    expected_columns = {
        "id",
        "obligation_id",
        "profession_or_position",
        "employer_name",
        "employer_inn",
        "knowledge_check_result",
        "knowledge_check_date",
        "protocol_number",
        "created_at",
        "updated_at",
    }

    assert (
        set(table.columns.keys())
        == expected_columns
    )

    obligation = (
        table.columns.obligation_id
    )

    assert obligation.nullable is False
    assert obligation.index is True

    foreign_keys = list(
        obligation.foreign_keys
    )

    assert (
        len(foreign_keys)
        == 1
    )

    foreign_key = foreign_keys[0]

    assert (
        foreign_key.target_fullname
        == "registry_obligations.id"
    )

    assert (
        foreign_key.ondelete
        == "CASCADE"
    )


def test_mintrud_registry_context_is_one_to_one_per_obligation() -> None:
    table = (
        MintrudRegistryContext.__table__
    )

    unique_constraints = {
        constraint.name: {
            column.name
            for column
            in constraint.columns
        }
        for constraint
        in table.constraints
        if isinstance(
            constraint,
            UniqueConstraint,
        )
    }

    assert (
        unique_constraints[
            (
                "uq_mintrud_registry_context_"
                "obligation_id"
            )
        ]
        == {
            "obligation_id",
        }
    )


def test_mintrud_knowledge_result_contract() -> None:
    assert (
        MINTRUD_KNOWLEDGE_CHECK_RESULTS
        == {
            "satisfactory",
            "unsatisfactory",
        }
    )

    assert (
        MINTRUD_KNOWLEDGE_CHECK_RESULT_SATISFACTORY
        == "satisfactory"
    )

    assert (
        MINTRUD_KNOWLEDGE_CHECK_RESULT_UNSATISFACTORY
        == "unsatisfactory"
    )

    table = (
        MintrudRegistryContext.__table__
    )

    checks = {
        constraint.name: str(
            constraint.sqltext
        )
        for constraint
        in table.constraints
        if isinstance(
            constraint,
            CheckConstraint,
        )
    }

    expression = checks[
        (
            "ck_mintrud_registry_context_"
            "knowledge_check_result"
        )
    ]

    assert (
        "satisfactory"
        in expression
    )

    assert (
        "unsatisfactory"
        in expression
    )


def test_mintrud_context_is_registered_in_base_metadata() -> None:
    assert (
        "mintrud_registry_contexts"
        in Base.metadata.tables
    )

    assert (
        Base.metadata.tables[
            "mintrud_registry_contexts"
        ]
        is MintrudRegistryContext.__table__
    )


def test_mintrud_context_does_not_duplicate_identity_or_course_data() -> None:
    columns = set(
        MintrudRegistryContext
        .__table__
        .columns
        .keys()
    )

    forbidden_duplicates = {
        "user_id",
        "learner_id",
        "first_name",
        "last_name",
        "middle_name",
        "snils",
        "course_id",
        "course_title",
        "program_name",
        "organization_id",
        "enrollment_id",
    }

    assert not (
        columns
        & forbidden_duplicates
    )
