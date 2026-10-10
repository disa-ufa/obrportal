"""Add exact FRDO PO document type to registry context.

Revision ID: 20261007_frdo_po_document_type
Revises: 20261002_frdo_context
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "20261007_frdo_po_document_type"
down_revision: str | None = "20261002_frdo_context"
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def upgrade() -> None:
    op.add_column(
        "frdo_registry_contexts",
        sa.Column(
            "po_document_type",
            sa.String(length=128),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "frdo_registry_contexts",
        "po_document_type",
    )
