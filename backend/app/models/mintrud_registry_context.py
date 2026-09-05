from datetime import date

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


MINTRUD_KNOWLEDGE_CHECK_RESULT_SATISFACTORY = (
    "satisfactory"
)

MINTRUD_KNOWLEDGE_CHECK_RESULT_UNSATISFACTORY = (
    "unsatisfactory"
)

MINTRUD_KNOWLEDGE_CHECK_RESULTS = frozenset(
    {
        MINTRUD_KNOWLEDGE_CHECK_RESULT_SATISFACTORY,
        MINTRUD_KNOWLEDGE_CHECK_RESULT_UNSATISFACTORY,
    }
)


class MintrudRegistryContext(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    """Editable source data specific to one Mintrud obligation.

    Person identity and the training program remain canonical in
    LearnerProfile and Course. This model stores only data that is
    specific to the worker's concrete occupational-safety training
    and knowledge-check event.

    RegistrySubmissionAttempt later freezes the complete immutable
    export snapshot.
    """

    __tablename__ = "mintrud_registry_contexts"

    __table_args__ = (
        UniqueConstraint(
            "obligation_id",
            name=(
                "uq_mintrud_registry_context_"
                "obligation_id"
            ),
        ),
        CheckConstraint(
            (
                "knowledge_check_result IS NULL "
                "OR knowledge_check_result IN "
                "('satisfactory', 'unsatisfactory')"
            ),
            name=(
                "ck_mintrud_registry_context_"
                "knowledge_check_result"
            ),
        ),
    )

    obligation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "registry_obligations.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    profession_or_position: Mapped[str | None] = (
        mapped_column(
            String(255),
            nullable=True,
        )
    )

    # Required by paragraph 118(a) when the training
    # provider trains a worker sent by an external
    # employer. They remain nullable at the storage layer
    # because paragraph 118(b) covers self-training by an
    # employer and does not contain these two export fields.
    employer_name: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    employer_inn: Mapped[str | None] = mapped_column(
        String(12),
        nullable=True,
    )

    knowledge_check_result: Mapped[str | None] = (
        mapped_column(
            String(32),
            nullable=True,
        )
    )

    knowledge_check_date: Mapped[date | None] = (
        mapped_column(
            Date,
            nullable=True,
        )
    )

    protocol_number: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
