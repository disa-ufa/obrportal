from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class RegistryObligation(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "registry_obligations"

    __table_args__ = (
        UniqueConstraint(
            "registry",
            "enrollment_id",
            name="uq_registry_obligation_registry_enrollment",
        ),
    )

    registry: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
    )

    enrollment_id: Mapped[str] = mapped_column(
        ForeignKey(
            "enrollments.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    document_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "document_records.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="pending_data",
        server_default="pending_data",
        index=True,
        nullable=False,
    )

    rule_code: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    rule_version: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    requirement_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    readiness_errors: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )

    due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    last_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )


class RegistrySubmissionAttempt(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "registry_submission_attempts"

    __table_args__ = (
        UniqueConstraint(
            "obligation_id",
            "attempt_no",
            name="uq_registry_submission_attempt_number",
        ),
    )

    obligation_id: Mapped[str] = mapped_column(
        ForeignKey(
            "registry_obligations.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    attempt_no: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    transport: Mapped[str] = mapped_column(
        String(32),
        default="file",
        server_default="file",
        nullable=False,
    )

    schema_version: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    snapshot_json: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )

    artifact_path: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )

    artifact_sha256: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    generated_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    generated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    submitted_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    external_reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    result_status: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    errors_json: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
