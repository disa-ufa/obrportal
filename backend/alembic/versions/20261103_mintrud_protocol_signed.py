"""Record paper protocol signing attestations and optional private scans.

Revision ID: 20261103_mintrud_protocol_signed
Revises: 20261102_mintrud_protocol_fixed

Additive-only. Existing recorded protocols remain unsigned; no backfill.
Production requires a separately verified backup and migration approval.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261103_mintrud_protocol_signed"
down_revision = "20261102_mintrud_protocol_fixed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    t = "mintrud_knowledge_protocols"
    op.add_column(t, sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(t, sa.Column("signed_on", sa.Date(), nullable=True))
    op.add_column(t, sa.Column("signed_by_user_id", sa.String(36), nullable=True))
    op.add_column(t, sa.Column("signing_request_id", sa.String(36), nullable=True))
    op.add_column(t, sa.Column("signed_source_sha256", sa.String(64), nullable=True))
    op.add_column(t, sa.Column("signed_scan_path", sa.String(512), nullable=True))
    op.add_column(t, sa.Column("signed_scan_sha256", sa.String(64), nullable=True))
    op.add_column(t, sa.Column("signed_scan_size", sa.Integer(), nullable=True))
    op.add_column(t, sa.Column("signed_scan_media_type", sa.String(64), nullable=True))
    op.add_column(t, sa.Column("signed_scan_uploaded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(t, sa.Column("signed_scan_uploaded_by_user_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_mintrud_protocol_signed_by_user", t, "users", ["signed_by_user_id"], ["id"], ondelete="RESTRICT")
    op.create_foreign_key("fk_mintrud_protocol_signed_scan_by_user", t, "users", ["signed_scan_uploaded_by_user_id"], ["id"], ondelete="RESTRICT")
    op.create_unique_constraint("uq_mintrud_protocol_signing_request", t, ["signing_request_id"])
    op.create_check_constraint(
        "ck_mintrud_protocol_signing_metadata", t,
        "(signed_at IS NULL AND signed_on IS NULL AND signed_by_user_id IS NULL "
        "AND signing_request_id IS NULL AND signed_source_sha256 IS NULL) OR "
        "(status = 'recorded' AND signed_at IS NOT NULL AND signed_on IS NOT NULL "
        "AND signed_by_user_id IS NOT NULL AND signing_request_id IS NOT NULL "
        "AND signed_source_sha256 IS NOT NULL AND signed_source_sha256 = recorded_snapshot_sha256)",
    )
    op.create_check_constraint(
        "ck_mintrud_protocol_signed_scan_metadata", t,
        "(signed_scan_path IS NULL AND signed_scan_sha256 IS NULL "
        "AND signed_scan_size IS NULL AND signed_scan_media_type IS NULL AND signed_scan_uploaded_at IS NULL "
        "AND signed_scan_uploaded_by_user_id IS NULL) OR "
        "(signed_at IS NOT NULL AND signed_scan_path IS NOT NULL "
        "AND signed_scan_sha256 IS NOT NULL AND signed_scan_size IS NOT NULL AND signed_scan_media_type IS NOT NULL "
        "AND signed_scan_uploaded_at IS NOT NULL AND signed_scan_uploaded_by_user_id IS NOT NULL)",
    )


def downgrade() -> None:
    raise RuntimeError("Signed protocol attestations must not be dropped; use an approved recovery plan")
