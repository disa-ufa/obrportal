"""add course cover image

Revision ID: 20260827_course_cover_image
Revises: 20260817_course_publication
Create Date: 2026-08-27
"""

from alembic import op
import sqlalchemy as sa


revision = "20260827_course_cover_image"
down_revision = "20260817_course_publication"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "cover_image_path",
            sa.String(length=512),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("courses", "cover_image_path")
