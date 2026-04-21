from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


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
    role_permission_id: str
    code: str
    name: str


class AdminRoleDetail(AdminRoleItem):
    permissions: list[AdminRolePermissionItem]
    created_at: datetime
    updated_at: datetime


class AdminRoleCreate(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=512)


class AdminRoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=512)


class AdminDeleteResult(BaseModel):
    status: str
    id: str

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
    id: str
    role_id: str
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


class AdminUserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    is_active: bool = True
    is_email_verified: bool = False


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    is_email_verified: bool | None = None


class AdminUserPasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class AdminUserRoleAssign(BaseModel):
    role_id: str
    organization_id: str | None = None


class AdminRolePermissionAssign(BaseModel):
    permission_id: str


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


class AdminOrganizationCreate(BaseModel):
    inn: str = Field(min_length=10, max_length=12)
    kpp: str | None = Field(default=None, max_length=9)
    ogrn: str | None = Field(default=None, max_length=15)
    name: str = Field(min_length=1, max_length=512)
    legal_address: str | None = Field(default=None, max_length=1024)
    actual_address: str | None = Field(default=None, max_length=1024)


class AdminOrganizationUpdate(BaseModel):
    inn: str | None = Field(default=None, min_length=10, max_length=12)
    kpp: str | None = Field(default=None, max_length=9)
    ogrn: str | None = Field(default=None, max_length=15)
    name: str | None = Field(default=None, min_length=1, max_length=512)
    legal_address: str | None = Field(default=None, max_length=1024)
    actual_address: str | None = Field(default=None, max_length=1024)


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
