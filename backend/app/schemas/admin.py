from __future__ import annotations

from datetime import datetime
from typing import Any

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
    document_issuer_name: str | None = None
    document_signer_position: str | None = None
    document_signer_name: str | None = None
    document_basis: str | None = None
    document_place: str | None = None


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
    document_issuer_name: str | None = Field(default=None, max_length=512)
    document_signer_position: str | None = Field(default=None, max_length=255)
    document_signer_name: str | None = Field(default=None, max_length=255)
    document_basis: str | None = Field(default=None, max_length=1024)
    document_place: str | None = Field(default=None, max_length=255)


class AdminOrganizationUpdate(BaseModel):
    inn: str | None = Field(default=None, min_length=10, max_length=12)
    kpp: str | None = Field(default=None, max_length=9)
    ogrn: str | None = Field(default=None, max_length=15)
    name: str | None = Field(default=None, min_length=1, max_length=512)
    legal_address: str | None = Field(default=None, max_length=1024)
    actual_address: str | None = Field(default=None, max_length=1024)
    document_issuer_name: str | None = Field(default=None, max_length=512)
    document_signer_position: str | None = Field(default=None, max_length=255)
    document_signer_name: str | None = Field(default=None, max_length=255)
    document_basis: str | None = Field(default=None, max_length=1024)
    document_place: str | None = Field(default=None, max_length=255)


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


class AdminDashboardSummary(BaseModel):
    users_total: int
    users_inactive: int
    organizations_total: int
    groups_total: int
    groups_inactive: int
    courses_total: int
    courses_inactive: int
    enrollments_total: int
    enrollments_assigned: int
    enrollments_active: int
    enrollments_completed: int
    enrollments_action_required: int
    documents_total: int
    documents_available: int
    documents_draft: int
    documents_revoked: int
    documents_action_required: int
    roles_total: int
    permissions_total: int
    audit_events_total: int


class AdminWorklistDocumentsSummary(BaseModel):
    total: int
    available: int
    draft: int
    revoked: int
    action_required: int


class AdminWorklistEnrollmentsSummary(BaseModel):
    total: int
    assigned: int
    active: int
    completed: int
    cancelled: int
    action_required: int


class AdminWorklistSummary(BaseModel):
    documents: AdminWorklistDocumentsSummary
    enrollments: AdminWorklistEnrollmentsSummary


class AdminDocumentItem(BaseModel):
    id: str
    document_number: str
    verification_code: str
    document_type: str
    title: str
    status: str
    revoked_at: datetime | None = None
    revoked_by_user_id: str | None = None
    revoked_by_user_email: str | None = None
    revoked_by_user_full_name: str | None = None
    revocation_reason: str | None = None
    user_id: str
    user_email: str
    user_full_name: str | None = None
    course_id: str | None = None
    course_title: str | None = None
    enrollment_id: str | None = None
    enrollment_status: str | None = None
    organization_id: str | None = None
    organization_name: str | None = None
    learning_group_id: str | None = None
    learning_group_name: str | None = None
    file_available: bool = False
    generated_at: datetime | None = None
    generated_by_user_id: str | None = None
    generated_by_user_email: str | None = None
    generated_by_user_full_name: str | None = None
    generation_source: str | None = None
    generation_template_version: str | None = None
    created_at: datetime
    updated_at: datetime


class AdminDocumentGenerationEventItem(BaseModel):
    id: str
    document_id: str
    storage_path: str
    source: str
    template_version: str | None = None
    generated_at: datetime
    generated_by_user_id: str | None = None
    generated_by_user_email: str | None = None
    generated_by_user_full_name: str | None = None
    created_at: datetime


class AdminCourseItem(BaseModel):
    id: str
    slug: str
    title: str
    description: str | None = None
    hours: int | None = None
    format: str | None = None
    document_type: str | None = None
    is_active: bool


class AdminCourseDetail(AdminCourseItem):
    created_at: datetime
    updated_at: datetime


class AdminCourseModuleItem(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    position: int
    is_active: bool


class AdminCourseModuleDetail(AdminCourseModuleItem):
    created_at: datetime
    updated_at: datetime


class AdminCourseModuleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2048)
    position: int = Field(ge=1, le=10000)
    is_active: bool = True


class AdminCourseModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2048)
    position: int | None = Field(default=None, ge=1, le=10000)
    is_active: bool | None = None

class AdminCourseLessonItem(BaseModel):
    id: str
    module_id: str
    title: str
    description: str | None = None
    content_type: str
    content_url: str | None = None
    content_text: str | None = None
    editor_mode: str = "legacy"
    status: str = "published"
    published_version_id: str | None = None
    position: int
    is_required: bool
    is_active: bool
    blocks_count: int = 0
    active_blocks_count: int = 0
    problem_blocks_count: int = 0
    is_content_ready: bool = False
    readiness_status: str = "empty"
    readiness_issues: list[str] = Field(default_factory=list)


class AdminCourseLessonDetail(AdminCourseLessonItem):
    created_at: datetime
    updated_at: datetime


class AdminCourseLessonCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2048)
    content_type: str = Field(default="text", min_length=1, max_length=32)
    content_url: str | None = Field(default=None, max_length=2048)
    content_text: str | None = None
    editor_mode: str = Field(default="legacy", min_length=1, max_length=32)
    status: str = Field(default="published", min_length=1, max_length=32)
    published_version_id: str | None = Field(default=None, max_length=36)
    position: int = Field(ge=1, le=10000)
    is_required: bool = True
    is_active: bool = True


class AdminCourseLessonUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2048)
    content_type: str | None = Field(default=None, min_length=1, max_length=32)
    content_url: str | None = Field(default=None, max_length=2048)
    content_text: str | None = None
    editor_mode: str | None = Field(default=None, min_length=1, max_length=32)
    status: str | None = Field(default=None, min_length=1, max_length=32)
    published_version_id: str | None = Field(default=None, max_length=36)
    position: int | None = Field(default=None, ge=1, le=10000)
    is_required: bool | None = None
    is_active: bool | None = None


class AdminLessonBlockItem(BaseModel):
    id: str
    lesson_id: str
    block_type: str
    position: int
    title: str | None = None
    content_json: dict[str, Any]
    settings_json: dict[str, Any]
    is_required: bool
    is_active: bool


class AdminLessonBlockDetail(AdminLessonBlockItem):
    created_at: datetime
    updated_at: datetime


class AdminLessonBlockCreate(BaseModel):
    block_type: str = Field(min_length=1, max_length=32)
    position: int = Field(ge=1, le=10000)
    title: str | None = Field(default=None, max_length=255)
    content_json: dict[str, Any] = Field(default_factory=dict)
    settings_json: dict[str, Any] = Field(default_factory=dict)
    is_required: bool = False
    is_active: bool = True


class AdminLessonBlockUpdate(BaseModel):
    block_type: str | None = Field(default=None, min_length=1, max_length=32)
    position: int | None = Field(default=None, ge=1, le=10000)
    title: str | None = Field(default=None, max_length=255)
    content_json: dict[str, Any] | None = None
    settings_json: dict[str, Any] | None = None
    is_required: bool | None = None
    is_active: bool | None = None


class AdminLessonBlockReorderItem(BaseModel):
    id: str
    position: int = Field(ge=1, le=10000)


class AdminLessonBlockReorder(BaseModel):
    blocks: list[AdminLessonBlockReorderItem] = Field(min_length=1)


class AdminCourseCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2048)
    hours: int | None = Field(default=None, ge=1, le=10000)
    format: str | None = Field(default=None, max_length=64)
    document_type: str | None = Field(default=None, max_length=128)
    is_active: bool = True


class AdminCourseUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2048)
    hours: int | None = Field(default=None, ge=1, le=10000)
    format: str | None = Field(default=None, max_length=64)
    document_type: str | None = Field(default=None, max_length=128)
    is_active: bool | None = None


class AdminEnrollmentItem(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_full_name: str | None = None
    course_id: str
    course_slug: str
    course_title: str
    organization_id: str | None = None
    organization_name: str | None = None
    learning_group_id: str | None = None
    learning_group_name: str | None = None
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminEnrollmentQuizAttemptItem(BaseModel):
    id: str
    enrollment_id: str
    user_id: str
    user_email: str
    user_full_name: str | None = None
    course_id: str
    course_slug: str
    course_title: str
    lesson_id: str
    lesson_title: str
    block_id: str
    block_title: str | None = None
    block_type: str
    attempt_number: int
    status: str
    passed: bool
    earned_points: float = 0
    total_points: float = 0
    percent: int = 0
    correct_count: int = 0
    question_count: int = 0
    pass_score_percent: int = 0
    answers_json: dict[str, Any] = Field(default_factory=dict)
    result_json: dict[str, Any] = Field(default_factory=dict)
    question_results: list[dict[str, Any]] = Field(default_factory=list)
    submitted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminEnrollmentCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    course_id: str = Field(min_length=1, max_length=64)
    organization_id: str | None = Field(default=None, max_length=64)
    learning_group_id: str | None = Field(default=None, max_length=64)
    status: str = Field(default="assigned", max_length=32)
    started_at: datetime | None = None
    completed_at: datetime | None = None


class AdminEnrollmentGroupCreate(BaseModel):
    learning_group_id: str = Field(min_length=1, max_length=64)
    course_id: str = Field(min_length=1, max_length=64)
    status: str = Field(default="assigned", max_length=32)
    started_at: datetime | None = None
    completed_at: datetime | None = None


class AdminEnrollmentBulkSkippedItem(BaseModel):
    user_id: str
    user_email: str
    user_full_name: str | None = None
    reason: str
    existing_enrollment_id: str | None = None


class AdminEnrollmentBulkCreateResult(BaseModel):
    status: str
    learning_group_id: str
    course_id: str
    organization_id: str
    created_count: int
    skipped_count: int
    created: list[AdminEnrollmentItem] = Field(default_factory=list)
    skipped: list[AdminEnrollmentBulkSkippedItem] = Field(default_factory=list)


class AdminEnrollmentUpdate(BaseModel):
    organization_id: str | None = Field(default=None, max_length=64)
    learning_group_id: str | None = Field(default=None, max_length=64)
    status: str | None = Field(default=None, max_length=32)
    started_at: datetime | None = None
    completed_at: datetime | None = None