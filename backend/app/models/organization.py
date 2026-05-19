from sqlalchemy import String
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
    document_issuer_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    document_signer_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_signer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_basis: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    document_place: Mapped[str | None] = mapped_column(String(255), nullable=True)
