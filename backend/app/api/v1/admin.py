from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import get_user_permission_codes, require_permission
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.organization import Organization
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User
from app.schemas.admin import (
    AdminAuditEventItem,
    AdminOrganizationDetail,
    AdminOrganizationItem,
    AdminPermissionDetail,
    AdminPermissionItem,
    AdminPermissionRoleItem,
    AdminRoleDetail,
    AdminRoleItem,
    AdminRolePermissionItem,
    AdminUserDetail,
    AdminUserItem,
    AdminUserRoleItem,
)


router = APIRouter(prefix="/admin", tags=["admin"])


async def get_user_roles(
    user_id: str,
    session: AsyncSession,
) -> list[AdminUserRoleItem]:
    roles_result = await session.execute(
        select(Role.code, Role.name, UserRole.organization_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
        .order_by(Role.code)
    )

    return [
        AdminUserRoleItem(
            code=row.code,
            name=row.name,
            organization_id=str(row.organization_id) if row.organization_id else None,
        )
        for row in roles_result.all()
    ]


async def get_role_permissions(
    role_id: str,
    session: AsyncSession,
) -> list[AdminRolePermissionItem]:
    result = await session.execute(
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id)
        .order_by(Permission.code)
    )
    permissions = result.scalars().all()

    return [
        AdminRolePermissionItem(
            id=str(permission.id),
            code=permission.code,
            name=permission.name,
        )
        for permission in permissions
    ]


async def get_permission_roles(
    permission_id: str,
    session: AsyncSession,
) -> list[AdminPermissionRoleItem]:
    result = await session.execute(
        select(Role)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .where(RolePermission.permission_id == permission_id)
        .order_by(Role.code)
    )
    roles = result.scalars().all()

    return [
        AdminPermissionRoleItem(
            id=str(role.id),
            code=role.code,
            name=role.name,
            description=role.description,
        )
        for role in roles
    ]


def build_admin_user_item(
    user: User,
    roles: list[AdminUserRoleItem],
) -> AdminUserItem:
    return AdminUserItem(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        full_name=user.full_name,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        mfa_enabled=user.mfa_enabled,
        roles=roles,
    )


def build_admin_user_detail(
    user: User,
    roles: list[AdminUserRoleItem],
) -> AdminUserDetail:
    return AdminUserDetail(
        id=str(user.id),
        email=user.email,
        phone=user.phone,
        full_name=user.full_name,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        mfa_enabled=user.mfa_enabled,
        roles=roles,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def build_admin_organization_item(
    organization: Organization,
) -> AdminOrganizationItem:
    return AdminOrganizationItem(
        id=str(organization.id),
        inn=organization.inn,
        kpp=organization.kpp,
        ogrn=organization.ogrn,
        name=organization.name,
        legal_address=organization.legal_address,
        actual_address=organization.actual_address,
    )


def build_admin_organization_detail(
    organization: Organization,
) -> AdminOrganizationDetail:
    return AdminOrganizationDetail(
        id=str(organization.id),
        inn=organization.inn,
        kpp=organization.kpp,
        ogrn=organization.ogrn,
        name=organization.name,
        legal_address=organization.legal_address,
        actual_address=organization.actual_address,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
    )


def build_admin_role_detail(
    role: Role,
    permissions: list[AdminRolePermissionItem],
) -> AdminRoleDetail:
    return AdminRoleDetail(
        id=str(role.id),
        code=role.code,
        name=role.name,
        description=role.description,
        permissions=permissions,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


def build_admin_permission_detail(
    permission: Permission,
    roles: list[AdminPermissionRoleItem],
) -> AdminPermissionDetail:
    return AdminPermissionDetail(
        id=str(permission.id),
        code=permission.code,
        name=permission.name,
        description=getattr(permission, "description", None),
        roles=roles,
        created_at=permission.created_at,
        updated_at=permission.updated_at,
    )


def build_admin_audit_event_item(
    event: AuditEvent,
) -> AdminAuditEventItem:
    return AdminAuditEventItem(
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
        roles = await get_user_roles(str(user.id), session)
        response.append(build_admin_user_item(user, roles))

    return response


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user_result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.get("/organizations", response_model=list[AdminOrganizationItem])
async def list_organizations(
    _: User = Depends(require_permission("admin.organizations.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminOrganizationItem]:
    result = await session.execute(select(Organization).order_by(Organization.name))
    organizations = result.scalars().all()

    return [
        build_admin_organization_item(organization)
        for organization in organizations
    ]


@router.get("/organizations/{organization_id}", response_model=AdminOrganizationDetail)
async def get_organization_detail(
    organization_id: str,
    _: User = Depends(require_permission("admin.organizations.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminOrganizationDetail:
    result = await session.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return build_admin_organization_detail(organization)


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


@router.get("/roles/{role_id}", response_model=AdminRoleDetail)
async def get_role_detail(
    role_id: str,
    _: User = Depends(require_permission("admin.roles.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminRoleDetail:
    result = await session.execute(
        select(Role).where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    permissions = await get_role_permissions(str(role.id), session)

    return build_admin_role_detail(role, permissions)


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


@router.get("/permissions/{permission_id}", response_model=AdminPermissionDetail)
async def get_permission_detail(
    permission_id: str,
    _: User = Depends(require_permission("admin.roles.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminPermissionDetail:
    result = await session.execute(
        select(Permission).where(Permission.id == permission_id)
    )
    permission = result.scalar_one_or_none()

    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    roles = await get_permission_roles(str(permission.id), session)

    return build_admin_permission_detail(permission, roles)


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
        build_admin_audit_event_item(event)
        for event in events
    ]


@router.get("/audit-events/{audit_event_id}", response_model=AdminAuditEventItem)
async def get_audit_event_detail(
    audit_event_id: str,
    _: User = Depends(require_permission("audit.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminAuditEventItem:
    result = await session.execute(
        select(AuditEvent).where(AuditEvent.id == audit_event_id)
    )
    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit event not found",
        )

    return build_admin_audit_event_item(event)

