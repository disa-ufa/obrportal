from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ImportBatch(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One uploaded learner import file and its processing summary."""

    __tablename__ = "import_batches"

    import_type: Mapped[str] = mapped_column(String(64), default="learner_roster", nullable=False)
    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)

    organization_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    learning_group_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("learning_groups.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    course_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("courses.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_users_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_users_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_profiles_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_profiles_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_enrollments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    uploaded_by_user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    rows = relationship("ImportRow", back_populates="batch", cascade="all, delete-orphan")


class ImportRow(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One parsed row from an import file with validation result and mapping refs."""

    __tablename__ = "import_rows"

    batch_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("import_batches.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    raw_data_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    normalized_data_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    validation_errors_json: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    learner_profile_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("learner_profiles.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    enrollment_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("enrollments.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    batch = relationship("ImportBatch", back_populates="rows")
