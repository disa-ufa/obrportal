from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import get_user_permission_codes, require_permission
from app.db.session import get_db
from app.models.user import User


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/rbac-check")
async def rbac_check(
    current_user: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    permissions = await get_user_permission_codes(current_user, session)

    return {
        "status": "ok",
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
        },
        "required_permission": "admin.users.read",
        "permissions_count": len(permissions),
        "has_permission": "admin.users.read" in permissions,
    }
