"""add document revocation metadata

Revision ID: 0009_doc_revocation
Revises: 0008_learning_group_members
Create Date: 2026-04-30
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_doc_revocation"
down_revision = "0008_learning_group_members"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_records",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "document_records",
        sa.Column("revoked_by_user_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "document_records",
        sa.Column("revocation_reason", sa.Text(), nullable=True),
    )
    op.create_foreign_key(
        "fk_document_records_revoked_by_user_id_users",
        "document_records",
        "users",
        ["revoked_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_document_records_revoked_by_user_id"),
        "document_records",
        ["revoked_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_document_records_revoked_by_user_id"),
        table_name="document_records",
    )
    op.drop_constraint(
        "fk_document_records_revoked_by_user_id_users",
        "document_records",
        type_="foreignkey",
    )
    op.drop_column("document_records", "revocation_reason")
    op.drop_column("document_records", "revoked_by_user_id")
    op.drop_column("document_records", "revoked_at")
