"""Add draft-only Mintrud knowledge check protocols. No backfills or old-table mutation.

Revision ID: 20261102_mintrud_protocol_drafts
Revises: 20261021_registry_approval_event

Do NOT run on production until separately qualified/approved; test isolated DB first.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261102_mintrud_protocol_drafts"
down_revision = "20261021_registry_approval_event"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mintrud_knowledge_protocols",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("course_id", sa.String(36), sa.ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("protocol_number", sa.String(128), nullable=False),
        sa.Column("protocol_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("commission_order_number", sa.String(128), nullable=True),
        sa.Column("commission_order_date", sa.Date(), nullable=True),
        sa.Column("commission_chair", sa.String(255), nullable=True),
        sa.Column("commission_members_json", sa.JSON(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("course_id", "protocol_date", "protocol_number", name="uq_mintrud_protocol_course_date_number"),
        sa.CheckConstraint("status = 'draft'", name="ck_mintrud_protocol_draft_only"),
    )
    op.create_index("ix_mintrud_knowledge_protocols_course_id", "mintrud_knowledge_protocols", ["course_id"])

    op.create_table(
        "mintrud_knowledge_protocol_members",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("protocol_id", sa.String(36), sa.ForeignKey("mintrud_knowledge_protocols.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("enrollment_id", sa.String(36), sa.ForeignKey("enrollments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("obligation_id", sa.String(36), sa.ForeignKey("registry_obligations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("knowledge_check_date", sa.Date(), nullable=True),
        sa.Column("knowledge_check_result", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("protocol_id", "enrollment_id", name="uq_mintrud_protocol_member_enrollment"),
        sa.CheckConstraint("knowledge_check_result IS NULL OR knowledge_check_result IN ('satisfactory','unsatisfactory')", name="ck_mintrud_protocol_member_result"),
    )
    op.create_index("ix_mintrud_knowledge_protocol_members_protocol_id", "mintrud_knowledge_protocol_members", ["protocol_id"])
    op.create_index("ix_mintrud_knowledge_protocol_members_enrollment_id", "mintrud_knowledge_protocol_members", ["enrollment_id"])
    op.create_index("ix_mintrud_knowledge_protocol_members_obligation_id", "mintrud_knowledge_protocol_members", ["obligation_id"])


def downgrade() -> None:
    raise RuntimeError("Destructive removal of Mintrud protocol projects is disabled; use a separately approved recovery plan")
