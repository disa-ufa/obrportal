from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import require_permission
from app.db.session import get_db
from app.models.learning_group import LearningGroup, LearningGroupMember
from app.models.organization import Organization
from app.models.user import User
from app.schemas.org import (
    OrgLearningGroupCreate,
    OrgLearningGroupDetail,
    OrgLearningGroupItem,
    OrgLearningGroupMemberCreate,
    OrgLearningGroupMemberItem,
    OrgLearningGroupUpdate,
)


router = APIRouter(prefix="/org", tags=["org"])


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


def build_learning_group_member_item(row) -> OrgLearningGroupMemberItem:
    return OrgLearningGroupMemberItem(
        id=str(row.id),
        learning_group_id=str(row.learning_group_id),
        user_id=str(row.user_id),
        user_email=row.user_email,
        user_full_name=row.user_full_name,
        user_is_active=bool(row.user_is_active),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


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


async def get_learning_group_or_404(
    group_id: str,
    session: AsyncSession,
) -> LearningGroup:
    result = await session.execute(
        select(LearningGroup).where(LearningGroup.id == group_id)
    )
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


@router.get("/groups", response_model=list[OrgLearningGroupItem])
async def list_learning_groups(
    organization_id: str | None = Query(default=None),
    _: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgLearningGroupItem]:
    query = select(LearningGroup).order_by(LearningGroup.name)

    if organization_id:
        normalized_organization_id = organization_id.strip()
        await get_organization_or_404(normalized_organization_id, session)
        query = query.where(LearningGroup.organization_id == normalized_organization_id)

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
    _: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupDetail:
    data = normalize_learning_group_create_data(payload)

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
    _: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupDetail:
    group = await get_learning_group_or_404(group_id, session)
    return build_learning_group_detail(group)


@router.patch("/groups/{group_id}", response_model=OrgLearningGroupDetail)
async def update_learning_group(
    group_id: str,
    payload: OrgLearningGroupUpdate,
    _: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupDetail:
    group = await get_learning_group_or_404(group_id, session)
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
    _: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> Response:
    group = await get_learning_group_or_404(group_id, session)
    await session.delete(group)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/groups/{group_id}/members",
    response_model=list[OrgLearningGroupMemberItem],
)
async def list_learning_group_members(
    group_id: str,
    _: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgLearningGroupMemberItem]:
    await get_learning_group_or_404(group_id, session)

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

    return [build_learning_group_member_item(row) for row in result.all()]


@router.post(
    "/groups/{group_id}/members",
    response_model=OrgLearningGroupMemberItem,
    status_code=status.HTTP_201_CREATED,
)
async def add_learning_group_member(
    group_id: str,
    payload: OrgLearningGroupMemberCreate,
    _: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> OrgLearningGroupMemberItem:
    group = await get_learning_group_or_404(group_id, session)
    user = await get_user_or_404(payload.user_id.strip(), session)

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

    return build_learning_group_member_item(row)


@router.delete(
    "/groups/{group_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def remove_learning_group_member(
    group_id: str,
    user_id: str,
    _: User = Depends(require_permission("org.groups.write")),
    session: AsyncSession = Depends(get_db),
) -> Response:
    await get_learning_group_or_404(group_id, session)

    member = await get_learning_group_member_or_404(
        group_id,
        user_id.strip(),
        session,
    )

    await session.delete(member)
    await session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
