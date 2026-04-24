from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DocumentRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "document_records"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    course_id: Mapped[str | None] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    enrollment_id: Mapped[str | None] = mapped_column(
        ForeignKey("enrollments.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    document_number: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="available", nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)