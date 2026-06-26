"""mark completion documents available

Revision ID: a8695df8a57d
Revises: 6423_quiz_attempts
Create Date: 2026-06-26 05:55:07

"""

from typing import Sequence, Union

from alembic import op


revision: str = "a8695df8a57d"
down_revision: Union[str, None] = "6423_quiz_attempts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE document_records AS d
        SET status = 'available'
        FROM enrollments AS e
        WHERE d.enrollment_id = e.id
          AND d.status = 'draft'
          AND d.storage_path IS NOT NULL
          AND e.status = 'completed'
          AND e.completed_at IS NOT NULL
        """
    )


def downgrade() -> None:
    pass
