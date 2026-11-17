"""Store pre-completion employment details and explicit absence of a patronymic."""
from alembic import op
import sqlalchemy as sa

revision = "20261117_enrollment_employment"
down_revision = "20261103_mintrud_protocol_signed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learner_profiles", sa.Column("no_middle_name", sa.Boolean(), nullable=True))
    op.create_table(
        "enrollment_employment_details",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("enrollment_id", sa.String(), sa.ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profession_or_position", sa.String(255), nullable=True),
        sa.Column("employer_name", sa.String(512), nullable=True),
        sa.Column("employer_inn", sa.String(12), nullable=True),
        sa.Column("source", sa.String(32), nullable=True),
        sa.Column("reporting_scenario", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("enrollment_id"),
        sa.CheckConstraint(
            "reporting_scenario IN ('external_training_provider', 'employer_self_training')",
            name="ck_employment_reporting_scenario",
        ),
    )


def downgrade() -> None:
    # Never discard employment records or explicit absence-of-patronymic data.
    # A safe recovery requires a separately approved backup-backed plan.
    raise RuntimeError("Employment details and patronymic absence must not be discarded; use an approved recovery plan")
