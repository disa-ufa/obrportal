"""add learner profiles

Revision ID: 6425_learner_profiles
Revises: 6424_assignment_submissions
Create Date: 2026-07-07
"""

from alembic import op
import sqlalchemy as sa


revision = "6425_learner_profiles"
down_revision = "6424_assignment_submissions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learner_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("last_name", sa.String(length=128), nullable=True),
        sa.Column("first_name", sa.String(length=128), nullable=True),
        sa.Column("middle_name", sa.String(length=128), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("snils", sa.String(length=32), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("identity_document_type", sa.String(length=64), nullable=True),
        sa.Column("identity_document_series", sa.String(length=32), nullable=True),
        sa.Column("identity_document_number", sa.String(length=64), nullable=True),
        sa.Column("identity_document_issued_by", sa.Text(), nullable=True),
        sa.Column("identity_document_issued_at", sa.Date(), nullable=True),
        sa.Column("identity_document_department_code", sa.String(length=32), nullable=True),
        sa.Column(
            "identity_document_status",
            sa.String(length=32),
            server_default="not_provided",
            nullable=False,
        ),
        sa.Column(
            "education_document_status",
            sa.String(length=32),
            server_default="not_provided",
            nullable=False,
        ),
        sa.Column("personal_data_basis", sa.String(length=64), nullable=True),
        sa.Column("personal_data_consent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source", sa.String(length=64), server_default="manual", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_learner_profiles_user_id"), "learner_profiles", ["user_id"], unique=True)
    op.create_index(op.f("ix_learner_profiles_snils"), "learner_profiles", ["snils"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_learner_profiles_snils"), table_name="learner_profiles")
    op.drop_index(op.f("ix_learner_profiles_user_id"), table_name="learner_profiles")
    op.drop_table("learner_profiles")
