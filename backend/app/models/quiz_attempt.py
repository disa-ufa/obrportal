from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class QuizAttempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "quiz_attempts"

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id",
            "block_id",
            "attempt_number",
            name="uq_quiz_attempt_enrollment_block_attempt",
        ),
    )

    enrollment_id: Mapped[str] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("course_lessons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    block_id: Mapped[str] = mapped_column(
        ForeignKey("lesson_blocks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="submitted", nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    earned_points: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    total_points: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pass_score_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answers_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    result_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    submitted_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
