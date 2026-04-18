from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import get_user_permission_codes, require_permission
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.role import Permission, Role, UserRole
from app.models.user import User
from app.schemas.admin import (
    AdminAuditEventItem,
    AdminPermissionItem,
    AdminRoleItem,
    AdminUserItem,
    AdminUserRoleItem,
)


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


@router.get("/users", response_model=list[AdminUserItem])
async def list_users(
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminUserItem]:
    users_result = await session.execute(select(User).order_by(User.email))
    users = users_result.scalars().all()

    response: list[AdminUserItem] = []

    for user in users:
        roles_result = await session.execute(
            select(Role.code, Role.name, UserRole.organization_id)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user.id)
            .order_by(Role.code)
        )

        roles = [
            AdminUserRoleItem(
                code=row.code,
                name=row.name,
                organization_id=str(row.organization_id) if row.organization_id else None,
            )
            for row in roles_result.all()
        ]

        response.append(
            AdminUserItem(
                id=str(user.id),
                email=user.email,
                phone=user.phone,
                full_name=user.full_name,
                is_active=user.is_active,
                is_email_verified=user.is_email_verified,
                mfa_enabled=user.mfa_enabled,
                roles=roles,
            )
        )

    return response


@router.get("/roles", response_model=list[AdminRoleItem])
async def list_roles(
    _: User = Depends(require_permission("admin.roles.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminRoleItem]:
    result = await session.execute(select(Role).order_by(Role.code))
    roles = result.scalars().all()

    return [
        AdminRoleItem(
            id=str(role.id),
            code=role.code,
            name=role.name,
            description=role.description,
        )
        for role in roles
    ]


@router.get("/permissions", response_model=list[AdminPermissionItem])
async def list_permissions(
    _: User = Depends(require_permission("admin.roles.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminPermissionItem]:
    result = await session.execute(select(Permission).order_by(Permission.code))
    permissions = result.scalars().all()

    return [
        AdminPermissionItem(
            id=str(permission.id),
            code=permission.code,
            name=permission.name,
            description=getattr(permission, "description", None),
        )
        for permission in permissions
    ]


@router.get("/audit-events", response_model=list[AdminAuditEventItem])
async def list_audit_events(
    _: User = Depends(require_permission("audit.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminAuditEventItem]:
    result = await session.execute(
        select(AuditEvent)
        .order_by(AuditEvent.created_at.desc())
        .limit(50)
    )
    events = result.scalars().all()

    return [
        AdminAuditEventItem(
            id=str(event.id),
            action=event.action,
            actor_user_id=str(event.actor_user_id) if event.actor_user_id else None,
            entity_type=event.entity_type,
            entity_id=str(event.entity_id) if event.entity_id else None,
            ip_address=event.ip_address,
            user_agent=event.user_agent,
            payload=event.payload or {},
            created_at=event.created_at,
        )
        for event in events
    ]
