"""Add registry applicability decisions and append-only evidence.

Revision ID: 20261013_registry_applicability
Revises: 20261008_registry_batch_frdo

Additive only: no existing obligation, snapshot, or submission is modified.
"""

from alembic import op
import sqlalchemy as sa


revision = "20261013_registry_applicability"
down_revision = "20261008_registry_batch_frdo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "registry_applicability",
        sa.Column("enrollment_id", sa.String(36), nullable=False),
        sa.Column("registry", sa.String(32), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("rule_code", sa.String(128), nullable=True),
        sa.Column("rule_version", sa.String(64), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("input_fingerprint", sa.String(64), nullable=True),
        sa.Column("decided_by_user_id", sa.String(36), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decision_version", sa.Integer(), nullable=False),
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("enrollment_id", "registry", name="uq_registry_applicability_enrollment_registry"),
        sa.CheckConstraint("registry IN ('frdo', 'mintrud')", name="ck_registry_applicability_registry"),
        sa.CheckConstraint("decision IN ('required', 'not_required', 'needs_review')", name="ck_registry_applicability_decision"),
        sa.CheckConstraint("source IN ('auto', 'manual', 'legacy')", name="ck_registry_applicability_source"),
        sa.CheckConstraint("decision_version >= 1", name="ck_registry_applicability_version"),
    )
    for name in ("enrollment_id", "registry", "decision"):
        op.create_index("ix_registry_applicability_" + name, "registry_applicability", [name])

    op.create_table(
        "registry_applicability_events",
        sa.Column("applicability_id", sa.String(36), nullable=False),
        sa.Column("enrollment_id", sa.String(36), nullable=False),
        sa.Column("registry", sa.String(32), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("rule_code", sa.String(128), nullable=True),
        sa.Column("rule_version", sa.String(64), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("input_fingerprint", sa.String(64), nullable=True),
        sa.Column("decided_by_user_id", sa.String(36), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_version", sa.Integer(), nullable=False),
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["applicability_id"], ["registry_applicability.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("applicability_id", "decision_version", name="uq_registry_applicability_event_version"),
        sa.CheckConstraint("registry IN ('frdo', 'mintrud')", name="ck_registry_applicability_event_registry"),
        sa.CheckConstraint("decision IN ('required', 'not_required', 'needs_review')", name="ck_registry_applicability_event_decision"),
        sa.CheckConstraint("source IN ('auto', 'manual', 'legacy')", name="ck_registry_applicability_event_source"),
        sa.CheckConstraint("decision_version >= 1", name="ck_registry_applicability_event_version"),
    )
    for name in ("applicability_id", "enrollment_id"):
        op.create_index("ix_registry_applicability_events_" + name, "registry_applicability_events", [name])

    # Defense-in-depth: event evidence is append-only, even for direct SQL.
    op.execute(
        """
        CREATE FUNCTION prevent_registry_applicability_event_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'Registry applicability events are append-only';
        END;
        $$;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_registry_applicability_events_append_only
        BEFORE UPDATE OR DELETE ON registry_applicability_events
        FOR EACH ROW
        EXECUTE FUNCTION prevent_registry_applicability_event_mutation();
        """
    )


def downgrade() -> None:
    # Explicit downgrade is destructive and must never be run on populated
    # historical decision evidence without a separate approved recovery plan.
    op.execute("DROP TRIGGER IF EXISTS trg_registry_applicability_events_append_only ON registry_applicability_events")
    op.execute("DROP FUNCTION IF EXISTS prevent_registry_applicability_event_mutation()")
    op.drop_table("registry_applicability_events")
    op.drop_table("registry_applicability")
