"""add lesson blocks schema foundation

Revision ID: 6422_lesson_blocks_schema
Revises: 6421_org_doc_profile
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa


revision = "6422_lesson_blocks_schema"
down_revision = "6421_org_doc_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "course_lessons",
        sa.Column(
            "editor_mode",
            sa.String(length=32),
            server_default="legacy",
            nullable=False,
        ),
    )
    op.add_column(
        "course_lessons",
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="published",
            nullable=False,
        ),
    )
    op.add_column(
        "course_lessons",
        sa.Column("published_version_id", sa.String(length=36), nullable=True),
    )

    op.create_table(
        "lesson_blocks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("lesson_id", sa.String(length=36), nullable=False),
        sa.Column("block_type", sa.String(length=32), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("content_json", sa.JSON(), nullable=False),
        sa.Column("settings_json", sa.JSON(), nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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
            ["lesson_id"],
            ["course_lessons.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "lesson_id",
            "position",
            name="uq_lesson_block_lesson_position",
        ),
    )
    op.create_index(
        op.f("ix_lesson_blocks_lesson_id"),
        "lesson_blocks",
        ["lesson_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lesson_blocks_block_type"),
        "lesson_blocks",
        ["block_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_lesson_blocks_block_type"), table_name="lesson_blocks")
    op.drop_index(op.f("ix_lesson_blocks_lesson_id"), table_name="lesson_blocks")
    op.drop_table("lesson_blocks")

    op.drop_column("course_lessons", "published_version_id")
    op.drop_column("course_lessons", "status")
    op.drop_column("course_lessons", "editor_mode")
