from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class EnrollmentEmploymentDetails(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "enrollment_employment_details"
    __table_args__ = (
        CheckConstraint(
            "reporting_scenario IN ('external_training_provider', 'employer_self_training')",
            name="ck_employment_reporting_scenario",
        ),
    )

    enrollment_id: Mapped[str] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"), unique=True, nullable=False,
    )
    profession_or_position: Mapped[str | None] = mapped_column(String(255))
    employer_name: Mapped[str | None] = mapped_column(String(512))
    employer_inn: Mapped[str | None] = mapped_column(String(12))
    source: Mapped[str | None] = mapped_column(String(32))
    # Administrative course-enrollment policy. It does not certify the learner's entries.
    reporting_scenario: Mapped[str | None] = mapped_column(String(32))
