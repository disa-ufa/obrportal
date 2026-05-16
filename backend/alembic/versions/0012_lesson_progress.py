"""create lesson progress

Revision ID: 0012_lesson_progress
Revises: 0011_course_lessons
Create Date: 2026-05-17
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_lesson_progress"
down_revision = "0011_course_lessons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("enrollment_id", sa.String(), nullable=False),
        sa.Column("lesson_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["enrollment_id"],
            ["enrollments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["course_lessons.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "enrollment_id",
            "lesson_id",
            name="uq_lesson_progress_enrollment_lesson",
        ),
    )
    op.create_index(
        op.f("ix_lesson_progress_enrollment_id"),
        "lesson_progress",
        ["enrollment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lesson_progress_lesson_id"),
        "lesson_progress",
        ["lesson_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_lesson_progress_lesson_id"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_enrollment_id"), table_name="lesson_progress")
    op.drop_table("lesson_progress")
