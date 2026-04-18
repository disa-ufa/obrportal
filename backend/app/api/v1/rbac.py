from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.role import Permission, RolePermission, UserRole
from app.models.user import User


async def get_user_permission_codes(
    user: User,
    session: AsyncSession,
) -> set[str]:
    result = await session.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user.id)
        .order_by(Permission.code)
    )

    return {row.code for row in result.all()}


def require_permission(permission_code: str) -> Callable:
    async def dependency(
        current_user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_db),
    ) -> User:
        permissions = await get_user_permission_codes(current_user, session)

        if permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission_code}",
            )

        return current_user

    return dependency
