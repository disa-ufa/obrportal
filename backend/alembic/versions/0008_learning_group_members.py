"""create learning group members

Revision ID: 0008_learning_group_members
Revises: 0007_unique_document_enrollment
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_learning_group_members"
down_revision = "0007_unique_document_enrollment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "learning_group_members",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("learning_group_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["learning_group_id"],
            ["learning_groups.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "learning_group_id",
            "user_id",
            name="uq_learning_group_member_group_user",
        ),
    )
    op.create_index(
        op.f("ix_learning_group_members_learning_group_id"),
        "learning_group_members",
        ["learning_group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_learning_group_members_user_id"),
        "learning_group_members",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_learning_group_members_user_id"),
        table_name="learning_group_members",
    )
    op.drop_index(
        op.f("ix_learning_group_members_learning_group_id"),
        table_name="learning_group_members",
    )
    op.drop_table("learning_group_members")
