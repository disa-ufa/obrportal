from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class OrgLearningGroupItem(BaseModel):
    id: str
    organization_id: str
    name: str
    code: str | None = None
    description: str | None = None
    is_active: bool


class OrgLearningGroupDetail(OrgLearningGroupItem):
    created_at: datetime
    updated_at: datetime


class OrgLearningGroupCreate(BaseModel):
    organization_id: str
    name: str = Field(min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=1024)
    is_active: bool = True


class OrgLearningGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=1024)
    is_active: bool | None = None


class OrgLearningGroupMemberItem(BaseModel):
    id: str
    learning_group_id: str
    user_id: str
    user_email: str
    user_full_name: str | None = None
    user_is_active: bool
    created_at: datetime
    updated_at: datetime


class OrgLearningGroupMemberCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)



class OrgProfileOrganizationItem(BaseModel):
    id: str
    inn: str
    kpp: str | None = None
    ogrn: str | None = None
    name: str
    legal_address: str | None = None
    actual_address: str | None = None
    created_at: datetime
    updated_at: datetime


class OrgProfileSummary(BaseModel):
    organizations_count: int
    groups_count: int
    active_groups_count: int
    members_count: int



class OrgProfileUpdate(BaseModel):
    kpp: str | None = Field(default=None)
    ogrn: str | None = Field(default=None)
    legal_address: str | None = Field(default=None)
    actual_address: str | None = Field(default=None)


class OrgProfile(BaseModel):
    organizations: list[OrgProfileOrganizationItem]
    summary: OrgProfileSummary
