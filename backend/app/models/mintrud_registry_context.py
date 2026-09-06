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


MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER = (
    "external_training_provider"
)

MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING = (
    "employer_self_training"
)

MINTRUD_REPORTING_SCENARIOS = frozenset(
    {
        MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER,
        MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING,
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
        CheckConstraint(
            (
                "reporting_scenario IS NULL "
                "OR reporting_scenario IN "
                "('external_training_provider', "
                "'employer_self_training')"
            ),
            name=(
                "ck_mintrud_registry_context_"
                "reporting_scenario"
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

    # Paragraph 118 distinguishes:
    # - an accredited external training provider;
    # - an employer training its own workers.
    #
    # Employer name/INN are required only in the first
    # scenario, so readiness must never infer the scenario
    # from Enrollment.organization_id.
    reporting_scenario: Mapped[str | None] = (
        mapped_column(
            String(32),
            nullable=True,
        )
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
