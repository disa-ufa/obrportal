from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CourseLesson(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "course_lessons"

    __table_args__ = (
        UniqueConstraint("module_id", "position", name="uq_course_lesson_module_position"),
    )

    module_id: Mapped[str] = mapped_column(
        ForeignKey("course_modules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    content_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    editor_mode: Mapped[str] = mapped_column(String(32), default="legacy", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="published", nullable=False)
    published_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
