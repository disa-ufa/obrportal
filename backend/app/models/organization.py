from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organizations"

    inn: Mapped[str] = mapped_column(String(12), unique=True, index=True, nullable=False)
    kpp: Mapped[str | None] = mapped_column(String(9), nullable=True)
    ogrn: Mapped[str | None] = mapped_column(String(15), nullable=True)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    legal_address: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    actual_address: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    description: Mapped[str | None] = mapped_column(String(4096), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(128), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    website: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    document_issuer_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    document_signer_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_signer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_basis: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    document_place: Mapped[str | None] = mapped_column(String(255), nullable=True)


class OrganizationActivityDirection(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "organization_activity_directions"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_org_activity_direction_org_name",
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )


class OrganizationService(
    Base,
    UUIDPrimaryKeyMixin,
    TimestampMixin,
):
    __tablename__ = "organization_services"

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_org_service_org_name",
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
