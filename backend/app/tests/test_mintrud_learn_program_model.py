from __future__ import annotations

from sqlalchemy import Boolean, Integer

from app.models.mintrud_learn_program import (
    CourseMintrudLearnProgram,
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
    MintrudLearnProgram,
)


def constraint_names(table) -> set[str]:
    return {
        str(constraint.name)
        for constraint in table.constraints
        if constraint.name
    }


def test_mintrud_learn_program_model_contract() -> None:
    table = MintrudLearnProgram.__table__

    assert table.name == "mintrud_learn_programs"

    assert set(table.columns.keys()) == {
        "learn_program_id",
        "code",
        "title",
        "schema_version",
        "is_active",
        "id",
        "created_at",
        "updated_at",
    }

    assert isinstance(
        table.c.learn_program_id.type,
        Integer,
    )

    assert isinstance(
        table.c.is_active.type,
        Boolean,
    )

    assert (
        MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
        == "1.0.9"
    )

    names = constraint_names(table)

    assert (
        "uq_mintrud_learn_program_"
        "schema_version_program_id"
        in names
    )

    assert (
        "uq_mintrud_learn_program_"
        "schema_version_code"
        in names
    )

    assert (
        "ck_mintrud_learn_program_"
        "positive_program_id"
        in names
    )


def test_course_mintrud_learn_program_mapping_contract() -> None:
    table = CourseMintrudLearnProgram.__table__

    assert (
        table.name
        == "course_mintrud_learn_programs"
    )

    assert set(table.columns.keys()) == {
        "course_id",
        "mintrud_learn_program_id",
        "id",
        "created_at",
        "updated_at",
    }

    names = constraint_names(table)

    assert (
        "uq_course_mintrud_learn_program_"
        "course_program"
        in names
    )

    course_fk = next(
        iter(
            table.c.course_id.foreign_keys
        )
    )

    assert (
        course_fk.target_fullname
        == "courses.id"
    )

    assert (
        course_fk.ondelete
        == "CASCADE"
    )

    program_fk = next(
        iter(
            table.c.mintrud_learn_program_id.foreign_keys
        )
    )

    assert (
        program_fk.target_fullname
        == "mintrud_learn_programs.id"
    )

    assert (
        program_fk.ondelete
        == "RESTRICT"
    )
