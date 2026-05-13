from __future__ import annotations

import asyncio
import os

from passlib.context import CryptContext
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization  # noqa: F401
from app.models.role import Role, UserRole
from app.models.user import User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"Environment variable {name} is required")

    return value


async def get_admin_role(session) -> Role:
    result = await session.execute(select(Role).where(Role.code == "admin"))
    role = result.scalar_one_or_none()

    if not role:
        raise RuntimeError("Role 'admin' not found. Run python -m app.db.seed first.")

    return role


async def get_or_create_admin_user(session, email: str, password: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    hashed_password = pwd_context.hash(password)

    if user:
        user.full_name = "Администратор ObrPortal"
        user.hashed_password = hashed_password
        user.is_active = True
        user.is_email_verified = True
        user.mfa_enabled = False
        return user

    user = User(
        email=email,
        phone=None,
        full_name="Администратор ObrPortal",
        hashed_password=hashed_password,
        is_active=True,
        is_email_verified=True,
        mfa_enabled=False,
    )
    session.add(user)
    await session.flush()

    return user


async def ensure_admin_role(session, user: User, role: Role) -> None:
    result = await session.execute(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.role_id == role.id,
            UserRole.organization_id.is_(None),
        )
    )
    exists = result.scalar_one_or_none()

    if exists:
        return

    session.add(
        UserRole(
            user_id=user.id,
            role_id=role.id,
            organization_id=None,
        )
    )


async def seed_admin() -> None:
    email = get_required_env("SEED_ADMIN_EMAIL")
    password = get_required_env("SEED_ADMIN_PASSWORD")

    async with AsyncSessionLocal() as session:
        admin_role = await get_admin_role(session)
        admin_user = await get_or_create_admin_user(session, email, password)
        await ensure_admin_role(session, admin_user, admin_role)

        await session.commit()

    print(f"Admin user is ready: {email}")


if __name__ == "__main__":
    asyncio.run(seed_admin())
