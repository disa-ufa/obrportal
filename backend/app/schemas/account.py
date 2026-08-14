from __future__ import annotations

from typing import Any

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.auth import CurrentUserResponse


class AccountSummaryResponse(BaseModel):
    profile: CurrentUserResponse
    enrollments_count: int
    active_courses_count: int
    documents_count: int


class AccountLearnerProfileResponse(BaseModel):
    id: str | None = None
    user_id: str
    last_name: str | None = None
    first_name: str | None = None
    middle_name: str | None = None
    birth_date: date | None = None
    snils: str | None = None
    phone: str | None = None
    email: str | None = None
    identity_document_type: str | None = None
    identity_document_series: str | None = None
    identity_document_number: str | None = None
    identity_document_issued_by: str | None = None
    identity_document_issued_at: date | None = None
    identity_document_department_code: str | None = None
    identity_document_status: str = "not_provided"
    education_document_status: str = "not_provided"
    personal_data_basis: str | None = None
    personal_data_consent_at: datetime | None = None
    source: str | None = None
    updated_at: datetime | None = None


class AccountLearnerProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    last_name: str | None = Field(default=None, max_length=128)
    first_name: str | None = Field(default=None, max_length=128)
    middle_name: str | None = Field(default=None, max_length=128)
    birth_date: date | None = None
    snils: str | None = Field(default=None, max_length=32)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=320)
    identity_document_type: str | None = Field(default=None, max_length=64)
    identity_document_series: str | None = Field(default=None, max_length=32)
    identity_document_number: str | None = Field(default=None, max_length=64)
    identity_document_issued_by: str | None = None
    identity_document_issued_at: date | None = None
    identity_document_department_code: str | None = Field(
        default=None,
        max_length=32,
    )


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


class AccountQuizAttemptSubmitRequest(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)


class AccountAssignmentSubmissionSubmitRequest(BaseModel):
    answer_text: str = Field(default="", max_length=10000)


class AccountQuizQuestionResultResponse(BaseModel):
    question_id: str | None = None
    type: str | None = None
    points: float = 0
    earned_points: float = 0
    correct: bool = False
    correct_answer: Any = None
    user_answer: Any = None


class AccountQuizAttemptResponse(BaseModel):
    id: str
    enrollment_id: str
    lesson_id: str
    block_id: str
    attempt_number: int
    status: str
    passed: bool
    earned_points: float = 0
    total_points: float = 0
    percent: int = 0
    correct_count: int = 0
    question_count: int = 0
    pass_score_percent: int = 0
    max_attempts: int | None = None
    remaining_attempts: int | None = None
    answers_json: dict[str, Any] = Field(default_factory=dict)
    question_results: list[AccountQuizQuestionResultResponse] = Field(default_factory=list)
    submitted_at: datetime | None = None


class AccountAssignmentSubmissionResponse(BaseModel):
    id: str | None = None
    enrollment_id: str
    user_id: str | None = None
    lesson_id: str
    block_id: str
    status: str = "not_started"
    answer_text: str | None = None
    attachments_json: dict[str, Any] = Field(default_factory=dict)
    score: float | None = None
    max_score: float | None = None
    review_comment: str | None = None
    reviewed_by_user_id: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


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



class AccountActivityItemResponse(BaseModel):
    activity_type: str
    status: str
    requires_action: bool = False

    enrollment_id: str
    enrollment_status: str

    course_id: str
    course_slug: str
    course_title: str

    module_id: str
    module_title: str
    module_position: int

    lesson_id: str
    lesson_title: str
    lesson_position: int

    block_id: str
    block_title: str | None = None
    block_position: int
    is_required: bool = False

    quiz_passed: bool | None = None
    attempts_used: int | None = None
    max_attempts: int | None = None
    remaining_attempts: int | None = None
    last_attempt_percent: int | None = None
    best_percent: int | None = None
    last_attempt_submitted_at: datetime | None = None

    review_mode: str | None = None
    submission_status: str | None = None
    score: float | None = None
    max_score: float | None = None
    review_comment: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None


class AccountActivitiesResponse(BaseModel):
    total: int
    items: list[AccountActivityItemResponse]


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
