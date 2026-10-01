"""Add Mintrud submission batch result reconciliation.

Revision ID: 20260929_mintrud_batch_results
Revises: 20260928_mintrud_batch_flow
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "20260929_mintrud_batch_results"
down_revision: str | None = "20260928_mintrud_batch_flow"
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def upgrade() -> None:
    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "reconciled_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "reconciled_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_registry_batches_reconciled_user",
        "registry_submission_batches",
        "users",
        ["reconciled_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_registry_submission_batches_reconciled_by_user_id",
        "registry_submission_batches",
        ["reconciled_by_user_id"],
        unique=False,
    )

    op.add_column(
        "registry_submission_batch_items",
        sa.Column(
            "result_status",
            sa.String(length=32),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batch_items",
        sa.Column(
            "errors_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text(
                "'[]'::json"
            ),
        ),
    )

    op.add_column(
        "registry_submission_batch_items",
        sa.Column(
            "external_id",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batch_items",
        sa.Column(
            "result_recorded_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batch_items",
        sa.Column(
            "result_recorded_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_check_constraint(
        "ck_registry_submission_batch_item_result_status",
        "registry_submission_batch_items",
        (
            "result_status IS NULL OR "
            "result_status IN "
            "('accepted', 'rejected', 'correction_required')"
        ),
    )

    op.create_foreign_key(
        "fk_registry_batch_items_result_user",
        "registry_submission_batch_items",
        "users",
        ["result_recorded_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_registry_submission_batch_items_result_recorded_by_user_id",
        "registry_submission_batch_items",
        ["result_recorded_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_registry_submission_batch_items_result_recorded_by_user_id",
        table_name="registry_submission_batch_items",
    )

    op.drop_constraint(
        "fk_registry_batch_items_result_user",
        "registry_submission_batch_items",
        type_="foreignkey",
    )

    op.drop_constraint(
        "ck_registry_submission_batch_item_result_status",
        "registry_submission_batch_items",
        type_="check",
    )

    op.drop_column(
        "registry_submission_batch_items",
        "result_recorded_at",
    )

    op.drop_column(
        "registry_submission_batch_items",
        "result_recorded_by_user_id",
    )

    op.drop_column(
        "registry_submission_batch_items",
        "external_id",
    )

    op.drop_column(
        "registry_submission_batch_items",
        "errors_json",
    )

    op.drop_column(
        "registry_submission_batch_items",
        "result_status",
    )

    op.drop_index(
        "ix_registry_submission_batches_reconciled_by_user_id",
        table_name="registry_submission_batches",
    )

    op.drop_constraint(
        "fk_registry_batches_reconciled_user",
        "registry_submission_batches",
        type_="foreignkey",
    )

    op.drop_column(
        "registry_submission_batches",
        "reconciled_at",
    )

    op.drop_column(
        "registry_submission_batches",
        "reconciled_by_user_id",
    )
