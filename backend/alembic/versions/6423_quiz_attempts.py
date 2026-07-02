"""add quiz attempts

Revision ID: 6423_quiz_attempts
Revises: 6422_lesson_blocks_schema
Create Date: 2026-06-24
"""

from alembic import op
import sqlalchemy as sa


revision = "6423_quiz_attempts"
down_revision = "6422_lesson_blocks_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("enrollment_id", sa.String(length=36), nullable=False),
        sa.Column("lesson_id", sa.String(length=36), nullable=False),
        sa.Column("block_id", sa.String(length=36), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="submitted", nullable=False),
        sa.Column("passed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("earned_points", sa.Float(), server_default="0", nullable=False),
        sa.Column("total_points", sa.Float(), server_default="0", nullable=False),
        sa.Column("percent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("correct_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("question_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("pass_score_percent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("answers_json", sa.JSON(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
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
            ["enrollment_id"],
            ["enrollments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["lesson_id"],
            ["course_lessons.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["block_id"],
            ["lesson_blocks.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "enrollment_id",
            "block_id",
            "attempt_number",
            name="uq_quiz_attempt_enrollment_block_attempt",
        ),
    )
    op.create_index(
        op.f("ix_quiz_attempts_enrollment_id"),
        "quiz_attempts",
        ["enrollment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_quiz_attempts_lesson_id"),
        "quiz_attempts",
        ["lesson_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_quiz_attempts_block_id"),
        "quiz_attempts",
        ["block_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_quiz_attempts_block_id"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_lesson_id"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_enrollment_id"), table_name="quiz_attempts")
    op.drop_table("quiz_attempts")
