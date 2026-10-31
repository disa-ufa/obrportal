"""Assign identity to future registry approval events; preserve legacy history.

Revision ID: 20261021_registry_approval_event
Revises: 20261013_registry_applicability

P1 schema only. Historical approvals and batch items remain NULL.
P2 must populate batch item IDs from the locked approval being exported.
No data backfill, no guessing of historic event identity, no DELETE.
"""

from alembic import op
import sqlalchemy as sa

revision = "20261021_registry_approval_event"
down_revision = "20261013_registry_applicability"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "registry_obligations",
        sa.Column("approval_event_id", sa.String(36), nullable=True),
    )
    op.add_column(
        "registry_submission_batch_items",
        sa.Column("approval_event_id", sa.String(36), nullable=True),
    )
    op.create_index(
        "uq_registry_batch_item_obligation_approval_event",
        "registry_submission_batch_items",
        ["obligation_id", "approval_event_id"],
        unique=True,
        postgresql_where=sa.text("approval_event_id IS NOT NULL"),
    )


def downgrade() -> None:
    # Avoid discarding business event identities through an accidental downgrade.
    raise RuntimeError(
        "Destructive downgrade of registry approval event IDs is disabled; "
        "use a separately approved recovery plan."
    )
