from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminRoleItem(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None


class AdminPermissionItem(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None


class AdminRolePermissionItem(BaseModel):
    id: str
    code: str
    name: str


class AdminRoleDetail(AdminRoleItem):
    permissions: list[AdminRolePermissionItem]
    created_at: datetime
    updated_at: datetime


class AdminPermissionRoleItem(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None


class AdminPermissionDetail(AdminPermissionItem):
    roles: list[AdminPermissionRoleItem]
    created_at: datetime
    updated_at: datetime


class AdminUserRoleItem(BaseModel):
    code: str
    name: str
    organization_id: str | None = None


class AdminUserItem(BaseModel):
    id: str
    email: str
    phone: str | None = None
    full_name: str | None = None
    is_active: bool
    is_email_verified: bool
    mfa_enabled: bool
    roles: list[AdminUserRoleItem]


class AdminUserDetail(AdminUserItem):
    created_at: datetime
    updated_at: datetime


class AdminOrganizationItem(BaseModel):
    id: str
    inn: str
    kpp: str | None = None
    ogrn: str | None = None
    name: str
    legal_address: str | None = None
    actual_address: str | None = None


class AdminOrganizationDetail(AdminOrganizationItem):
    created_at: datetime
    updated_at: datetime


class AdminAuditEventItem(BaseModel):
    id: str
    action: str
    actor_user_id: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    payload: dict
    created_at: datetime
