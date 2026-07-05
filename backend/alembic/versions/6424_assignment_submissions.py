"""add assignment submissions

Revision ID: 6424_assignment_submissions
Revises: a8695df8a57d
Create Date: 2026-07-05
"""

from alembic import op
import sqlalchemy as sa


revision = "6424_assignment_submissions"
down_revision = "a8695df8a57d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assignment_submissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("enrollment_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("lesson_id", sa.String(length=36), nullable=False),
        sa.Column("block_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="completed", nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("attachments_json", sa.JSON(), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=True),
        sa.Column("review_comment", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["block_id"], ["lesson_blocks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "enrollment_id",
            "block_id",
            name="uq_assignment_submission_enrollment_block",
        ),
    )
    op.create_index(op.f("ix_assignment_submissions_enrollment_id"), "assignment_submissions", ["enrollment_id"], unique=False)
    op.create_index(op.f("ix_assignment_submissions_user_id"), "assignment_submissions", ["user_id"], unique=False)
    op.create_index(op.f("ix_assignment_submissions_lesson_id"), "assignment_submissions", ["lesson_id"], unique=False)
    op.create_index(op.f("ix_assignment_submissions_block_id"), "assignment_submissions", ["block_id"], unique=False)
    op.create_index(op.f("ix_assignment_submissions_reviewed_by_user_id"), "assignment_submissions", ["reviewed_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_assignment_submissions_reviewed_by_user_id"), table_name="assignment_submissions")
    op.drop_index(op.f("ix_assignment_submissions_block_id"), table_name="assignment_submissions")
    op.drop_index(op.f("ix_assignment_submissions_lesson_id"), table_name="assignment_submissions")
    op.drop_index(op.f("ix_assignment_submissions_user_id"), table_name="assignment_submissions")
    op.drop_index(op.f("ix_assignment_submissions_enrollment_id"), table_name="assignment_submissions")
    op.drop_table("assignment_submissions")
