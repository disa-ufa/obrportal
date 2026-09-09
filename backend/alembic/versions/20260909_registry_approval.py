"""Add registry approval snapshot and invalidation metadata.

Revision ID: 20260909_registry_approval
Revises: 20260905_mintrud_scenario
"""

from alembic import op
import sqlalchemy as sa


revision = "20260909_registry_approval"
down_revision = "20260905_mintrud_scenario"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "registry_obligations",
        sa.Column(
            "approval_snapshot_json",
            sa.JSON(),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_obligations",
        sa.Column(
            "approval_fingerprint",
            sa.String(length=64),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_obligations",
        sa.Column(
            "approval_invalidated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_obligations",
        sa.Column(
            "approval_invalidation_reason",
            sa.String(length=128),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "registry_obligations",
        "approval_invalidation_reason",
    )

    op.drop_column(
        "registry_obligations",
        "approval_invalidated_at",
    )

    op.drop_column(
        "registry_obligations",
        "approval_fingerprint",
    )

    op.drop_column(
        "registry_obligations",
        "approval_snapshot_json",
    )
