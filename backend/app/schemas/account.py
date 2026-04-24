from __future__ import annotations

from pydantic import BaseModel

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


class AccountCoursesResponse(BaseModel):
    total: int
    items: list[AccountCourseItemResponse]


class AccountDocumentItemResponse(BaseModel):
    id: str
    document_number: str
    document_type: str
    title: str
    status: str
    file_url: str | None = None
    course_id: str | None = None
    course_slug: str | None = None
    course_title: str | None = None
    enrollment_id: str | None = None


class AccountDocumentsResponse(BaseModel):
    total: int
    items: list[AccountDocumentItemResponse]


class AccountDocumentDownloadResponse(BaseModel):
    id: str
    document_number: str
    title: str
    file_url: str