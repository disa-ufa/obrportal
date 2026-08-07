"""add organization profile recipient categories

Revision ID: 20260806_org_profile_recipients
Revises: 20260806_org_profile_specialists
Create Date: 2026-08-06
"""

from alembic import op
import sqlalchemy as sa


revision = "20260806_org_profile_recipients"
down_revision = "20260806_org_profile_specialists"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_recipient_categories",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=True),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "name",
            name="uq_org_recipient_category_org_name",
        ),
    )
    op.create_index(
        "ix_organization_recipient_categories_organization_id",
        "organization_recipient_categories",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organization_recipient_categories_organization_id",
        table_name="organization_recipient_categories",
    )
    op.drop_table("organization_recipient_categories")
