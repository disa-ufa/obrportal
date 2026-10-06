"""Add FRDO registry context and document legal fields.

Revision ID: 20261002_frdo_context
Revises: 20260929_mintrud_batch_results
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "20261002_frdo_context"
down_revision: str | None = "20260929_mintrud_batch_results"
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def upgrade() -> None:
    op.add_column(
        "document_records",
        sa.Column(
            "document_series",
            sa.String(length=32),
            nullable=True,
        ),
    )

    op.add_column(
        "document_records",
        sa.Column(
            "issued_at",
            sa.Date(),
            nullable=True,
        ),
    )

    op.add_column(
        "document_records",
        sa.Column(
            "registration_number",
            sa.String(length=128),
            nullable=True,
        ),
    )

    op.create_table(
        "frdo_registry_contexts",
        sa.Column(
            "obligation_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "document_status",
            sa.String(length=32),
            nullable=True,
        ),
        sa.Column(
            "loss_confirmation",
            sa.String(length=128),
            nullable=True,
        ),
        sa.Column(
            "exchange_confirmation",
            sa.String(length=128),
            nullable=True,
        ),
        sa.Column(
            "destruction_confirmation",
            sa.String(length=32),
            nullable=True,
        ),
        sa.Column(
            "study_form",
            sa.String(length=64),
            nullable=True,
        ),
        sa.Column(
            "funding_source",
            sa.String(length=128),
            nullable=True,
        ),
        sa.Column(
            "education_delivery_form",
            sa.String(length=128),
            nullable=True,
        ),
        sa.Column(
            "po_program_type",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "po_profession",
            sa.String(length=512),
            nullable=True,
        ),
        sa.Column(
            "po_qualification",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "dpo_professional_activity_area",
            sa.String(length=512),
            nullable=True,
        ),
        sa.Column(
            "dpo_enlarged_specialty_group",
            sa.String(length=512),
            nullable=True,
        ),
        sa.Column(
            "dpo_qualification",
            sa.String(length=512),
            nullable=True,
        ),
        sa.Column(
            "prior_education_snapshot_json",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "original_document_snapshot_json",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["obligation_id"],
            ["registry_obligations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
        sa.UniqueConstraint(
            "obligation_id",
            name=(
                "uq_frdo_registry_context_"
                "obligation_id"
            ),
        ),
    )

    op.create_index(
        "ix_frdo_registry_contexts_obligation_id",
        "frdo_registry_contexts",
        ["obligation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_frdo_registry_contexts_obligation_id",
        table_name="frdo_registry_contexts",
    )

    op.drop_table(
        "frdo_registry_contexts"
    )

    op.drop_column(
        "document_records",
        "registration_number",
    )

    op.drop_column(
        "document_records",
        "issued_at",
    )

    op.drop_column(
        "document_records",
        "document_series",
    )
