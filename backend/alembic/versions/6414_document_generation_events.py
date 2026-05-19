"""add document generation events

Revision ID: 6414_doc_gen_events
Revises: 6413_doc_gen_meta
Create Date: 2026-05-19
"""

from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "6414_doc_gen_events"
down_revision = "6413_doc_gen_meta"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "document_generation_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("template_version", sa.String(length=64), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("generated_by_user_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["document_records.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["generated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_document_generation_events_document_id"), "document_generation_events", ["document_id"], unique=False)
    op.create_index(op.f("ix_document_generation_events_generated_by_user_id"), "document_generation_events", ["generated_by_user_id"], unique=False)

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, storage_path, generation_source, generation_template_version, "
            "generated_at, generated_by_user_id, created_at, updated_at "
            "FROM document_records "
            "WHERE storage_path IS NOT NULL "
            "AND document_number LIKE 'AUTO-%'"
        )
    ).mappings()

    for row in rows:
        generated_at = row["generated_at"] or row["updated_at"] or row["created_at"]
        connection.execute(
            sa.text(
                "INSERT INTO document_generation_events "
                "(id, document_id, storage_path, source, template_version, generated_at, "
                "generated_by_user_id, created_at, updated_at) "
                "VALUES "
                "(:id, :document_id, :storage_path, :source, :template_version, :generated_at, "
                ":generated_by_user_id, :created_at, :updated_at)"
            ),
            {
                "id": str(uuid4()),
                "document_id": row["id"],
                "storage_path": row["storage_path"],
                "source": row["generation_source"] or "legacy_completion",
                "template_version": row["generation_template_version"] or "completion_pdf_v1",
                "generated_at": generated_at,
                "generated_by_user_id": row["generated_by_user_id"],
                "created_at": generated_at,
                "updated_at": generated_at,
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_document_generation_events_generated_by_user_id"), table_name="document_generation_events")
    op.drop_index(op.f("ix_document_generation_events_document_id"), table_name="document_generation_events")
    op.drop_table("document_generation_events")
