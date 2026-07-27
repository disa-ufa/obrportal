# Enforce unique global user role assignments.
#
# Revision ID: 6430_global_user_role_unique
# Revises: 6429_canonical_learner_role

from alembic import op
import sqlalchemy as sa


revision = "6430_global_user_role_unique"
down_revision = "6429_canonical_learner_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "LOCK TABLE user_roles "
        "IN SHARE ROW EXCLUSIVE MODE"
    )

    op.execute(
        "WITH ranked_global_assignments AS ("
        " SELECT id,"
        " ROW_NUMBER() OVER ("
        " PARTITION BY user_id, role_id"
        " ORDER BY created_at, id"
        " ) AS duplicate_rank"
        " FROM user_roles"
        " WHERE organization_id IS NULL"
        ")"
        " DELETE FROM user_roles"
        " WHERE id IN ("
        " SELECT id"
        " FROM ranked_global_assignments"
        " WHERE duplicate_rank > 1"
        " )"
    )

    op.create_index(
        "uq_user_role_global",
        "user_roles",
        ["user_id", "role_id"],
        unique=True,
        postgresql_where=sa.text(
            "organization_id IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_user_role_global",
        table_name="user_roles",
    )
