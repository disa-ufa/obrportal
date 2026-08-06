from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import require_permission
from app.db.session import get_db
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learning_group import LearningGroup, LearningGroupMember
from app.models.organization import (
    Organization,
    OrganizationActivityDirection,
    OrganizationService,
    OrganizationSpecialist,
)
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User
from app.schemas.org import (
    OrgEnrollmentBulkCreateResult,
    OrgEnrollmentBulkSkippedItem,
    OrgEnrollmentDocumentItem,
    OrgEnrollmentGroupCreate,
    OrgEnrollmentItem,
    OrgLearningGroupCreate,
    OrgLearningGroupDetail,
    OrgLearningGroupItem,
    OrgLearningGroupMemberCreate,
    OrgLearningGroupMemberItem,
    OrgLearningGroupUpdate,
    OrgProfile,
    OrgProfileOfferingInput,
    OrgProfileOfferingItem,
    OrgProfileOfferingsUpdate,
    OrgProfileOrganizationItem,
    OrgProfileSpecialistInput,
    OrgProfileSpecialistItem,
    OrgProfileSpecialistsUpdate,
    OrgProfileSummary,
    OrgProfileUpdate,
    OrgUserSearchItem,
    OrgUserSearchOrganizationItem,
    OrgUserSearchRoleItem,
)


router = APIRouter(prefix="/org", tags=["org"])


GLOBAL_ORG_SCOPE_ROLE_CODES = {"admin"}


def model_to_dict(model, **kwargs) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)

    return model.dict(**kwargs)


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def normalize_learning_group_create_data(payload: OrgLearningGroupCreate) -> dict:
    data = model_to_dict(payload)
    data["organization_id"] = data["organization_id"].strip()
    data["name"] = data["name"].strip()
    data["code"] = normalize_optional_text(data.get("code"))
    data["description"] = normalize_optional_text(data.get("description"))

    if not data["organization_id"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Organization id is required",
        )

    if not data["name"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Learning group name is required",
        )

    return data


def normalize_learning_group_update_data(payload: OrgLearningGroupUpdate) -> dict:
    data = model_to_dict(payload, exclude_unset=True)

    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

        if not data["name"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Learning group name is required",
            )

    if "code" in data:
        data["code"] = normalize_optional_text(data["code"])

    if "description" in data:
        data["description"] = normalize_optional_text(data["description"])

    return data

def build_org_enrollment_document_item(row) -> OrgEnrollmentDocumentItem | None:
    document_id = getattr(row, "document_id", None)

    if document_id is None:
        return None

    document_status = getattr(row, "document_status", None) or "draft"
    verification_code = getattr(row, "document_verification_code", None) or ""
    public_verify_path = (
        f"/verify/{verification_code}"
        if document_status == "available" and verification_code
        else None
    )

    return OrgEnrollmentDocumentItem(
        id=str(document_id),
        document_number=getattr(row, "document_number", None) or "",
        verification_code=verification_code,
        document_type=getattr(row, "document_type", None),
        title=getattr(row, "document_title", None) or "Итоговый документ",
        status=document_status,
        file_available=bool(getattr(row, "document_storage_path", None)),
        public_verify_path=public_verify_path,
        generated_at=getattr(row, "document_generated_at", None),
        created_at=getattr(row, "document_created_at", None),
        revoked_at=getattr(row, "document_revoked_at", None),
        revocation_reason=getattr(row, "document_revocation_reason", None),
    )


def build_org_enrollment_item(row) -> OrgEnrollmentItem:
    return OrgEnrollmentItem(
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
        document=build_org_enrollment_document_item(row),
    )


def build_learning_group_item(group: LearningGroup) -> OrgLearningGroupItem:
    return OrgLearningGroupItem(
        id=str(group.id),
        organization_id=str(group.organization_id),
        name=group.name,
        code=group.code,
        description=group.description,
        is_active=group.is_active,
    )


def build_learning_group_detail(group: LearningGroup) -> OrgLearningGroupDetail:
    return OrgLearningGroupDetail(
        id=str(group.id),
        organization_id=str(group.organization_id),
        name=group.name,
        code=group.code,
        description=group.description,
        is_active=group.is_active,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def build_learning_group_member_item(
    row,
    user_scope_by_user_id: dict[str, dict] | None = None,
) -> OrgLearningGroupMemberItem:
    user_id = str(row.user_id)
    scope = (user_scope_by_user_id or {}).get(user_id, {})

    return OrgLearningGroupMemberItem(
        id=str(row.id),
        learning_group_id=str(row.learning_group_id),
        user_id=user_id,
        user_email=row.user_email,
        user_full_name=row.user_full_name,
        user_is_active=bool(row.user_is_active),
        user_organizations=scope.get("organizations", []),
        user_roles=scope.get("roles", []),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )



def normalize_org_profile_update_data(payload: OrgProfileUpdate) -> dict:
    data = model_to_dict(payload, exclude_unset=True)
    max_lengths = {
        "kpp": 9,
        "ogrn": 15,
        "legal_address": 1024,
        "actual_address": 1024,
        "description": 4096,
        "phone": 128,
        "email": 320,
        "website": 2048,
    }

    for key, max_length in max_lengths.items():
        if key not in data:
            continue

        data[key] = normalize_optional_text(data[key])

        if data[key] is not None and len(data[key]) > max_length:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{key} must be at most {max_length} characters",
            )

    return data


def normalize_org_profile_offering_items(
    items: list[OrgProfileOfferingInput],
    *,
    item_label: str,
) -> list[dict]:
    if len(items) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{item_label} must contain at most 100 items",
        )

    normalized_items: list[dict] = []
    normalized_names: set[str] = set()

    for index, item in enumerate(items):
        data = model_to_dict(item)
        name = (data.get("name") or "").strip()
        description = normalize_optional_text(data.get("description"))

        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{item_label} name is required",
            )

        if len(name) > 255:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{item_label} name must be at most 255 characters",
            )

        if description is not None and len(description) > 2048:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"{item_label} description must be at most "
                    "2048 characters"
                ),
            )

        normalized_name = name.casefold()

        if normalized_name in normalized_names:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{item_label} names must be unique",
            )

        normalized_names.add(normalized_name)
        normalized_items.append(
            {
                "name": name,
                "description": description,
                "sort_order": index,
            }
        )

    return normalized_items


def normalize_org_profile_specialist_items(
    items: list[OrgProfileSpecialistInput],
) -> list[dict]:
    if len(items) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Specialists must contain at most 100 items",
        )

    normalized_items: list[dict] = []
    normalized_names: set[str] = set()

    for index, item in enumerate(items):
        data = model_to_dict(item)
        name = (data.get("name") or "").strip()
        description = normalize_optional_text(data.get("description"))
        specialist_count = data.get("count", 1)

        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Specialist name is required",
            )

        if len(name) > 255:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Specialist name must be at most 255 characters",
            )

        if description is not None and len(description) > 2048:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Specialist description must be at most "
                    "2048 characters"
                ),
            )

        if (
            not isinstance(specialist_count, int)
            or isinstance(specialist_count, bool)
            or specialist_count < 1
            or specialist_count > 10000
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Specialist count must be between 1 and 10000",
            )

        normalized_name = name.casefold()

        if normalized_name in normalized_names:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Specialist names must be unique",
            )

        normalized_names.add(normalized_name)
        normalized_items.append(
            {
                "name": name,
                "description": description,
                "count": specialist_count,
                "sort_order": index,
            }
        )

    return normalized_items


def build_org_profile_specialist_item(
    item: OrganizationSpecialist,
) -> OrgProfileSpecialistItem:
    return OrgProfileSpecialistItem(
        id=str(item.id),
        name=item.name,
        description=item.description,
        count=item.count,
        sort_order=item.sort_order,
    )


def build_org_profile_offering_item(
    item: OrganizationActivityDirection | OrganizationService,
) -> OrgProfileOfferingItem:
    return OrgProfileOfferingItem(
        id=str(item.id),
        name=item.name,
        description=item.description,
        sort_order=item.sort_order,
    )


async def get_org_profile_offering_maps(
    organization_ids: list[str],
    session: AsyncSession,
) -> tuple[
    dict[str, list[OrganizationActivityDirection]],
    dict[str, list[OrganizationService]],
]:
    direction_map: dict[str, list[OrganizationActivityDirection]] = {
        organization_id: []
        for organization_id in organization_ids
    }
    service_map: dict[str, list[OrganizationService]] = {
        organization_id: []
        for organization_id in organization_ids
    }

    if not organization_ids:
        return direction_map, service_map

    direction_result = await session.execute(
        select(OrganizationActivityDirection)
        .where(
            OrganizationActivityDirection.organization_id.in_(
                organization_ids
            )
        )
        .order_by(
            OrganizationActivityDirection.organization_id,
            OrganizationActivityDirection.sort_order,
            OrganizationActivityDirection.name,
        )
    )

    for item in direction_result.scalars().all():
        direction_map.setdefault(
            str(item.organization_id),
            [],
        ).append(item)

    service_result = await session.execute(
        select(OrganizationService)
        .where(OrganizationService.organization_id.in_(organization_ids))
        .order_by(
            OrganizationService.organization_id,
            OrganizationService.sort_order,
            OrganizationService.name,
        )
    )

    for item in service_result.scalars().all():
        service_map.setdefault(
            str(item.organization_id),
            [],
        ).append(item)

    return direction_map, service_map


async def get_org_profile_specialist_map(
    organization_ids: list[str],
    session: AsyncSession,
) -> dict[str, list[OrganizationSpecialist]]:
    specialist_map: dict[str, list[OrganizationSpecialist]] = {
        organization_id: []
        for organization_id in organization_ids
    }

    if not organization_ids:
        return specialist_map

    result = await session.execute(
        select(OrganizationSpecialist)
        .where(
            OrganizationSpecialist.organization_id.in_(
                organization_ids
            )
        )
        .order_by(
            OrganizationSpecialist.organization_id,
            OrganizationSpecialist.sort_order,
            OrganizationSpecialist.name,
        )
    )

    for item in result.scalars().all():
        specialist_map.setdefault(
            str(item.organization_id),
            [],
        ).append(item)

    return specialist_map


def build_org_profile_organization_item(
    organization: Organization,
    *,
    activity_directions: (
        list[OrganizationActivityDirection] | None
    ) = None,
    services: list[OrganizationService] | None = None,
    specialists: list[OrganizationSpecialist] | None = None,
) -> OrgProfileOrganizationItem:
    return OrgProfileOrganizationItem(
        id=str(organization.id),
        inn=organization.inn,
        kpp=organization.kpp,
        ogrn=organization.ogrn,
        name=organization.name,
        legal_address=organization.legal_address,
        actual_address=organization.actual_address,
        description=organization.description,
        phone=organization.phone,
        email=organization.email,
        website=organization.website,
        activity_directions=[
            build_org_profile_offering_item(item)
            for item in (activity_directions or [])
        ],
        services=[
            build_org_profile_offering_item(item)
            for item in (services or [])
        ],
        specialists=[
            build_org_profile_specialist_item(item)
            for item in (specialists or [])
        ],
        created_at=organization.created_at,
        updated_at=organization.updated_at,
    )


async def get_org_profile_organizations(
    current_user: User,
    session: AsyncSession,
) -> list[Organization]:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.profile.read",
        session,
    )

    if allowed_organization_ids is not None and not allowed_organization_ids:
        return []

    query = select(Organization).order_by(Organization.name)

    if allowed_organization_ids is not None:
        query = query.where(Organization.id.in_(list(allowed_organization_ids)))

    result = await session.execute(query)
    return list(result.scalars().all())


async def build_org_profile_summary(
    organization_ids: list[str],
    session: AsyncSession,
) -> OrgProfileSummary:
    if not organization_ids:
        return OrgProfileSummary(
            organizations_count=0,
            groups_count=0,
            active_groups_count=0,
            members_count=0,
        )

    groups_result = await session.execute(
        select(LearningGroup.id, LearningGroup.is_active).where(
            LearningGroup.organization_id.in_(organization_ids)
        )
    )
    group_rows = groups_result.all()
    group_ids = [str(row.id) for row in group_rows]

    members_count = 0

    if group_ids:
        members_result = await session.execute(
            select(func.count(LearningGroupMember.id)).where(
                LearningGroupMember.learning_group_id.in_(group_ids)
            )
        )
        members_count = int(members_result.scalar_one() or 0)

    return OrgProfileSummary(
        organizations_count=len(organization_ids),
        groups_count=len(group_rows),
        active_groups_count=sum(1 for row in group_rows if row.is_active),
        members_count=members_count,
    )


async def build_user_scope_map(
    user_ids: list[str],
    session: AsyncSession,
) -> dict[str, dict]:
    unique_user_ids = list(dict.fromkeys(user_ids))

    if not unique_user_ids:
        return {}

    scope_by_user_id: dict[str, dict] = {
        user_id: {
            "organizations": [],
            "roles": [],
            "organization_ids": set(),
            "role_keys": set(),
        }
        for user_id in unique_user_ids
    }

    result = await session.execute(
        select(
            UserRole.user_id,
            UserRole.organization_id,
            Organization.name.label("organization_name"),
            Role.code.label("role_code"),
            Role.name.label("role_name"),
        )
        .join(Role, Role.id == UserRole.role_id)
        .outerjoin(Organization, Organization.id == UserRole.organization_id)
        .where(UserRole.user_id.in_(unique_user_ids))
        .order_by(Role.name, Organization.name)
    )

    for user_id, organization_id, organization_name, role_code, role_name in result.all():
        normalized_user_id = str(user_id)
        scope = scope_by_user_id.setdefault(
            normalized_user_id,
            {
                "organizations": [],
                "roles": [],
                "organization_ids": set(),
                "role_keys": set(),
            },
        )

        normalized_organization_id = str(organization_id) if organization_id is not None else None

        if normalized_organization_id and normalized_organization_id not in scope["organization_ids"]:
            scope["organization_ids"].add(normalized_organization_id)
            scope["organizations"].append(
                OrgUserSearchOrganizationItem(
                    id=normalized_organization_id,
                    name=organization_name,
                )
            )

        role_key = (role_code, normalized_organization_id)

        if role_code and role_key not in scope["role_keys"]:
            scope["role_keys"].add(role_key)
            scope["roles"].append(
                OrgUserSearchRoleItem(
                    code=role_code,
                    name=role_name,
                    organization_id=normalized_organization_id,
                )
            )

    for scope in scope_by_user_id.values():
        scope.pop("organization_ids", None)
        scope.pop("role_keys", None)

    return scope_by_user_id


def build_org_user_search_items(rows, limit: int) -> list[OrgUserSearchItem]:
    users_by_id: dict[str, dict] = {}

    for user, organization_id, organization_name, role_code, role_name in rows:
        user_id = str(user.id)

        if user_id not in users_by_id:
            users_by_id[user_id] = {
                "user": user,
                "organization_ids": [],
                "organizations": [],
                "roles": [],
                "role_keys": set(),
            }

        normalized_organization_id = str(organization_id) if organization_id is not None else None

        if normalized_organization_id and normalized_organization_id not in users_by_id[user_id]["organization_ids"]:
            users_by_id[user_id]["organization_ids"].append(normalized_organization_id)
            users_by_id[user_id]["organizations"].append(
                OrgUserSearchOrganizationItem(
                    id=normalized_organization_id,
                    name=organization_name,
                )
            )

        role_key = (role_code, normalized_organization_id)

        if role_code and role_key not in users_by_id[user_id]["role_keys"]:
            users_by_id[user_id]["role_keys"].add(role_key)
            users_by_id[user_id]["roles"].append(
                OrgUserSearchRoleItem(
                    code=role_code,
                    name=role_name,
                    organization_id=normalized_organization_id,
                )
            )

    items: list[OrgUserSearchItem] = []

    for item in users_by_id.values():
        user = item["user"]
        items.append(
            OrgUserSearchItem(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
                organization_ids=item["organization_ids"],
                organizations=item["organizations"],
                roles=item["roles"],
            )
        )

        if len(items) >= limit:
            break

    return items


async def get_active_course_or_404(
    course_id: str,
    session: AsyncSession,
) -> Course:
    result = await session.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_active.is_(True),
        )
    )
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return course


async def enrollment_for_user_course_exists(
    *,
    user_id: str,
    course_id: str,
    session: AsyncSession,
) -> str | None:
    result = await session.execute(
        select(Enrollment.id)
        .where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
        )
        .limit(1)
    )
    enrollment_id = result.scalar_one_or_none()

    return str(enrollment_id) if enrollment_id is not None else None


async def get_org_enrollment_rows_by_ids(
    enrollment_ids: list[str],
    session: AsyncSession,
):
    if not enrollment_ids:
        return []

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
            DocumentRecord.id.label("document_id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("document_verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("document_title"),
            DocumentRecord.status.label("document_status"),
            DocumentRecord.storage_path.label("document_storage_path"),
            DocumentRecord.created_at.label("document_created_at"),
            DocumentRecord.generated_at.label("document_generated_at"),
            DocumentRecord.revoked_at.label("document_revoked_at"),
            DocumentRecord.revocation_reason.label("document_revocation_reason"),
        )
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .outerjoin(DocumentRecord, DocumentRecord.enrollment_id == Enrollment.id)
        .where(Enrollment.id.in_(enrollment_ids))
        .order_by(User.email.asc())
    )

    return result.all()


async def get_organization_or_404(
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


async def get_user_or_404(
    user_id: str,
    session: AsyncSession,
) -> User:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


async def ensure_user_belongs_to_group_organization_or_404(
    *,
    user_id: str,
    organization_id: str,
    session: AsyncSession,
) -> None:
    result = await session.execute(
        select(UserRole.organization_id).where(
            UserRole.user_id == user_id,
            UserRole.organization_id.is_not(None),
        )
    )
    scoped_organization_ids = {str(item) for item in result.scalars().all()}

    if not scoped_organization_ids:
        return

    if organization_id in scoped_organization_ids:
        return

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found",
    )


async def get_organization_scope_for_permission(
    current_user: User,
    permission_code: str,
    session: AsyncSession,
) -> set[str] | None:
    result = await session.execute(
        select(Role.code, UserRole.organization_id)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(
            UserRole.user_id == current_user.id,
            Permission.code == permission_code,
        )
    )

    organization_ids: set[str] = set()

    for role_code, organization_id in result.all():
        if organization_id is None and role_code in GLOBAL_ORG_SCOPE_ROLE_CODES:
            return None

        if organization_id is not None:
            organization_ids.add(str(organization_id))

    return organization_ids


def ensure_organization_in_scope_or_404(
    organization_id: str,
    allowed_organization_ids: set[str] | None,
) -> None:
    if allowed_organization_ids is None:
        return

    if str(organization_id) not in allowed_organization_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )


async def get_learning_group_or_404(
    group_id: str,
    session: AsyncSession,
    allowed_organization_ids: set[str] | None = None,
) -> LearningGroup:
    query = select(LearningGroup).where(LearningGroup.id == group_id)

    if allowed_organization_ids is not None:
        if not allowed_organization_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Learning group not found",
            )

        query = query.where(
            LearningGroup.organization_id.in_(list(allowed_organization_ids))
        )

    result = await session.execute(query)
    group = result.scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning group not found",
        )

    return group


async def get_learning_group_member_or_404(
    group_id: str,
    user_id: str,
    session: AsyncSession,
) -> LearningGroupMember:
    result = await session.execute(
        select(LearningGroupMember).where(
            LearningGroupMember.learning_group_id == group_id,
            LearningGroupMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning group member not found",
        )

    return member


async def get_learning_group_member_row_or_404(
    group_id: str,
    user_id: str,
    session: AsyncSession,
):
    result = await session.execute(
        select(
            LearningGroupMember.id.label("id"),
            LearningGroupMember.learning_group_id.label("learning_group_id"),
            LearningGroupMember.user_id.label("user_id"),
            LearningGroupMember.created_at.label("created_at"),
            LearningGroupMember.updated_at.label("updated_at"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            User.is_active.label("user_is_active"),
        )
        .join(User, User.id == LearningGroupMember.user_id)
        .where(
            LearningGroupMember.learning_group_id == group_id,
            LearningGroupMember.user_id == user_id,
        )
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning group member not found",
        )

    return row


async def learning_group_member_exists(
    *,
    group_id: str,
    user_id: str,
    session: AsyncSession,
) -> bool:
    result = await session.execute(
        select(LearningGroupMember.id)
        .where(
            LearningGroupMember.learning_group_id == group_id,
            LearningGroupMember.user_id == user_id,
        )
        .limit(1)
    )

    return result.scalar_one_or_none() is not None


@router.get("/users", response_model=list[OrgUserSearchItem])
async def search_org_users(
    q: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=20, ge=1, le=50),
    exclude_group_id: str | None = Query(default=None, max_length=64),
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgUserSearchItem]:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )

    if allowed_organization_ids is not None and not allowed_organization_ids:
        return []

    excluded_user_ids: set[str] = set()
    normalized_exclude_group_id = (exclude_group_id or "").strip()

    if normalized_exclude_group_id:
        group = await get_learning_group_or_404(normalized_exclude_group_id, session)
        ensure_organization_in_scope_or_404(
            str(group.organization_id),
            allowed_organization_ids,
        )

        members_result = await session.execute(
            select(LearningGroupMember.user_id).where(
                LearningGroupMember.learning_group_id == normalized_exclude_group_id
            )
        )
        excluded_user_ids = {str(user_id) for user_id in members_result.scalars().all()}

    query = (
        select(
            User,
            UserRole.organization_id,
            Organization.name.label("organization_name"),
            Role.code.label("role_code"),
            Role.name.label("role_name"),
        )
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .outerjoin(Organization, Organization.id == UserRole.organization_id)
        .where(
            User.is_active.is_(True),
            UserRole.organization_id.is_not(None),
        )
        .order_by(User.email)
        .limit(limit * 3)
    )

    if allowed_organization_ids is not None:
        query = query.where(UserRole.organization_id.in_(list(allowed_organization_ids)))

    normalized_query = (q or "").strip().lower()

    if normalized_query:
        search_pattern = f"%{normalized_query}%"
        query = query.where(
            or_(
                func.lower(User.email).like(search_pattern),
                func.lower(User.full_name).like(search_pattern),
            )
        )

    if excluded_user_ids:
        query = query.where(User.id.not_in(excluded_user_ids))

    result = await session.execute(query)
    return build_org_user_search_items(result.all(), limit)



@router.get("/enrollments", response_model=list[OrgEnrollmentItem])
async def list_org_enrollments(
    organization_id: str | None = Query(default=None),
    group_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgEnrollmentItem]:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.read",
        session,
    )

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
            DocumentRecord.id.label("document_id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("document_verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("document_title"),
            DocumentRecord.status.label("document_status"),
            DocumentRecord.storage_path.label("document_storage_path"),
            DocumentRecord.created_at.label("document_created_at"),
            DocumentRecord.generated_at.label("document_generated_at"),
            DocumentRecord.revoked_at.label("document_revoked_at"),
            DocumentRecord.revocation_reason.label("document_revocation_reason"),
        )
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .outerjoin(DocumentRecord, DocumentRecord.enrollment_id == Enrollment.id)
    )

    if organization_id:
        normalized_organization_id = organization_id.strip()
        ensure_organization_in_scope_or_404(
            normalized_organization_id,
            allowed_organization_ids,
        )
        await get_organization_or_404(normalized_organization_id, session)
        query = query.where(Enrollment.organization_id == normalized_organization_id)
    elif allowed_organization_ids is not None:
        if not allowed_organization_ids:
            return []

        query = query.where(
            Enrollment.organization_id.in_(list(allowed_organization_ids))
        )

    if group_id:
        group = await get_learning_group_or_404(
            group_id.strip(),
            session,
            allowed_organization_ids,
        )
        query = query.where(Enrollment.learning_group_id == group.id)

    if status_filter:
        normalized_status = status_filter.strip()
        if normalized_status:
            query = query.where(Enrollment.status == normalized_status)

    result = await session.execute(
        query.order_by(
            Organization.name.asc(),
            LearningGroup.name.asc(),
            Course.title.asc(),
            User.email.asc(),
        )
    )

    return [build_org_enrollment_item(row) for row in result.all()]


@router.get("/groups/{group_id}/enrollments", response_model=list[OrgEnrollmentItem])
async def list_org_group_enrollments(
    group_id: str,
    current_user: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgEnrollmentItem]:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.read",
        session,
    )
    group = await get_learning_group_or_404(
        group_id.strip(),
        session,
        allowed_organization_ids,
    )

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
            DocumentRecord.id.label("document_id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("document_verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("document_title"),
            DocumentRecord.status.label("document_status"),
            DocumentRecord.storage_path.label("document_storage_path"),
            DocumentRecord.created_at.label("document_created_at"),
            DocumentRecord.generated_at.label("document_generated_at"),
            DocumentRecord.revoked_at.label("document_revoked_at"),
            DocumentRecord.revocation_reason.label("document_revocation_reason"),
        )
        .join(User, User.id == Enrollment.user_id)
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .outerjoin(DocumentRecord, DocumentRecord.enrollment_id == Enrollment.id)
        .where(Enrollment.learning_group_id == group.id)
        .order_by(Course.title.asc(), User.email.asc())
    )

    return [build_org_enrollment_item(row) for row in result.all()]


@router.post(
    "/enrollments/group",
    response_model=OrgEnrollmentBulkCreateResult,
    status_code=status.HTTP_201_CREATED,
)
async def create_org_group_enrollments(
    payload: OrgEnrollmentGroupCreate,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgEnrollmentBulkCreateResult:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )

    group = await get_learning_group_or_404(
        payload.learning_group_id.strip(),
        session,
        allowed_organization_ids,
    )
    course = await get_active_course_or_404(payload.course_id.strip(), session)

    members_result = await session.execute(
        select(
            LearningGroupMember.user_id,
            User.email,
            User.full_name,
        )
        .join(User, User.id == LearningGroupMember.user_id)
        .where(
            LearningGroupMember.learning_group_id == group.id,
            User.is_active.is_(True),
        )
        .order_by(User.email.asc())
    )
    members = members_result.all()

    created_enrollments: list[Enrollment] = []
    skipped: list[OrgEnrollmentBulkSkippedItem] = []

    for user_id, user_email, user_full_name in members:
        existing_enrollment_id = await enrollment_for_user_course_exists(
            user_id=str(user_id),
            course_id=str(course.id),
            session=session,
        )

        if existing_enrollment_id is not None:
            skipped.append(
                OrgEnrollmentBulkSkippedItem(
                    user_id=str(user_id),
                    user_email=user_email,
                    user_full_name=user_full_name,
                    reason="already_enrolled",
                    existing_enrollment_id=existing_enrollment_id,
                )
            )
            continue

        enrollment = Enrollment(
            user_id=user_id,
            course_id=course.id,
            organization_id=group.organization_id,
            learning_group_id=group.id,
            status=payload.status.strip() or "assigned",
            started_at=payload.started_at,
            completed_at=payload.completed_at,
        )
        session.add(enrollment)
        created_enrollments.append(enrollment)

    try:
        await session.flush()
        created_ids = [str(enrollment.id) for enrollment in created_enrollments]
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Enrollment already exists",
        )

    created_rows = await get_org_enrollment_rows_by_ids(created_ids, session)
    created = [build_org_enrollment_item(row) for row in created_rows]

    return OrgEnrollmentBulkCreateResult(
        status="ok",
        learning_group_id=str(group.id),
        course_id=str(course.id),
        organization_id=str(group.organization_id),
        created_count=len(created),
        skipped_count=len(skipped),
        created=created,
        skipped=skipped,
    )



@router.delete("/groups/{group_id}/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org_group_enrollment(
    group_id: str,
    enrollment_id: str,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> Response:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )
    group = await get_learning_group_or_404(
        group_id.strip(),
        session,
        allowed_organization_ids,
    )

    result = await session.execute(
        select(Enrollment).where(
            Enrollment.id == enrollment_id.strip(),
            Enrollment.learning_group_id == group.id,
        )
    )
    enrollment = result.scalar_one_or_none()

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    if enrollment.status != "assigned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only assigned group enrollment can be deleted",
        )

    await session.delete(enrollment)
    await session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/profile", response_model=OrgProfile)
async def get_org_profile(
    current_user: User = Depends(require_permission("org.profile.read")),
    session: AsyncSession = Depends(get_db),
) -> OrgProfile:
    organizations = await get_org_profile_organizations(current_user, session)
    organization_ids = [
        str(organization.id)
        for organization in organizations
    ]
    summary = await build_org_profile_summary(organization_ids, session)
    direction_map, service_map = await get_org_profile_offering_maps(
        organization_ids,
        session,
    )
    specialist_map = await get_org_profile_specialist_map(
        organization_ids,
        session,
    )

    return OrgProfile(
        organizations=[
            build_org_profile_organization_item(
                organization,
                activity_directions=direction_map.get(
                    str(organization.id),
                    [],
                ),
                services=service_map.get(str(organization.id), []),
                specialists=specialist_map.get(
                    str(organization.id),
                    [],
                ),
            )
            for organization in organizations
        ],
        summary=summary,
    )


@router.patch("/profile/{organization_id}", response_model=OrgProfileOrganizationItem)
async def update_org_profile(
    organization_id: str,
    payload: OrgProfileUpdate,
    current_user: User = Depends(require_permission("org.profile.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgProfileOrganizationItem:
    normalized_organization_id = organization_id.strip()
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.profile.write",
        session,
    )

    ensure_organization_in_scope_or_404(
        normalized_organization_id,
        allowed_organization_ids,
    )

    organization = await get_organization_or_404(normalized_organization_id, session)
    data = normalize_org_profile_update_data(payload)

    for key, value in data.items():
        setattr(organization, key, value)

    await session.commit()
    await session.refresh(organization)

    direction_map, service_map = await get_org_profile_offering_maps(
        [str(organization.id)],
        session,
    )
    specialist_map = await get_org_profile_specialist_map(
        [str(organization.id)],
        session,
    )

    return build_org_profile_organization_item(
        organization,
        activity_directions=direction_map.get(
            str(organization.id),
            [],
        ),
        services=service_map.get(str(organization.id), []),
        specialists=specialist_map.get(str(organization.id), []),
    )


@router.put(
    "/profile/{organization_id}/offerings",
    response_model=OrgProfileOrganizationItem,
)
async def replace_org_profile_offerings(
    organization_id: str,
    payload: OrgProfileOfferingsUpdate,
    current_user: User = Depends(
        require_permission("org.profile.write")
    ),
    session: AsyncSession = Depends(get_db),
) -> OrgProfileOrganizationItem:
    normalized_organization_id = organization_id.strip()
    allowed_organization_ids = (
        await get_organization_scope_for_permission(
            current_user,
            "org.profile.write",
            session,
        )
    )

    ensure_organization_in_scope_or_404(
        normalized_organization_id,
        allowed_organization_ids,
    )

    organization = await get_organization_or_404(
        normalized_organization_id,
        session,
    )
    direction_data = normalize_org_profile_offering_items(
        payload.activity_directions,
        item_label="Activity direction",
    )
    service_data = normalize_org_profile_offering_items(
        payload.services,
        item_label="Service",
    )

    await session.execute(
        delete(OrganizationActivityDirection).where(
            OrganizationActivityDirection.organization_id
            == normalized_organization_id
        )
    )
    await session.execute(
        delete(OrganizationService).where(
            OrganizationService.organization_id
            == normalized_organization_id
        )
    )

    session.add_all(
        [
            OrganizationActivityDirection(
                organization_id=normalized_organization_id,
                **item,
            )
            for item in direction_data
        ]
    )
    session.add_all(
        [
            OrganizationService(
                organization_id=normalized_organization_id,
                **item,
            )
            for item in service_data
        ]
    )

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization offering already exists",
        )

    direction_map, service_map = await get_org_profile_offering_maps(
        [str(organization.id)],
        session,
    )
    specialist_map = await get_org_profile_specialist_map(
        [str(organization.id)],
        session,
    )

    return build_org_profile_organization_item(
        organization,
        activity_directions=direction_map.get(
            str(organization.id),
            [],
        ),
        services=service_map.get(str(organization.id), []),
        specialists=specialist_map.get(str(organization.id), []),
    )


@router.put(
    "/profile/{organization_id}/specialists",
    response_model=OrgProfileOrganizationItem,
)
async def replace_org_profile_specialists(
    organization_id: str,
    payload: OrgProfileSpecialistsUpdate,
    current_user: User = Depends(
        require_permission("org.profile.write")
    ),
    session: AsyncSession = Depends(get_db),
) -> OrgProfileOrganizationItem:
    normalized_organization_id = organization_id.strip()
    allowed_organization_ids = (
        await get_organization_scope_for_permission(
            current_user,
            "org.profile.write",
            session,
        )
    )

    ensure_organization_in_scope_or_404(
        normalized_organization_id,
        allowed_organization_ids,
    )

    organization = await get_organization_or_404(
        normalized_organization_id,
        session,
    )
    specialist_data = normalize_org_profile_specialist_items(
        payload.specialists
    )

    await session.execute(
        delete(OrganizationSpecialist).where(
            OrganizationSpecialist.organization_id
            == normalized_organization_id
        )
    )

    session.add_all(
        [
            OrganizationSpecialist(
                organization_id=normalized_organization_id,
                **item,
            )
            for item in specialist_data
        ]
    )

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization specialist already exists",
        )

    direction_map, service_map = await get_org_profile_offering_maps(
        [str(organization.id)],
        session,
    )
    specialist_map = await get_org_profile_specialist_map(
        [str(organization.id)],
        session,
    )

    return build_org_profile_organization_item(
        organization,
        activity_directions=direction_map.get(
            str(organization.id),
            [],
        ),
        services=service_map.get(str(organization.id), []),
        specialists=specialist_map.get(str(organization.id), []),
    )


@router.get("/groups", response_model=list[OrgLearningGroupItem])
async def list_learning_groups(
    organization_id: str | None = Query(default=None),
    current_user: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgLearningGroupItem]:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.read",
        session,
    )

    query = select(LearningGroup).order_by(LearningGroup.name)

    if organization_id:
        normalized_organization_id = organization_id.strip()
        ensure_organization_in_scope_or_404(
            normalized_organization_id,
            allowed_organization_ids,
        )
        await get_organization_or_404(normalized_organization_id, session)
        query = query.where(LearningGroup.organization_id == normalized_organization_id)
    elif allowed_organization_ids is not None:
        if not allowed_organization_ids:
            return []

        query = query.where(
            LearningGroup.organization_id.in_(list(allowed_organization_ids))
        )

    result = await session.execute(query)
    groups = result.scalars().all()

    return [build_learning_group_item(group) for group in groups]


@router.post(
    "/groups",
    response_model=OrgLearningGroupDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_learning_group(
    payload: OrgLearningGroupCreate,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupDetail:
    data = normalize_learning_group_create_data(payload)
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )

    ensure_organization_in_scope_or_404(
        data["organization_id"],
        allowed_organization_ids,
    )
    await get_organization_or_404(data["organization_id"], session)

    group = LearningGroup(**data)
    session.add(group)

    try:
        await session.commit()
        await session.refresh(group)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Learning group with this name or code already exists in organization",
        )

    return build_learning_group_detail(group)


@router.get("/groups/{group_id}", response_model=OrgLearningGroupDetail)
async def get_learning_group_detail(
    group_id: str,
    current_user: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupDetail:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.read",
        session,
    )
    group = await get_learning_group_or_404(
        group_id,
        session,
        allowed_organization_ids,
    )
    return build_learning_group_detail(group)


@router.patch("/groups/{group_id}", response_model=OrgLearningGroupDetail)
async def update_learning_group(
    group_id: str,
    payload: OrgLearningGroupUpdate,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupDetail:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )
    group = await get_learning_group_or_404(
        group_id,
        session,
        allowed_organization_ids,
    )
    data = normalize_learning_group_update_data(payload)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    for field, value in data.items():
        setattr(group, field, value)

    try:
        await session.commit()
        await session.refresh(group)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Learning group with this name or code already exists in organization",
        )

    return build_learning_group_detail(group)


@router.delete(
    "/groups/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_learning_group(
    group_id: str,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> Response:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )
    group = await get_learning_group_or_404(
        group_id,
        session,
        allowed_organization_ids,
    )
    await session.delete(group)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/groups/{group_id}/members",
    response_model=list[OrgLearningGroupMemberItem],
)
async def list_learning_group_members(
    group_id: str,
    current_user: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgLearningGroupMemberItem]:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.read",
        session,
    )
    await get_learning_group_or_404(
        group_id,
        session,
        allowed_organization_ids,
    )

    result = await session.execute(
        select(
            LearningGroupMember.id.label("id"),
            LearningGroupMember.learning_group_id.label("learning_group_id"),
            LearningGroupMember.user_id.label("user_id"),
            LearningGroupMember.created_at.label("created_at"),
            LearningGroupMember.updated_at.label("updated_at"),
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            User.is_active.label("user_is_active"),
        )
        .join(User, User.id == LearningGroupMember.user_id)
        .where(LearningGroupMember.learning_group_id == group_id)
        .order_by(User.email.asc())
    )

    rows = result.all()
    user_scope_by_user_id = await build_user_scope_map(
        [str(row.user_id) for row in rows],
        session,
    )

    return [
        build_learning_group_member_item(row, user_scope_by_user_id)
        for row in rows
    ]


@router.post(
    "/groups/{group_id}/members",
    response_model=OrgLearningGroupMemberItem,
    status_code=status.HTTP_201_CREATED,
)
async def add_learning_group_member(
    group_id: str,
    payload: OrgLearningGroupMemberCreate,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupMemberItem:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )
    group = await get_learning_group_or_404(
        group_id,
        session,
        allowed_organization_ids,
    )
    user = await get_user_or_404(payload.user_id.strip(), session)

    await ensure_user_belongs_to_group_organization_or_404(
        user_id=str(user.id),
        organization_id=str(group.organization_id),
        session=session,
    )

    if await learning_group_member_exists(
        group_id=str(group.id),
        user_id=str(user.id),
        session=session,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this learning group",
        )

    member = LearningGroupMember(
        learning_group_id=group.id,
        user_id=user.id,
    )
    session.add(member)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this learning group",
        )

    row = await get_learning_group_member_row_or_404(
        str(group.id),
        str(user.id),
        session,
    )
    user_scope_by_user_id = await build_user_scope_map([str(user.id)], session)

    return build_learning_group_member_item(row, user_scope_by_user_id)


@router.delete(
    "/groups/{group_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def remove_learning_group_member(
    group_id: str,
    user_id: str,
    current_user: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> Response:
    allowed_organization_ids = await get_organization_scope_for_permission(
        current_user,
        "org.groups.write",
        session,
    )
    await get_learning_group_or_404(
        group_id,
        session,
        allowed_organization_ids,
    )

    member = await get_learning_group_member_or_404(
        group_id,
        user_id.strip(),
        session,
    )

    await session.delete(member)
    await session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
