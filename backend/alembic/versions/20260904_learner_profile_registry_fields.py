"""Add learner registry identity fields.

Revision ID: 20260904_profile_registry_fields
Revises: 20260904_compliance_registry
"""

from alembic import op
import sqlalchemy as sa


revision = "20260904_profile_registry_fields"
down_revision = "20260904_compliance_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "learner_profiles",
        sa.Column(
            "sex",
            sa.String(length=16),
            nullable=True,
        ),
    )
    op.add_column(
        "learner_profiles",
        sa.Column(
            "citizenship_country_code",
            sa.String(length=3),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "learner_profiles",
        "citizenship_country_code",
    )
    op.drop_column(
        "learner_profiles",
        "sex",
    )
