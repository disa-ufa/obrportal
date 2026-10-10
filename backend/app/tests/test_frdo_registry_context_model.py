from __future__ import annotations

from sqlalchemy import (
    CheckConstraint,
    Date,
    JSON,
    String,
    UniqueConstraint,
)

import app.db.base  # noqa: F401
from app.models.base import Base
from app.models.document_record import DocumentRecord
from app.models.frdo_registry_context import (
    FrdoRegistryContext,
)


def test_frdo_registry_context_model_contract() -> None:
    assert (
        FrdoRegistryContext.__tablename__
        == "frdo_registry_contexts"
    )

    table = FrdoRegistryContext.__table__

    expected_columns = {
        "id",
        "obligation_id",
        "document_status",
        "loss_confirmation",
        "exchange_confirmation",
        "destruction_confirmation",
        "study_form",
        "funding_source",
        "education_delivery_form",
        "po_document_type",
        "po_program_type",
        "po_profession",
        "po_qualification",
        "dpo_professional_activity_area",
        "dpo_enlarged_specialty_group",
        "dpo_qualification",
        "prior_education_snapshot_json",
        "original_document_snapshot_json",
        "created_at",
        "updated_at",
    }

    assert (
        set(table.columns.keys())
        == expected_columns
    )

    obligation = table.columns.obligation_id

    assert obligation.nullable is False
    assert obligation.index is True

    foreign_keys = list(
        obligation.foreign_keys
    )

    assert len(foreign_keys) == 1

    foreign_key = foreign_keys[0]

    assert (
        foreign_key.target_fullname
        == "registry_obligations.id"
    )

    assert foreign_key.ondelete == "CASCADE"


def test_frdo_registry_context_is_one_to_one_per_obligation() -> None:
    table = FrdoRegistryContext.__table__

    unique_constraints = {
        constraint.name: {
            column.name
            for column in constraint.columns
        }
        for constraint in table.constraints
        if isinstance(
            constraint,
            UniqueConstraint,
        )
    }

    assert (
        unique_constraints[
            "uq_frdo_registry_context_obligation_id"
        ]
        == {
            "obligation_id",
        }
    )


def test_frdo_context_keeps_versioned_classifiers_out_of_db_checks() -> None:
    table = FrdoRegistryContext.__table__

    checks = [
        constraint
        for constraint in table.constraints
        if isinstance(
            constraint,
            CheckConstraint,
        )
    ]

    assert checks == []


def test_frdo_snapshot_columns_are_nullable_json() -> None:
    table = FrdoRegistryContext.__table__

    for name in {
        "prior_education_snapshot_json",
        "original_document_snapshot_json",
    }:
        column = table.columns[name]

        assert column.nullable is True
        assert isinstance(
            column.type,
            JSON,
        )


def test_frdo_context_is_registered_in_base_metadata() -> None:
    assert (
        "frdo_registry_contexts"
        in Base.metadata.tables
    )

    assert (
        Base.metadata.tables[
            "frdo_registry_contexts"
        ]
        is FrdoRegistryContext.__table__
    )


def test_frdo_context_does_not_duplicate_canonical_data() -> None:
    columns = set(
        FrdoRegistryContext
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
        "birth_date",
        "sex",
        "snils",
        "citizenship_country_code",
        "course_id",
        "course_title",
        "program_name",
        "training_start_year",
        "training_end_year",
        "document_number",
        "document_series",
        "issued_at",
        "registration_number",
        "enrollment_id",
    }

    assert not (
        columns
        & forbidden_duplicates
    )


def test_document_record_frdo_legal_fields_contract() -> None:
    table = DocumentRecord.__table__

    series = table.columns.document_series
    issued_at = table.columns.issued_at
    registration = (
        table.columns.registration_number
    )

    assert series.nullable is True
    assert isinstance(
        series.type,
        String,
    )
    assert series.type.length == 32

    assert issued_at.nullable is True
    assert isinstance(
        issued_at.type,
        Date,
    )

    assert registration.nullable is True
    assert isinstance(
        registration.type,
        String,
    )
    assert registration.type.length == 128


def test_document_generated_at_remains_separate_from_issue_date() -> None:
    table = DocumentRecord.__table__

    assert "generated_at" in table.columns
    assert "issued_at" in table.columns

    assert (
        table.columns.generated_at
        is not table.columns.issued_at
    )
