from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import require_permission
from app.db.session import get_db
from app.models.learning_group import LearningGroup
from app.models.organization import Organization
from app.models.user import User
from app.schemas.org import (
    OrgLearningGroupCreate,
    OrgLearningGroupDetail,
    OrgLearningGroupItem,
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
    data["name"] = data["name"].strip()
    data["code"] = normalize_optional_text(data.get("code"))
    data["description"] = normalize_optional_text(data.get("description"))
    return data


def normalize_learning_group_update_data(payload: OrgLearningGroupUpdate) -> dict:
    data = model_to_dict(payload, exclude_unset=True)

    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

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


@router.get("/groups", response_model=list[OrgLearningGroupItem])
async def list_learning_groups(
    organization_id: str | None = Query(default=None),
    _: User = Depends(require_permission("org.groups.read")),
    session: AsyncSession = Depends(get_db),
) -> list[OrgLearningGroupItem]:
    query = select(LearningGroup).order_by(LearningGroup.name)

    if organization_id:
        await get_organization_or_404(organization_id, session)
        query = query.where(LearningGroup.organization_id == organization_id)

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
