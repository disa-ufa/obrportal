"""add document record storage path

Revision ID: 0005_doc_storage_path
Revises: 0004_document_records
Create Date: 2026-04-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_doc_storage_path"
down_revision: str | None = "0004_document_records"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "document_records",
        sa.Column("storage_path", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_records", "storage_path")