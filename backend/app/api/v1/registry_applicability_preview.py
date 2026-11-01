"""Opt-in read-only preview of confirmed registry applicability decisions."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.rbac import require_permission
from app.db.session import get_db
from app.models.user import User
from app.services.registry_applicability_preview import (
    read_registry_applicability_preview,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/frdo/applicability-preview")
async def preview_frdo_applicability(
    scope: str = Query("review", pattern="^(work|review|history)$"),
    limit: int = Query(100, ge=1, le=300),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_permission("frdo.read")),
    session: AsyncSession = Depends(get_db),
):
    return await read_registry_applicability_preview(
        session=session, registry="frdo", scope=scope, limit=limit, offset=offset
    )


@router.get("/mintrud/applicability-preview")
async def preview_mintrud_applicability(
    scope: str = Query("review", pattern="^(work|review|history)$"),
    limit: int = Query(100, ge=1, le=300),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
):
    return await read_registry_applicability_preview(
        session=session, registry="mintrud", scope=scope, limit=limit, offset=offset
    )
