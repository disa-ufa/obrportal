"""Compliance registry domain foundation.

Revision ID: 20260904_compliance_registry
Revises: 20260827_course_cover_image
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260904_compliance_registry"
down_revision: Union[str, None] = (
    "20260827_course_cover_image"
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "regulatory_program_type",
            sa.String(length=64),
            server_default="unspecified",
            nullable=False,
        ),
    )

    op.add_column(
        "courses",
        sa.Column(
            "frdo_requirement_mode",
            sa.String(length=32),
            server_default="auto",
            nullable=False,
        ),
    )

    op.add_column(
        "courses",
        sa.Column(
            "mintrud_requirement_mode",
            sa.String(length=32),
            server_default="auto",
            nullable=False,
        ),
    )

    op.create_table(
        "registry_obligations",
        sa.Column(
            "registry",
            sa.String(length=32),
            nullable=False,
        ),
        sa.Column(
            "enrollment_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            sa.String(length=36),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="pending_data",
            nullable=False,
        ),
        sa.Column(
            "rule_code",
            sa.String(length=128),
            nullable=True,
        ),
        sa.Column(
            "rule_version",
            sa.String(length=64),
            nullable=True,
        ),
        sa.Column(
            "requirement_reason",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "readiness_errors",
            sa.JSON(),
            nullable=False,
        ),
        sa.Column(
            "due_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "approved_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
        sa.Column(
            "approved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "external_id",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "last_error",
            sa.Text(),
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
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["approved_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["document_records.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["enrollment_id"],
            ["enrollments.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "registry",
            "enrollment_id",
            name=(
                "uq_registry_obligation_"
                "registry_enrollment"
            ),
        ),
    )

    op.create_index(
        "ix_registry_obligations_registry",
        "registry_obligations",
        ["registry"],
        unique=False,
    )

    op.create_index(
        "ix_registry_obligations_enrollment_id",
        "registry_obligations",
        ["enrollment_id"],
        unique=False,
    )

    op.create_index(
        "ix_registry_obligations_document_id",
        "registry_obligations",
        ["document_id"],
        unique=False,
    )

    op.create_index(
        "ix_registry_obligations_status",
        "registry_obligations",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_registry_obligations_approved_by_user_id",
        "registry_obligations",
        ["approved_by_user_id"],
        unique=False,
    )

    op.create_table(
        "registry_submission_attempts",
        sa.Column(
            "obligation_id",
            sa.String(length=36),
            nullable=False,
        ),
        sa.Column(
            "attempt_no",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "transport",
            sa.String(length=32),
            server_default="file",
            nullable=False,
        ),
        sa.Column(
            "schema_version",
            sa.String(length=64),
            nullable=True,
        ),
        sa.Column(
            "snapshot_json",
            sa.JSON(),
            nullable=False,
        ),
        sa.Column(
            "artifact_path",
            sa.String(length=1024),
            nullable=True,
        ),
        sa.Column(
            "artifact_sha256",
            sa.String(length=64),
            nullable=True,
        ),
        sa.Column(
            "generated_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "submitted_by_user_id",
            sa.String(length=36),
            nullable=True,
        ),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "external_reference",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "result_status",
            sa.String(length=32),
            nullable=True,
        ),
        sa.Column(
            "errors_json",
            sa.JSON(),
            nullable=False,
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
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["generated_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["obligation_id"],
            ["registry_obligations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["submitted_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "obligation_id",
            "attempt_no",
            name=(
                "uq_registry_submission_attempt_number"
            ),
        ),
    )

    op.create_index(
        "ix_registry_submission_attempts_obligation_id",
        "registry_submission_attempts",
        ["obligation_id"],
        unique=False,
    )

    op.create_index(
        "ix_registry_submission_attempts_generated_by_user_id",
        "registry_submission_attempts",
        ["generated_by_user_id"],
        unique=False,
    )

    op.create_index(
        "ix_registry_submission_attempts_submitted_by_user_id",
        "registry_submission_attempts",
        ["submitted_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_registry_submission_attempts_submitted_by_user_id",
        table_name="registry_submission_attempts",
    )

    op.drop_index(
        "ix_registry_submission_attempts_generated_by_user_id",
        table_name="registry_submission_attempts",
    )

    op.drop_index(
        "ix_registry_submission_attempts_obligation_id",
        table_name="registry_submission_attempts",
    )

    op.drop_table(
        "registry_submission_attempts"
    )

    op.drop_index(
        "ix_registry_obligations_approved_by_user_id",
        table_name="registry_obligations",
    )

    op.drop_index(
        "ix_registry_obligations_status",
        table_name="registry_obligations",
    )

    op.drop_index(
        "ix_registry_obligations_document_id",
        table_name="registry_obligations",
    )

    op.drop_index(
        "ix_registry_obligations_enrollment_id",
        table_name="registry_obligations",
    )

    op.drop_index(
        "ix_registry_obligations_registry",
        table_name="registry_obligations",
    )

    op.drop_table("registry_obligations")

    op.drop_column(
        "courses",
        "mintrud_requirement_mode",
    )

    op.drop_column(
        "courses",
        "frdo_requirement_mode",
    )

    op.drop_column(
        "courses",
        "regulatory_program_type",
    )
