from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LessonBlock(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "lesson_blocks"

    __table_args__ = (
        UniqueConstraint("lesson_id", "position", name="uq_lesson_block_lesson_position"),
    )

    lesson_id: Mapped[str] = mapped_column(
        ForeignKey("course_lessons.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    block_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    settings_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
