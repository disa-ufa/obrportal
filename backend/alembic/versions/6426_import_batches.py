"""add import batches and rows

Revision ID: 6426_import_batches
Revises: 6425_learner_profiles
Create Date: 2026-07-07
"""

from alembic import op
import sqlalchemy as sa


revision = "6426_import_batches"
down_revision = "6425_learner_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "import_batches",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("import_type", sa.String(length=64), server_default="learner_roster", nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=True),
        sa.Column("source_content_type", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=True),
        sa.Column("learning_group_id", sa.String(length=36), nullable=True),
        sa.Column("course_id", sa.String(length=36), nullable=True),
        sa.Column("total_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("valid_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("invalid_rows", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_users_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_users_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_profiles_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_profiles_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_enrollments_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("uploaded_by_user_id", sa.String(length=36), nullable=True),
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
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["learning_group_id"], ["learning_groups.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_import_batches_organization_id"), "import_batches", ["organization_id"], unique=False)
    op.create_index(op.f("ix_import_batches_learning_group_id"), "import_batches", ["learning_group_id"], unique=False)
    op.create_index(op.f("ix_import_batches_course_id"), "import_batches", ["course_id"], unique=False)
    op.create_index(op.f("ix_import_batches_uploaded_by_user_id"), "import_batches", ["uploaded_by_user_id"], unique=False)

    op.create_table(
        "import_rows",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("batch_id", sa.String(length=36), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("raw_data_json", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("normalized_data_json", sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("validation_errors_json", sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("learner_profile_id", sa.String(length=36), nullable=True),
        sa.Column("enrollment_id", sa.String(length=36), nullable=True),
        sa.Column("error_summary", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["batch_id"], ["import_batches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["learner_profile_id"], ["learner_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("batch_id", "row_number", name="uq_import_rows_batch_row_number"),
    )
    op.create_index(op.f("ix_import_rows_batch_id"), "import_rows", ["batch_id"], unique=False)
    op.create_index(op.f("ix_import_rows_user_id"), "import_rows", ["user_id"], unique=False)
    op.create_index(op.f("ix_import_rows_learner_profile_id"), "import_rows", ["learner_profile_id"], unique=False)
    op.create_index(op.f("ix_import_rows_enrollment_id"), "import_rows", ["enrollment_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_import_rows_enrollment_id"), table_name="import_rows")
    op.drop_index(op.f("ix_import_rows_learner_profile_id"), table_name="import_rows")
    op.drop_index(op.f("ix_import_rows_user_id"), table_name="import_rows")
    op.drop_index(op.f("ix_import_rows_batch_id"), table_name="import_rows")
    op.drop_table("import_rows")

    op.drop_index(op.f("ix_import_batches_uploaded_by_user_id"), table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_course_id"), table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_learning_group_id"), table_name="import_batches")
    op.drop_index(op.f("ix_import_batches_organization_id"), table_name="import_batches")
    op.drop_table("import_batches")
