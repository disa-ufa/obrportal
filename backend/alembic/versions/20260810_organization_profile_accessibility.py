"""add organization profile accessibility

Revision ID: 20260810_org_profile_access
Revises: 20260806_org_profile_recipients
Create Date: 2026-08-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260810_org_profile_access"
down_revision = "20260806_org_profile_recipients"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column(
            "accessibility_status",
            sa.String(length=32),
            nullable=False,
            server_default="not_specified",
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "accessibility_description",
            sa.String(length=4096),
            nullable=True,
        ),
    )
    op.create_check_constraint(
        "ck_organizations_accessibility_status",
        "organizations",
        (
            "accessibility_status IN "
            "('not_specified', 'full', 'partial', 'none')"
        ),
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_organizations_accessibility_status",
        "organizations",
        type_="check",
    )
    op.drop_column("organizations", "accessibility_description")
    op.drop_column("organizations", "accessibility_status")
