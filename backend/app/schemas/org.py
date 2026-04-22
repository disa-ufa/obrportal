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
