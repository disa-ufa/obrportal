"""add organization profile core fields

Revision ID: 20260805_org_profile_core
Revises: 6430_global_user_role_unique
Create Date: 2026-08-05
"""

from alembic import op
import sqlalchemy as sa


revision = "20260805_org_profile_core"
down_revision = "6430_global_user_role_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("description", sa.String(length=4096), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("phone", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("email", sa.String(length=320), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("website", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "website")
    op.drop_column("organizations", "email")
    op.drop_column("organizations", "phone")
    op.drop_column("organizations", "description")
