"""add document generation metadata

Revision ID: 6413_doc_gen_meta
Revises: 0012_lesson_progress
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "6413_doc_gen_meta"
down_revision = "0012_lesson_progress"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document_records", sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("document_records", sa.Column("generated_by_user_id", sa.String(), nullable=True))
    op.add_column("document_records", sa.Column("generation_source", sa.String(length=64), nullable=True))
    op.add_column("document_records", sa.Column("generation_template_version", sa.String(length=64), nullable=True))
    op.create_index(op.f("ix_document_records_generated_by_user_id"), "document_records", ["generated_by_user_id"], unique=False)
    op.create_foreign_key(
        "fk_document_records_generated_by_user_id_users",
        "document_records",
        "users",
        ["generated_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        "UPDATE document_records "
        "SET generated_at = updated_at, "
        "generation_source = 'legacy_completion', "
        "generation_template_version = 'completion_pdf_v1' "
        "WHERE storage_path IS NOT NULL "
        "AND document_number LIKE 'AUTO-%' "
        "AND generated_at IS NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_document_records_generated_by_user_id_users", "document_records", type_="foreignkey")
    op.drop_index(op.f("ix_document_records_generated_by_user_id"), table_name="document_records")
    op.drop_column("document_records", "generation_template_version")
    op.drop_column("document_records", "generation_source")
    op.drop_column("document_records", "generated_by_user_id")
    op.drop_column("document_records", "generated_at")
