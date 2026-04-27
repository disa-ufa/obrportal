"""add unique document enrollment constraint

Revision ID: 0007_unique_document_enrollment
Revises: 0006_document_verification_code
Create Date: 2026-04-27 00:00:00.000000
"""

from alembic import op


revision = "0007_unique_document_enrollment"
down_revision = "0006_document_verification_code"
branch_labels = None
depends_on = None


CONSTRAINT_NAME = "uq_document_records_enrollment_id"
TABLE_NAME = "document_records"


def upgrade() -> None:
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        TABLE_NAME,
        ["enrollment_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        CONSTRAINT_NAME,
        TABLE_NAME,
        type_="unique",
    )