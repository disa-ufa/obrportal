"""Enable explicit recorded commission result state; no registry writes or backfills.

Revision ID: 20261102_mintrud_protocol_fixed
Revises: 20261102_mintrud_protocol_drafts
"""
from alembic import op
import sqlalchemy as sa

revision = "20261102_mintrud_protocol_fixed"
down_revision = "20261102_mintrud_protocol_drafts"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("mintrud_knowledge_protocols", sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("mintrud_knowledge_protocols", sa.Column("recorded_by_user_id", sa.String(36), nullable=True))
    op.add_column("mintrud_knowledge_protocols", sa.Column("recording_request_id", sa.String(36), nullable=True))
    op.add_column("mintrud_knowledge_protocols", sa.Column("recorded_snapshot", sa.JSON(), nullable=True))
    op.add_column("mintrud_knowledge_protocols", sa.Column("recorded_snapshot_sha256", sa.String(64), nullable=True))
    op.create_foreign_key(
        "fk_mintrud_protocol_recorded_by_user", "mintrud_knowledge_protocols", "users",
        ["recorded_by_user_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_mintrud_protocol_recording_request", "mintrud_knowledge_protocols", ["recording_request_id"]
    )
    op.drop_constraint("ck_mintrud_protocol_draft_only", "mintrud_knowledge_protocols", type_="check")
    op.create_check_constraint(
        "ck_mintrud_protocol_state", "mintrud_knowledge_protocols", "status IN ('draft', 'recorded')"
    )
    op.create_check_constraint(
        "ck_mintrud_protocol_recording_metadata", "mintrud_knowledge_protocols",
        "(status = 'draft' AND recorded_at IS NULL AND recorded_by_user_id IS NULL AND recording_request_id IS NULL "
        "AND recorded_snapshot IS NULL AND recorded_snapshot_sha256 IS NULL) OR "
        "(status = 'recorded' AND recorded_at IS NOT NULL AND recorded_by_user_id IS NOT NULL AND recording_request_id IS NOT NULL "
        "AND recorded_snapshot IS NOT NULL AND recorded_snapshot_sha256 IS NOT NULL)"
    )


def downgrade():
    raise RuntimeError("Destructive rollback of recorded commission checks is prohibited; use an approved recovery plan")
