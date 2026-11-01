"""Persistence for registry applicability decisions and their audit events.

This is an additive schema foundation. Existing registry obligations and
submission artifacts are not rewritten or implicitly reclassified.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
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
    utcnow,
)


class RegistryApplicabilityRecord(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "registry_applicability"

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id",
            "registry",
            name="uq_registry_applicability_enrollment_registry",
        ),
        CheckConstraint(
            "registry IN ('frdo', 'mintrud')",
            name="ck_registry_applicability_registry",
        ),
        CheckConstraint(
            "decision IN ('required', 'not_required', 'needs_review')",
            name="ck_registry_applicability_decision",
        ),
        CheckConstraint(
            "source IN ('auto', 'manual', 'legacy')",
            name="ck_registry_applicability_source",
        ),
        CheckConstraint(
            "decision_version >= 1",
            name="ck_registry_applicability_version",
        ),
    )

    enrollment_id: Mapped[str] = mapped_column(
        ForeignKey("enrollments.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    registry: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(32),
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
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    input_fingerprint: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    decided_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    decision_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )


class RegistryApplicabilityEvent(
    Base,
    UUIDPrimaryKeyMixin,
):
    """Append-only evidence; PostgreSQL prevents UPDATE and DELETE."""

    __tablename__ = "registry_applicability_events"

    __table_args__ = (
        UniqueConstraint(
            "applicability_id",
            "decision_version",
            name="uq_registry_applicability_event_version",
        ),
        CheckConstraint(
            "registry IN ('frdo', 'mintrud')",
            name="ck_registry_applicability_event_registry",
        ),
        CheckConstraint(
            "decision IN ('required', 'not_required', 'needs_review')",
            name="ck_registry_applicability_event_decision",
        ),
        CheckConstraint(
            "source IN ('auto', 'manual', 'legacy')",
            name="ck_registry_applicability_event_source",
        ),
        CheckConstraint(
            "decision_version >= 1",
            name="ck_registry_applicability_event_version",
        ),
    )

    applicability_id: Mapped[str] = mapped_column(
        ForeignKey("registry_applicability.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    enrollment_id: Mapped[str] = mapped_column(
        ForeignKey("enrollments.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    registry: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(32),
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
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    input_fingerprint: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    decided_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    decision_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
