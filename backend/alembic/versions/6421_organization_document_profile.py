"""add organization document profile fields

Revision ID: 6421_org_doc_profile
Revises: 6414_doc_gen_events
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa


revision = "6421_org_doc_profile"
down_revision = "6414_doc_gen_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("document_issuer_name", sa.String(length=512), nullable=True))
    op.add_column("organizations", sa.Column("document_signer_position", sa.String(length=255), nullable=True))
    op.add_column("organizations", sa.Column("document_signer_name", sa.String(length=255), nullable=True))
    op.add_column("organizations", sa.Column("document_basis", sa.String(length=1024), nullable=True))
    op.add_column("organizations", sa.Column("document_place", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "document_place")
    op.drop_column("organizations", "document_basis")
    op.drop_column("organizations", "document_signer_name")
    op.drop_column("organizations", "document_signer_position")
    op.drop_column("organizations", "document_issuer_name")
