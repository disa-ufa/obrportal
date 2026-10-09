"""Enable FRDO submission batches.

Revision ID: 20261008_registry_batch_frdo
Revises: 20261007_frdo_po_document_type
"""

from alembic import op
import sqlalchemy as sa


revision = "20261008_registry_batch_frdo"
down_revision = "20261007_frdo_po_document_type"
branch_labels = None
depends_on = None


TABLE = "registry_submission_batches"


def upgrade() -> None:
    op.drop_constraint(
        "ck_registry_submission_batch_registry",
        TABLE,
        type_="check",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_registry",
        TABLE,
        "registry IN ('mintrud', 'frdo')",
    )

    op.drop_constraint(
        "ck_registry_submission_batch_schema_version",
        TABLE,
        type_="check",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_schema_version",
        TABLE,
        (
            "(registry = 'mintrud' AND schema_version = '1.0.9') "
            "OR (registry = 'frdo' AND "
            "schema_version = 'frdo-po-working-reference-v1')"
        ),
    )

    op.drop_constraint(
        "ck_registry_submission_batch_record_count",
        TABLE,
        type_="check",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_record_count",
        TABLE,
        (
            "(registry = 'mintrud' AND "
            "record_count BETWEEN 1 AND 5000) "
            "OR (registry = 'frdo' AND "
            "record_count BETWEEN 1 AND 1001)"
        ),
    )

    op.drop_constraint(
        "ck_registry_submission_batch_status",
        TABLE,
        type_="check",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_status",
        TABLE,
        (
            "status IN ('exported', 'imported', 'submitted') "
            "AND (registry = 'mintrud' OR status != 'imported')"
        ),
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_registry_submission_batch_status",
        TABLE,
        type_="check",
    )
    op.drop_constraint(
        "ck_registry_submission_batch_record_count",
        TABLE,
        type_="check",
    )
    op.drop_constraint(
        "ck_registry_submission_batch_schema_version",
        TABLE,
        type_="check",
    )
    op.drop_constraint(
        "ck_registry_submission_batch_registry",
        TABLE,
        type_="check",
    )

    op.create_check_constraint(
        "ck_registry_submission_batch_registry",
        TABLE,
        "registry = 'mintrud'",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_schema_version",
        TABLE,
        "schema_version = '1.0.9'",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_record_count",
        TABLE,
        "record_count >= 1 AND record_count <= 5000",
    )
    op.create_check_constraint(
        "ck_registry_submission_batch_status",
        TABLE,
        "status IN ('exported', 'imported', 'submitted')",
    )
