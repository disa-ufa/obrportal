"""add learner import source idempotency

Revision ID: 6428_import_batch_idempotency
Revises: 6427_user_password_tokens
Create Date: 2026-07-17
"""

from alembic import op
import sqlalchemy as sa


revision = "6428_import_batch_idempotency"
down_revision = "6427_user_password_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "import_batches",
        sa.Column(
            "source_digest",
            sa.String(length=64),
            nullable=True,
        ),
    )
    op.add_column(
        "import_batches",
        sa.Column(
            "deduplication_key",
            sa.String(length=64),
            nullable=True,
        ),
    )
    op.create_index(
        op.f("ix_import_batches_source_digest"),
        "import_batches",
        ["source_digest"],
        unique=False,
    )
    op.create_index(
        op.f("ix_import_batches_deduplication_key"),
        "import_batches",
        ["deduplication_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_import_batches_deduplication_key"),
        table_name="import_batches",
    )
    op.drop_index(
        op.f("ix_import_batches_source_digest"),
        table_name="import_batches",
    )
    op.drop_column(
        "import_batches",
        "deduplication_key",
    )
    op.drop_column(
        "import_batches",
        "source_digest",
    )
