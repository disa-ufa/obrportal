from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LearningGroup(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_groups"

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_learning_group_org_name"),
        UniqueConstraint("organization_id", "code", name="uq_learning_group_org_code"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class LearningGroupMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "learning_group_members"

    __table_args__ = (
        UniqueConstraint(
            "learning_group_id",
            "user_id",
            name="uq_learning_group_member_group_user",
        ),
    )

    learning_group_id: Mapped[str] = mapped_column(
        ForeignKey("learning_groups.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
