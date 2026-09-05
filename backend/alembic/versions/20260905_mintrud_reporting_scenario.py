"""Add Mintrud reporting scenario.

Revision ID: 20260905_mintrud_scenario
Revises: 20260905_mintrud_context
"""

from alembic import op
import sqlalchemy as sa


revision = "20260905_mintrud_scenario"
down_revision = "20260905_mintrud_context"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "mintrud_registry_contexts",
        sa.Column(
            "reporting_scenario",
            sa.String(length=32),
            nullable=True,
        ),
    )

    op.create_check_constraint(
        (
            "ck_mintrud_registry_context_"
            "reporting_scenario"
        ),
        "mintrud_registry_contexts",
        (
            "reporting_scenario IS NULL "
            "OR reporting_scenario IN "
            "('external_training_provider', "
            "'employer_self_training')"
        ),
    )


def downgrade() -> None:
    op.drop_constraint(
        (
            "ck_mintrud_registry_context_"
            "reporting_scenario"
        ),
        "mintrud_registry_contexts",
        type_="check",
    )

    op.drop_column(
        "mintrud_registry_contexts",
        "reporting_scenario",
    )
