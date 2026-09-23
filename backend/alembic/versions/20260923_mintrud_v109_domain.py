"""Restrict Mintrud v1.0.9 learn program ids to official domain.

Revision ID: 20260923_mintrud_v109_domain
Revises: 20260918_registry_artifact_kind
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260923_mintrud_v109_domain"
down_revision: Union[str, None] = "20260918_registry_artifact_kind"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_CONSTRAINT_NAME = (
    "ck_mintrud_learn_program_"
    "v109_program_id"
)

_ALLOWED_IDS_SQL = (
    "1, 2, 3, 4, 6, 7, 8, 9, 10, 11, "
    "12, 13, 14, 15, 16, 17, 18, 19, "
    "20, 21, 22, 23, 24, 25, 26, 27, "
    "28, 29"
)

_CONSTRAINT_SQL = (
    "schema_version <> '1.0.9' "
    "OR learn_program_id IN ("
    + _ALLOWED_IDS_SQL
    + ")"
)


def _find_invalid_v109_rows():
    bind = op.get_bind()

    result = bind.execute(
        sa.text(
            """
            SELECT
                learn_program_id,
                code
            FROM mintrud_learn_programs
            WHERE schema_version = :schema_version
              AND learn_program_id NOT IN (
                1, 2, 3, 4, 6, 7, 8, 9, 10, 11,
                12, 13, 14, 15, 16, 17, 18, 19,
                20, 21, 22, 23, 24, 25, 26, 27,
                28, 29
              )
            ORDER BY
                learn_program_id,
                code
            """
        ),
        {
            "schema_version": "1.0.9",
        },
    )

    return tuple(
        result.mappings().all()
    )


def upgrade() -> None:
    invalid_rows = (
        _find_invalid_v109_rows()
    )

    if invalid_rows:
        details = ", ".join(
            (
                "learn_program_id="
                + str(row["learn_program_id"])
                + ", code="
                + repr(row["code"])
            )
            for row in invalid_rows[:20]
        )

        if len(invalid_rows) > 20:
            details += (
                ", ... total="
                + str(len(invalid_rows))
            )

        raise RuntimeError(
            "Cannot enforce Mintrud learn-program "
            "domain for schema 1.0.9 because "
            "invalid existing rows were found. "
            "No rows were deleted or modified. "
            + details
        )

    op.create_check_constraint(
        _CONSTRAINT_NAME,
        "mintrud_learn_programs",
        _CONSTRAINT_SQL,
    )


def downgrade() -> None:
    op.drop_constraint(
        _CONSTRAINT_NAME,
        "mintrud_learn_programs",
        type_="check",
    )