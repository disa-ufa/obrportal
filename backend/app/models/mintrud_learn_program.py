from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109 = "1.0.9"


class MintrudLearnProgram(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "mintrud_learn_programs"

    __table_args__ = (
        UniqueConstraint(
            "schema_version",
            "learn_program_id",
            name=(
                "uq_mintrud_learn_program_"
                "schema_version_program_id"
            ),
        ),
        UniqueConstraint(
            "schema_version",
            "code",
            name=(
                "uq_mintrud_learn_program_"
                "schema_version_code"
            ),
        ),
        CheckConstraint(
            "learn_program_id > 0",
            name=(
                "ck_mintrud_learn_program_"
                "positive_program_id"
            ),
        ),
    )

    learn_program_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(2048),
        nullable=False,
    )

    schema_version: Mapped[str] = mapped_column(
        String(32),
        default=MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )


class CourseMintrudLearnProgram(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "course_mintrud_learn_programs"

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "mintrud_learn_program_id",
            name=(
                "uq_course_mintrud_learn_program_"
                "course_program"
            ),
        ),
    )

    course_id: Mapped[str] = mapped_column(
        ForeignKey(
            "courses.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    mintrud_learn_program_id: Mapped[str] = mapped_column(
        ForeignKey(
            "mintrud_learn_programs.id",
            ondelete="RESTRICT",
        ),
        index=True,
        nullable=False,
    )
