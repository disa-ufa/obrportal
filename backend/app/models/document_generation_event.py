from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utcnow


class DocumentGenerationEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "document_generation_events"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("document_records.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    template_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    generated_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
