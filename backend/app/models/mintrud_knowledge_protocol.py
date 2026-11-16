"""Mintrud knowledge-check protocol draft, recorded check and signing evidence.

Recording a commission result does not sign or export the protocol. A signed
attestation does not cryptographically sign the paper document, and the optional
scan is stored privately.
"""
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MintrudKnowledgeProtocol(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "mintrud_knowledge_protocols"
    __table_args__ = (
        UniqueConstraint("course_id", "protocol_date", "protocol_number", name="uq_mintrud_protocol_course_date_number"),
        CheckConstraint("status IN ('draft', 'recorded')", name="ck_mintrud_protocol_state"),
        UniqueConstraint("recording_request_id", name="uq_mintrud_protocol_recording_request"),
        UniqueConstraint("signing_request_id", name="uq_mintrud_protocol_signing_request"),
        CheckConstraint(
            "(signed_at IS NULL AND signed_on IS NULL AND signed_by_user_id IS NULL "
            "AND signing_request_id IS NULL AND signed_source_sha256 IS NULL) OR "
            "(status = 'recorded' AND signed_at IS NOT NULL AND signed_on IS NOT NULL "
            "AND signed_by_user_id IS NOT NULL AND signing_request_id IS NOT NULL "
            "AND signed_source_sha256 IS NOT NULL AND signed_source_sha256 = recorded_snapshot_sha256)",
            name="ck_mintrud_protocol_signing_metadata",
        ),
        CheckConstraint(
            "(signed_scan_path IS NULL AND signed_scan_sha256 IS NULL "
            "AND signed_scan_size IS NULL AND signed_scan_media_type IS NULL AND signed_scan_uploaded_at IS NULL "
            "AND signed_scan_uploaded_by_user_id IS NULL) OR "
            "(signed_at IS NOT NULL AND signed_scan_path IS NOT NULL "
            "AND signed_scan_sha256 IS NOT NULL AND signed_scan_size IS NOT NULL AND signed_scan_media_type IS NOT NULL "
            "AND signed_scan_uploaded_at IS NOT NULL AND signed_scan_uploaded_by_user_id IS NOT NULL)",
            name="ck_mintrud_protocol_signed_scan_metadata",
        ),
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

    # A confirmed paper signature is an attestation, NOT a cryptographic signature.
    # Keep status='recorded' to preserve the existing immutable commission snapshot.
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    signed_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    signing_request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    signed_source_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Optional private, immutable one-time attachment; adding it never changes results.
    signed_scan_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    signed_scan_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    signed_scan_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    signed_scan_media_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    signed_scan_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_scan_uploaded_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)


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
