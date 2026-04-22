"""add learning groups

Revision ID: 0002_learning_groups
Revises: 0001_initial_stage6
Create Date: 2026-04-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_learning_groups"
down_revision: str | None = "0001_initial_stage6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "learning_groups",
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=True),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_learning_group_org_name"),
        sa.UniqueConstraint("organization_id", "code", name="uq_learning_group_org_code"),
    )
    op.create_index(
        op.f("ix_learning_groups_organization_id"),
        "learning_groups",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_learning_groups_organization_id"), table_name="learning_groups")
    op.drop_table("learning_groups")
