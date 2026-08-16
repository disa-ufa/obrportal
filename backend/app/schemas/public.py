from __future__ import annotations

from typing import Any

from datetime import datetime

from pydantic import BaseModel, Field


class PublicDocumentVerifyResponse(BaseModel):
    document_number: str
    verification_code: str
    document_type: str
    title: str
    holder_name: str | None = None
    course_title: str | None = None
    issued_at: datetime | None = None
    completed_at: datetime | None = None
    course_hours: int | None = None
    course_format: str | None = None
    issuer_name: str | None = None
    issuer_short_name: str | None = None
    issuer_address: str | None = None
    issuer_license: str | None = None
    issuer_inn: str | None = None
    issuer_kpp: str | None = None
    issuer_ogrn: str | None = None
    registry_status: str
    verification_status: str
    status: str | None = None
    organization_name: str | None = None
    message: str | None = None
    revoked_at: datetime | None = None
    revocation_reason: str | None = None


class PublicCourseItemResponse(BaseModel):
    id: str
    slug: str
    title: str
    description: str | None = None
    hours: int | None = None
    format: str | None = None
    document_type: str | None = None
    direction: str | None = None


class PublicLessonBlockResponse(BaseModel):
    id: str
    lesson_id: str
    block_type: str
    position: int
    title: str | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    settings_json: dict[str, Any] = Field(default_factory=dict)
    is_required: bool = False
    is_active: bool = True


class PublicCourseLessonResponse(BaseModel):
    id: str
    module_id: str
    title: str
    description: str | None = None
    content_type: str
    content_url: str | None = None
    content_text: str | None = None
    position: int
    is_required: bool
    blocks: list[PublicLessonBlockResponse] = Field(default_factory=list)


class PublicCourseModuleResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    position: int
    lessons: list[PublicCourseLessonResponse] = Field(default_factory=list)


class PublicCourseDetailResponse(PublicCourseItemResponse):
    modules: list[PublicCourseModuleResponse] = Field(default_factory=list)

