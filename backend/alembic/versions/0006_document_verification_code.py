"""add document verification code

Revision ID: 0006_document_verification_code
Revises: 0005_doc_storage_path
Create Date: 2026-04-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_document_verification_code"
down_revision: str | None = "0005_doc_storage_path"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "document_records",
        sa.Column("verification_code", sa.String(length=64), nullable=True),
    )

    op.execute(
        """
        UPDATE document_records
        SET verification_code = 'DOCV-' || upper(substr(md5(id || document_number), 1, 24))
        WHERE verification_code IS NULL
        """
    )

    op.alter_column("document_records", "verification_code", nullable=False)

    op.create_index(
        op.f("ix_document_records_verification_code"),
        "document_records",
        ["verification_code"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_document_records_verification_code"), table_name="document_records")
    op.drop_column("document_records", "verification_code")
