from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AssignmentSubmission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "assignment_submissions"

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id",
            "block_id",
            name="uq_assignment_submission_enrollment_block",
        ),
    )

    enrollment_id: Mapped[str] = mapped_column(
        ForeignKey("enrollments.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
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

    status: Mapped[str] = mapped_column(String(32), default="completed", nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    submitted_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
