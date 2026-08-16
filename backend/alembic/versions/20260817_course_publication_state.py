"""add course publication state

Revision ID: 20260817_course_publication
Revises: 20260816_course_direction
Create Date: 2026-08-17
"""

from alembic import op
import sqlalchemy as sa


revision = "20260817_course_publication"
down_revision = "20260816_course_direction"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "is_public",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.execute(
        sa.text(
            "UPDATE courses "
            "SET is_public = is_active"
        )
    )


def downgrade() -> None:
    op.drop_column("courses", "is_public")
