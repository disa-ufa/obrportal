from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LearnerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Personal learner data used for documents and regulatory registry preparation.

    The User model stays responsible only for authentication/account access.
    This profile stores identity data that may be required later for issued
    documents, FRDO staging, Mintrud/labor-safety registry exports, and import
    validation.
    """

    __tablename__ = "learner_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    last_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    middle_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)
    citizenship_country_code: Mapped[str | None] = mapped_column(
        String(3),
        nullable=True,
    )

    snils: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    identity_document_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    identity_document_series: Mapped[str | None] = mapped_column(String(32), nullable=True)
    identity_document_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    identity_document_issued_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    identity_document_issued_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    identity_document_department_code: Mapped[str | None] = mapped_column(String(32), nullable=True)

    identity_document_status: Mapped[str] = mapped_column(String(32), default="not_provided", nullable=False)
    education_document_status: Mapped[str] = mapped_column(String(32), default="not_provided", nullable=False)

    personal_data_basis: Mapped[str | None] = mapped_column(String(64), nullable=True)
    personal_data_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    source: Mapped[str] = mapped_column(String(64), default="manual", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User")
