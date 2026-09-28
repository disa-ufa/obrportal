"""Add Mintrud registry submission batch foundation.

Revision ID: 20260928_mintrud_batch
Revises: 20260923_mintrud_v109_domain
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "20260928_mintrud_batch"
down_revision: str | None = "20260923_mintrud_v109_domain"
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def upgrade() -> None:
    op.create_table(
        "registry_submission_batches",
        sa.Column(
            "registry",
            sa.String(length=32),
            server_default="mintrud",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="exported",
            nullable=False,
        ),
        sa.Column(
            "artifact_kind",
            sa.String(length=32),
            server_default="portal-upload-artifact",
            nullable=False,
        ),
        sa.Column(
            "transport",
            sa.String(length=32),
            server_default="file",
            nullable=False,
        ),
        sa.Column(
            "schema_version",
            sa.String(length=64),
            server_default="1.0.9",
            nullable=False,
        ),
        sa.Column(
            "obligation_count",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "record_count",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "artifact_path",
            sa.String(length=1024),
            nullable=False,
        ),
        sa.Column(
            "artifact_sha256",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "generated_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "registry = 'mintrud'",
            name="ck_registry_submission_batch_registry",
        ),
        sa.CheckConstraint(
            "status = 'exported'",
            name="ck_registry_submission_batch_status",
        ),
        sa.CheckConstraint(
            "artifact_kind = 'portal-upload-artifact'",
            name="ck_registry_submission_batch_artifact_kind",
        ),
        sa.CheckConstraint(
            "transport = 'file'",
            name="ck_registry_submission_batch_transport",
        ),
        sa.CheckConstraint(
            "schema_version = '1.0.9'",
            name="ck_registry_submission_batch_schema_version",
        ),
        sa.CheckConstraint(
            "obligation_count >= 1",
            name="ck_registry_submission_batch_obligation_count",
        ),
        sa.CheckConstraint(
            "record_count >= 1 AND record_count <= 5000",
            name="ck_registry_submission_batch_record_count",
        ),
        sa.ForeignKeyConstraint(
            ["generated_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    op.create_index(
        "ix_registry_submission_batches_registry",
        "registry_submission_batches",
        ["registry"],
        unique=False,
    )

    op.create_index(
        "ix_registry_submission_batches_status",
        "registry_submission_batches",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_registry_submission_batches_generated_by_user_id",
        "registry_submission_batches",
        ["generated_by_user_id"],
        unique=False,
    )

    op.create_table(
        "registry_submission_batch_items",
        sa.Column(
            "batch_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "obligation_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "position",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "approval_snapshot_json",
            sa.JSON(),
            nullable=False,
        ),
        sa.Column(
            "approval_fingerprint",
            sa.String(length=64),
            nullable=False,
        ),
        sa.Column(
            "record_count",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "position >= 0",
            name="ck_registry_submission_batch_item_position",
        ),
        sa.CheckConstraint(
            "record_count >= 1",
            name=(
                "ck_registry_submission_batch_item_"
                "record_count"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"],
            ["registry_submission_batches.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["obligation_id"],
            ["registry_obligations.id"],
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
        sa.UniqueConstraint(
            "batch_id",
            "obligation_id",
            name=(
                "uq_registry_submission_batch_item_"
                "batch_obligation"
            ),
        ),
        sa.UniqueConstraint(
            "batch_id",
            "position",
            name=(
                "uq_registry_submission_batch_item_"
                "batch_position"
            ),
        ),
    )

    op.create_index(
        "ix_registry_submission_batch_items_batch_id",
        "registry_submission_batch_items",
        ["batch_id"],
        unique=False,
    )

    op.create_index(
        "ix_registry_submission_batch_items_obligation_id",
        "registry_submission_batch_items",
        ["obligation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_registry_submission_batch_items_obligation_id",
        table_name="registry_submission_batch_items",
    )

    op.drop_index(
        "ix_registry_submission_batch_items_batch_id",
        table_name="registry_submission_batch_items",
    )

    op.drop_table(
        "registry_submission_batch_items"
    )

    op.drop_index(
        "ix_registry_submission_batches_generated_by_user_id",
        table_name="registry_submission_batches",
    )

    op.drop_index(
        "ix_registry_submission_batches_status",
        table_name="registry_submission_batches",
    )

    op.drop_index(
        "ix_registry_submission_batches_registry",
        table_name="registry_submission_batches",
    )

    op.drop_table(
        "registry_submission_batches"
    )
