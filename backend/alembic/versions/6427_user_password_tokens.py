"""add user password tokens

Revision ID: 6427_user_password_tokens
Revises: 6426_import_batches
Create Date: 2026-07-09
"""

from alembic import op
import sqlalchemy as sa


revision = "6427_user_password_tokens"
down_revision = "6426_import_batches"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_password_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=64), server_default="initial_password_setup", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_target_email", sa.String(length=320), nullable=True),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
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
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_password_tokens_user_id"),
        "user_password_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_password_tokens_token_hash"),
        "user_password_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_user_password_tokens_purpose"),
        "user_password_tokens",
        ["purpose"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_password_tokens_expires_at"),
        "user_password_tokens",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_password_tokens_used_at"),
        "user_password_tokens",
        ["used_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_password_tokens_created_by_user_id"),
        "user_password_tokens",
        ["created_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_password_tokens_created_by_user_id"), table_name="user_password_tokens")
    op.drop_index(op.f("ix_user_password_tokens_used_at"), table_name="user_password_tokens")
    op.drop_index(op.f("ix_user_password_tokens_expires_at"), table_name="user_password_tokens")
    op.drop_index(op.f("ix_user_password_tokens_purpose"), table_name="user_password_tokens")
    op.drop_index(op.f("ix_user_password_tokens_token_hash"), table_name="user_password_tokens")
    op.drop_index(op.f("ix_user_password_tokens_user_id"), table_name="user_password_tokens")
    op.drop_table("user_password_tokens")
