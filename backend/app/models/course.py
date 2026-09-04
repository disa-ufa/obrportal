from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "courses"

    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    format: Mapped[str | None] = mapped_column(String(64), nullable=True)
    document_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    direction: Mapped[str | None] = mapped_column(String(128), nullable=True)
    regulatory_program_type: Mapped[str] = mapped_column(
        String(64),
        default="unspecified",
        server_default="unspecified",
        nullable=False,
    )
    frdo_requirement_mode: Mapped[str] = mapped_column(
        String(32),
        default="auto",
        server_default="auto",
        nullable=False,
    )
    mintrud_requirement_mode: Mapped[str] = mapped_column(
        String(32),
        default="auto",
        server_default="auto",
        nullable=False,
    )
    cover_image_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)