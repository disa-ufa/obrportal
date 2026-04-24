"""add document records

Revision ID: 0004_document_records
Revises: 0003_courses_enrollments
Create Date: 2026-04-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_document_records"
down_revision: str | None = "0003_courses_enrollments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "document_records",
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("course_id", sa.String(), nullable=True),
        sa.Column("enrollment_id", sa.String(), nullable=True),
        sa.Column("document_number", sa.String(length=128), nullable=False),
        sa.Column("document_type", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("file_url", sa.String(length=1024), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_document_records_user_id"), "document_records", ["user_id"], unique=False)
    op.create_index(op.f("ix_document_records_course_id"), "document_records", ["course_id"], unique=False)
    op.create_index(op.f("ix_document_records_enrollment_id"), "document_records", ["enrollment_id"], unique=False)
    op.create_index(op.f("ix_document_records_document_number"), "document_records", ["document_number"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_document_records_document_number"), table_name="document_records")
    op.drop_index(op.f("ix_document_records_enrollment_id"), table_name="document_records")
    op.drop_index(op.f("ix_document_records_course_id"), table_name="document_records")
    op.drop_index(op.f("ix_document_records_user_id"), table_name="document_records")
    op.drop_table("document_records")