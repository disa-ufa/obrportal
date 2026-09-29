"""Add Mintrud submission batch lifecycle.

Revision ID: 20260928_mintrud_batch_flow
Revises: 20260928_mintrud_batch
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "20260928_mintrud_batch_flow"
down_revision: str | None = "20260928_mintrud_batch"
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_registry_submission_batch_status",
        "registry_submission_batches",
        type_="check",
    )

    op.create_check_constraint(
        "ck_registry_submission_batch_status",
        "registry_submission_batches",
        (
            "status IN "
            "('exported', 'imported', 'submitted')"
        ),
    )

    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "imported_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "imported_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "submitted_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "registry_submission_batches",
        sa.Column(
            "external_reference",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        (
            "fk_registry_submission_batches_"
            "imported_by_user_id_users"
        ),
        "registry_submission_batches",
        "users",
        ["imported_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_foreign_key(
        (
            "fk_registry_submission_batches_"
            "submitted_by_user_id_users"
        ),
        "registry_submission_batches",
        "users",
        ["submitted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        (
            "ix_registry_submission_batches_"
            "imported_by_user_id"
        ),
        "registry_submission_batches",
        ["imported_by_user_id"],
        unique=False,
    )

    op.create_index(
        (
            "ix_registry_submission_batches_"
            "submitted_by_user_id"
        ),
        "registry_submission_batches",
        ["submitted_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        (
            "ix_registry_submission_batches_"
            "submitted_by_user_id"
        ),
        table_name="registry_submission_batches",
    )

    op.drop_index(
        (
            "ix_registry_submission_batches_"
            "imported_by_user_id"
        ),
        table_name="registry_submission_batches",
    )

    op.drop_constraint(
        (
            "fk_registry_submission_batches_"
            "submitted_by_user_id_users"
        ),
        "registry_submission_batches",
        type_="foreignkey",
    )

    op.drop_constraint(
        (
            "fk_registry_submission_batches_"
            "imported_by_user_id_users"
        ),
        "registry_submission_batches",
        type_="foreignkey",
    )

    op.drop_column(
        "registry_submission_batches",
        "external_reference",
    )

    op.drop_column(
        "registry_submission_batches",
        "submitted_at",
    )

    op.drop_column(
        "registry_submission_batches",
        "submitted_by_user_id",
    )

    op.drop_column(
        "registry_submission_batches",
        "imported_at",
    )

    op.drop_column(
        "registry_submission_batches",
        "imported_by_user_id",
    )

    op.drop_constraint(
        "ck_registry_submission_batch_status",
        "registry_submission_batches",
        type_="check",
    )

    op.create_check_constraint(
        "ck_registry_submission_batch_status",
        "registry_submission_batches",
        "status = 'exported'",
    )
