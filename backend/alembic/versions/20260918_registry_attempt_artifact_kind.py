"""Add registry submission artifact kind.

Revision ID: 20260918_registry_artifact_kind
Revises: 20260917_mintrud_programs
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_registry_artifact_kind"
down_revision: Union[str, None] = (
    "20260917_mintrud_programs"
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "registry_submission_attempts",
        sa.Column(
            "artifact_kind",
            sa.String(length=32),
            server_default=(
                "internal-export-package"
            ),
            nullable=False,
        ),
    )

    op.create_check_constraint(
        (
            "ck_registry_submission_attempt_"
            "artifact_kind"
        ),
        "registry_submission_attempts",
        (
            "artifact_kind IN "
            "('internal-export-package', "
            "'portal-upload-artifact')"
        ),
    )


def downgrade() -> None:
    op.drop_constraint(
        (
            "ck_registry_submission_attempt_"
            "artifact_kind"
        ),
        "registry_submission_attempts",
        type_="check",
    )

    op.drop_column(
        "registry_submission_attempts",
        "artifact_kind",
    )
