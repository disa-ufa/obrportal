"""add nullable course direction

Revision ID: 20260816_course_direction
Revises: 20260810_org_profile_access
Create Date: 2026-08-16
"""

from alembic import op
import sqlalchemy as sa


revision = "20260816_course_direction"
down_revision = "20260810_org_profile_access"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "direction",
            sa.String(length=128),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("courses", "direction")