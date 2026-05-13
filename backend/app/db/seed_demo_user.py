from __future__ import annotations

import asyncio
import os

from app.core.security import get_password_hash
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.organization import Organization  # noqa: F401
from app.models.role import Role, UserRole
from app.models.user import User


def get_required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(f"Environment variable {name} is required")

    return value


async def seed_demo_user() -> None:
    email = get_required_env("SEED_DEMO_EMAIL")
    password = get_required_env("SEED_DEMO_PASSWORD")
    role_code = os.getenv("SEED_DEMO_ROLE", "learner_fl")

    async with AsyncSessionLocal() as session:
        role_result = await session.execute(select(Role).where(Role.code == role_code))
        role = role_result.scalar_one_or_none()

        if not role:
            raise RuntimeError(f"Role '{role_code}' not found. Run python -m app.db.seed first.")

        user_result = await session.execute(select(User).where(User.email == email))
        user = user_result.scalar_one_or_none()

        if user:
            user.full_name = "Тестовый пользователь"
            user.hashed_password = get_password_hash(password)
            user.is_active = True
            user.is_email_verified = True
            user.mfa_enabled = False
        else:
            user = User(
                email=email,
                phone=None,
                full_name="Тестовый пользователь",
                hashed_password=get_password_hash(password),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )
            session.add(user)
            await session.flush()

        existing_role_result = await session.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == role.id,
                UserRole.organization_id.is_(None),
            )
        )
        existing_role = existing_role_result.scalar_one_or_none()

        if not existing_role:
            session.add(
                UserRole(
                    user_id=user.id,
                    role_id=role.id,
                    organization_id=None,
                )
            )

        await session.commit()

    print(f"Demo user is ready: {email} / role={role_code}")


if __name__ == "__main__":
    asyncio.run(seed_demo_user())
