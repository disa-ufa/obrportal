from __future__ import annotations

import re
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.exc import IntegrityError

from app.api.v1.rbac import get_user_permission_codes, require_permission
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.course import Course
from app.models.course_lesson import CourseLesson
from app.models.course_module import CourseModule
from app.models.document_generation_event import DocumentGenerationEvent
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
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
from app.schemas.admin import (
    AdminAuditEventItem,
    AdminCourseCreate,
    AdminCourseDetail,
    AdminCourseItem,
    AdminCourseLessonCreate,
    AdminCourseLessonDetail,
    AdminCourseLessonItem,
    AdminCourseLessonUpdate,
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


@router.get("/users", response_model=list[AdminUserItem])
async def list_users(
    _: User = Depends(require_permission("admin.users.read")),
    session: AsyncSession = Depends(get_db),
) -> list[AdminUserItem]:
    users_result = await session.execute(select(User).order_by(User.email))
    users = users_result.scalars().all()

    response: list[AdminUserItem] = []

    for user in users:
        roles = await get_user_roles(str(user.id), session)
        response.append(build_admin_user_item(user, roles))

    return response


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


def normalize_course_lesson_content_type(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in ADMIN_COURSE_LESSON_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported course lesson content type",
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


def build_admin_course_lesson_item(lesson: CourseLesson) -> AdminCourseLessonItem:
    return AdminCourseLessonItem(
        id=str(lesson.id),
        module_id=str(lesson.module_id),
        title=lesson.title,
        description=lesson.description,
        content_type=lesson.content_type,
        content_url=lesson.content_url,
        content_text=lesson.content_text,
        position=lesson.position,
        is_required=lesson.is_required,
        is_active=lesson.is_active,
    )


def build_admin_course_lesson_detail(lesson: CourseLesson) -> AdminCourseLessonDetail:
    return AdminCourseLessonDetail(
        id=str(lesson.id),
        module_id=str(lesson.module_id),
        title=lesson.title,
        description=lesson.description,
        content_type=lesson.content_type,
        content_url=lesson.content_url,
        content_text=lesson.content_text,
        position=lesson.position,
        is_required=lesson.is_required,
        is_active=lesson.is_active,
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

    return [
        build_admin_course_lesson_item(lesson)
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

    return build_admin_course_lesson_detail(lesson)


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
    normalized_documents_document_type = normalize_optional_text(documents_document_type)
    normalized_documents_q = normalize_optional_text(documents_q)

    if normalized_documents_user_id:
        document_conditions.append(DocumentRecord.user_id == normalized_documents_user_id)

    if normalized_documents_enrollment_id:
        document_conditions.append(DocumentRecord.enrollment_id == normalized_documents_enrollment_id)

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