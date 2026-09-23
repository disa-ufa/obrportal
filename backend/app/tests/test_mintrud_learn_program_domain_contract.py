from pathlib import Path

from sqlalchemy import CheckConstraint

from app.models.mintrud_learn_program import (
    MintrudLearnProgram,
)


EXPECTED_IDS = (
    1, 2, 3, 4, 6, 7, 8, 9, 10, 11,
    12, 13, 14, 15, 16, 17, 18, 19,
    20, 21, 22, 23, 24, 25, 26, 27,
    28, 29,
)


def test_model_has_version_scoped_v109_domain_constraint():
    constraints = {
        constraint.name: str(
            constraint.sqltext
        )
        for constraint
        in MintrudLearnProgram.__table__.constraints
        if isinstance(
            constraint,
            CheckConstraint,
        )
    }

    sql = constraints[
        "ck_mintrud_learn_program_v109_program_id"
    ]

    assert "schema_version" in sql
    assert "1.0.9" in sql
    assert "learn_program_id IN" in sql

    for value in EXPECTED_IDS:
        assert str(value) in sql

    assert "schema_version <>" in sql


def test_migration_extends_only_mintrud_branch():
    path = (
        Path(__file__)
        .resolve()
        .parents[2]
        / "alembic"
        / "versions"
        / "20260923_mintrud_v109_domain.py"
    )

    source = path.read_text(
        encoding="utf-8"
    )

    assert (
        'revision: str = "20260923_mintrud_v109_domain"'
        in source
    )

    assert (
        'down_revision: Union[str, None] = '
        '"20260918_registry_artifact_kind"'
        in source
    )


def test_migration_is_fail_closed_for_existing_invalid_rows():
    path = (
        Path(__file__)
        .resolve()
        .parents[2]
        / "alembic"
        / "versions"
        / "20260923_mintrud_v109_domain.py"
    )

    source = path.read_text(
        encoding="utf-8"
    )

    assert "learn_program_id NOT IN" in source
    assert "raise RuntimeError(" in source
    assert "No rows were deleted or modified." in source

    upper = source.upper()

    assert "DELETE FROM" not in upper
    assert "UPDATE MINTRUD_LEARN_PROGRAMS" not in upper


def test_migration_creates_and_drops_same_constraint():
    path = (
        Path(__file__)
        .resolve()
        .parents[2]
        / "alembic"
        / "versions"
        / "20260923_mintrud_v109_domain.py"
    )

    source = path.read_text(
        encoding="utf-8"
    )

    assert "op.create_check_constraint(" in source
    assert "op.drop_constraint(" in source

    assert (
        '"ck_mintrud_learn_program_"'
        in source
    )
    assert (
        '"v109_program_id"'
        in source
    )