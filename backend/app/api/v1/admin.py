from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload
from sqlalchemy.exc import IntegrityError

from app.api.v1.rbac import get_user_permission_codes, require_permission
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.assignment_submission import AssignmentSubmission
from app.models.course import Course
from app.models.course_lesson import CourseLesson
from app.models.lesson_block import LessonBlock
from app.models.course_module import CourseModule
from app.models.document_generation_event import DocumentGenerationEvent
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.import_batch import ImportBatch, ImportRow
from app.models.quiz_attempt import QuizAttempt
from app.models.learning_group import LearningGroup, LearningGroupMember
from app.models.organization import Organization
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User
from app.services.document_storage import (
    build_document_download_filename,
    detect_document_download_metadata,
    delete_private_storage_file,
    resolve_private_storage_path,
    write_private_storage_file,
)
from app.services.completion_documents import (
    add_completion_document_generation_event,
    ensure_completion_document_for_enrollment,
    load_completion_document_context,
    mark_completion_document_generation_metadata,
    write_completion_document_pdf_to_storage,
)
from app.services.lesson_blocks import (
    build_synthetic_legacy_lesson_blocks,
    normalize_lesson_block_type,
)
from app.services.lesson_readiness import (
    get_admin_lesson_readiness_payload,
    get_admin_lessons_readiness_map,
    normalize_admin_lesson_readiness_payload,
)
from app.services.learner_import_batches import (
    LearnerImportPreflightResult,
    apply_learner_import_batch,
    build_learner_import_preflight,
    create_import_batch_from_parse_result,
)
from app.services.learner_import_parser import parse_learner_import_file
from app.services.email_delivery import (
    send_course_assignment_email,
    send_password_setup_email,
)
from app.services.user_password_tokens import build_password_setup_url, create_user_password_token
from app.schemas.admin import (
    AdminAuditEventItem,
    AdminCourseCreate,
    AdminCourseDetail,
    AdminCourseItem,
    AdminCourseLessonCreate,
    AdminCourseLessonDetail,
    AdminCourseLessonItem,
    AdminCourseLessonUpdate,
    AdminLessonBlockCreate,
    AdminLessonBlockDetail,
    AdminLessonBlockItem,
    AdminLessonBlockReorder,
    AdminLearnerImportBatchDetail,
    AdminLearnerImportBatchItem,
    AdminLearnerImportCourseNotificationItem,
    AdminLearnerImportInvitationItem,
    AdminLearnerImportPreflightItem,
    AdminLearnerImportPreflightRowItem,
    AdminLearnerImportRowItem,
    AdminLessonBlockUpdate,
    AdminCourseModuleCreate,
    AdminCourseModuleDetail,
    AdminCourseModuleItem,
    AdminCourseModuleUpdate,
    AdminCourseUpdate,
    AdminDashboardSummary,
    AdminEnrollmentBulkCreateResult,
    AdminEnrollmentBulkSkippedItem,
    AdminEnrollmentCreate,
    AdminEnrollmentGroupCreate,
    AdminEnrollmentItem,
    AdminAssignmentSubmissionReview,
    AdminEnrollmentAssignmentSubmissionItem,
    AdminEnrollmentQuizAttemptItem,
    AdminEnrollmentUpdate,
    AdminDocumentGenerationEventItem,
    AdminDocumentItem,
    AdminDeleteResult,
    AdminOrganizationCreate,
    AdminOrganizationDetail,
    AdminOrganizationItem,
    AdminOrganizationUpdate,
    AdminPermissionDetail,
    AdminPermissionItem,
    AdminPermissionRoleItem,
    AdminRoleCreate,
    AdminRoleDetail,
    AdminRoleItem,
    AdminRolePermissionItem,
    AdminRolePermissionAssign,
    AdminRoleUpdate,
    AdminUserCreate,
    AdminUserDetail,
    AdminUserInviteResponse,
    AdminUserItem,
    AdminUserPasswordUpdate,
    AdminUserRoleAssign,
    AdminUserRoleItem,
    AdminUserUpdate,
    AdminWorklistDocumentsSummary,
    AdminWorklistEnrollmentsSummary,
    AdminWorklistSummary,
)


router = APIRouter(prefix="/admin", tags=["admin"])


SYSTEM_ROLE_CODES = {
    "admin",
    "learner_fl",
    "learner_org",
    "org_rep",
    "teacher",
    "methodist",
    "finance_operator",
    "edo_operator",
    "frdo_operator",
}

ROLE_CODE_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_.-]{0,63}$")

LESSON_PRESENTATION_ALLOWED_EXTENSIONS = {".pdf", ".pptx"}
LESSON_PRESENTATION_MAX_UPLOAD_BYTES = 50 * 1024 * 1024
LEARNER_IMPORT_ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
LEARNER_IMPORT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
LESSON_AUDIO_ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".oga", ".webm"}
LESSON_AUDIO_MAX_UPLOAD_BYTES = 100 * 1024 * 1024
LESSON_AUDIO_MIME_BY_EXTENSION = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".webm": "audio/webm",
}


LESSON_IMAGE_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
LESSON_IMAGE_MAX_UPLOAD_BYTES = 20 * 1024 * 1024
LESSON_IMAGE_MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def normalize_learner_import_extension(filename: str | None) -> str:
    extension = Path(filename or "").suffix.lower()

    if extension not in LEARNER_IMPORT_ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(LEARNER_IMPORT_ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported import format. Allowed: {allowed}",
        )

    return extension


def normalize_lesson_image_extension(filename: str | None) -> str:
    extension = Path(filename or "").suffix.lower()

    if extension not in LESSON_IMAGE_ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(LESSON_IMAGE_ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image format. Allowed: {allowed}",
        )

    return extension


def get_lesson_image_mime_type(extension: str) -> str:
    return LESSON_IMAGE_MIME_BY_EXTENSION.get(extension.lower(), "application/octet-stream")


async def save_admin_lesson_image_file(
    file: UploadFile,
    *,
    lesson_id: str,
    asset_id: str,
    extension: str,
) -> tuple[str, int]:
    content = await file.read()
    size_bytes = len(content)

    if size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image file is empty",
        )

    if size_bytes > LESSON_IMAGE_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image file is too large",
        )

    storage_path = f"lesson-images/{lesson_id}/{asset_id}{extension}"
    saved_path = write_private_storage_file(storage_path, content)

    return saved_path, size_bytes


def build_lesson_image_public_urls(
    *,
    lesson_id: str,
    asset_id: str,
) -> dict:
    base_path = f"/api/v1/public/lesson-images/{lesson_id}/{asset_id}"

    return {
        "url": f"{base_path}/view",
        "content_url": f"{base_path}/view",
        "image_url": f"{base_path}/view",
        "image_src": f"{base_path}/view",
        "src": f"{base_path}/view",
        "original_url": f"{base_path}/download",
        "download_url": f"{base_path}/download",
    }


async def get_user_roles(
    user_id: str,
    session: AsyncSession,
) -> list[AdminUserRoleItem]:
    roles_result = await session.execute(
        select(
            UserRole.id.label("id"),
            Role.id.label("role_id"),
            Role.code,
            Role.name,
            UserRole.organization_id,
        )
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
        .order_by(Role.code)
    )

    return [
        AdminUserRoleItem(
            id=str(row.id),
            role_id=str(row.role_id),
            code=row.code,
            name=row.name,
            organization_id=str(row.organization_id) if row.organization_id else None,
        )
        for row in roles_result.all()
    ]

async def get_users_roles(
    user_ids: list,
    session: AsyncSession,
) -> dict[str, list[AdminUserRoleItem]]:
    if not user_ids:
        return {}

    roles_result = await session.execute(
        select(
            UserRole.user_id.label("user_id"),
            UserRole.id.label("id"),
            Role.id.label("role_id"),
            Role.code,
            Role.name,
            UserRole.organization_id,
        )
        .join(Role, UserRole.role_id == Role.id)
        .where(UserRole.user_id.in_(user_ids))
        .order_by(UserRole.user_id, Role.code)
    )

    roles_by_user_id: dict[str, list[AdminUserRoleItem]] = {}

    for row in roles_result.all():
        roles_by_user_id.setdefault(str(row.user_id), []).append(
            AdminUserRoleItem(
                id=str(row.id),
                role_id=str(row.role_id),
                code=row.code,
                name=row.name,
                organization_id=str(row.organization_id) if row.organization_id else None,
            )
        )

    return roles_by_user_id


async def get_role_permissions(
    role_id: str,
    session: AsyncSession,
) -> list[AdminRolePermissionItem]:
    result = await session.execute(
        select(
            RolePermission.id.label("role_permission_id"),
            Permission.id.label("permission_id"),
            Permission.code,
            Permission.name,
        )
        .join(Permission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id)
        .order_by(Permission.code)
    )

    return [
        AdminRolePermissionItem(
            id=str(row.permission_id),
            role_permission_id=str(row.role_permission_id),
            code=row.code,
            name=row.name,
        )
        for row in result.all()
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
        document_issuer_name=organization.document_issuer_name,
        document_signer_position=organization.document_signer_position,
        document_signer_name=organization.document_signer_name,
        document_basis=organization.document_basis,
        document_place=organization.document_place,
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
        document_issuer_name=organization.document_issuer_name,
        document_signer_position=organization.document_signer_position,
        document_signer_name=organization.document_signer_name,
        document_basis=organization.document_basis,
        document_place=organization.document_place,
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


def build_admin_learner_import_row_item(
    row: ImportRow,
    *,
    applied_outcome: (
        dict[str, str | None] | None
    ) = None,
) -> AdminLearnerImportRowItem:
    outcome = applied_outcome or {}

    return AdminLearnerImportRowItem(
        id=str(row.id),
        row_number=row.row_number,
        status=row.status,
        raw_data_json=row.raw_data_json or {},
        normalized_data_json=(
            row.normalized_data_json or {}
        ),
        validation_errors_json=(
            row.validation_errors_json or []
        ),
        error_summary=row.error_summary,
        user_id=(
            str(row.user_id)
            if row.user_id
            else None
        ),
        learner_profile_id=(
            str(row.learner_profile_id)
            if row.learner_profile_id
            else None
        ),
        enrollment_id=(
            str(row.enrollment_id)
            if row.enrollment_id
            else None
        ),
        classification=outcome.get(
            "classification"
        ),
        account_state=outcome.get(
            "account_state"
        ),
        user_action=outcome.get(
            "user_action"
        ),
        profile_action=outcome.get(
            "profile_action"
        ),
        enrollment_action=outcome.get(
            "enrollment_action"
        ),
        notification_action=outcome.get(
            "notification_action"
        ),
        email_delivery_status=outcome.get(
            "email_delivery_status"
        ),
        email_delivery_detail=outcome.get(
            "email_delivery_detail"
        ),
        email_delivery_error=outcome.get(
            "email_delivery_error"
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )





async def get_learner_import_course_title(
    session: AsyncSession,
    course_id: str | None,
) -> str | None:
    if not course_id:
        return None

    course = await session.get(
        Course,
        course_id,
    )

    fallback_title = (
        "\u041d\u0430\u0437\u043d\u0430"
        "\u0447\u0435\u043d\u043d\u044b\u0439 "
        "\u043a\u0443\u0440\u0441"
    )

    if course is None:
        return fallback_title

    course_title = (
        str(course.title).strip()
        if course.title
        else ""
    )

    return (
        course_title
        or fallback_title
    )


def build_admin_learner_import_batch_item(batch: ImportBatch) -> AdminLearnerImportBatchItem:
    return AdminLearnerImportBatchItem(
        id=str(batch.id),
        import_type=batch.import_type,
        source_filename=batch.source_filename,
        source_content_type=batch.source_content_type,
        status=batch.status,
        organization_id=str(batch.organization_id) if batch.organization_id else None,
        learning_group_id=str(batch.learning_group_id) if batch.learning_group_id else None,
        course_id=str(batch.course_id) if batch.course_id else None,
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        invalid_rows=batch.invalid_rows,
        created_users_count=batch.created_users_count,
        updated_users_count=batch.updated_users_count,
        created_profiles_count=batch.created_profiles_count,
        updated_profiles_count=batch.updated_profiles_count,
        created_enrollments_count=batch.created_enrollments_count,
        uploaded_by_user_id=str(batch.uploaded_by_user_id) if batch.uploaded_by_user_id else None,
        notes=batch.notes,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
    )


def build_admin_learner_import_preflight_item(
    batch: ImportBatch,
    preflight: LearnerImportPreflightResult | None,
) -> AdminLearnerImportPreflightItem | None:
    if preflight is None:
        return None

    return AdminLearnerImportPreflightItem(
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        invalid_rows=batch.invalid_rows,
        new_users_count=preflight.new_users_count,
        existing_inactive_users_count=(
            preflight.existing_inactive_users_count
        ),
        existing_active_users_count=(
            preflight.existing_active_users_count
        ),
        existing_enrollments_count=(
            preflight.existing_enrollments_count
        ),
        identity_conflicts_count=(
            preflight.identity_conflicts_count
        ),
        invalid_rows_count=preflight.invalid_rows_count,
        new_profiles_count=preflight.new_profiles_count,
        updated_profiles_count=(
            preflight.updated_profiles_count
        ),
        new_enrollments_count=(
            preflight.new_enrollments_count
        ),
        password_setup_invitations_count=(
            preflight.password_setup_invitations_count
        ),
        new_course_notifications_count=(
            preflight.new_course_notifications_count
        ),
        rows=[
            AdminLearnerImportPreflightRowItem(
                row_id=item.row_id,
                row_number=item.row_number,
                email=item.email,
                classification=item.classification,
                account_state=item.account_state,
                user_id=item.user_id,
                learner_profile_id=(
                    item.learner_profile_id
                ),
                enrollment_id=item.enrollment_id,
                user_action=item.user_action,
                profile_action=item.profile_action,
                enrollment_action=(
                    item.enrollment_action
                ),
                notification_action=(
                    item.notification_action
                ),
                error_code=item.error_code,
                error_message=item.error_message,
            )
            for item in preflight.rows
        ],
    )


def build_admin_learner_import_batch_detail(
    batch: ImportBatch,
    *,
    invitations: list[
        AdminLearnerImportInvitationItem
    ] | None = None,
    course_notifications: list[
        AdminLearnerImportCourseNotificationItem
    ] | None = None,
    applied_row_outcomes: (
        dict[
            str,
            dict[str, str | None],
        ]
        | None
    ) = None,
    preflight: (
        LearnerImportPreflightResult | None
    ) = None,
) -> AdminLearnerImportBatchDetail:
    outcome_map = applied_row_outcomes or {}

    return AdminLearnerImportBatchDetail(
        id=str(batch.id),
        import_type=batch.import_type,
        source_filename=batch.source_filename,
        source_content_type=(
            batch.source_content_type
        ),
        status=batch.status,
        organization_id=(
            str(batch.organization_id)
            if batch.organization_id
            else None
        ),
        learning_group_id=(
            str(batch.learning_group_id)
            if batch.learning_group_id
            else None
        ),
        course_id=(
            str(batch.course_id)
            if batch.course_id
            else None
        ),
        total_rows=batch.total_rows,
        valid_rows=batch.valid_rows,
        invalid_rows=batch.invalid_rows,
        created_users_count=(
            batch.created_users_count
        ),
        updated_users_count=(
            batch.updated_users_count
        ),
        created_profiles_count=(
            batch.created_profiles_count
        ),
        updated_profiles_count=(
            batch.updated_profiles_count
        ),
        created_enrollments_count=(
            batch.created_enrollments_count
        ),
        uploaded_by_user_id=(
            str(batch.uploaded_by_user_id)
            if batch.uploaded_by_user_id
            else None
        ),
        notes=batch.notes,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        rows=[
            build_admin_learner_import_row_item(
                row,
                applied_outcome=outcome_map.get(
                    str(row.id)
                ),
            )
            for row in sorted(
                batch.rows,
                key=lambda item: item.row_number,
            )
        ],
        invitations=list(
            invitations or []
        ),
        course_notifications=list(
            course_notifications or []
        ),
        preflight=(
            build_admin_learner_import_preflight_item(
                batch,
                preflight,
            )
        ),
    )


def model_to_dict(model, **kwargs) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)

    return model.dict(**kwargs)


def organization_snapshot(organization: Organization) -> dict:
    return {
        "id": str(organization.id),
        "inn": organization.inn,
        "kpp": organization.kpp,
        "ogrn": organization.ogrn,
        "name": organization.name,
        "legal_address": organization.legal_address,
        "actual_address": organization.actual_address,
        "document_issuer_name": organization.document_issuer_name,
        "document_signer_position": organization.document_signer_position,
        "document_signer_name": organization.document_signer_name,
        "document_basis": organization.document_basis,
        "document_place": organization.document_place,
    }


async def ensure_organization_can_be_deleted(
    organization: Organization,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        select(UserRole.id)
        .where(UserRole.organization_id == organization.id)
        .limit(1)
    )

    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete organization assigned to users",
        )


def user_snapshot(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_email_verified": user.is_email_verified,
        "mfa_enabled": user.mfa_enabled,
    }



def role_snapshot(role: Role) -> dict:
    return {
        "id": str(role.id),
        "code": role.code,
        "name": role.name,
        "description": role.description,
    }


def normalize_role_code(code: str) -> str:
    normalized = code.strip().lower()

    if not ROLE_CODE_PATTERN.match(normalized):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role code must start with a lowercase letter or digit and contain only lowercase letters, digits, dots, underscores or hyphens",
        )

    return normalized


def normalize_role_create_data(data: dict) -> dict:
    normalized = dict(data)
    normalized["code"] = normalize_role_code(normalized["code"])
    normalized["name"] = normalized["name"].strip()
    normalized["description"] = normalize_optional_text(normalized.get("description"))

    if not normalized["name"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role name is required",
        )

    return normalized


def normalize_role_update_data(data: dict) -> dict:
    normalized = dict(data)

    if "name" in normalized:
        normalized["name"] = normalized["name"].strip()
        if not normalized["name"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Role name is required",
            )

    if "description" in normalized:
        normalized["description"] = normalize_optional_text(normalized["description"])

    return normalized


def ensure_role_metadata_can_be_modified(role: Role) -> None:
    if role.code in SYSTEM_ROLE_CODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system role metadata",
        )


async def ensure_role_can_be_deleted(
    role: Role,
    session: AsyncSession,
) -> None:
    if role.code in SYSTEM_ROLE_CODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system role",
        )

    result = await session.execute(
        select(UserRole.id)
        .where(UserRole.role_id == role.id)
        .limit(1)
    )

    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete role assigned to users",
        )

def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    return value.strip() or None


def validate_email_format(email: str) -> None:
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email format",
        )


def normalize_user_create_data(data: dict) -> dict:
    normalized = dict(data)
    normalized["email"] = normalize_email(normalized["email"])
    normalized["phone"] = normalize_optional_text(normalized.get("phone"))
    normalized["full_name"] = normalize_optional_text(normalized.get("full_name"))

    validate_email_format(normalized["email"])

    return normalized


def normalize_user_update_data(data: dict) -> dict:
    normalized = dict(data)

    if "phone" in normalized:
        normalized["phone"] = normalize_optional_text(normalized["phone"])

    if "full_name" in normalized:
        normalized["full_name"] = normalize_optional_text(normalized["full_name"])

    return normalized


async def get_admin_user_or_404(
    user_id: str,
    session: AsyncSession,
) -> User:
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


async def get_admin_role_or_404(
    role_id: str,
    session: AsyncSession,
) -> Role:
    result = await session.execute(
        select(Role).where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return role


async def get_admin_permission_or_404(
    permission_id: str,
    session: AsyncSession,
) -> Permission:
    result = await session.execute(
        select(Permission).where(Permission.id == permission_id)
    )
    permission = result.scalar_one_or_none()

    if permission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    return permission


async def get_admin_organization_or_404(
    organization_id: str,
    session: AsyncSession,
) -> Organization:
    result = await session.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return organization


async def ensure_admin_learning_group_exists(
    learning_group_id: str,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        select(LearningGroup.id).where(LearningGroup.id == learning_group_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning group not found",
        )


async def ensure_admin_course_exists(
    course_id: str,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        select(Course.id).where(Course.id == course_id)
    )

    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )


async def get_admin_learner_import_batch_or_404(
    batch_id: str,
    session: AsyncSession,
) -> ImportBatch:
    result = await session.execute(
        select(ImportBatch)
        .options(selectinload(ImportBatch.rows))
        .where(
            ImportBatch.id == batch_id,
            ImportBatch.import_type == "learner_roster",
        )
    )
    batch = result.scalar_one_or_none()

    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learner import batch not found",
        )

    return batch


async def get_user_role_or_404(
    user_id: str,
    user_role_id: str,
    session: AsyncSession,
) -> tuple[UserRole, Role]:
    result = await session.execute(
        select(UserRole, Role)
        .join(Role, UserRole.role_id == Role.id)
        .where(
            UserRole.id == user_role_id,
            UserRole.user_id == user_id,
        )
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User role assignment not found",
        )

    user_role, role = row

    return user_role, role


async def get_role_permission_or_404(
    role_id: str,
    role_permission_id: str,
    session: AsyncSession,
) -> tuple[RolePermission, Permission]:
    result = await session.execute(
        select(RolePermission, Permission)
        .join(Permission, RolePermission.permission_id == Permission.id)
        .where(
            RolePermission.id == role_permission_id,
            RolePermission.role_id == role_id,
        )
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role permission assignment not found",
        )

    role_permission, permission = row

    return role_permission, permission


async def user_role_assignment_exists(
    *,
    user_id: str,
    role_id: str,
    organization_id: str | None,
    session: AsyncSession,
) -> bool:
    query = select(UserRole.id).where(
        UserRole.user_id == user_id,
        UserRole.role_id == role_id,
    )

    if organization_id is None:
        query = query.where(UserRole.organization_id.is_(None))
    else:
        query = query.where(UserRole.organization_id == organization_id)

    result = await session.execute(query.limit(1))

    return result.scalar_one_or_none() is not None


async def role_permission_assignment_exists(
    *,
    role_id: str,
    permission_id: str,
    session: AsyncSession,
) -> bool:
    result = await session.execute(
        select(RolePermission.id)
        .where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id,
        )
        .limit(1)
    )

    return result.scalar_one_or_none() is not None


def role_assignment_snapshot(
    user_role: UserRole,
    role: Role,
) -> dict:
    return {
        "id": str(user_role.id),
        "user_id": str(user_role.user_id),
        "role_id": str(user_role.role_id),
        "role_code": role.code,
        "role_name": role.name,
        "organization_id": str(user_role.organization_id) if user_role.organization_id else None,
    }


async def count_admin_rows(session: AsyncSession, query) -> int:
    result = await session.execute(query)
    value = result.scalar_one()
    return int(value or 0)


def role_permission_snapshot(
    role_permission: RolePermission,
    role: Role,
    permission: Permission,
) -> dict:
    return {
        "id": str(role_permission.id),
        "role_id": str(role_permission.role_id),
        "role_code": role.code,
        "role_name": role.name,
        "permission_id": str(role_permission.permission_id),
        "permission_code": permission.code,
        "permission_name": permission.name,
    }


def ensure_role_permissions_can_be_modified(role: Role) -> None:
    if role.code == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system admin role permissions",
        )


async def ensure_user_role_can_be_removed(
    user: User,
    role: Role,
    session: AsyncSession,
) -> None:
    if not user.is_active:
        return

    if role.code != "admin":
        return

    active_admins_count = await count_active_admin_users(session)

    if active_admins_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last admin role from the last active admin",
        )


async def user_has_role_code(
    user_id: str,
    role_code: str,
    session: AsyncSession,
) -> bool:
    result = await session.execute(
        select(UserRole.id)
        .join(Role, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == user_id,
            Role.code == role_code,
        )
        .limit(1)
    )

    return result.scalar_one_or_none() is not None


async def count_active_admin_users(session: AsyncSession) -> int:
    result = await session.execute(
        select(User.id)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, UserRole.role_id == Role.id)
        .where(
            Role.code == "admin",
            User.is_active.is_(True),
        )
        .distinct()
    )

    return len(result.scalars().all())


async def ensure_user_can_be_deactivated(
    user: User,
    session: AsyncSession,
) -> None:
    if not user.is_active:
        return

    is_admin = await user_has_role_code(str(user.id), "admin", session)

    if not is_admin:
        return

    active_admins_count = await count_active_admin_users(session)

    if active_admins_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate the last active admin",
        )


def get_request_ip(request: Request) -> str | None:
    if not request.client:
        return None

    return request.client.host


def get_request_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


async def create_admin_audit_event(
    session: AsyncSession,
    *,
    actor_user: User,
    action: str,
    entity_type: str,
    entity_id: str,
    payload: dict,
    request: Request,
) -> None:
    session.add(
        AuditEvent(
            actor_user_id=actor_user.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=get_request_ip(request),
            user_agent=get_request_user_agent(request),
            payload=payload,
        )
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


@router.get("/dashboard-summary", response_model=AdminDashboardSummary)
async def get_admin_dashboard_summary(
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminDashboardSummary:
    enrollment_action_required_condition = Enrollment.status.in_(("assigned", "completed"))
    document_action_required_condition = or_(
        DocumentRecord.status.in_(("draft", "revoked")),
        (DocumentRecord.status == "available") & DocumentRecord.storage_path.is_(None),
    )

    return AdminDashboardSummary(
        users_total=await count_admin_rows(session, select(func.count()).select_from(User)),
        users_inactive=await count_admin_rows(
            session,
            select(func.count()).select_from(User).where(User.is_active.is_(False)),
        ),
        organizations_total=await count_admin_rows(
            session,
            select(func.count()).select_from(Organization),
        ),
        groups_total=await count_admin_rows(
            session,
            select(func.count()).select_from(LearningGroup),
        ),
        groups_inactive=await count_admin_rows(
            session,
            select(func.count()).select_from(LearningGroup).where(LearningGroup.is_active.is_(False)),
        ),
        courses_total=await count_admin_rows(
            session,
            select(func.count()).select_from(Course),
        ),
        courses_inactive=await count_admin_rows(
            session,
            select(func.count()).select_from(Course).where(Course.is_active.is_(False)),
        ),
        enrollments_total=await count_admin_rows(
            session,
            select(func.count()).select_from(Enrollment),
        ),
        enrollments_assigned=await count_admin_rows(
            session,
            select(func.count()).select_from(Enrollment).where(Enrollment.status == "assigned"),
        ),
        enrollments_active=await count_admin_rows(
            session,
            select(func.count()).select_from(Enrollment).where(Enrollment.status == "active"),
        ),
        enrollments_completed=await count_admin_rows(
            session,
            select(func.count()).select_from(Enrollment).where(Enrollment.status == "completed"),
        ),
        enrollments_action_required=await count_admin_rows(
            session,
            select(func.count()).select_from(Enrollment).where(enrollment_action_required_condition),
        ),
        documents_total=await count_admin_rows(
            session,
            select(func.count()).select_from(DocumentRecord),
        ),
        documents_available=await count_admin_rows(
            session,
            select(func.count()).select_from(DocumentRecord).where(DocumentRecord.status == "available"),
        ),
        documents_draft=await count_admin_rows(
            session,
            select(func.count()).select_from(DocumentRecord).where(DocumentRecord.status == "draft"),
        ),
        documents_revoked=await count_admin_rows(
            session,
            select(func.count()).select_from(DocumentRecord).where(DocumentRecord.status == "revoked"),
        ),
        documents_action_required=await count_admin_rows(
            session,
            select(func.count()).select_from(DocumentRecord).where(document_action_required_condition),
        ),
        roles_total=await count_admin_rows(
            session,
            select(func.count()).select_from(Role),
        ),
        permissions_total=await count_admin_rows(
            session,
            select(func.count()).select_from(Permission),
        ),
        audit_events_total=await count_admin_rows(
            session,
            select(func.count()).select_from(AuditEvent),
        ),
    )



@router.post("/course-lessons/{lesson_id}/image-assets")
async def upload_admin_lesson_image_asset(
    lesson_id: str,
    file: UploadFile = File(...),
    _: User = Depends(require_permission("admin.courses.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    lesson_result = await session.execute(
        select(CourseLesson).where(CourseLesson.id == lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    extension = normalize_lesson_image_extension(file.filename)
    asset_id = str(uuid4())
    storage_path, size_bytes = await save_admin_lesson_image_file(
        file,
        lesson_id=lesson_id,
        asset_id=asset_id,
        extension=extension,
    )
    public_urls = build_lesson_image_public_urls(
        lesson_id=lesson_id,
        asset_id=asset_id,
    )

    return {
        "asset_id": asset_id,
        "lesson_id": lesson_id,
        "material_kind": "image",
        "original_filename": file.filename or f"image{extension}",
        "mime_type": get_lesson_image_mime_type(extension),
        "source_extension": extension,
        "size_bytes": size_bytes,
        "storage_path": storage_path,
        **public_urls,
    }


@router.get("/users", response_model=list[AdminUserItem])
async def list_users(
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
    limit: int | None = Query(default=None, ge=1, le=200),
    q: str | None = Query(default=None, max_length=320),
    role: str | None = Query(default=None, max_length=64),
    is_active: bool | None = Query(default=None),
) -> list[AdminUserItem]:
    query = select(User)

    normalized_q = q.strip() if q else None
    if normalized_q:
        search_pattern = f"%{normalized_q}%"
        query = query.where(
            or_(
                User.email.ilike(search_pattern),
                User.phone.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
            )
        )

    if is_active is not None:
        query = query.where(User.is_active.is_(is_active))

    normalized_role = role.strip().lower() if role else None
    if normalized_role:
        query = (
            query
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, UserRole.role_id == Role.id)
            .where(Role.code == normalized_role)
            .distinct()
        )

    query = query.order_by(User.email)
    if limit is not None:
        query = query.limit(limit)

    users_result = await session.execute(query)
    users = users_result.scalars().all()

    roles_by_user_id = await get_users_roles([user.id for user in users], session)

    return [
        build_admin_user_item(user, roles_by_user_id.get(str(user.id), []))
        for user in users
    ]


@router.post("/users", response_model=AdminUserDetail, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    data = normalize_user_create_data(model_to_dict(payload))

    user = User(
        email=data["email"],
        phone=data["phone"],
        full_name=data["full_name"],
        hashed_password=get_password_hash(data["password"]),
        is_active=data["is_active"],
        is_email_verified=data["is_email_verified"],
        mfa_enabled=False,
    )
    session.add(user)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.user_created",
            entity_type="user",
            entity_id=str(user.id),
            payload={
                "after": user_snapshot(user),
                "created_fields": [
                    "email",
                    "phone",
                    "full_name",
                    "is_active",
                    "is_email_verified",
                ],
            },
            request=request,
        )

        await session.commit()
        await session.refresh(user)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or phone already exists",
        )

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user_detail(
    user_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)
    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.patch("/users/{user_id}", response_model=AdminUserDetail)
async def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)
    data = normalize_user_update_data(model_to_dict(payload, exclude_unset=True))

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = user_snapshot(user)

    for field, value in data.items():
        setattr(user, field, value)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.user_updated",
            entity_type="user",
            entity_id=str(user.id),
            payload={
                "before": before,
                "after": user_snapshot(user),
                "changed_fields": sorted(data.keys()),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(user)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this phone already exists",
        )

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.post("/users/{user_id}/password", response_model=AdminUserDetail)
async def reset_user_password(
    user_id: str,
    payload: AdminUserPasswordUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)

    before = user_snapshot(user)
    user.hashed_password = get_password_hash(payload.password)

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.user_password_reset",
        entity_type="user",
        entity_id=str(user.id),
        payload={
            "before": before,
            "after": user_snapshot(user),
            "changed_fields": ["password"],
        },
        request=request,
    )

    await session.commit()
    await session.refresh(user)

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.post("/users/{user_id}/invite", response_model=AdminUserInviteResponse)
async def invite_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserInviteResponse:
    user = await get_admin_user_or_404(user_id, session)

    created_token = await create_user_password_token(
        session,
        user=user,
        created_by_user=current_user,
        delivery_target_email=user.email,
        mark_sent=False,
    )

    setup_url = build_password_setup_url(settings.public_base_url, created_token.raw_token)
    email_delivery_result = send_password_setup_email(
        recipient=user.email,
        user_email=user.email,
        setup_url=setup_url,
        expires_at=created_token.record.expires_at,
    )

    if email_delivery_result.sent:
        created_token.record.sent_at = datetime.now(timezone.utc)

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.user_invited",
        entity_type="user",
        entity_id=str(user.id),
        payload={
            "email": user.email,
            "delivery_target_email": user.email,
            "password_link_id": created_token.record.id,
            "expires_at": created_token.record.expires_at.isoformat(),
            "delivery_mode": "email",
            "email_delivery_status": email_delivery_result.status,
            "email_delivery_error": email_delivery_result.error,
            "setup_url_returned": True,
        },
        request=request,
    )

    await session.commit()

    return AdminUserInviteResponse(
        status="created",
        user_id=str(user.id),
        email=user.email,
        setup_url=setup_url,
        expires_at=created_token.record.expires_at,
        email_delivery_status=email_delivery_result.status,
        email_delivery_detail=email_delivery_result.detail,
        email_delivery_error=email_delivery_result.error,
    )


@router.post("/users/{user_id}/activate", response_model=AdminUserDetail)
async def activate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)
    before = user_snapshot(user)

    user.is_active = True

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.user_activated",
        entity_type="user",
        entity_id=str(user.id),
        payload={
            "before": before,
            "after": user_snapshot(user),
            "changed_fields": ["is_active"] if before["is_active"] is not True else [],
        },
        request=request,
    )

    await session.commit()
    await session.refresh(user)

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.post("/users/{user_id}/deactivate", response_model=AdminUserDetail)
async def deactivate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)

    await ensure_user_can_be_deactivated(user, session)

    before = user_snapshot(user)
    user.is_active = False

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.user_deactivated",
        entity_type="user",
        entity_id=str(user.id),
        payload={
            "before": before,
            "after": user_snapshot(user),
            "changed_fields": ["is_active"] if before["is_active"] is not False else [],
        },
        request=request,
    )

    await session.commit()
    await session.refresh(user)

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)



@router.post("/users/{user_id}/roles", response_model=AdminUserDetail)
async def assign_user_role(
    user_id: str,
    payload: AdminUserRoleAssign,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)
    role = await get_admin_role_or_404(payload.role_id, session)

    organization_id = payload.organization_id

    if organization_id is not None:
        await get_admin_organization_or_404(organization_id, session)

    duplicate_exists = await user_role_assignment_exists(
        user_id=str(user.id),
        role_id=str(role.id),
        organization_id=organization_id,
        session=session,
    )

    if duplicate_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User role assignment already exists",
        )

    user_role = UserRole(
        user_id=user.id,
        role_id=role.id,
        organization_id=organization_id,
    )
    session.add(user_role)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.user_role_assigned",
            entity_type="user",
            entity_id=str(user.id),
            payload={
                "user": user_snapshot(user),
                "role_assignment": role_assignment_snapshot(user_role, role),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(user)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User role assignment already exists",
        )

    roles = await get_user_roles(str(user.id), session)

    return build_admin_user_detail(user, roles)


@router.delete("/users/{user_id}/roles/{user_role_id}", response_model=AdminUserDetail)
async def remove_user_role(
    user_id: str,
    user_role_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    user = await get_admin_user_or_404(user_id, session)
    user_role, role = await get_user_role_or_404(user_id, user_role_id, session)

    await ensure_user_role_can_be_removed(user, role, session)

    role_assignment = role_assignment_snapshot(user_role, role)

    await session.delete(user_role)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.user_role_removed",
        entity_type="user",
        entity_id=str(user.id),
        payload={
            "user": user_snapshot(user),
            "role_assignment": role_assignment,
        },
        request=request,
    )

    await session.commit()
    await session.refresh(user)

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


@router.post(
    "/organizations",
    response_model=AdminOrganizationDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    payload: AdminOrganizationCreate,
    request: Request,
    current_user: User = Depends(require_permission("admin.organizations.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminOrganizationDetail:
    data = model_to_dict(payload)
    organization = Organization(**data)
    session.add(organization)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.organization_created",
            entity_type="organization",
            entity_id=str(organization.id),
            payload={
                "organization": organization_snapshot(organization),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(organization)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization with this INN already exists",
        )

    return build_admin_organization_detail(organization)


@router.patch("/organizations/{organization_id}", response_model=AdminOrganizationDetail)
async def update_organization(
    organization_id: str,
    payload: AdminOrganizationUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admin.organizations.write")),
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

    data = model_to_dict(payload, exclude_unset=True)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = organization_snapshot(organization)

    for field, value in data.items():
        setattr(organization, field, value)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.organization_updated",
            entity_type="organization",
            entity_id=str(organization.id),
            payload={
                "before": before,
                "after": organization_snapshot(organization),
                "changed_fields": sorted(data.keys()),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(organization)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization with this INN already exists",
        )

    return build_admin_organization_detail(organization)


@router.delete("/organizations/{organization_id}", response_model=AdminDeleteResult)
async def delete_organization(
    organization_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.organizations.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    organization = await get_admin_organization_or_404(organization_id, session)
    await ensure_organization_can_be_deleted(organization, session)

    deleted_organization_id = str(organization.id)
    before = organization_snapshot(organization)

    await session.delete(organization)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.organization_deleted",
        entity_type="organization",
        entity_id=deleted_organization_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_organization_id)


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


@router.post("/roles", response_model=AdminRoleDetail, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: AdminRoleCreate,
    request: Request,
    current_user: User = Depends(require_permission("admin.roles.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminRoleDetail:
    data = normalize_role_create_data(model_to_dict(payload))

    role = Role(
        code=data["code"],
        name=data["name"],
        description=data["description"],
    )
    session.add(role)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.role_created",
            entity_type="role",
            entity_id=str(role.id),
            payload={
                "role": role_snapshot(role),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(role)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Role with this code already exists",
        )

    permissions = await get_role_permissions(str(role.id), session)

    return build_admin_role_detail(role, permissions)


@router.patch("/roles/{role_id}", response_model=AdminRoleDetail)
async def update_role(
    role_id: str,
    payload: AdminRoleUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admin.roles.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminRoleDetail:
    role = await get_admin_role_or_404(role_id, session)
    ensure_role_metadata_can_be_modified(role)

    data = normalize_role_update_data(model_to_dict(payload, exclude_unset=True))

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = role_snapshot(role)

    for field, value in data.items():
        setattr(role, field, value)

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.role_updated",
        entity_type="role",
        entity_id=str(role.id),
        payload={
            "before": before,
            "after": role_snapshot(role),
            "changed_fields": sorted(data.keys()),
        },
        request=request,
    )

    await session.commit()
    await session.refresh(role)

    permissions = await get_role_permissions(str(role.id), session)

    return build_admin_role_detail(role, permissions)




@router.delete("/roles/{role_id}", response_model=AdminDeleteResult)
async def delete_role(
    role_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.roles.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    role = await get_admin_role_or_404(role_id, session)
    await ensure_role_can_be_deleted(role, session)

    deleted_role_id = str(role.id)
    before = role_snapshot(role)

    permissions_result = await session.execute(
        select(RolePermission).where(RolePermission.role_id == role.id)
    )
    role_permissions = permissions_result.scalars().all()
    removed_permission_ids = [
        str(role_permission.permission_id)
        for role_permission in role_permissions
    ]

    for role_permission in role_permissions:
        await session.delete(role_permission)

    await session.delete(role)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.role_deleted",
        entity_type="role",
        entity_id=deleted_role_id,
        payload={
            "before": before,
            "removed_permission_ids": removed_permission_ids,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_role_id)


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


@router.post("/roles/{role_id}/permissions", response_model=AdminRoleDetail)
async def assign_role_permission(
    role_id: str,
    payload: AdminRolePermissionAssign,
    request: Request,
    current_user: User = Depends(require_permission("admin.roles.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminRoleDetail:
    role = await get_admin_role_or_404(role_id, session)
    ensure_role_permissions_can_be_modified(role)

    permission = await get_admin_permission_or_404(payload.permission_id, session)

    duplicate_exists = await role_permission_assignment_exists(
        role_id=str(role.id),
        permission_id=str(permission.id),
        session=session,
    )

    if duplicate_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Role permission assignment already exists",
        )

    role_permission = RolePermission(
        role_id=role.id,
        permission_id=permission.id,
    )
    session.add(role_permission)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.role_permission_assigned",
            entity_type="role",
            entity_id=str(role.id),
            payload={
                "role_permission": role_permission_snapshot(role_permission, role, permission),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(role)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Role permission assignment already exists",
        )

    permissions = await get_role_permissions(str(role.id), session)

    return build_admin_role_detail(role, permissions)


@router.delete("/roles/{role_id}/permissions/{role_permission_id}", response_model=AdminRoleDetail)
async def remove_role_permission(
    role_id: str,
    role_permission_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.roles.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminRoleDetail:
    role = await get_admin_role_or_404(role_id, session)
    ensure_role_permissions_can_be_modified(role)

    role_permission, permission = await get_role_permission_or_404(
        role_id,
        role_permission_id,
        session,
    )
    snapshot = role_permission_snapshot(role_permission, role, permission)

    await session.delete(role_permission)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.role_permission_removed",
        entity_type="role",
        entity_id=str(role.id),
        payload={
            "role_permission": snapshot,
        },
        request=request,
    )

    await session.commit()
    await session.refresh(role)

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
    action: str | None = Query(default=None, max_length=128),
    entity_type: str | None = Query(default=None, max_length=64),
    entity_id: str | None = Query(default=None, max_length=64),
    actor_user_id: str | None = Query(default=None, max_length=64),
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_permission("audit.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminAuditEventItem]:
    action_filter = action.strip() if action else None
    entity_type_filter = entity_type.strip() if entity_type else None
    entity_id_filter = entity_id.strip() if entity_id else None
    actor_user_id_filter = actor_user_id.strip() if actor_user_id else None

    query = select(AuditEvent)

    if action_filter:
        query = query.where(AuditEvent.action == action_filter)

    if entity_type_filter:
        query = query.where(AuditEvent.entity_type == entity_type_filter)

    if entity_id_filter:
        query = query.where(AuditEvent.entity_id == entity_id_filter)

    if actor_user_id_filter:
        query = query.where(AuditEvent.actor_user_id == actor_user_id_filter)

    result = await session.execute(
        query
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
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



ADMIN_DOCUMENT_STATUSES = {"available", "draft", "revoked"}
ADMIN_DOCUMENT_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}


def build_admin_document_item(row) -> AdminDocumentItem:
    return AdminDocumentItem(
        id=str(row.id),
        document_number=row.document_number,
        verification_code=row.verification_code,
        document_type=row.document_type,
        title=row.title,
        status=row.status,
        revoked_at=row.revoked_at,
        revoked_by_user_id=str(row.revoked_by_user_id) if row.revoked_by_user_id else None,
        revoked_by_user_email=row.revoked_by_user_email,
        revoked_by_user_full_name=row.revoked_by_user_full_name,
        revocation_reason=row.revocation_reason,
        user_id=str(row.user_id),
        user_email=row.user_email,
        user_full_name=row.user_full_name,
        course_id=str(row.course_id) if row.course_id else None,
        course_title=row.course_title,
        enrollment_id=str(row.enrollment_id) if row.enrollment_id else None,
        enrollment_status=row.enrollment_status,
        organization_id=str(row.organization_id) if row.organization_id else None,
        organization_name=row.organization_name,
        learning_group_id=str(row.learning_group_id) if row.learning_group_id else None,
        learning_group_name=row.learning_group_name,
        file_available=bool(row.storage_path),
        generated_at=row.generated_at,
        generated_by_user_id=str(row.generated_by_user_id) if row.generated_by_user_id else None,
        generated_by_user_email=row.generated_by_user_email,
        generated_by_user_full_name=row.generated_by_user_full_name,
        generation_source=row.generation_source,
        generation_template_version=row.generation_template_version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def build_admin_document_generation_event_item(row) -> AdminDocumentGenerationEventItem:
    return AdminDocumentGenerationEventItem(
        id=str(row.id),
        document_id=str(row.document_id),
        storage_path=row.storage_path,
        source=row.source,
        template_version=row.template_version,
        generated_at=row.generated_at,
        generated_by_user_id=str(row.generated_by_user_id) if row.generated_by_user_id else None,
        generated_by_user_email=row.generated_by_user_email,
        generated_by_user_full_name=row.generated_by_user_full_name,
        created_at=row.created_at,
    )


def normalize_document_number(value: str | None) -> str:
    if value is None or not value.strip():
        return f"DOC-{uuid4().hex[:12].upper()}"

    normalized = value.strip().upper()

    if len(normalized) < 3 or len(normalized) > 128:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document number length must be between 3 and 128 characters",
        )

    return normalized


def normalize_document_status(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in ADMIN_DOCUMENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported document status",
        )

    return normalized


def normalize_revocation_reason(value: str | None) -> str | None:
    return normalize_optional_text(value)


def ensure_revocation_reason_allowed(
    *,
    document_status: str,
    revocation_reason: str | None,
) -> None:
    if document_status != "revoked" and revocation_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Revocation reason is allowed only for revoked documents",
        )


def apply_document_status_metadata(
    document: DocumentRecord,
    document_status: str,
    actor_user: User,
    revocation_reason: str | None = None,
) -> None:
    previous_status = document.status
    document.status = document_status

    if document_status == "revoked":
        if previous_status != "revoked" or document.revoked_at is None:
            document.revoked_at = datetime.now(timezone.utc)

        document.revoked_by_user_id = actor_user.id

        if revocation_reason is not None:
            document.revocation_reason = revocation_reason

        return

    document.revoked_at = None
    document.revoked_by_user_id = None
    document.revocation_reason = None


def normalize_uploaded_extension(filename: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()

    if not suffix:
        return ".bin"

    if suffix not in ADMIN_DOCUMENT_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported document file extension",
        )

    return suffix


async def save_admin_document_file(document_id: str, upload_file: UploadFile) -> str:
    content = await upload_file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty",
        )

    extension = normalize_uploaded_extension(upload_file.filename)
    relative_path = Path("documents") / f"{document_id}{extension}"

    try:
        return write_private_storage_file(relative_path, content)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document storage path",
        )



async def ensure_document_enrollment_is_unique(
    *,
    enrollment_id: str | None,
    session: AsyncSession,
    exclude_document_id: str | None = None,
) -> None:
    if enrollment_id is None:
        return

    query = select(DocumentRecord.id).where(DocumentRecord.enrollment_id == enrollment_id)

    if exclude_document_id is not None:
        query = query.where(DocumentRecord.id != exclude_document_id)

    result = await session.execute(query.limit(1))

    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document for this enrollment already exists",
        )


def ensure_document_enrollment_is_completed(enrollment: Enrollment) -> None:
    if enrollment.status != "completed" or enrollment.completed_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document can be linked only to completed enrollment",
        )


async def get_admin_document_row_or_404(
    document_id: str,
    session: AsyncSession,
):
    revoked_by_user = aliased(User)
    generated_by_user = aliased(User)

    result = await session.execute(
        select(
            DocumentRecord.id.label("id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("status"),
            DocumentRecord.revoked_at.label("revoked_at"),
            DocumentRecord.revoked_by_user_id.label("revoked_by_user_id"),
            DocumentRecord.revocation_reason.label("revocation_reason"),
            DocumentRecord.user_id.label("user_id"),
            DocumentRecord.course_id.label("course_id"),
            DocumentRecord.enrollment_id.label("enrollment_id"),
            DocumentRecord.storage_path.label("storage_path"),
            DocumentRecord.generated_at.label("generated_at"),
            DocumentRecord.generated_by_user_id.label("generated_by_user_id"),
            DocumentRecord.generation_source.label("generation_source"),
            DocumentRecord.generation_template_version.label("generation_template_version"),
            DocumentRecord.created_at.label("created_at"),
            DocumentRecord.updated_at.label("updated_at"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            revoked_by_user.email.label("revoked_by_user_email"),
            revoked_by_user.full_name.label("revoked_by_user_full_name"),
            generated_by_user.email.label("generated_by_user_email"),
            generated_by_user.full_name.label("generated_by_user_full_name"),
            Course.title.label("course_title"),
            Enrollment.status.label("enrollment_status"),
            Enrollment.organization_id.label("organization_id"),
            Enrollment.learning_group_id.label("learning_group_id"),
            Organization.name.label("organization_name"),
            LearningGroup.name.label("learning_group_name"),
        )
        .join(User, User.id == DocumentRecord.user_id)
        .outerjoin(revoked_by_user, revoked_by_user.id == DocumentRecord.revoked_by_user_id)
        .outerjoin(generated_by_user, generated_by_user.id == DocumentRecord.generated_by_user_id)
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .where(DocumentRecord.id == document_id)
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return row


@router.get("/documents", response_model=list[AdminDocumentItem])
async def list_admin_documents(
    user_id: str | None = Query(default=None, max_length=64),
    enrollment_id: str | None = Query(default=None, max_length=64),
    organization_id: str | None = Query(default=None, max_length=64),
    status_filter: str | None = Query(default=None, alias="status", max_length=32),
    document_type: str | None = Query(default=None, max_length=128),
    q: str | None = Query(default=None, max_length=255),
    action_required: bool | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminDocumentItem]:
    revoked_by_user = aliased(User)
    generated_by_user = aliased(User)

    query = (
        select(
            DocumentRecord.id.label("id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("status"),
            DocumentRecord.revoked_at.label("revoked_at"),
            DocumentRecord.revoked_by_user_id.label("revoked_by_user_id"),
            DocumentRecord.revocation_reason.label("revocation_reason"),
            DocumentRecord.user_id.label("user_id"),
            DocumentRecord.course_id.label("course_id"),
            DocumentRecord.enrollment_id.label("enrollment_id"),
            DocumentRecord.storage_path.label("storage_path"),
            DocumentRecord.generated_at.label("generated_at"),
            DocumentRecord.generated_by_user_id.label("generated_by_user_id"),
            DocumentRecord.generation_source.label("generation_source"),
            DocumentRecord.generation_template_version.label("generation_template_version"),
            DocumentRecord.created_at.label("created_at"),
            DocumentRecord.updated_at.label("updated_at"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            revoked_by_user.email.label("revoked_by_user_email"),
            revoked_by_user.full_name.label("revoked_by_user_full_name"),
            generated_by_user.email.label("generated_by_user_email"),
            generated_by_user.full_name.label("generated_by_user_full_name"),
            Course.title.label("course_title"),
            Enrollment.status.label("enrollment_status"),
            Enrollment.organization_id.label("organization_id"),
            Enrollment.learning_group_id.label("learning_group_id"),
            Organization.name.label("organization_name"),
            LearningGroup.name.label("learning_group_name"),
        )
        .join(User, User.id == DocumentRecord.user_id)
        .outerjoin(revoked_by_user, revoked_by_user.id == DocumentRecord.revoked_by_user_id)
        .outerjoin(generated_by_user, generated_by_user.id == DocumentRecord.generated_by_user_id)
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .order_by(DocumentRecord.created_at.desc(), DocumentRecord.title.asc())
        .limit(limit)
    )

    if user_id:
        query = query.where(DocumentRecord.user_id == user_id.strip())

    if enrollment_id and enrollment_id.strip():
        query = query.where(DocumentRecord.enrollment_id == enrollment_id.strip())

    if organization_id and organization_id.strip():
        query = query.where(Enrollment.organization_id == organization_id.strip())

    if status_filter:
        query = query.where(DocumentRecord.status == normalize_document_status(status_filter))

    if action_required is not None:
        action_required_condition = or_(
            DocumentRecord.status.in_(("draft", "revoked")),
            (DocumentRecord.status == "available") & DocumentRecord.storage_path.is_(None),
        )
        query = query.where(
            action_required_condition
            if action_required
            else ~action_required_condition
        )

    if document_type and document_type.strip():
        query = query.where(DocumentRecord.document_type.ilike(f"%{document_type.strip()}%"))

    if q and q.strip():
        q_filter = f"%{q.strip()}%"
        query = query.where(
            or_(
                DocumentRecord.document_number.ilike(q_filter),
                DocumentRecord.verification_code.ilike(q_filter),
                DocumentRecord.title.ilike(q_filter),
                DocumentRecord.document_type.ilike(q_filter),
                User.email.ilike(q_filter),
                User.full_name.ilike(q_filter),
                Course.title.ilike(q_filter),
            )
        )

    result = await session.execute(query)

    return [
        build_admin_document_item(row)
        for row in result.all()
    ]

@router.post("/documents", response_model=AdminDocumentItem, status_code=status.HTTP_201_CREATED)
async def create_admin_document(
    request: Request,
    user_id: str = Form(...),
    title: str = Form(...),
    document_type: str = Form(...),
    document_number: str | None = Form(default=None),
    doc_status: str = Form(default="available", alias="status"),
    revocation_reason: str | None = Form(default=None),
    course_id: str | None = Form(default=None),
    enrollment_id: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDocumentItem:
    user = await get_admin_user_or_404(user_id.strip(), session)

    normalized_title = title.strip()
    normalized_document_type = document_type.strip()

    if not normalized_title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document title is required",
        )

    if not normalized_document_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Document type is required",
        )

    normalized_status = normalize_document_status(doc_status)
    normalized_revocation_reason = normalize_revocation_reason(revocation_reason)
    ensure_revocation_reason_allowed(
        document_status=normalized_status,
        revocation_reason=normalized_revocation_reason,
    )
    normalized_number = normalize_document_number(document_number)

    normalized_course_id = course_id.strip() if course_id and course_id.strip() else None
    normalized_enrollment_id = enrollment_id.strip() if enrollment_id and enrollment_id.strip() else None

    if normalized_course_id is not None:
        course_result = await session.execute(
            select(Course).where(Course.id == normalized_course_id)
        )
        if course_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

    if normalized_enrollment_id is not None:
        enrollment_result = await session.execute(
            select(Enrollment).where(Enrollment.id == normalized_enrollment_id)
        )
        enrollment = enrollment_result.scalar_one_or_none()

        if enrollment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found",
            )

        if str(enrollment.user_id) != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enrollment belongs to another user",
            )

        if normalized_course_id is None:
            normalized_course_id = str(enrollment.course_id)
        elif str(enrollment.course_id) != normalized_course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enrollment course does not match document course",
            )

    if normalized_enrollment_id is not None:
        ensure_document_enrollment_is_completed(enrollment)

    await ensure_document_enrollment_is_unique(
        enrollment_id=normalized_enrollment_id,
        session=session,
    )

    document = DocumentRecord(
        user_id=user.id,
        course_id=normalized_course_id,
        enrollment_id=normalized_enrollment_id,
        document_number=normalized_number,
        document_type=normalized_document_type,
        title=normalized_title,
        status=normalized_status,
    )

    if normalized_status == "revoked":
        apply_document_status_metadata(
            document,
            "revoked",
            current_user,
            normalized_revocation_reason,
        )

    session.add(document)

    try:
        await session.flush()

        if file is not None and file.filename:
            document.storage_path = await save_admin_document_file(str(document.id), file)
            await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.document_created",
            entity_type="document",
            entity_id=str(document.id),
            payload={
                "document": {
                    "id": str(document.id),
                    "document_number": document.document_number,
                    "title": document.title,
                    "document_type": document.document_type,
                    "status": document.status,
                    "user_id": str(document.user_id),
                    "course_id": str(document.course_id) if document.course_id else None,
                    "enrollment_id": str(document.enrollment_id) if document.enrollment_id else None,
                    "file_available": bool(document.storage_path),
                },
            },
            request=request,
        )

        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document with this number already exists",
        )

    row = await get_admin_document_row_or_404(str(document.id), session)

    return build_admin_document_item(row)


def document_record_snapshot(document: DocumentRecord) -> dict:
    return {
        "id": str(document.id),
        "document_number": document.document_number,
        "verification_code": document.verification_code,
        "document_type": document.document_type,
        "title": document.title,
        "status": document.status,
        "revoked_at": document.revoked_at.isoformat() if document.revoked_at else None,
        "revoked_by_user_id": str(document.revoked_by_user_id) if document.revoked_by_user_id else None,
        "revocation_reason": document.revocation_reason,
        "user_id": str(document.user_id),
        "course_id": str(document.course_id) if document.course_id else None,
        "enrollment_id": str(document.enrollment_id) if document.enrollment_id else None,
        "file_available": bool(document.storage_path),
        "storage_path": document.storage_path,
        "generated_at": document.generated_at.isoformat() if document.generated_at else None,
        "generated_by_user_id": str(document.generated_by_user_id) if document.generated_by_user_id else None,
        "generation_source": document.generation_source,
        "generation_template_version": document.generation_template_version,
    }


def get_document_update_audit_action(before: dict, after: dict) -> str:
    before_status = before.get("status")
    after_status = after.get("status")

    if before_status != "revoked" and after_status == "revoked":
        return "admin.document_revoked"

    if before_status == "revoked" and after_status != "revoked":
        return "admin.document_restored"

    return "admin.document_updated"


def get_changed_snapshot_fields(before: dict, after: dict) -> list[str]:
    keys = set(before) | set(after)

    return sorted(
        key
        for key in keys
        if before.get(key) != after.get(key)
    )


def delete_admin_document_file(storage_path: str | None) -> None:
    delete_private_storage_file(storage_path)


async def get_admin_document_or_404(
    document_id: str,
    session: AsyncSession,
) -> DocumentRecord:
    result = await session.execute(
        select(DocumentRecord).where(DocumentRecord.id == document_id)
    )
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


@router.get("/documents/{document_id}/generation-events", response_model=list[AdminDocumentGenerationEventItem])
async def list_admin_document_generation_events(
    document_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminDocumentGenerationEventItem]:
    await get_admin_document_or_404(document_id, session)

    generated_by_user = aliased(User)

    result = await session.execute(
        select(
            DocumentGenerationEvent.id.label("id"),
            DocumentGenerationEvent.document_id.label("document_id"),
            DocumentGenerationEvent.storage_path.label("storage_path"),
            DocumentGenerationEvent.source.label("source"),
            DocumentGenerationEvent.template_version.label("template_version"),
            DocumentGenerationEvent.generated_at.label("generated_at"),
            DocumentGenerationEvent.generated_by_user_id.label("generated_by_user_id"),
            generated_by_user.email.label("generated_by_user_email"),
            generated_by_user.full_name.label("generated_by_user_full_name"),
            DocumentGenerationEvent.created_at.label("created_at"),
        )
        .outerjoin(generated_by_user, generated_by_user.id == DocumentGenerationEvent.generated_by_user_id)
        .where(DocumentGenerationEvent.document_id == document_id)
        .order_by(DocumentGenerationEvent.generated_at.desc(), DocumentGenerationEvent.created_at.desc())
        .limit(limit)
    )

    return [
        build_admin_document_generation_event_item(row)
        for row in result.all()
    ]


@router.get("/documents/{document_id}/generation-events/{event_id}/download")
async def download_admin_document_generation_event(
    document_id: str,
    event_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
):
    document = await get_admin_document_or_404(document_id, session)

    event_result = await session.execute(
        select(DocumentGenerationEvent).where(
            DocumentGenerationEvent.id == event_id,
            DocumentGenerationEvent.document_id == document.id,
        )
    )
    event = event_result.scalar_one_or_none()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document generation event not found",
        )

    resolved_path = resolve_admin_document_storage_path(event.storage_path)

    if not resolved_path or not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document generation artifact is not available",
        )

    media_type, filename = detect_document_download_metadata(
        resolved_path=resolved_path,
        storage_path=event.storage_path,
        document_number=document.document_number,
    )

    return FileResponse(
        path=resolved_path,
        media_type=media_type,
        filename=filename,
    )


@router.patch("/documents/{document_id}", response_model=AdminDocumentItem)
async def update_admin_document(
    document_id: str,
    request: Request,
    title: str | None = Form(default=None),
    document_type: str | None = Form(default=None),
    document_number: str | None = Form(default=None),
    doc_status: str | None = Form(default=None, alias="status"),
    revocation_reason: str | None = Form(default=None),
    course_id: str | None = Form(default=None),
    enrollment_id: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDocumentItem:
    document = await get_admin_document_or_404(document_id, session)

    has_file = file is not None and bool(file.filename)
    has_changes = any(
        value is not None
        for value in [title, document_type, document_number, doc_status, revocation_reason, course_id, enrollment_id]
    ) or has_file

    if not has_changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = document_record_snapshot(document)
    old_storage_path = document.storage_path
    new_storage_path_to_cleanup = None
    old_storage_path_to_delete = None
    normalized_revocation_reason = (
        normalize_revocation_reason(revocation_reason)
        if revocation_reason is not None
        else None
    )

    if title is not None:
        normalized_title = title.strip()

        if not normalized_title:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Document title is required",
            )

        document.title = normalized_title

    if document_type is not None:
        normalized_document_type = document_type.strip()

        if not normalized_document_type:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Document type is required",
            )

        document.document_type = normalized_document_type

    if document_number is not None and document_number.strip():
        document.document_number = normalize_document_number(document_number)

    if doc_status is not None:
        normalized_status = normalize_document_status(doc_status)
        ensure_revocation_reason_allowed(
            document_status=normalized_status,
            revocation_reason=normalized_revocation_reason,
        )
        apply_document_status_metadata(
            document,
            normalized_status,
            current_user,
            normalized_revocation_reason if revocation_reason is not None else document.revocation_reason,
        )
    elif revocation_reason is not None:
        if document.status != "revoked":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Revocation reason is allowed only for revoked documents",
            )

        document.revocation_reason = normalized_revocation_reason

    normalized_course_id = None
    normalized_enrollment_id = None

    if course_id is not None:
        normalized_course_id = course_id.strip() if course_id.strip() else None

        if normalized_course_id is not None:
            course_result = await session.execute(
                select(Course).where(Course.id == normalized_course_id)
            )
            if course_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Course not found",
                )

        document.course_id = normalized_course_id

    if enrollment_id is not None:
        normalized_enrollment_id = enrollment_id.strip() if enrollment_id.strip() else None

        if normalized_enrollment_id is not None:
            enrollment_result = await session.execute(
                select(Enrollment).where(Enrollment.id == normalized_enrollment_id)
            )
            enrollment = enrollment_result.scalar_one_or_none()

            if enrollment is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Enrollment not found",
                )

            if str(enrollment.user_id) != str(document.user_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment belongs to another user",
                )

            if document.course_id and str(enrollment.course_id) != str(document.course_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment course does not match document course",
                )

            if document.course_id is None:
                document.course_id = enrollment.course_id

            await ensure_document_enrollment_is_unique(
                enrollment_id=normalized_enrollment_id,
                session=session,
                exclude_document_id=str(document.id),
            )

        document.enrollment_id = normalized_enrollment_id

    if document.enrollment_id is not None:
        enrollment_result = await session.execute(
            select(Enrollment).where(Enrollment.id == document.enrollment_id)
        )
        enrollment = enrollment_result.scalar_one_or_none()

        if enrollment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Enrollment not found",
            )

        if str(enrollment.user_id) != str(document.user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enrollment belongs to another user",
            )

        if document.course_id is None:
            document.course_id = enrollment.course_id
        elif str(enrollment.course_id) != str(document.course_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enrollment course does not match document course",
            )

    try:
        if document.enrollment_id is not None:
            enrollment_result = await session.execute(
                select(Enrollment).where(Enrollment.id == document.enrollment_id)
            )
            enrollment = enrollment_result.scalar_one_or_none()

            if enrollment is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Enrollment not found",
                )

            if str(enrollment.user_id) != str(document.user_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment user does not match document user",
                )

            if document.course_id is None:
                document.course_id = enrollment.course_id
            elif str(enrollment.course_id) != str(document.course_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enrollment course does not match document course",
                )

            ensure_document_enrollment_is_completed(enrollment)

        if has_file:
            new_storage_path = await save_admin_document_file(str(document.id), file)
            document.storage_path = new_storage_path

            if new_storage_path != old_storage_path:
                new_storage_path_to_cleanup = new_storage_path
                old_storage_path_to_delete = old_storage_path

        await session.flush()

        after = document_record_snapshot(document)
        audit_action = get_document_update_audit_action(before, after)

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action=audit_action,
            entity_type="document",
            entity_id=str(document.id),
            payload={
                "before": before,
                "after": after,
                "changed_fields": get_changed_snapshot_fields(before, after),
                "status_transition": {
                    "from": before.get("status"),
                    "to": after.get("status"),
                },
            },
            request=request,
        )

        await session.commit()
    except IntegrityError:
        await session.rollback()

        if new_storage_path_to_cleanup:
            delete_admin_document_file(new_storage_path_to_cleanup)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document with this number already exists",
        )

    if old_storage_path_to_delete:
        delete_admin_document_file(old_storage_path_to_delete)

    row = await get_admin_document_row_or_404(str(document.id), session)

    return build_admin_document_item(row)


@router.delete("/documents/{document_id}", response_model=AdminDeleteResult)
async def delete_admin_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    document = await get_admin_document_or_404(document_id, session)

    deleted_document_id = str(document.id)
    storage_path = document.storage_path
    before = document_record_snapshot(document)

    await session.delete(document)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.document_deleted",
        entity_type="document",
        entity_id=deleted_document_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    delete_admin_document_file(storage_path)

    return AdminDeleteResult(status="deleted", id=deleted_document_id)


def resolve_admin_document_storage_path(storage_path: str) -> Path | None:
    return resolve_private_storage_path(storage_path)


def build_admin_document_download_filename(
    document: DocumentRecord,
    resolved_path: Path | None = None,
) -> str:
    if resolved_path is None:
        return build_document_download_filename(
            document.document_number,
            document.storage_path,
        )

    _, filename = detect_document_download_metadata(
        resolved_path=resolved_path,
        storage_path=document.storage_path,
        document_number=document.document_number,
    )

    return filename


@router.get("/documents/{document_id}/download")
async def download_admin_document(
    document_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
):
    document = await get_admin_document_or_404(document_id, session)

    if not document.storage_path:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document file is not available",
        )

    resolved_path = resolve_admin_document_storage_path(document.storage_path)

    if not resolved_path or not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document file is not available",
        )

    media_type, filename = detect_document_download_metadata(
        resolved_path=resolved_path,
        storage_path=document.storage_path,
        document_number=document.document_number,
    )

    return FileResponse(
        path=resolved_path,
        media_type=media_type,
        filename=filename,
    )


def is_generated_completion_document(document: DocumentRecord) -> bool:
    return bool(
        document.enrollment_id
        and str(document.document_number or "").startswith("AUTO-")
    )


@router.post("/documents/{document_id}/regenerate", response_model=AdminDocumentItem)
async def regenerate_admin_completion_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDocumentItem:
    document = await get_admin_document_or_404(document_id, session)

    if not is_generated_completion_document(document):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only generated completion documents can be regenerated",
        )

    enrollment_result = await session.execute(
        select(Enrollment).where(Enrollment.id == document.enrollment_id)
    )
    enrollment = enrollment_result.scalar_one_or_none()

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    ensure_document_enrollment_is_completed(enrollment)

    before = document_record_snapshot(document)
    course, learner, organization = await load_completion_document_context(enrollment, session)

    document.storage_path = write_completion_document_pdf_to_storage(
        enrollment=enrollment,
        document=document,
        course=course,
        learner=learner,
        organization=organization,
    )
    mark_completion_document_generation_metadata(
        document,
        actor_user=current_user,
        source="admin_regenerate",
    )
    add_completion_document_generation_event(
        document=document,
        session=session,
        actor_user=current_user,
        source="admin_regenerate",
    )

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.document_regenerated",
        entity_type="document",
        entity_id=str(document.id),
        payload={
            "before": before,
            "after": document_record_snapshot(document),
            "regenerated_file_available": bool(document.storage_path),
        },
        request=request,
    )

    await session.commit()

    row = await get_admin_document_row_or_404(str(document.id), session)

    return build_admin_document_item(row)


COURSE_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,254}$")


def normalize_course_slug(value: str) -> str:
    normalized = value.strip().lower()

    if not COURSE_SLUG_PATTERN.match(normalized):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course slug must start with a lowercase letter or digit and contain only lowercase letters, digits or hyphens",
        )

    return normalized


def normalize_course_create_data(data: dict) -> dict:
    normalized = dict(data)
    normalized["slug"] = normalize_course_slug(normalized["slug"])
    normalized["title"] = normalized["title"].strip()
    normalized["description"] = normalize_optional_text(normalized.get("description"))
    normalized["format"] = normalize_optional_text(normalized.get("format"))
    normalized["document_type"] = normalize_optional_text(normalized.get("document_type"))

    if not normalized["title"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course title is required",
        )

    return normalized


def normalize_course_update_data(data: dict) -> dict:
    normalized = dict(data)

    if "slug" in normalized and normalized["slug"] is not None:
        normalized["slug"] = normalize_course_slug(normalized["slug"])

    if "title" in normalized and normalized["title"] is not None:
        normalized["title"] = normalized["title"].strip()
        if not normalized["title"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course title is required",
            )

    if "description" in normalized:
        normalized["description"] = normalize_optional_text(normalized["description"])

    if "format" in normalized:
        normalized["format"] = normalize_optional_text(normalized["format"])

    if "document_type" in normalized:
        normalized["document_type"] = normalize_optional_text(normalized["document_type"])

    return normalized


def build_admin_course_item(course: Course) -> AdminCourseItem:
    return AdminCourseItem(
        id=str(course.id),
        slug=course.slug,
        title=course.title,
        description=course.description,
        hours=course.hours,
        format=course.format,
        document_type=course.document_type,
        is_active=course.is_active,
    )


def build_admin_course_detail(course: Course) -> AdminCourseDetail:
    return AdminCourseDetail(
        id=str(course.id),
        slug=course.slug,
        title=course.title,
        description=course.description,
        hours=course.hours,
        format=course.format,
        document_type=course.document_type,
        is_active=course.is_active,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


def course_snapshot(course: Course) -> dict:
    return {
        "id": str(course.id),
        "slug": course.slug,
        "title": course.title,
        "description": course.description,
        "hours": course.hours,
        "format": course.format,
        "document_type": course.document_type,
        "is_active": course.is_active,
    }


async def get_admin_course_or_404(
    course_id: str,
    session: AsyncSession,
) -> Course:
    result = await session.execute(
        select(Course).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return course


async def ensure_course_can_be_deleted(
    course: Course,
    session: AsyncSession,
) -> None:
    enrollment_result = await session.execute(
        select(Enrollment.id)
        .where(Enrollment.course_id == course.id)
        .limit(1)
    )

    if enrollment_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete course with enrollments",
        )

    document_result = await session.execute(
        select(DocumentRecord.id)
        .where(DocumentRecord.course_id == course.id)
        .limit(1)
    )

    if document_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete course with documents",
        )


@router.get("/courses", response_model=list[AdminCourseItem])
async def list_admin_courses(
    is_active: bool | None = Query(default=None),
    q: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=100, ge=1, le=300),
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminCourseItem]:
    query = select(Course).order_by(Course.title.asc()).limit(limit)

    if is_active is not None:
        query = query.where(Course.is_active == is_active)

    if q and q.strip():
        q_filter = f"%{q.strip()}%"
        query = query.where(
            or_(
                Course.slug.ilike(q_filter),
                Course.title.ilike(q_filter),
                Course.description.ilike(q_filter),
                Course.format.ilike(q_filter),
                Course.document_type.ilike(q_filter),
            )
        )

    result = await session.execute(query)
    courses = result.scalars().all()

    return [
        build_admin_course_item(course)
        for course in courses
    ]


@router.post("/courses", response_model=AdminCourseDetail, status_code=status.HTTP_201_CREATED)
async def create_admin_course(
    payload: AdminCourseCreate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseDetail:
    data = normalize_course_create_data(model_to_dict(payload))

    course = Course(**data)
    session.add(course)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.course_created",
            entity_type="course",
            entity_id=str(course.id),
            payload={
                "course": course_snapshot(course),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(course)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course with this slug already exists",
        )

    return build_admin_course_detail(course)


@router.get("/courses/{course_id}", response_model=AdminCourseDetail)
async def get_admin_course_detail(
    course_id: str,
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseDetail:
    course = await get_admin_course_or_404(course_id, session)

    return build_admin_course_detail(course)


@router.patch("/courses/{course_id}", response_model=AdminCourseDetail)
async def update_admin_course(
    course_id: str,
    payload: AdminCourseUpdate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseDetail:
    course = await get_admin_course_or_404(course_id, session)
    data = normalize_course_update_data(model_to_dict(payload, exclude_unset=True))

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = course_snapshot(course)

    for field, value in data.items():
        setattr(course, field, value)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.course_updated",
            entity_type="course",
            entity_id=str(course.id),
            payload={
                "before": before,
                "after": course_snapshot(course),
                "changed_fields": sorted(data.keys()),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(course)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course with this slug already exists",
        )

    return build_admin_course_detail(course)


@router.post("/courses/{course_id}/activate", response_model=AdminCourseDetail)
async def activate_admin_course(
    course_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseDetail:
    course = await get_admin_course_or_404(course_id, session)
    before = course_snapshot(course)

    course.is_active = True

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_activated",
        entity_type="course",
        entity_id=str(course.id),
        payload={
            "before": before,
            "after": course_snapshot(course),
            "changed_fields": ["is_active"] if before["is_active"] is not True else [],
        },
        request=request,
    )

    await session.commit()
    await session.refresh(course)

    return build_admin_course_detail(course)


@router.post("/courses/{course_id}/deactivate", response_model=AdminCourseDetail)
async def deactivate_admin_course(
    course_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseDetail:
    course = await get_admin_course_or_404(course_id, session)
    before = course_snapshot(course)

    course.is_active = False

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_deactivated",
        entity_type="course",
        entity_id=str(course.id),
        payload={
            "before": before,
            "after": course_snapshot(course),
            "changed_fields": ["is_active"] if before["is_active"] is not False else [],
        },
        request=request,
    )

    await session.commit()
    await session.refresh(course)

    return build_admin_course_detail(course)


@router.delete("/courses/{course_id}", response_model=AdminDeleteResult)
async def delete_admin_course(
    course_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    course = await get_admin_course_or_404(course_id, session)
    await ensure_course_can_be_deleted(course, session)

    deleted_course_id = str(course.id)
    before = course_snapshot(course)

    await session.delete(course)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_deleted",
        entity_type="course",
        entity_id=deleted_course_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_course_id)



def normalize_course_module_create_data(data: dict) -> dict:
    normalized = dict(data)
    normalized["title"] = normalized["title"].strip()
    normalized["description"] = normalize_optional_text(normalized.get("description"))

    if not normalized["title"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course module title is required",
        )

    return normalized


def normalize_course_module_update_data(data: dict) -> dict:
    normalized = dict(data)

    if "title" in normalized and normalized["title"] is not None:
        normalized["title"] = normalized["title"].strip()
        if not normalized["title"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course module title is required",
            )

    if "description" in normalized:
        normalized["description"] = normalize_optional_text(normalized["description"])

    return normalized


def build_admin_course_module_item(module: CourseModule) -> AdminCourseModuleItem:
    return AdminCourseModuleItem(
        id=str(module.id),
        course_id=str(module.course_id),
        title=module.title,
        description=module.description,
        position=module.position,
        is_active=module.is_active,
    )


def build_admin_course_module_detail(module: CourseModule) -> AdminCourseModuleDetail:
    return AdminCourseModuleDetail(
        id=str(module.id),
        course_id=str(module.course_id),
        title=module.title,
        description=module.description,
        position=module.position,
        is_active=module.is_active,
        created_at=module.created_at,
        updated_at=module.updated_at,
    )


def course_module_snapshot(module: CourseModule) -> dict:
    return {
        "id": str(module.id),
        "course_id": str(module.course_id),
        "title": module.title,
        "description": module.description,
        "position": module.position,
        "is_active": module.is_active,
    }


async def get_admin_course_module_or_404(
    module_id: str,
    session: AsyncSession,
) -> CourseModule:
    result = await session.execute(
        select(CourseModule).where(CourseModule.id == module_id)
    )
    module = result.scalar_one_or_none()

    if module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course module not found",
        )

    return module


@router.get("/courses/{course_id}/modules", response_model=list[AdminCourseModuleItem])
async def list_admin_course_modules(
    course_id: str,
    is_active: bool | None = Query(default=None),
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminCourseModuleItem]:
    course = await get_admin_course_or_404(course_id, session)

    query = (
        select(CourseModule)
        .where(CourseModule.course_id == course.id)
        .order_by(CourseModule.position.asc(), CourseModule.title.asc())
    )

    if is_active is not None:
        query = query.where(CourseModule.is_active == is_active)

    result = await session.execute(query)
    modules = result.scalars().all()

    return [
        build_admin_course_module_item(module)
        for module in modules
    ]


@router.post(
    "/courses/{course_id}/modules",
    response_model=AdminCourseModuleDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_course_module(
    course_id: str,
    payload: AdminCourseModuleCreate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseModuleDetail:
    course = await get_admin_course_or_404(course_id, session)
    data = normalize_course_module_create_data(model_to_dict(payload))

    module = CourseModule(
        course_id=course.id,
        **data,
    )
    session.add(module)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.course_module_created",
            entity_type="course_module",
            entity_id=str(module.id),
            payload={
                "course": course_snapshot(course),
                "course_module": course_module_snapshot(module),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(module)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course module position already exists for this course",
        )

    return build_admin_course_module_detail(module)


@router.get("/course-modules/{module_id}", response_model=AdminCourseModuleDetail)
async def get_admin_course_module_detail(
    module_id: str,
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseModuleDetail:
    module = await get_admin_course_module_or_404(module_id, session)

    return build_admin_course_module_detail(module)


@router.patch("/course-modules/{module_id}", response_model=AdminCourseModuleDetail)
async def update_admin_course_module(
    module_id: str,
    payload: AdminCourseModuleUpdate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseModuleDetail:
    module = await get_admin_course_module_or_404(module_id, session)
    data = normalize_course_module_update_data(model_to_dict(payload, exclude_unset=True))

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = course_module_snapshot(module)

    for field, value in data.items():
        setattr(module, field, value)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.course_module_updated",
            entity_type="course_module",
            entity_id=str(module.id),
            payload={
                "before": before,
                "after": course_module_snapshot(module),
                "changed_fields": sorted(data.keys()),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(module)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course module position already exists for this course",
        )

    return build_admin_course_module_detail(module)


@router.delete("/course-modules/{module_id}", response_model=AdminDeleteResult)
async def delete_admin_course_module(
    module_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    module = await get_admin_course_module_or_404(module_id, session)

    deleted_module_id = str(module.id)
    before = course_module_snapshot(module)

    await session.delete(module)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_module_deleted",
        entity_type="course_module",
        entity_id=deleted_module_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_module_id)

ADMIN_COURSE_LESSON_CONTENT_TYPES = {
    "text",
    "video",
    "file",
    "link",
    "assignment",
}

ADMIN_COURSE_LESSON_EDITOR_MODES = {
    "legacy",
    "block",
}

ADMIN_COURSE_LESSON_STATUSES = {
    "draft",
    "published",
    "archived",
}


def normalize_course_lesson_content_type(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in ADMIN_COURSE_LESSON_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported course lesson content type",
        )

    return normalized


def normalize_course_lesson_editor_mode(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in ADMIN_COURSE_LESSON_EDITOR_MODES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported course lesson editor mode",
        )

    return normalized


def normalize_course_lesson_status(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in ADMIN_COURSE_LESSON_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported course lesson status",
        )

    return normalized


def normalize_course_lesson_create_data(data: dict) -> dict:
    normalized = dict(data)
    normalized["title"] = normalized["title"].strip()
    normalized["description"] = normalize_optional_text(normalized.get("description"))
    normalized["content_type"] = normalize_course_lesson_content_type(
        normalized.get("content_type") or "text"
    )
    normalized["content_url"] = normalize_optional_text(normalized.get("content_url"))
    normalized["content_text"] = normalize_optional_text(normalized.get("content_text"))
    normalized["editor_mode"] = normalize_course_lesson_editor_mode(
        normalized.get("editor_mode") or "legacy"
    )
    normalized["status"] = normalize_course_lesson_status(
        normalized.get("status") or "published"
    )
    normalized["published_version_id"] = normalize_optional_text(
        normalized.get("published_version_id")
    )

    if not normalized["title"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course lesson title is required",
        )

    return normalized


def normalize_course_lesson_update_data(data: dict) -> dict:
    normalized = dict(data)

    if "title" in normalized:
        if normalized["title"] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course lesson title is required",
            )

        normalized["title"] = normalized["title"].strip()

        if not normalized["title"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course lesson title is required",
            )

    if "description" in normalized:
        normalized["description"] = normalize_optional_text(normalized["description"])

    if "content_type" in normalized:
        if normalized["content_type"] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course lesson content type is required",
            )

        normalized["content_type"] = normalize_course_lesson_content_type(
            normalized["content_type"]
        )

    if "content_url" in normalized:
        normalized["content_url"] = normalize_optional_text(normalized["content_url"])

    if "content_text" in normalized:
        normalized["content_text"] = normalize_optional_text(normalized["content_text"])

    if "editor_mode" in normalized:
        if normalized["editor_mode"] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course lesson editor mode is required",
            )
        normalized["editor_mode"] = normalize_course_lesson_editor_mode(normalized["editor_mode"])

    if "status" in normalized:
        if normalized["status"] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Course lesson status is required",
            )
        normalized["status"] = normalize_course_lesson_status(normalized["status"])

    if "published_version_id" in normalized:
        normalized["published_version_id"] = normalize_optional_text(
            normalized["published_version_id"]
        )

    if "position" in normalized and normalized["position"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course lesson position is required",
        )

    if "is_required" in normalized and normalized["is_required"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course lesson required flag is required",
        )

    if "is_active" in normalized and normalized["is_active"] is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Course lesson active flag is required",
        )

    return normalized


def build_admin_course_lesson_item(lesson: CourseLesson, readiness: dict | None = None) -> AdminCourseLessonItem:
    readiness = normalize_admin_lesson_readiness_payload(readiness)

    return AdminCourseLessonItem(
        id=str(lesson.id),
        module_id=str(lesson.module_id),
        title=lesson.title,
        description=lesson.description,
        content_type=lesson.content_type,
        content_url=lesson.content_url,
        content_text=lesson.content_text,
        editor_mode=lesson.editor_mode,
        status=lesson.status,
        published_version_id=lesson.published_version_id,
        position=lesson.position,
        is_required=lesson.is_required,
        is_active=lesson.is_active,
        blocks_count=readiness["blocks_count"],
        active_blocks_count=readiness["active_blocks_count"],
        problem_blocks_count=readiness["problem_blocks_count"],
        is_content_ready=readiness["is_content_ready"],
        readiness_status=readiness["readiness_status"],
        readiness_issues=readiness["readiness_issues"],
    )


def build_admin_course_lesson_detail(lesson: CourseLesson, readiness: dict | None = None) -> AdminCourseLessonDetail:
    readiness = normalize_admin_lesson_readiness_payload(readiness)

    return AdminCourseLessonDetail(
        id=str(lesson.id),
        module_id=str(lesson.module_id),
        title=lesson.title,
        description=lesson.description,
        content_type=lesson.content_type,
        content_url=lesson.content_url,
        content_text=lesson.content_text,
        editor_mode=lesson.editor_mode,
        status=lesson.status,
        published_version_id=lesson.published_version_id,
        position=lesson.position,
        is_required=lesson.is_required,
        is_active=lesson.is_active,
        blocks_count=readiness["blocks_count"],
        active_blocks_count=readiness["active_blocks_count"],
        problem_blocks_count=readiness["problem_blocks_count"],
        is_content_ready=readiness["is_content_ready"],
        readiness_status=readiness["readiness_status"],
        readiness_issues=readiness["readiness_issues"],
        created_at=lesson.created_at,
        updated_at=lesson.updated_at,
    )


def course_lesson_snapshot(lesson: CourseLesson) -> dict:
    return {
        "id": str(lesson.id),
        "module_id": str(lesson.module_id),
        "title": lesson.title,
        "description": lesson.description,
        "content_type": lesson.content_type,
        "content_url": lesson.content_url,
        "content_text": lesson.content_text,
        "editor_mode": lesson.editor_mode,
        "status": lesson.status,
        "published_version_id": lesson.published_version_id,
        "position": lesson.position,
        "is_required": lesson.is_required,
        "is_active": lesson.is_active,
    }


async def get_admin_course_lesson_or_404(
    lesson_id: str,
    session: AsyncSession,
) -> CourseLesson:
    result = await session.execute(
        select(CourseLesson).where(CourseLesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course lesson not found",
        )

    return lesson


@router.get("/course-modules/{module_id}/lessons", response_model=list[AdminCourseLessonItem])
async def list_admin_course_lessons(
    module_id: str,
    is_active: bool | None = Query(default=None),
    content_type: str | None = Query(default=None),
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminCourseLessonItem]:
    module = await get_admin_course_module_or_404(module_id, session)

    query = (
        select(CourseLesson)
        .where(CourseLesson.module_id == module.id)
        .order_by(CourseLesson.position.asc(), CourseLesson.title.asc())
    )

    if is_active is not None:
        query = query.where(CourseLesson.is_active == is_active)

    if content_type:
        query = query.where(
            CourseLesson.content_type == normalize_course_lesson_content_type(content_type)
        )

    result = await session.execute(query)
    lessons = result.scalars().all()
    readiness_by_lesson_id = await get_admin_lessons_readiness_map(lessons, session)

    return [
        build_admin_course_lesson_item(
            lesson,
            readiness_by_lesson_id.get(str(lesson.id)),
        )
        for lesson in lessons
    ]


@router.post(
    "/course-modules/{module_id}/lessons",
    response_model=AdminCourseLessonDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_course_lesson(
    module_id: str,
    payload: AdminCourseLessonCreate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseLessonDetail:
    module = await get_admin_course_module_or_404(module_id, session)
    data = normalize_course_lesson_create_data(model_to_dict(payload))

    lesson = CourseLesson(
        module_id=module.id,
        **data,
    )
    session.add(lesson)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.course_lesson_created",
            entity_type="course_lesson",
            entity_id=str(lesson.id),
            payload={
                "course_module": course_module_snapshot(module),
                "course_lesson": course_lesson_snapshot(lesson),
            },
            request=request,
        )

        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course lesson position already exists in this module",
        ) from exc

    return build_admin_course_lesson_detail(lesson)


@router.get("/course-lessons/{lesson_id}", response_model=AdminCourseLessonDetail)
async def get_admin_course_lesson_detail(
    lesson_id: str,
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseLessonDetail:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    readiness = await get_admin_lesson_readiness_payload(lesson, session)

    return build_admin_course_lesson_detail(lesson, readiness)


@router.patch("/course-lessons/{lesson_id}", response_model=AdminCourseLessonDetail)
async def update_admin_course_lesson(
    lesson_id: str,
    payload: AdminCourseLessonUpdate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseLessonDetail:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    data = normalize_course_lesson_update_data(model_to_dict(payload, exclude_unset=True))

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = course_lesson_snapshot(lesson)

    for field, value in data.items():
        setattr(lesson, field, value)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.course_lesson_updated",
            entity_type="course_lesson",
            entity_id=str(lesson.id),
            payload={
                "before": before,
                "after": course_lesson_snapshot(lesson),
            },
            request=request,
        )

        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Course lesson position already exists in this module",
        ) from exc

    return build_admin_course_lesson_detail(lesson)



@router.post("/course-lessons/{lesson_id}/publish", response_model=AdminCourseLessonDetail)
async def publish_admin_course_lesson(
    lesson_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseLessonDetail:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    readiness = await get_admin_lesson_readiness_payload(lesson, session)

    if not readiness["is_content_ready"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Lesson is not ready for publication",
                "issues": readiness["readiness_issues"],
            },
        )

    before = course_lesson_snapshot(lesson)

    lesson.status = "published"
    lesson.published_version_id = str(uuid4())

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_lesson_published",
        entity_type="course_lesson",
        entity_id=str(lesson.id),
        payload={
            "before": before,
            "after": course_lesson_snapshot(lesson),
            "readiness": readiness,
        },
        request=request,
    )

    await session.commit()
    await session.refresh(lesson)

    readiness = await get_admin_lesson_readiness_payload(lesson, session)

    return build_admin_course_lesson_detail(lesson, readiness)



@router.post("/course-lessons/{lesson_id}/unpublish", response_model=AdminCourseLessonDetail)
async def unpublish_admin_course_lesson(
    lesson_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminCourseLessonDetail:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    readiness = await get_admin_lesson_readiness_payload(lesson, session)
    before = course_lesson_snapshot(lesson)

    lesson.status = "draft"
    lesson.published_version_id = None

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_lesson_unpublished",
        entity_type="course_lesson",
        entity_id=str(lesson.id),
        payload={
            "before": before,
            "after": course_lesson_snapshot(lesson),
            "readiness": readiness,
        },
        request=request,
    )

    await session.commit()
    await session.refresh(lesson)

    readiness = await get_admin_lesson_readiness_payload(lesson, session)

    return build_admin_course_lesson_detail(lesson, readiness)


@router.delete("/course-lessons/{lesson_id}", response_model=AdminDeleteResult)
async def delete_admin_course_lesson(
    lesson_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)

    deleted_lesson_id = str(lesson.id)
    before = course_lesson_snapshot(lesson)

    await session.delete(lesson)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.course_lesson_deleted",
        entity_type="course_lesson",
        entity_id=deleted_lesson_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_lesson_id)


def build_admin_lesson_block_item(block: LessonBlock) -> AdminLessonBlockItem:
    return AdminLessonBlockItem(
        id=str(block.id),
        lesson_id=str(block.lesson_id),
        block_type=block.block_type,
        position=block.position,
        title=block.title,
        content_json=block.content_json or {},
        settings_json=block.settings_json or {},
        is_required=block.is_required,
        is_active=block.is_active,
    )


def build_admin_lesson_block_detail(block: LessonBlock) -> AdminLessonBlockDetail:
    return AdminLessonBlockDetail(
        id=str(block.id),
        lesson_id=str(block.lesson_id),
        block_type=block.block_type,
        position=block.position,
        title=block.title,
        content_json=block.content_json or {},
        settings_json=block.settings_json or {},
        is_required=block.is_required,
        is_active=block.is_active,
        created_at=block.created_at,
        updated_at=block.updated_at,
    )


def build_admin_lesson_block_item_from_legacy_dict(block: dict) -> AdminLessonBlockItem:
    return AdminLessonBlockItem(
        id=str(block["id"]),
        lesson_id=str(block["lesson_id"]),
        block_type=block["block_type"],
        position=block["position"],
        title=block.get("title"),
        content_json=block.get("content_json") or {},
        settings_json=block.get("settings_json") or {},
        is_required=bool(block.get("is_required")),
        is_active=bool(block.get("is_active")),
    )


def lesson_block_snapshot(block: LessonBlock) -> dict:
    return {
        "id": str(block.id),
        "lesson_id": str(block.lesson_id),
        "block_type": block.block_type,
        "position": block.position,
        "title": block.title,
        "content_json": block.content_json or {},
        "settings_json": block.settings_json or {},
        "is_required": block.is_required,
        "is_active": block.is_active,
    }


def normalize_lesson_block_create_data(data: dict) -> dict:
    normalized = dict(data)
    normalized["block_type"] = normalize_lesson_block_type(normalized["block_type"])
    normalized["title"] = normalize_optional_text(normalized.get("title"))
    normalized["content_json"] = normalized.get("content_json") or {}
    normalized["settings_json"] = normalized.get("settings_json") or {}

    if not isinstance(normalized["content_json"], dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Lesson block content_json must be an object",
        )

    if not isinstance(normalized["settings_json"], dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Lesson block settings_json must be an object",
        )

    return normalized


def normalize_lesson_block_update_data(data: dict) -> dict:
    normalized = dict(data)

    if "block_type" in normalized and normalized["block_type"] is not None:
        normalized["block_type"] = normalize_lesson_block_type(normalized["block_type"])

    if "title" in normalized:
        normalized["title"] = normalize_optional_text(normalized["title"])

    if "content_json" in normalized:
        if normalized["content_json"] is None or not isinstance(normalized["content_json"], dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Lesson block content_json must be an object",
            )

    if "settings_json" in normalized:
        if normalized["settings_json"] is None or not isinstance(normalized["settings_json"], dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Lesson block settings_json must be an object",
            )

    return normalized


async def get_admin_lesson_block_or_404(
    block_id: str,
    session: AsyncSession,
) -> LessonBlock:
    result = await session.execute(
        select(LessonBlock).where(LessonBlock.id == block_id)
    )
    block = result.scalar_one_or_none()

    if block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson block not found",
        )

    return block


async def list_real_lesson_blocks(
    lesson_id: str,
    session: AsyncSession,
) -> list[LessonBlock]:
    result = await session.execute(
        select(LessonBlock)
        .where(LessonBlock.lesson_id == lesson_id)
        .order_by(LessonBlock.position.asc(), LessonBlock.created_at.asc())
    )

    return list(result.scalars().all())



def normalize_lesson_audio_extension(filename: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()

    if not suffix:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio file extension is required",
        )

    if suffix not in LESSON_AUDIO_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only MP3, WAV, M4A, AAC, OGG and WEBM audio files are supported",
        )

    return suffix


def get_lesson_audio_mime_type(extension: str) -> str:
    return LESSON_AUDIO_MIME_BY_EXTENSION.get(extension.lower(), "application/octet-stream")


async def save_admin_lesson_audio_file(
    *,
    lesson_id: str,
    asset_id: str,
    upload_file: UploadFile,
) -> tuple[str, int, str, str]:
    content = await upload_file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded audio file is empty",
        )

    if len(content) > LESSON_AUDIO_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file is too large",
        )

    extension = normalize_lesson_audio_extension(upload_file.filename)
    mime_type = get_lesson_audio_mime_type(extension)
    relative_path = Path("lesson-audio") / lesson_id / f"{asset_id}{extension}"

    try:
        storage_path = write_private_storage_file(relative_path, content)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio storage path",
        )

    return storage_path, len(content), extension, mime_type


def build_lesson_audio_public_urls(
    *,
    request: Request,
    lesson_id: str,
    asset_id: str,
) -> dict[str, str]:
    base_url = str(request.base_url).rstrip("/")
    public_path = f"/api/v1/public/lesson-audio/{lesson_id}/{asset_id}"

    return {
        "stream_url": f"{base_url}{public_path}/stream",
        "download_url": f"{base_url}{public_path}/download",
    }


@router.post(
    "/course-lessons/{lesson_id}/audio-assets",
    status_code=status.HTTP_201_CREATED,
)
async def upload_admin_lesson_audio_asset(
    lesson_id: str,
    request: Request,
    file: UploadFile = File(...),
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    asset_id = str(uuid4())

    storage_path, size_bytes, source_extension, mime_type = await save_admin_lesson_audio_file(
        lesson_id=str(lesson.id),
        asset_id=asset_id,
        upload_file=file,
    )

    urls = build_lesson_audio_public_urls(
        request=request,
        lesson_id=str(lesson.id),
        asset_id=asset_id,
    )

    return {
        "asset_id": asset_id,
        "lesson_id": str(lesson.id),
        "material_kind": "audio",
        "original_filename": file.filename or f"audio{source_extension}",
        "mime_type": mime_type,
        "source_extension": source_extension,
        "size_bytes": size_bytes,
        "storage_path": storage_path,
        "url": urls["stream_url"],
        "content_url": urls["stream_url"],
        "audio_url": urls["stream_url"],
        "stream_url": urls["stream_url"],
        "original_url": urls["download_url"],
        "download_url": urls["download_url"],
    }



def normalize_lesson_presentation_extension(filename: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()

    if not suffix:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Presentation file extension is required",
        )

    if suffix not in LESSON_PRESENTATION_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only PDF and PPTX presentation files are supported at this stage",
        )

    return suffix


def get_lesson_presentation_converter_command() -> str:
    return shutil.which("soffice") or shutil.which("libreoffice") or ""


def convert_pptx_presentation_to_pdf(
    *,
    content: bytes,
    asset_id: str,
) -> bytes:
    converter = get_lesson_presentation_converter_command()

    if not converter:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Presentation converter is not installed",
        )

    with tempfile.TemporaryDirectory(prefix="obrportal-presentation-") as temp_dir:
        temp_path = Path(temp_dir)
        input_path = temp_path / f"{asset_id}.pptx"
        output_dir = temp_path / "out"
        output_dir.mkdir(parents=True, exist_ok=True)

        input_path.write_bytes(content)

        command = [
            converter,
            "--headless",
            "--nologo",
            "--nodefault",
            "--nofirststartwizard",
            "--convert-to",
            "pdf",
            "--outdir",
            str(output_dir),
            str(input_path),
        ]

        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                check=False,
                text=True,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Presentation conversion timed out",
            )

        if completed.returncode != 0:
            converter_output = " ".join(
                item.strip()
                for item in [completed.stderr, completed.stdout]
                if item and item.strip()
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Presentation conversion failed: {converter_output[:500]}",
            )

        output_path = output_dir / f"{asset_id}.pdf"

        if not output_path.exists():
            pdf_candidates = list(output_dir.glob("*.pdf"))

            if pdf_candidates:
                output_path = pdf_candidates[0]
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Presentation conversion did not produce a PDF file",
                )

        pdf_content = output_path.read_bytes()

        if not pdf_content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Converted presentation is not a valid PDF document",
            )

        return pdf_content


async def save_admin_lesson_presentation_file(
    *,
    lesson_id: str,
    asset_id: str,
    upload_file: UploadFile,
) -> tuple[str, int, str]:
    content = await upload_file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded presentation file is empty",
        )

    if len(content) > LESSON_PRESENTATION_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Presentation file is too large",
        )

    extension = normalize_lesson_presentation_extension(upload_file.filename)

    if extension == ".pdf":
        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file is not a valid PDF document",
            )

        pdf_content = content
    elif extension == ".pptx":
        pdf_content = convert_pptx_presentation_to_pdf(
            content=content,
            asset_id=asset_id,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported presentation file extension",
        )

    relative_path = Path("lesson-presentations") / lesson_id / f"{asset_id}.pdf"

    try:
        storage_path = write_private_storage_file(relative_path, pdf_content)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid presentation storage path",
        )

    return storage_path, len(pdf_content), extension


def build_lesson_presentation_public_urls(
    *,
    request: Request,
    lesson_id: str,
    asset_id: str,
) -> dict[str, str]:
    base_url = str(request.base_url).rstrip("/")
    public_path = f"/api/v1/public/lesson-presentations/{lesson_id}/{asset_id}"

    return {
        "viewer_url": f"{base_url}{public_path}/view",
        "download_url": f"{base_url}{public_path}/download",
    }


@router.post(
    "/course-lessons/{lesson_id}/presentation-assets",
    status_code=status.HTTP_201_CREATED,
)
async def upload_admin_lesson_presentation_asset(
    lesson_id: str,
    request: Request,
    file: UploadFile = File(...),
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    asset_id = str(uuid4())

    storage_path, size_bytes, source_extension = await save_admin_lesson_presentation_file(
        lesson_id=str(lesson.id),
        asset_id=asset_id,
        upload_file=file,
    )

    urls = build_lesson_presentation_public_urls(
        request=request,
        lesson_id=str(lesson.id),
        asset_id=asset_id,
    )

    return {
        "asset_id": asset_id,
        "lesson_id": str(lesson.id),
        "material_kind": "presentation",
        "original_filename": file.filename or "presentation.pdf",
        "mime_type": "application/pdf",
        "source_extension": source_extension,
        "size_bytes": size_bytes,
        "storage_path": storage_path,
        "viewer_url": urls["viewer_url"],
        "original_url": urls["download_url"],
        "download_url": urls["download_url"],
        "render_mode": "pdf",
        "conversion_status": "ready",
        "show_download": True,
    }


@router.get("/course-lessons/{lesson_id}/blocks", response_model=list[AdminLessonBlockItem])
async def list_admin_lesson_blocks(
    lesson_id: str,
    _: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminLessonBlockItem]:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    blocks = await list_real_lesson_blocks(str(lesson.id), session)

    if blocks:
        return [
            build_admin_lesson_block_item(block)
            for block in blocks
        ]

    if lesson.editor_mode == "block":
        return []

    return [
        build_admin_lesson_block_item_from_legacy_dict(block)
        for block in build_synthetic_legacy_lesson_blocks(lesson)
    ]


@router.post(
    "/course-lessons/{lesson_id}/blocks",
    response_model=AdminLessonBlockDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_lesson_block(
    lesson_id: str,
    payload: AdminLessonBlockCreate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminLessonBlockDetail:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    data = normalize_lesson_block_create_data(model_to_dict(payload))

    block = LessonBlock(
        lesson_id=lesson.id,
        **data,
    )
    lesson.editor_mode = "block"
    session.add(block)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.lesson_block_created",
            entity_type="lesson_block",
            entity_id=str(block.id),
            payload={
                "course_lesson": course_lesson_snapshot(lesson),
                "lesson_block": lesson_block_snapshot(block),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(block)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lesson block position already exists for this lesson",
        ) from exc

    return build_admin_lesson_block_detail(block)


@router.patch("/lesson-blocks/{block_id}", response_model=AdminLessonBlockDetail)
async def update_admin_lesson_block(
    block_id: str,
    payload: AdminLessonBlockUpdate,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminLessonBlockDetail:
    block = await get_admin_lesson_block_or_404(block_id, session)
    data = normalize_lesson_block_update_data(model_to_dict(payload, exclude_unset=True))

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = lesson_block_snapshot(block)

    for field, value in data.items():
        setattr(block, field, value)

    try:
        await session.flush()

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.lesson_block_updated",
            entity_type="lesson_block",
            entity_id=str(block.id),
            payload={
                "before": before,
                "after": lesson_block_snapshot(block),
                "changed_fields": sorted(data.keys()),
            },
            request=request,
        )

        await session.commit()
        await session.refresh(block)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lesson block position already exists for this lesson",
        ) from exc

    return build_admin_lesson_block_detail(block)


@router.delete("/lesson-blocks/{block_id}", response_model=AdminDeleteResult)
async def delete_admin_lesson_block(
    block_id: str,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    block = await get_admin_lesson_block_or_404(block_id, session)
    deleted_block_id = str(block.id)
    before = lesson_block_snapshot(block)

    await session.delete(block)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.lesson_block_deleted",
        entity_type="lesson_block",
        entity_id=deleted_block_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_block_id)


@router.post("/course-lessons/{lesson_id}/blocks/reorder", response_model=list[AdminLessonBlockItem])
async def reorder_admin_lesson_blocks(
    lesson_id: str,
    payload: AdminLessonBlockReorder,
    request: Request,
    current_user: User = Depends(require_permission("catalog.write")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminLessonBlockItem]:
    lesson = await get_admin_course_lesson_or_404(lesson_id, session)
    block_positions = {
        item.id: item.position
        for item in payload.blocks
    }

    if len(block_positions) != len(payload.blocks):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Lesson block ids must be unique",
        )

    if len(set(block_positions.values())) != len(block_positions):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Lesson block positions must be unique",
        )

    result = await session.execute(
        select(LessonBlock)
        .where(LessonBlock.lesson_id == lesson.id)
        .order_by(LessonBlock.position.asc(), LessonBlock.created_at.asc())
    )
    all_blocks = list(result.scalars().all())
    blocks_by_id = {
        str(block.id): block
        for block in all_blocks
    }

    missing_ids = sorted(set(block_positions) - set(blocks_by_id))
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson block not found for this lesson",
        )

    untouched_positions = {
        block.position
        for block in all_blocks
        if str(block.id) not in block_positions
    }
    conflicting_positions = sorted(set(block_positions.values()) & untouched_positions)
    if conflicting_positions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lesson block position conflicts with an existing block",
        )

    before = [
        lesson_block_snapshot(blocks_by_id[block_id])
        for block_id in sorted(block_positions)
    ]

    # Avoid unique constraint conflicts when swapping positions.
    for index, block_id in enumerate(sorted(block_positions), start=1):
        blocks_by_id[block_id].position = -index

    await session.flush()

    for block_id, position in block_positions.items():
        blocks_by_id[block_id].position = position

    try:
        await session.flush()

        after = [
            lesson_block_snapshot(blocks_by_id[block_id])
            for block_id in sorted(block_positions)
        ]

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.lesson_blocks_reordered",
            entity_type="course_lesson",
            entity_id=str(lesson.id),
            payload={
                "course_lesson": course_lesson_snapshot(lesson),
                "before": before,
                "after": after,
            },
            request=request,
        )

        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lesson block position already exists for this lesson",
        ) from exc

    reordered_blocks = await list_real_lesson_blocks(str(lesson.id), session)

    return [
        build_admin_lesson_block_item(block)
        for block in reordered_blocks
    ]


ADMIN_ENROLLMENT_STATUSES = {
    "assigned",
    "active",
    "completed",
    "cancelled",
}

ADMIN_ENROLLMENT_ACTION_REQUIRED_STATUSES = {
    "assigned",
    "completed",
}


@router.get("/worklist-summary", response_model=AdminWorklistSummary)
async def get_admin_worklist_summary(
    documents_user_id: str | None = Query(default=None, max_length=64),
    documents_enrollment_id: str | None = Query(default=None, max_length=64),
    documents_organization_id: str | None = Query(default=None, max_length=64),
    documents_document_type: str | None = Query(default=None, max_length=128),
    documents_q: str | None = Query(default=None, max_length=255),
    enrollments_user_id: str | None = Query(default=None, max_length=64),
    enrollments_course_id: str | None = Query(default=None, max_length=64),
    enrollments_organization_id: str | None = Query(default=None, max_length=64),
    enrollments_learning_group_id: str | None = Query(default=None, max_length=64),
    enrollments_q: str | None = Query(default=None, max_length=255),
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminWorklistSummary:
    document_action_required_condition = or_(
        DocumentRecord.status.in_(("draft", "revoked")),
        (DocumentRecord.status == "available") & DocumentRecord.storage_path.is_(None),
    )
    enrollment_action_required_condition = Enrollment.status.in_(
        tuple(ADMIN_ENROLLMENT_ACTION_REQUIRED_STATUSES)
    )

    document_conditions = []

    normalized_documents_user_id = normalize_optional_text(documents_user_id)
    normalized_documents_enrollment_id = normalize_optional_text(documents_enrollment_id)
    normalized_documents_organization_id = normalize_optional_text(documents_organization_id)
    normalized_documents_document_type = normalize_optional_text(documents_document_type)
    normalized_documents_q = normalize_optional_text(documents_q)

    if normalized_documents_user_id:
        document_conditions.append(DocumentRecord.user_id == normalized_documents_user_id)

    if normalized_documents_enrollment_id:
        document_conditions.append(DocumentRecord.enrollment_id == normalized_documents_enrollment_id)

    if normalized_documents_organization_id:
        document_conditions.append(Enrollment.organization_id == normalized_documents_organization_id)

    if normalized_documents_document_type:
        document_conditions.append(
            DocumentRecord.document_type.ilike(f"%{normalized_documents_document_type}%")
        )

    if normalized_documents_q:
        q_filter = f"%{normalized_documents_q}%"
        document_conditions.append(
            or_(
                DocumentRecord.document_number.ilike(q_filter),
                DocumentRecord.verification_code.ilike(q_filter),
                DocumentRecord.title.ilike(q_filter),
                DocumentRecord.document_type.ilike(q_filter),
                User.email.ilike(q_filter),
                User.full_name.ilike(q_filter),
                Course.title.ilike(q_filter),
            )
        )

    enrollment_conditions = []

    normalized_enrollments_user_id = normalize_optional_text(enrollments_user_id)
    normalized_enrollments_course_id = normalize_optional_text(enrollments_course_id)
    normalized_enrollments_organization_id = normalize_optional_text(enrollments_organization_id)
    normalized_enrollments_learning_group_id = normalize_optional_text(enrollments_learning_group_id)
    normalized_enrollments_q = normalize_optional_text(enrollments_q)

    if normalized_enrollments_user_id:
        enrollment_conditions.append(Enrollment.user_id == normalized_enrollments_user_id)

    if normalized_enrollments_course_id:
        enrollment_conditions.append(Enrollment.course_id == normalized_enrollments_course_id)

    if normalized_enrollments_organization_id:
        enrollment_conditions.append(Enrollment.organization_id == normalized_enrollments_organization_id)

    if normalized_enrollments_learning_group_id:
        enrollment_conditions.append(
            Enrollment.learning_group_id == normalized_enrollments_learning_group_id
        )

    if normalized_enrollments_q:
        q_filter = f"%{normalized_enrollments_q}%"
        enrollment_conditions.append(
            or_(
                User.email.ilike(q_filter),
                User.full_name.ilike(q_filter),
                Course.slug.ilike(q_filter),
                Course.title.ilike(q_filter),
                Enrollment.status.ilike(q_filter),
                Organization.name.ilike(q_filter),
                LearningGroup.name.ilike(q_filter),
            )
        )

    def count_if(condition):
        return func.coalesce(func.sum(case((condition, 1), else_=0)), 0)

    documents_query = (
        select(
            func.count().label("total"),
            count_if(DocumentRecord.status == "available").label("available"),
            count_if(DocumentRecord.status == "draft").label("draft"),
            count_if(DocumentRecord.status == "revoked").label("revoked"),
            count_if(document_action_required_condition).label("action_required"),
        )
        .select_from(DocumentRecord)
        .join(User, User.id == DocumentRecord.user_id)
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
    )

    if document_conditions:
        documents_query = documents_query.where(*document_conditions)

    documents_result = await session.execute(documents_query)
    documents_summary = documents_result.one()

    enrollments_query = (
        select(
            func.count().label("total"),
            count_if(Enrollment.status == "assigned").label("assigned"),
            count_if(Enrollment.status == "active").label("active"),
            count_if(Enrollment.status == "completed").label("completed"),
            count_if(Enrollment.status == "cancelled").label("cancelled"),
            count_if(enrollment_action_required_condition).label("action_required"),
        )
        .select_from(Enrollment)
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
    )

    if enrollment_conditions:
        enrollments_query = enrollments_query.where(*enrollment_conditions)

    enrollments_result = await session.execute(enrollments_query)
    enrollments_summary = enrollments_result.one()

    return AdminWorklistSummary(
        documents=AdminWorklistDocumentsSummary(
            total=int(documents_summary.total or 0),
            available=int(documents_summary.available or 0),
            draft=int(documents_summary.draft or 0),
            revoked=int(documents_summary.revoked or 0),
            action_required=int(documents_summary.action_required or 0),
        ),
        enrollments=AdminWorklistEnrollmentsSummary(
            total=int(enrollments_summary.total or 0),
            assigned=int(enrollments_summary.assigned or 0),
            active=int(enrollments_summary.active or 0),
            completed=int(enrollments_summary.completed or 0),
            cancelled=int(enrollments_summary.cancelled or 0),
            action_required=int(enrollments_summary.action_required or 0),
        ),
    )


def normalize_enrollment_status(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in ADMIN_ENROLLMENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported enrollment status",
        )

    return normalized


def normalize_optional_reference(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()

    return normalized or None


def build_admin_enrollment_item(row) -> AdminEnrollmentItem:
    return AdminEnrollmentItem(
        id=str(row.id),
        user_id=str(row.user_id),
        user_email=row.user_email,
        user_full_name=row.user_full_name,
        course_id=str(row.course_id),
        course_slug=row.course_slug,
        course_title=row.course_title,
        organization_id=str(row.organization_id) if row.organization_id else None,
        organization_name=row.organization_name,
        learning_group_id=str(row.learning_group_id) if row.learning_group_id else None,
        learning_group_name=row.learning_group_name,
        status=row.status,
        started_at=row.started_at,
        completed_at=row.completed_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def admin_quiz_blank_text() -> str:
    return "\u2014"


def admin_quiz_bool_text(value) -> str:
    if value is True:
        return "\u0414\u0430"
    if value is False:
        return "\u041d\u0435\u0442"
    return admin_quiz_blank_text()


def admin_quiz_plain_text(value) -> str:
    if value is None:
        return admin_quiz_blank_text()

    if isinstance(value, bool):
        return admin_quiz_bool_text(value)

    if isinstance(value, (int, float)):
        return str(value)

    if isinstance(value, list):
        items = [admin_quiz_plain_text(item) for item in value]
        items = [item for item in items if item and item != admin_quiz_blank_text()]
        return ", ".join(items) if items else admin_quiz_blank_text()

    text_value = str(value).strip()
    return text_value if text_value else admin_quiz_blank_text()


def admin_quiz_question_id(question) -> str:
    if not isinstance(question, dict):
        return ""

    return str(question.get("id") or "").strip()


def admin_quiz_option_map(question) -> dict[str, str]:
    if not isinstance(question, dict):
        return {}

    options = question.get("options") if isinstance(question.get("options"), list) else []
    result: dict[str, str] = {}

    for index, option in enumerate(options, start=1):
        if not isinstance(option, dict):
            continue

        option_id = str(option.get("id") or f"o_{index}").strip()
        option_text = str(option.get("text") or option.get("label") or option_id).strip()

        if option_id:
            result[option_id] = option_text or option_id

    return result


def admin_quiz_option_answer_text(question, value) -> str:
    option_map = admin_quiz_option_map(question)

    if isinstance(value, list):
        values = value
    elif value is None:
        values = []
    else:
        values = [value]

    labels = []

    for item in values:
        item_key = str(item).strip()
        labels.append(option_map.get(item_key) or item_key)

    labels = [label for label in labels if label]

    return ", ".join(labels) if labels else admin_quiz_blank_text()


def admin_quiz_question_correct_value(question):
    if not isinstance(question, dict):
        return None

    question_type = str(question.get("type") or "").strip()

    if question_type == "single_choice":
        options = question.get("options") if isinstance(question.get("options"), list) else []

        for option in options:
            if isinstance(option, dict) and bool(option.get("is_correct")):
                return option.get("id")

        return None

    if question_type == "multiple_choice":
        options = question.get("options") if isinstance(question.get("options"), list) else []

        return [
            option.get("id")
            for option in options
            if isinstance(option, dict) and bool(option.get("is_correct"))
        ]

    if question_type == "true_false":
        if "correct_value" in question:
            return bool(question.get("correct_value"))
        if "correct_boolean" in question:
            return bool(question.get("correct_boolean"))

        return None

    if question_type == "short_text":
        accepted_answers = question.get("accepted_answers")

        if isinstance(accepted_answers, list) and accepted_answers:
            return accepted_answers

        if "correct_text" in question:
            return question.get("correct_text")

        return None

    if question_type == "number":
        return question.get("correct_number")

    return None


def admin_quiz_answer_text(question, value) -> str:
    question_type = ""

    if isinstance(question, dict):
        question_type = str(question.get("type") or "").strip()

    if question_type in ("single_choice", "multiple_choice"):
        return admin_quiz_option_answer_text(question, value)

    if question_type == "true_false":
        if isinstance(value, bool):
            return admin_quiz_bool_text(value)

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in ("true", "1", "yes", "y", "\u0434\u0430"):
                return admin_quiz_bool_text(True)
            if normalized in ("false", "0", "no", "n", "\u043d\u0435\u0442"):
                return admin_quiz_bool_text(False)

    return admin_quiz_plain_text(value)


def admin_quiz_points_text(earned_points, points) -> str:
    earned = admin_quiz_plain_text(earned_points)
    total = admin_quiz_plain_text(points)

    return f"{earned} \u0438\u0437 {total}"


def build_admin_quiz_question_results(result_json, answers_json, block_content_json) -> list[dict]:
    safe_result_json = result_json if isinstance(result_json, dict) else {}
    safe_answers_json = answers_json if isinstance(answers_json, dict) else {}
    safe_content_json = block_content_json if isinstance(block_content_json, dict) else {}

    raw_question_results = safe_result_json.get("question_results") or []

    if not isinstance(raw_question_results, list):
        raw_question_results = []

    questions = safe_content_json.get("questions") or []

    if not isinstance(questions, list):
        questions = []

    questions_by_id = {
        admin_quiz_question_id(question): question
        for question in questions
        if admin_quiz_question_id(question)
    }

    readable_results: list[dict] = []

    for index, raw_item in enumerate(raw_question_results, start=1):
        if not isinstance(raw_item, dict):
            continue

        question_id = str(raw_item.get("question_id") or "").strip()
        question = questions_by_id.get(question_id, {})

        question_type = str(
            raw_item.get("type")
            or (question.get("type") if isinstance(question, dict) else "")
            or ""
        ).strip()

        if isinstance(question, dict) and question_type and not question.get("type"):
            question = {**question, "type": question_type}

        question_title = ""

        if isinstance(question, dict):
            question_title = str(question.get("title") or question.get("text") or "").strip()

        if not question_title:
            question_title = question_id or f"Question {index}"

        question_description = ""

        if isinstance(question, dict):
            question_description = str(question.get("description") or "").strip()

        user_answer_value = (
            raw_item.get("user_answer")
            if "user_answer" in raw_item
            else safe_answers_json.get(question_id)
        )

        correct_answer_value = (
            raw_item.get("correct_answer")
            if "correct_answer" in raw_item and raw_item.get("correct_answer") not in (None, "", [])
            else admin_quiz_question_correct_value(question)
        )

        enriched = {
            **raw_item,
            "question_title": question_title,
            "question_description": question_description,
            "question_type": question_type,
            "student_answer": user_answer_value,
            "student_answer_text": admin_quiz_answer_text(question, user_answer_value),
            "correct_answer": correct_answer_value,
            "correct_answer_text": admin_quiz_answer_text(question, correct_answer_value),
            "is_correct": bool(raw_item.get("correct")),
            "points_text": admin_quiz_points_text(
                raw_item.get("earned_points", 0),
                raw_item.get("points", raw_item.get("total_points", 0)),
            ),
        }

        readable_results.append(enriched)

    return readable_results


def build_admin_enrollment_quiz_attempt_item(row) -> AdminEnrollmentQuizAttemptItem:
    result_json = row.result_json or {}
    answers_json = row.answers_json or {}
    question_results = build_admin_quiz_question_results(
        result_json=result_json,
        answers_json=answers_json,
        block_content_json=row.block_content_json,
    )

    return AdminEnrollmentQuizAttemptItem(
        id=str(row.id),
        enrollment_id=str(row.enrollment_id),
        user_id=str(row.user_id),
        user_email=row.user_email,
        user_full_name=row.user_full_name,
        course_id=str(row.course_id),
        course_slug=row.course_slug,
        course_title=row.course_title,
        lesson_id=str(row.lesson_id),
        lesson_title=row.lesson_title,
        block_id=str(row.block_id),
        block_title=row.block_title,
        block_type=row.block_type,
        attempt_number=row.attempt_number,
        status=row.status,
        passed=row.passed,
        earned_points=float(row.earned_points or 0),
        total_points=float(row.total_points or 0),
        percent=int(row.percent or 0),
        correct_count=int(row.correct_count or 0),
        question_count=int(row.question_count or 0),
        pass_score_percent=int(row.pass_score_percent or 0),
        answers_json=answers_json if isinstance(answers_json, dict) else {},
        result_json=result_json if isinstance(result_json, dict) else {},
        question_results=question_results,
        submitted_at=row.submitted_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


ADMIN_ASSIGNMENT_REVIEW_STATUSES = {"approved", "rejected"}


def normalize_admin_assignment_review_status(value: str) -> str:
    normalized = str(value or "").strip()

    if normalized not in ADMIN_ASSIGNMENT_REVIEW_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported assignment review status",
        )

    return normalized


def admin_assignment_review_mode(content_json: dict | None) -> str:
    if not isinstance(content_json, dict):
        return "self_check"

    review_mode = str(content_json.get("review_mode") or "").strip()

    if review_mode in {"self_check", "submit_only", "manual_review"}:
        return review_mode

    return "self_check"


def build_admin_assignment_submission_query():
    reviewer = aliased(User)

    return (
        select(
            AssignmentSubmission.id.label("id"),
            AssignmentSubmission.enrollment_id.label("enrollment_id"),
            AssignmentSubmission.user_id.label("submission_user_id"),
            AssignmentSubmission.lesson_id.label("lesson_id"),
            AssignmentSubmission.block_id.label("block_id"),
            AssignmentSubmission.status.label("status"),
            AssignmentSubmission.answer_text.label("answer_text"),
            AssignmentSubmission.attachments_json.label("attachments_json"),
            AssignmentSubmission.score.label("score"),
            AssignmentSubmission.max_score.label("max_score"),
            AssignmentSubmission.review_comment.label("review_comment"),
            AssignmentSubmission.reviewed_by_user_id.label("reviewed_by_user_id"),
            AssignmentSubmission.submitted_at.label("submitted_at"),
            AssignmentSubmission.reviewed_at.label("reviewed_at"),
            AssignmentSubmission.created_at.label("created_at"),
            AssignmentSubmission.updated_at.label("updated_at"),
            Enrollment.user_id.label("user_id"),
            Enrollment.course_id.label("course_id"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
            CourseLesson.title.label("lesson_title"),
            CourseLesson.position.label("lesson_position"),
            LessonBlock.title.label("block_title"),
            LessonBlock.block_type.label("block_type"),
            LessonBlock.content_json.label("block_content_json"),
            LessonBlock.position.label("block_position"),
            reviewer.email.label("reviewed_by_user_email"),
            reviewer.full_name.label("reviewed_by_user_full_name"),
        )
        .select_from(AssignmentSubmission)
        .join(Enrollment, Enrollment.id == AssignmentSubmission.enrollment_id)
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .join(CourseLesson, CourseLesson.id == AssignmentSubmission.lesson_id)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .join(LessonBlock, LessonBlock.id == AssignmentSubmission.block_id)
        .outerjoin(reviewer, reviewer.id == AssignmentSubmission.reviewed_by_user_id)
        .where(CourseModule.course_id == Enrollment.course_id)
    )


def build_admin_assignment_submission_item(row) -> AdminEnrollmentAssignmentSubmissionItem:
    block_content_json = row.block_content_json if isinstance(row.block_content_json, dict) else {}
    attachments_json = row.attachments_json if isinstance(row.attachments_json, dict) else {}

    return AdminEnrollmentAssignmentSubmissionItem(
        id=str(row.id),
        enrollment_id=str(row.enrollment_id),
        user_id=str(row.user_id),
        user_email=row.user_email,
        user_full_name=row.user_full_name,
        course_id=str(row.course_id),
        course_slug=row.course_slug,
        course_title=row.course_title,
        lesson_id=str(row.lesson_id),
        lesson_title=row.lesson_title,
        block_id=str(row.block_id),
        block_title=row.block_title,
        block_type=row.block_type,
        block_content_json=block_content_json,
        review_mode=admin_assignment_review_mode(block_content_json),
        status=row.status,
        answer_text=row.answer_text,
        attachments_json=attachments_json,
        score=row.score,
        max_score=row.max_score,
        review_comment=row.review_comment,
        reviewed_by_user_id=str(row.reviewed_by_user_id) if row.reviewed_by_user_id else None,
        reviewed_by_user_email=row.reviewed_by_user_email,
        reviewed_by_user_full_name=row.reviewed_by_user_full_name,
        submitted_at=row.submitted_at,
        reviewed_at=row.reviewed_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def get_admin_assignment_submission_row_or_404(
    submission_id: str,
    session: AsyncSession,
):
    result = await session.execute(
        build_admin_assignment_submission_query()
        .where(AssignmentSubmission.id == submission_id.strip())
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment submission not found",
        )

    return row


def enrollment_snapshot(enrollment: Enrollment) -> dict:
    return {
        "id": str(enrollment.id),
        "user_id": str(enrollment.user_id),
        "course_id": str(enrollment.course_id),
        "organization_id": str(enrollment.organization_id) if enrollment.organization_id else None,
        "learning_group_id": str(enrollment.learning_group_id) if enrollment.learning_group_id else None,
        "status": enrollment.status,
        "started_at": enrollment.started_at.isoformat() if enrollment.started_at else None,
        "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
    }


async def get_admin_enrollment_or_404(
    enrollment_id: str,
    session: AsyncSession,
) -> Enrollment:
    result = await session.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    return enrollment


async def get_admin_enrollment_row_or_404(
    enrollment_id: str,
    session: AsyncSession,
):
    result = await session.execute(
        select(
            Enrollment.id.label("id"),
            Enrollment.user_id.label("user_id"),
            Enrollment.course_id.label("course_id"),
            Enrollment.organization_id.label("organization_id"),
            Enrollment.learning_group_id.label("learning_group_id"),
            Enrollment.status.label("status"),
            Enrollment.started_at.label("started_at"),
            Enrollment.completed_at.label("completed_at"),
            Enrollment.created_at.label("created_at"),
            Enrollment.updated_at.label("updated_at"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
            Organization.name.label("organization_name"),
            LearningGroup.name.label("learning_group_name"),
        )
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .where(Enrollment.id == enrollment_id)
    )

    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    return row


async def ensure_learning_group_assignment_is_valid(
    *,
    user_id: str,
    organization_id: str | None,
    learning_group_id: str | None,
    session: AsyncSession,
) -> None:
    if learning_group_id is None:
        return

    group_result = await session.execute(
        select(LearningGroup).where(LearningGroup.id == learning_group_id)
    )
    learning_group = group_result.scalar_one_or_none()

    if learning_group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning group not found",
        )

    if organization_id is not None and str(learning_group.organization_id) != str(organization_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Learning group belongs to another organization",
        )

    member_result = await session.execute(
        select(LearningGroupMember.id)
        .where(LearningGroupMember.learning_group_id == learning_group_id)
        .where(LearningGroupMember.user_id == user_id)
        .limit(1)
    )

    if member_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of learning group",
        )


async def ensure_enrollment_references_exist(
    *,
    user_id: str,
    course_id: str,
    organization_id: str | None,
    learning_group_id: str | None,
    session: AsyncSession,
) -> None:
    await get_admin_user_or_404(user_id, session)
    await get_admin_course_or_404(course_id, session)

    if organization_id is not None:
        await get_admin_organization_or_404(organization_id, session)

    await ensure_learning_group_assignment_is_valid(
        user_id=user_id,
        organization_id=organization_id,
        learning_group_id=learning_group_id,
        session=session,
    )


async def ensure_enrollment_can_be_deleted(
    enrollment: Enrollment,
    session: AsyncSession,
) -> None:
    document_result = await session.execute(
        select(DocumentRecord.id)
        .where(DocumentRecord.enrollment_id == enrollment.id)
        .limit(1)
    )

    if document_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete enrollment with documents",
        )


@router.get("/enrollments", response_model=list[AdminEnrollmentItem])
async def list_admin_enrollments(
    user_id: str | None = Query(default=None, max_length=64),
    course_id: str | None = Query(default=None, max_length=64),
    organization_id: str | None = Query(default=None, max_length=64),
    learning_group_id: str | None = Query(default=None, max_length=64),
    status_filter: str | None = Query(default=None, alias="status", max_length=32),
    q: str | None = Query(default=None, max_length=255),
    action_required: bool | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminEnrollmentItem]:
    query = (
        select(
            Enrollment.id.label("id"),
            Enrollment.user_id.label("user_id"),
            Enrollment.course_id.label("course_id"),
            Enrollment.organization_id.label("organization_id"),
            Enrollment.learning_group_id.label("learning_group_id"),
            Enrollment.status.label("status"),
            Enrollment.started_at.label("started_at"),
            Enrollment.completed_at.label("completed_at"),
            Enrollment.created_at.label("created_at"),
            Enrollment.updated_at.label("updated_at"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
            Organization.name.label("organization_name"),
            LearningGroup.name.label("learning_group_name"),
        )
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .order_by(Enrollment.created_at.desc())
        .limit(limit)
    )

    if user_id:
        query = query.where(Enrollment.user_id == user_id.strip())

    if course_id:
        query = query.where(Enrollment.course_id == course_id.strip())

    if organization_id:
        query = query.where(Enrollment.organization_id == organization_id.strip())

    if learning_group_id:
        query = query.where(Enrollment.learning_group_id == learning_group_id.strip())

    if status_filter:
        query = query.where(Enrollment.status == normalize_enrollment_status(status_filter))

    if action_required is not None:
        action_required_condition = Enrollment.status.in_(
            tuple(ADMIN_ENROLLMENT_ACTION_REQUIRED_STATUSES)
        )
        query = query.where(
            action_required_condition
            if action_required
            else ~action_required_condition
        )

    if q and q.strip():
        q_filter = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.email.ilike(q_filter),
                User.full_name.ilike(q_filter),
                Course.slug.ilike(q_filter),
                Course.title.ilike(q_filter),
                Enrollment.status.ilike(q_filter),
                Organization.name.ilike(q_filter),
                LearningGroup.name.ilike(q_filter),
            )
        )

    result = await session.execute(query)

    return [
        build_admin_enrollment_item(row)
        for row in result.all()
    ]


@router.post("/enrollments", response_model=AdminEnrollmentItem, status_code=status.HTTP_201_CREATED)
async def create_admin_enrollment(
    payload: AdminEnrollmentCreate,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminEnrollmentItem:
    user_id = payload.user_id.strip()
    course_id = payload.course_id.strip()
    organization_id = normalize_optional_reference(payload.organization_id)
    learning_group_id = normalize_optional_reference(payload.learning_group_id)
    normalized_status = normalize_enrollment_status(payload.status)

    await ensure_enrollment_references_exist(
        user_id=user_id,
        course_id=course_id,
        organization_id=organization_id,
        learning_group_id=learning_group_id,
        session=session,
    )

    enrollment = Enrollment(
        user_id=user_id,
        course_id=course_id,
        organization_id=organization_id,
        learning_group_id=learning_group_id,
        status=normalized_status,
        started_at=payload.started_at,
        completed_at=payload.completed_at,
    )
    session.add(enrollment)

    try:
        await session.flush()
        enrollment_id = str(enrollment.id)

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.enrollment_created",
            entity_type="enrollment",
            entity_id=enrollment_id,
            payload={
                "enrollment": enrollment_snapshot(enrollment),
            },
            request=request,
        )

        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Enrollment already exists for this user and course",
        )

    row = await get_admin_enrollment_row_or_404(enrollment_id, session)

    return build_admin_enrollment_item(row)


@router.post(
    "/enrollments/group",
    response_model=AdminEnrollmentBulkCreateResult,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_group_enrollments(
    payload: AdminEnrollmentGroupCreate,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminEnrollmentBulkCreateResult:
    learning_group_id = payload.learning_group_id.strip()
    course_id = payload.course_id.strip()
    normalized_status = normalize_enrollment_status(payload.status)

    group_result = await session.execute(
        select(LearningGroup).where(LearningGroup.id == learning_group_id)
    )
    learning_group = group_result.scalar_one_or_none()

    if learning_group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning group not found",
        )

    await get_admin_course_or_404(course_id, session)

    members_result = await session.execute(
        select(
            LearningGroupMember.user_id.label("user_id"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
        )
        .join(User, User.id == LearningGroupMember.user_id)
        .where(LearningGroupMember.learning_group_id == learning_group_id)
        .order_by(User.email.asc())
    )
    member_rows = members_result.all()

    if not member_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Learning group has no members",
        )

    member_user_ids = [str(row.user_id) for row in member_rows]

    existing_result = await session.execute(
        select(
            Enrollment.id.label("id"),
            Enrollment.user_id.label("user_id"),
        )
        .where(Enrollment.course_id == course_id)
        .where(Enrollment.user_id.in_(member_user_ids))
    )
    existing_by_user_id = {
        str(row.user_id): str(row.id)
        for row in existing_result.all()
    }

    organization_id = str(learning_group.organization_id)
    created_enrollments: list[Enrollment] = []
    skipped: list[AdminEnrollmentBulkSkippedItem] = []

    for row in member_rows:
        user_id = str(row.user_id)
        existing_enrollment_id = existing_by_user_id.get(user_id)

        if existing_enrollment_id is not None:
            skipped.append(
                AdminEnrollmentBulkSkippedItem(
                    user_id=user_id,
                    user_email=row.user_email,
                    user_full_name=row.user_full_name,
                    reason="Enrollment already exists for this user and course",
                    existing_enrollment_id=existing_enrollment_id,
                )
            )
            continue

        enrollment = Enrollment(
            user_id=user_id,
            course_id=course_id,
            organization_id=organization_id,
            learning_group_id=learning_group_id,
            status=normalized_status,
            started_at=payload.started_at,
            completed_at=payload.completed_at,
        )
        session.add(enrollment)
        created_enrollments.append(enrollment)

    try:
        await session.flush()
        created_enrollment_ids = [
            str(enrollment.id)
            for enrollment in created_enrollments
        ]

        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action="admin.enrollments_group_created",
            entity_type="learning_group",
            entity_id=learning_group_id,
            payload={
                "learning_group_id": learning_group_id,
                "course_id": course_id,
                "organization_id": organization_id,
                "status": normalized_status,
                "created_count": len(created_enrollment_ids),
                "skipped_count": len(skipped),
                "created_enrollment_ids": created_enrollment_ids,
                "skipped": [
                    {
                        "user_id": item.user_id,
                        "user_email": item.user_email,
                        "user_full_name": item.user_full_name,
                        "reason": item.reason,
                        "existing_enrollment_id": item.existing_enrollment_id,
                    }
                    for item in skipped
                ],
            },
            request=request,
        )

        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Some enrollments already exist for this course",
        )

    created_items: list[AdminEnrollmentItem] = []

    for created_enrollment_id in created_enrollment_ids:
        created_row = await get_admin_enrollment_row_or_404(
            created_enrollment_id,
            session,
        )
        created_items.append(build_admin_enrollment_item(created_row))

    return AdminEnrollmentBulkCreateResult(
        status="completed",
        learning_group_id=learning_group_id,
        course_id=course_id,
        organization_id=organization_id,
        created_count=len(created_items),
        skipped_count=len(skipped),
        created=created_items,
        skipped=skipped,
    )


@router.get("/enrollments/{enrollment_id}", response_model=AdminEnrollmentItem)
async def get_admin_enrollment_detail(
    enrollment_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminEnrollmentItem:
    row = await get_admin_enrollment_row_or_404(enrollment_id, session)

    return build_admin_enrollment_item(row)


@router.get(
    "/enrollments/{enrollment_id}/quiz-attempts",
    response_model=list[AdminEnrollmentQuizAttemptItem],
)
async def list_admin_enrollment_quiz_attempts(
    enrollment_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminEnrollmentQuizAttemptItem]:
    enrollment = await get_admin_enrollment_or_404(enrollment_id.strip(), session)

    result = await session.execute(
        select(
            QuizAttempt.id.label("id"),
            QuizAttempt.enrollment_id.label("enrollment_id"),
            QuizAttempt.lesson_id.label("lesson_id"),
            QuizAttempt.block_id.label("block_id"),
            QuizAttempt.attempt_number.label("attempt_number"),
            QuizAttempt.status.label("status"),
            QuizAttempt.passed.label("passed"),
            QuizAttempt.earned_points.label("earned_points"),
            QuizAttempt.total_points.label("total_points"),
            QuizAttempt.percent.label("percent"),
            QuizAttempt.correct_count.label("correct_count"),
            QuizAttempt.question_count.label("question_count"),
            QuizAttempt.pass_score_percent.label("pass_score_percent"),
            QuizAttempt.answers_json.label("answers_json"),
            QuizAttempt.result_json.label("result_json"),
            QuizAttempt.submitted_at.label("submitted_at"),
            QuizAttempt.created_at.label("created_at"),
            QuizAttempt.updated_at.label("updated_at"),
            Enrollment.user_id.label("user_id"),
            Enrollment.course_id.label("course_id"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
            CourseLesson.title.label("lesson_title"),
            CourseLesson.position.label("lesson_position"),
            LessonBlock.title.label("block_title"),
            LessonBlock.content_json.label("block_content_json"),
            LessonBlock.block_type.label("block_type"),
            LessonBlock.position.label("block_position"),
        )
        .select_from(QuizAttempt)
        .join(Enrollment, Enrollment.id == QuizAttempt.enrollment_id)
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .join(CourseLesson, CourseLesson.id == QuizAttempt.lesson_id)
        .join(LessonBlock, LessonBlock.id == QuizAttempt.block_id)
        .where(QuizAttempt.enrollment_id == enrollment.id)
        .order_by(
            CourseLesson.position.asc(),
            LessonBlock.position.asc(),
            QuizAttempt.attempt_number.asc(),
        )
    )

    return [
        build_admin_enrollment_quiz_attempt_item(row)
        for row in result.all()
    ]


@router.get(
    "/enrollments/{enrollment_id}/assignment-submissions",
    response_model=list[AdminEnrollmentAssignmentSubmissionItem],
)
async def list_admin_enrollment_assignment_submissions(
    enrollment_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminEnrollmentAssignmentSubmissionItem]:
    enrollment = await get_admin_enrollment_or_404(enrollment_id.strip(), session)

    result = await session.execute(
        build_admin_assignment_submission_query()
        .where(AssignmentSubmission.enrollment_id == enrollment.id)
        .order_by(
            CourseLesson.position.asc(),
            LessonBlock.position.asc(),
            AssignmentSubmission.created_at.desc(),
        )
    )

    return [
        build_admin_assignment_submission_item(row)
        for row in result.all()
    ]


@router.patch(
    "/assignment-submissions/{submission_id}/review",
    response_model=AdminEnrollmentAssignmentSubmissionItem,
)
async def review_admin_assignment_submission(
    submission_id: str,
    payload: AdminAssignmentSubmissionReview,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminEnrollmentAssignmentSubmissionItem:
    review_status = normalize_admin_assignment_review_status(payload.status)

    if payload.score is not None and payload.max_score is not None and payload.score > payload.max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score cannot be greater than max score",
        )

    result = await session.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id.strip())
    )
    submission = result.scalar_one_or_none()

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment submission not found",
        )

    before = {
        "status": submission.status,
        "score": submission.score,
        "max_score": submission.max_score,
        "review_comment": submission.review_comment,
        "reviewed_by_user_id": str(submission.reviewed_by_user_id) if submission.reviewed_by_user_id else None,
        "reviewed_at": submission.reviewed_at.isoformat() if submission.reviewed_at else None,
    }

    review_comment = payload.review_comment.strip() if payload.review_comment else None

    submission.status = review_status
    submission.score = payload.score
    submission.max_score = payload.max_score
    submission.review_comment = review_comment
    submission.reviewed_by_user_id = current_user.id
    submission.reviewed_at = datetime.now(timezone.utc)

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.assignment_submission_reviewed",
        entity_type="assignment_submission",
        entity_id=str(submission.id),
        payload={
            "before": before,
            "after": {
                "status": submission.status,
                "score": submission.score,
                "max_score": submission.max_score,
                "review_comment": submission.review_comment,
                "reviewed_by_user_id": str(submission.reviewed_by_user_id) if submission.reviewed_by_user_id else None,
                "reviewed_at": submission.reviewed_at.isoformat() if submission.reviewed_at else None,
            },
        },
        request=request,
    )

    await session.commit()

    row = await get_admin_assignment_submission_row_or_404(str(submission.id), session)

    return build_admin_assignment_submission_item(row)


@router.patch("/enrollments/{enrollment_id}", response_model=AdminEnrollmentItem)
async def update_admin_enrollment(
    enrollment_id: str,
    payload: AdminEnrollmentUpdate,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminEnrollmentItem:
    enrollment = await get_admin_enrollment_or_404(enrollment_id, session)
    data = model_to_dict(payload, exclude_unset=True)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    before = enrollment_snapshot(enrollment)

    if "status" in data and data["status"] is not None:
        enrollment.status = normalize_enrollment_status(data["status"])

    if "organization_id" in data:
        organization_id = normalize_optional_reference(data["organization_id"])
        if organization_id is not None:
            await get_admin_organization_or_404(organization_id, session)
        enrollment.organization_id = organization_id

    if "learning_group_id" in data:
        enrollment.learning_group_id = normalize_optional_reference(data["learning_group_id"])

    if "started_at" in data:
        enrollment.started_at = data["started_at"]

    if "completed_at" in data:
        enrollment.completed_at = data["completed_at"]

    if enrollment.status == "completed":
        now = datetime.now(timezone.utc)

        if enrollment.started_at is None:
            enrollment.started_at = now

        if enrollment.completed_at is None:
            enrollment.completed_at = now

    await ensure_learning_group_assignment_is_valid(
        user_id=str(enrollment.user_id),
        organization_id=str(enrollment.organization_id) if enrollment.organization_id else None,
        learning_group_id=str(enrollment.learning_group_id) if enrollment.learning_group_id else None,
        session=session,
    )

    if enrollment.status == "completed":
        await ensure_completion_document_for_enrollment(enrollment, session)

    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.enrollment_updated",
        entity_type="enrollment",
        entity_id=str(enrollment.id),
        payload={
            "before": before,
            "after": enrollment_snapshot(enrollment),
            "changed_fields": sorted(data.keys()),
        },
        request=request,
    )

    await session.commit()

    row = await get_admin_enrollment_row_or_404(enrollment_id, session)

    return build_admin_enrollment_item(row)


@router.delete("/enrollments/{enrollment_id}", response_model=AdminDeleteResult)
async def delete_admin_enrollment(
    enrollment_id: str,
    request: Request,
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminDeleteResult:
    enrollment = await get_admin_enrollment_or_404(enrollment_id, session)
    await ensure_enrollment_can_be_deleted(enrollment, session)

    deleted_enrollment_id = str(enrollment.id)
    before = enrollment_snapshot(enrollment)

    await session.delete(enrollment)
    await session.flush()

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.enrollment_deleted",
        entity_type="enrollment",
        entity_id=deleted_enrollment_id,
        payload={
            "before": before,
        },
        request=request,
    )

    await session.commit()

    return AdminDeleteResult(status="deleted", id=deleted_enrollment_id)


@router.get("/learner-imports", response_model=list[AdminLearnerImportBatchItem])
async def list_learner_imports(
    q: str | None = Query(default=None, max_length=255),
    status_filter: str | None = Query(default=None, alias="status", max_length=32),
    organization_id: str | None = Query(default=None),
    learning_group_id: str | None = Query(default=None),
    course_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminLearnerImportBatchItem]:
    query = select(ImportBatch).where(ImportBatch.import_type == "learner_roster")

    if q:
        normalized_q = f"%{q.strip()}%"
        query = query.where(
            or_(
                ImportBatch.source_filename.ilike(normalized_q),
                ImportBatch.notes.ilike(normalized_q),
            )
        )

    if status_filter:
        query = query.where(ImportBatch.status == status_filter)

    if organization_id:
        query = query.where(ImportBatch.organization_id == organization_id)

    if learning_group_id:
        query = query.where(ImportBatch.learning_group_id == learning_group_id)

    if course_id:
        query = query.where(ImportBatch.course_id == course_id)

    result = await session.execute(
        query.order_by(ImportBatch.created_at.desc(), ImportBatch.id.desc())
        .offset(offset)
        .limit(limit)
    )
    batches = result.scalars().all()

    return [build_admin_learner_import_batch_item(batch) for batch in batches]


@router.post("/learner-imports/{batch_id}/apply", response_model=AdminLearnerImportBatchDetail)
async def apply_learner_import(
    batch_id: str,
    request: Request,
    current_user: User = Depends(
        require_permission("admin.users.write")
    ),
    session: AsyncSession = Depends(get_db),
) -> AdminLearnerImportBatchDetail:
    batch = (
        await get_admin_learner_import_batch_or_404(
            batch_id,
            session,
        )
    )

    try:
        preflight = (
            await build_learner_import_preflight(
                session,
                batch=batch,
            )
        )

        apply_result = (
            await apply_learner_import_batch(
                session,
                batch=batch,
            )
        )

        applied_row_outcomes: dict[
            str,
            dict[str, str | None],
        ] = {
            item.row_id: {
                "classification": (
                    item.classification
                ),
                "account_state": (
                    item.account_state
                ),
                "user_action": item.user_action,
                "profile_action": (
                    item.profile_action
                ),
                "enrollment_action": (
                    item.enrollment_action
                ),
                "notification_action": (
                    item.notification_action
                ),
                "email_delivery_status": (
                    "not_required"
                    if (
                        item.notification_action
                        == "not_required"
                    )
                    else "skipped"
                ),
                "email_delivery_detail": (
                    "Email delivery was not required."
                    if (
                        item.notification_action
                        == "not_required"
                    )
                    else (
                        "Email delivery was not "
                        "completed."
                    )
                ),
                "email_delivery_error": None,
            }
            for item in preflight.rows
        }

        course_titles: dict[str, str] = {}

        invitations: list[
            AdminLearnerImportInvitationItem
        ] = []

        for candidate in (
            apply_result.invitation_candidates
        ):
            invited_user = await session.get(
                User,
                candidate.user_id,
            )

            if invited_user is None:
                outcome = applied_row_outcomes.get(
                    candidate.row_id
                )

                if outcome is not None:
                    outcome[
                        "email_delivery_status"
                    ] = "failed"
                    outcome[
                        "email_delivery_detail"
                    ] = None
                    outcome[
                        "email_delivery_error"
                    ] = (
                        "Imported user could not be "
                        "loaded for invitation delivery."
                    )

                continue

            created_token = (
                await create_user_password_token(
                    session,
                    user=invited_user,
                    created_by_user=current_user,
                    delivery_target_email=(
                        invited_user.email
                    ),
                    mark_sent=False,
                )
            )

            setup_url = build_password_setup_url(
                settings.public_base_url,
                created_token.raw_token,
            )

            invitation_course_title = None

            if candidate.course_id:
                invitation_course_title = (
                    course_titles.get(
                        candidate.course_id
                    )
                )

                if invitation_course_title is None:
                    invitation_course_title = (
                        await get_learner_import_course_title(
                            session,
                            candidate.course_id,
                        )
                    )

                    if invitation_course_title:
                        course_titles[
                            candidate.course_id
                        ] = invitation_course_title

            delivery_result = (
                send_password_setup_email(
                    recipient=invited_user.email,
                    user_email=invited_user.email,
                    setup_url=setup_url,
                    expires_at=(
                        created_token.record.expires_at
                    ),
                    course_title=(
                        invitation_course_title
                    ),
                )
            )

            if delivery_result.sent:
                created_token.record.sent_at = (
                    datetime.now(timezone.utc)
                )

            invitations.append(
                AdminLearnerImportInvitationItem(
                    row_id=candidate.row_id,
                    row_number=candidate.row_number,
                    user_id=str(invited_user.id),
                    email=invited_user.email,
                    setup_url=setup_url,
                    expires_at=(
                        created_token.record.expires_at
                    ),
                    email_delivery_status=(
                        delivery_result.status
                    ),
                    email_delivery_detail=(
                        delivery_result.detail
                    ),
                    email_delivery_error=(
                        delivery_result.error
                    ),
                )
            )

            outcome = applied_row_outcomes.get(
                candidate.row_id
            )

            if outcome is not None:
                outcome[
                    "email_delivery_status"
                ] = delivery_result.status
                outcome[
                    "email_delivery_detail"
                ] = delivery_result.detail
                outcome[
                    "email_delivery_error"
                ] = delivery_result.error


        course_notifications: list[
            AdminLearnerImportCourseNotificationItem
        ] = []

        for candidate in (
            apply_result
            .course_notification_candidates
        ):
            notified_user = await session.get(
                User,
                candidate.user_id,
            )

            if notified_user is None:
                outcome = applied_row_outcomes.get(
                    candidate.row_id
                )

                if outcome is not None:
                    outcome[
                        "email_delivery_status"
                    ] = "failed"
                    outcome[
                        "email_delivery_detail"
                    ] = None
                    outcome[
                        "email_delivery_error"
                    ] = (
                        "Imported user could not be "
                        "loaded for course notification."
                    )

                continue

            course_title = course_titles.get(
                candidate.course_id
            )

            if course_title is None:
                course = await session.get(
                    Course,
                    candidate.course_id,
                )
                course_title = (
                    course.title
                    if course is not None
                    else (
                        "\u041d\u0430\u0437\u043d\u0430"
                        "\u0447\u0435\u043d\u043d\u044b\u0439 "
                        "\u043a\u0443\u0440\u0441"
                    )
                )
                course_titles[
                    candidate.course_id
                ] = course_title

            delivery_result = (
                send_course_assignment_email(
                    recipient=notified_user.email,
                    user_email=notified_user.email,
                    course_title=course_title,
                    portal_url=(
                        settings.public_base_url
                    ),
                )
            )

            course_notifications.append(
                AdminLearnerImportCourseNotificationItem(
                    row_id=candidate.row_id,
                    row_number=candidate.row_number,
                    user_id=str(notified_user.id),
                    email=notified_user.email,
                    course_id=candidate.course_id,
                    course_title=course_title,
                    email_delivery_status=(
                        delivery_result.status
                    ),
                    email_delivery_detail=(
                        delivery_result.detail
                    ),
                    email_delivery_error=(
                        delivery_result.error
                    ),
                )
            )

            outcome = applied_row_outcomes.get(
                candidate.row_id
            )

            if outcome is not None:
                outcome[
                    "email_delivery_status"
                ] = delivery_result.status
                outcome[
                    "email_delivery_detail"
                ] = delivery_result.detail
                outcome[
                    "email_delivery_error"
                ] = delivery_result.error


        await create_admin_audit_event(
            session,
            actor_user=current_user,
            action=(
                "admin.learner_import_applied"
            ),
            entity_type="import_batch",
            entity_id=str(batch.id),
            payload={
                "batch_id": str(batch.id),
                "source_filename": (
                    batch.source_filename
                ),
                "created_users_count": (
                    apply_result.created_users_count
                ),
                "updated_users_count": (
                    apply_result.updated_users_count
                ),
                "created_profiles_count": (
                    apply_result.created_profiles_count
                ),
                "updated_profiles_count": (
                    apply_result.updated_profiles_count
                ),
                "created_enrollments_count": (
                    apply_result
                    .created_enrollments_count
                ),
                "assigned_learner_roles_count": (
                    apply_result
                    .assigned_learner_roles_count
                ),
                "error_rows_count": (
                    apply_result.error_rows_count
                ),
                "created_invitations_count": len(
                    invitations
                ),
                "sent_invitations_count": sum(
                    1
                    for item in invitations
                    if (
                        item.email_delivery_status
                        == "sent"
                    )
                ),
                "failed_invitations_count": sum(
                    1
                    for item in invitations
                    if (
                        item.email_delivery_status
                        == "failed"
                    )
                ),
                "skipped_invitations_count": sum(
                    1
                    for item in invitations
                    if (
                        item.email_delivery_status
                        == "skipped"
                    )
                ),
                "course_notifications_count": len(
                    course_notifications
                ),
                "sent_course_notifications_count": sum(
                    1
                    for item in course_notifications
                    if (
                        item.email_delivery_status
                        == "sent"
                    )
                ),
                "failed_course_notifications_count": sum(
                    1
                    for item in course_notifications
                    if (
                        item.email_delivery_status
                        == "failed"
                    )
                ),
                "skipped_course_notifications_count": sum(
                    1
                    for item in course_notifications
                    if (
                        item.email_delivery_status
                        == "skipped"
                    )
                ),
            },
            request=request,
        )

        await session.commit()

    except ValueError as exc:
        await session.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        )

    except IntegrityError:
        await session.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Learner import could not be "
                "applied because of duplicate "
                "user, phone, profile or "
                "enrollment data"
            ),
        )

    refreshed_batch = (
        await get_admin_learner_import_batch_or_404(
            batch_id,
            session,
        )
    )

    for row in refreshed_batch.rows:
        row_id = str(row.id)
        outcome = applied_row_outcomes.get(
            row_id
        )

        if outcome is None:
            outcome = {
                "classification": (
                    "invalid_row"
                    if row.status == "invalid"
                    else "identity_conflict"
                ),
                "account_state": "unknown",
                "user_action": "skipped",
                "profile_action": "skipped",
                "enrollment_action": "skipped",
                "notification_action": (
                    "not_required"
                ),
                "email_delivery_status": (
                    "not_required"
                ),
                "email_delivery_detail": (
                    "Email delivery was not required."
                ),
                "email_delivery_error": None,
            }
            applied_row_outcomes[row_id] = outcome

        if row.status == "error":
            outcome["classification"] = (
                "identity_conflict"
            )
            outcome["user_action"] = "conflict"
            outcome["profile_action"] = "skipped"
            outcome["enrollment_action"] = "skipped"
            outcome["notification_action"] = (
                "not_required"
            )
            outcome["email_delivery_status"] = (
                "not_required"
            )
            outcome["email_delivery_detail"] = (
                "Email delivery was not required."
            )
            outcome["email_delivery_error"] = (
                row.error_summary
            )

    return build_admin_learner_import_batch_detail(
        refreshed_batch,
        invitations=invitations,
        course_notifications=(
            course_notifications
        ),
        applied_row_outcomes=(
            applied_row_outcomes
        ),
    )


@router.get("/learner-imports/{batch_id}", response_model=AdminLearnerImportBatchDetail)
async def get_learner_import_detail(
    batch_id: str,
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> AdminLearnerImportBatchDetail:
    batch = await get_admin_learner_import_batch_or_404(batch_id, session)

    preflight = (
        await build_learner_import_preflight(
            session,
            batch=batch,
        )
        if batch.status == "parsed"
        else None
    )

    return build_admin_learner_import_batch_detail(
        batch,
        preflight=preflight,
    )

@router.post(
    "/learner-imports",
    response_model=AdminLearnerImportBatchDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_learner_import(
    request: Request,
    file: UploadFile = File(...),
    organization_id: str | None = Form(default=None),
    learning_group_id: str | None = Form(default=None),
    course_id: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    current_user: User = Depends(require_permission("admin.users.write")),
    session: AsyncSession = Depends(get_db),
) -> AdminLearnerImportBatchDetail:
    normalize_learner_import_extension(file.filename)

    content = await file.read()
    size_bytes = len(content)

    if size_bytes <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Import file is empty",
        )

    if size_bytes > LEARNER_IMPORT_MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Import file is too large",
        )

    if organization_id is not None:
        await get_admin_organization_or_404(organization_id, session)

    if learning_group_id is not None:
        await ensure_admin_learning_group_exists(learning_group_id, session)

    if course_id is not None:
        await ensure_admin_course_exists(course_id, session)

    try:
        parse_result = parse_learner_import_file(file.filename or "learners.csv", content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    batch = await create_import_batch_from_parse_result(
        session,
        parse_result=parse_result,
        source_content_type=file.content_type,
        organization_id=organization_id,
        learning_group_id=learning_group_id,
        course_id=course_id,
        uploaded_by_user_id=str(current_user.id),
        notes=notes,
    )

    await create_admin_audit_event(
        session,
        actor_user=current_user,
        action="admin.learner_import_parsed",
        entity_type="import_batch",
        entity_id=str(batch.id),
        payload={
            "source_filename": batch.source_filename,
            "source_content_type": batch.source_content_type,
            "organization_id": str(batch.organization_id) if batch.organization_id else None,
            "learning_group_id": str(batch.learning_group_id) if batch.learning_group_id else None,
            "course_id": str(batch.course_id) if batch.course_id else None,
            "total_rows": batch.total_rows,
            "valid_rows": batch.valid_rows,
            "invalid_rows": batch.invalid_rows,
        },
        request=request,
    )

    await session.commit()

    preflight = await build_learner_import_preflight(
        session,
        batch=batch,
    )

    return build_admin_learner_import_batch_detail(
        batch,
        preflight=preflight,
    )
