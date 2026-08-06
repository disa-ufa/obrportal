"""add organization profile specialists

Revision ID: 20260806_org_profile_specialists
Revises: 20260806_org_profile_offerings
Create Date: 2026-08-06
"""

from alembic import op
import sqlalchemy as sa


revision = "20260806_org_profile_specialists"
down_revision = "20260806_org_profile_offerings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_specialists",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2048), nullable=True),
        sa.Column(
            "count",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
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
        sa.CheckConstraint(
            "count >= 1",
            name="ck_org_specialist_count_positive",
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
            name="uq_org_specialist_org_name",
        ),
    )
    op.create_index(
        "ix_organization_specialists_organization_id",
        "organization_specialists",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organization_specialists_organization_id",
        table_name="organization_specialists",
    )
    op.drop_table("organization_specialists")
