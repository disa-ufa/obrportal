"""create course modules

Revision ID: 0010_course_modules
Revises: 0009_doc_revocation
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_course_modules"
down_revision = "0009_doc_revocation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "course_modules",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("course_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["course_id"],
            ["courses.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "course_id",
            "position",
            name="uq_course_module_course_position",
        ),
    )
    op.create_index(
        op.f("ix_course_modules_course_id"),
        "course_modules",
        ["course_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_course_modules_course_id"),
        table_name="course_modules",
    )
    op.drop_table("course_modules")
