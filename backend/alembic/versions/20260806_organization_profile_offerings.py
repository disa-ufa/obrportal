"""add organization profile offerings

Revision ID: 20260806_org_profile_offerings
Revises: 20260805_org_profile_core
Create Date: 2026-08-06
"""

from alembic import op
import sqlalchemy as sa


revision = "20260806_org_profile_offerings"
down_revision = "20260805_org_profile_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_activity_directions",
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
            name="uq_org_activity_direction_org_name",
        ),
    )
    op.create_index(
        "ix_organization_activity_directions_organization_id",
        "organization_activity_directions",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "organization_services",
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
            name="uq_org_service_org_name",
        ),
    )
    op.create_index(
        "ix_organization_services_organization_id",
        "organization_services",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organization_services_organization_id",
        table_name="organization_services",
    )
    op.drop_table("organization_services")

    op.drop_index(
        "ix_organization_activity_directions_organization_id",
        table_name="organization_activity_directions",
    )
    op.drop_table("organization_activity_directions")
