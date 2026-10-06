from __future__ import annotations

from sqlalchemy import (
    JSON,
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


class FrdoRegistryContext(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    """Editable FRDO-specific data for one registry obligation.

    Canonical learner identity, course data, training period, and
    core document data remain in their existing domain models.
    This model stores only FRDO-specific reporting context.

    Approval later freezes the complete export snapshot.
    """

    __tablename__ = "frdo_registry_contexts"

    __table_args__ = (
        UniqueConstraint(
            "obligation_id",
            name=(
                "uq_frdo_registry_context_"
                "obligation_id"
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

    document_status: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    loss_confirmation: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    exchange_confirmation: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    destruction_confirmation: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    study_form: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    funding_source: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    education_delivery_form: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    po_program_type: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    po_profession: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    po_qualification: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    dpo_professional_activity_area: Mapped[str | None] = (
        mapped_column(
            String(512),
            nullable=True,
        )
    )

    dpo_enlarged_specialty_group: Mapped[str | None] = (
        mapped_column(
            String(512),
            nullable=True,
        )
    )

    dpo_qualification: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    prior_education_snapshot_json: Mapped[dict | None] = (
        mapped_column(
            JSON,
            nullable=True,
        )
    )

    original_document_snapshot_json: Mapped[dict | None] = (
        mapped_column(
            JSON,
            nullable=True,
        )
    )
