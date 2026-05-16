"""create course lessons

Revision ID: 0011_course_lessons
Revises: 0010_course_modules
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa


revision = "0011_course_lessons"
down_revision = "0010_course_modules"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "course_lessons",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("module_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=True),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("content_url", sa.String(length=2048), nullable=True),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False),
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
            ["module_id"],
            ["course_modules.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "module_id",
            "position",
            name="uq_course_lesson_module_position",
        ),
    )
    op.create_index(
        op.f("ix_course_lessons_module_id"),
        "course_lessons",
        ["module_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_course_lessons_module_id"),
        table_name="course_lessons",
    )
    op.drop_table("course_lessons")
