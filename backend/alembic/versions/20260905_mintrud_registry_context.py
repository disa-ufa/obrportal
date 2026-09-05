"""Add Mintrud registry context.

Revision ID: 20260905_mintrud_context
Revises: 20260904_profile_registry_fields
"""

from alembic import op
import sqlalchemy as sa


revision = "20260905_mintrud_context"
down_revision = "20260904_profile_registry_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mintrud_registry_contexts",
        sa.Column(
            "obligation_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "profession_or_position",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "employer_name",
            sa.String(length=512),
            nullable=True,
        ),
        sa.Column(
            "employer_inn",
            sa.String(length=12),
            nullable=True,
        ),
        sa.Column(
            "knowledge_check_result",
            sa.String(length=32),
            nullable=True,
        ),
        sa.Column(
            "knowledge_check_date",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "protocol_number",
            sa.String(length=128),
            nullable=True,
        ),
        sa.Column(
            "id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            (
                "knowledge_check_result IS NULL "
                "OR knowledge_check_result IN "
                "('satisfactory', 'unsatisfactory')"
            ),
            name=(
                "ck_mintrud_registry_context_"
                "knowledge_check_result"
            ),
        ),
        sa.ForeignKeyConstraint(
            ["obligation_id"],
            ["registry_obligations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
        sa.UniqueConstraint(
            "obligation_id",
            name=(
                "uq_mintrud_registry_context_"
                "obligation_id"
            ),
        ),
    )

    op.create_index(
        "ix_mintrud_registry_contexts_obligation_id",
        "mintrud_registry_contexts",
        ["obligation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_mintrud_registry_contexts_obligation_id",
        table_name="mintrud_registry_contexts",
    )

    op.drop_table(
        "mintrud_registry_contexts"
    )
