from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class RegistrySubmissionBatch(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "registry_submission_batches"

    __table_args__ = (
        CheckConstraint(
            "registry IN ('mintrud', 'frdo')",
            name="ck_registry_submission_batch_registry",
        ),
        CheckConstraint(
            (
                "status IN "
                "('exported', 'imported', 'submitted') AND (registry = 'mintrud' OR status != 'imported')"
            ),
            name="ck_registry_submission_batch_status",
        ),
        CheckConstraint(
            "artifact_kind = 'portal-upload-artifact'",
            name="ck_registry_submission_batch_artifact_kind",
        ),
        CheckConstraint(
            "transport = 'file'",
            name="ck_registry_submission_batch_transport",
        ),
        CheckConstraint(
            "((registry = 'mintrud' AND schema_version = '1.0.9') OR (registry = 'frdo' AND schema_version = 'frdo-po-working-reference-v1'))",
            name="ck_registry_submission_batch_schema_version",
        ),
        CheckConstraint(
            "obligation_count >= 1",
            name="ck_registry_submission_batch_obligation_count",
        ),
        CheckConstraint(
            "((registry = 'mintrud' AND record_count BETWEEN 1 AND 5000) OR (registry = 'frdo' AND record_count BETWEEN 1 AND 1001))",
            name="ck_registry_submission_batch_record_count",
        ),
    )

    registry: Mapped[str] = mapped_column(
        String(32),
        default="mintrud",
        server_default="mintrud",
        index=True,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="exported",
        server_default="exported",
        index=True,
        nullable=False,
    )

    artifact_kind: Mapped[str] = mapped_column(
        String(32),
        default="portal-upload-artifact",
        server_default="portal-upload-artifact",
        nullable=False,
    )

    transport: Mapped[str] = mapped_column(
        String(32),
        default="file",
        server_default="file",
        nullable=False,
    )

    schema_version: Mapped[str] = mapped_column(
        String(64),
        default="1.0.9",
        server_default="1.0.9",
        nullable=False,
    )

    obligation_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    record_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    artifact_path: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
    )

    artifact_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    generated_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        nullable=False,
    )

    imported_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    imported_at: Mapped[datetime | None] = mapped_column(
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

    reconciled_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    reconciled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class RegistrySubmissionBatchItem(
    Base,
    UUIDPrimaryKeyMixin,
):
    __tablename__ = "registry_submission_batch_items"

    __table_args__ = (
        UniqueConstraint(
            "batch_id",
            "obligation_id",
            name=(
                "uq_registry_submission_batch_item_"
                "batch_obligation"
            ),
        ),
        UniqueConstraint(
            "batch_id",
            "position",
            name=(
                "uq_registry_submission_batch_item_"
                "batch_position"
            ),
        ),
        CheckConstraint(
            "position >= 0",
            name="ck_registry_submission_batch_item_position",
        ),
        CheckConstraint(
            "record_count >= 1",
            name=(
                "ck_registry_submission_batch_item_"
                "record_count"
            ),
        ),
        CheckConstraint(
            (
                "result_status IS NULL OR "
                "result_status IN "
                "('accepted', 'rejected', 'correction_required')"
            ),
            name=(
                "ck_registry_submission_batch_item_"
                "result_status"
            ),
        ),
    )

    batch_id: Mapped[str] = mapped_column(
        ForeignKey(
            "registry_submission_batches.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    obligation_id: Mapped[str] = mapped_column(
        ForeignKey(
            "registry_obligations.id",
        ),
        index=True,
        nullable=False,
    )

    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    approval_snapshot_json: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    approval_fingerprint: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    record_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
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

    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    result_recorded_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        index=True,
        nullable=True,
    )

    result_recorded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        nullable=False,
    )
