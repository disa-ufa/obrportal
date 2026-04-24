from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import build_current_user_response, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.account import AccountSummaryResponse


router = APIRouter(prefix="/account", tags=["account"])


@router.get("/summary", response_model=AccountSummaryResponse)
async def get_account_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountSummaryResponse:
    profile = await build_current_user_response(session, current_user)

    return AccountSummaryResponse(
        profile=profile,
        enrollments_count=0,
        active_courses_count=0,
        documents_count=0,
    )