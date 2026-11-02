"""Draft-only knowledge-check protocol planning.

A draft is *not* a commission decision and does not authorize EISOT export.
No relationship to course completion or quiz result is inferred as legal evidence.
"""
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MintrudKnowledgeProtocol(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "mintrud_knowledge_protocols"
    __table_args__ = (
        UniqueConstraint("course_id", "protocol_date", "protocol_number", name="uq_mintrud_protocol_course_date_number"),
        CheckConstraint("status IN ('draft', 'recorded')", name="ck_mintrud_protocol_state"),
        UniqueConstraint("recording_request_id", name="uq_mintrud_protocol_recording_request"),
        CheckConstraint(
            "(status = 'draft' AND recorded_at IS NULL AND recorded_by_user_id IS NULL AND recording_request_id IS NULL AND recorded_snapshot IS NULL AND recorded_snapshot_sha256 IS NULL) OR "
            "(status = 'recorded' AND recorded_at IS NOT NULL AND recorded_by_user_id IS NOT NULL AND recording_request_id IS NOT NULL AND recorded_snapshot IS NOT NULL AND recorded_snapshot_sha256 IS NOT NULL)",
            name="ck_mintrud_protocol_recording_metadata",
        ),
    )

    course_id: Mapped[str] = mapped_column(ForeignKey("courses.id", ondelete="RESTRICT"), index=True, nullable=False)
    protocol_number: Mapped[str] = mapped_column(String(128), nullable=False)
    protocol_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", server_default="draft", nullable=False)
    commission_order_number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    commission_order_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    commission_chair: Mapped[str | None] = mapped_column(String(255), nullable=True)
    commission_members_json: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    # Explicit administrative recording after a real commission check; NOT a signature
    # and NOT an EISOT submission. A full source snapshot is frozen at this point.
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recorded_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    recording_request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    recorded_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recorded_snapshot_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)


class MintrudKnowledgeProtocolMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "mintrud_knowledge_protocol_members"
    __table_args__ = (
        UniqueConstraint("protocol_id", "enrollment_id", name="uq_mintrud_protocol_member_enrollment"),
        CheckConstraint("knowledge_check_result IS NULL OR knowledge_check_result IN ('satisfactory', 'unsatisfactory')", name="ck_mintrud_protocol_member_result"),
    )

    protocol_id: Mapped[str] = mapped_column(ForeignKey("mintrud_knowledge_protocols.id", ondelete="RESTRICT"), index=True, nullable=False)
    enrollment_id: Mapped[str] = mapped_column(ForeignKey("enrollments.id", ondelete="RESTRICT"), index=True, nullable=False)
    obligation_id: Mapped[str] = mapped_column(ForeignKey("registry_obligations.id", ondelete="RESTRICT"), index=True, nullable=False)
    # Explicit legal confirmation is a later step; never derive from quiz submissions.
    knowledge_check_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    knowledge_check_result: Mapped[str | None] = mapped_column(String(32), nullable=True)
