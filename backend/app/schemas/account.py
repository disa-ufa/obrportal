from __future__ import annotations

from typing import Any

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import CurrentUserResponse


class AccountSummaryResponse(BaseModel):
    profile: CurrentUserResponse
    enrollments_count: int
    active_courses_count: int
    documents_count: int


class AccountCourseItemResponse(BaseModel):
    enrollment_id: str
    course_id: str
    course_slug: str
    course_title: str
    course_description: str | None = None
    hours: int | None = None
    format: str | None = None
    document_type: str | None = None
    status: str
    organization_id: str | None = None
    organization_name: str | None = None
    learning_group_id: str | None = None
    learning_group_name: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None

class AccountLessonBlockResponse(BaseModel):
    id: str
    lesson_id: str
    block_type: str
    position: int
    title: str | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    settings_json: dict[str, Any] = Field(default_factory=dict)
    is_required: bool = False
    is_active: bool = True


class AccountCourseLessonResponse(BaseModel):
    id: str
    module_id: str
    title: str
    description: str | None = None
    content_type: str
    content_url: str | None = None
    content_text: str | None = None
    position: int
    is_required: bool
    is_completed: bool = False
    completed_at: datetime | None = None
    blocks: list[AccountLessonBlockResponse] = Field(default_factory=list)


class AccountCourseModuleResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    position: int
    lessons: list[AccountCourseLessonResponse] = Field(default_factory=list)


class AccountCourseDetailResponse(AccountCourseItemResponse):
    lessons_total: int = 0
    lessons_completed: int = 0
    required_lessons_total: int = 0
    required_lessons_completed: int = 0
    progress_percent: int = 0
    required_progress_percent: int = 0
    modules: list[AccountCourseModuleResponse] = Field(default_factory=list)


class AccountCoursesResponse(BaseModel):
    total: int
    items: list[AccountCourseItemResponse]


class AccountDocumentItemResponse(BaseModel):
    id: str
    document_number: str
    verification_code: str
    document_type: str
    title: str
    status: str
    revoked_at: datetime | None = None
    revocation_reason: str | None = None
    course_id: str | None = None
    course_slug: str | None = None
    course_title: str | None = None
    enrollment_id: str | None = None
    file_available: bool = False
    download_available: bool = False
    download_url: str | None = None
    created_at: datetime | None = None
    issued_at: datetime | None = None


class AccountDocumentsResponse(BaseModel):
    total: int
    items: list[AccountDocumentItemResponse]