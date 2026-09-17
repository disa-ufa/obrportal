"""Add Mintrud learn program catalog and course mapping.

Revision ID: 20260917_mintrud_programs
Revises: 20260909_registry_approval
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260917_mintrud_programs"
down_revision: Union[str, None] = "20260909_registry_approval"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mintrud_learn_programs",
        sa.Column(
            "learn_program_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "code",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(length=2048),
            nullable=False,
        ),
        sa.Column(
            "schema_version",
            sa.String(length=32),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column(
            "id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "learn_program_id > 0",
            name=(
                "ck_mintrud_learn_program_"
                "positive_program_id"
            ),
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
        sa.UniqueConstraint(
            "schema_version",
            "learn_program_id",
            name=(
                "uq_mintrud_learn_program_"
                "schema_version_program_id"
            ),
        ),
        sa.UniqueConstraint(
            "schema_version",
            "code",
            name=(
                "uq_mintrud_learn_program_"
                "schema_version_code"
            ),
        ),
    )

    op.create_index(
        "ix_mintrud_learn_programs_learn_program_id",
        "mintrud_learn_programs",
        ["learn_program_id"],
        unique=False,
    )

    op.create_index(
        "ix_mintrud_learn_programs_is_active",
        "mintrud_learn_programs",
        ["is_active"],
        unique=False,
    )

    op.create_table(
        "course_mintrud_learn_programs",
        sa.Column(
            "course_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "mintrud_learn_program_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["mintrud_learn_program_id"],
            ["mintrud_learn_programs.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
        sa.UniqueConstraint(
            "course_id",
            "mintrud_learn_program_id",
            name=(
                "uq_course_mintrud_learn_program_"
                "course_program"
            ),
        ),
    )

    op.create_index(
        "ix_course_mintrud_learn_programs_course_id",
        "course_mintrud_learn_programs",
        ["course_id"],
        unique=False,
    )

    op.create_index(
        (
            "ix_course_mintrud_learn_programs_"
            "mintrud_learn_program_id"
        ),
        "course_mintrud_learn_programs",
        ["mintrud_learn_program_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        (
            "ix_course_mintrud_learn_programs_"
            "mintrud_learn_program_id"
        ),
        table_name="course_mintrud_learn_programs",
    )

    op.drop_index(
        "ix_course_mintrud_learn_programs_course_id",
        table_name="course_mintrud_learn_programs",
    )

    op.drop_table(
        "course_mintrud_learn_programs"
    )

    op.drop_index(
        "ix_mintrud_learn_programs_is_active",
        table_name="mintrud_learn_programs",
    )

    op.drop_index(
        "ix_mintrud_learn_programs_learn_program_id",
        table_name="mintrud_learn_programs",
    )

    op.drop_table(
        "mintrud_learn_programs"
    )
