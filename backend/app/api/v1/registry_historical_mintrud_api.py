"""Authenticated local-only historical Mintrud reconciliation dry-run.

No apply endpoint is exposed here. No caller-supplied actor_id.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.api.v1.rbac import get_user_permission_codes
from app.core.config import settings
from app.db.session import AsyncSessionLocal, get_db
from app.models.role import Role, UserRole
from app.models.user import User
from app.services.registry_historical_mintrud_reconciliation import (
    HistoricalMintrudReconciliationError,
    reconcile_historical_mintrud,
)


def require_local_clone() -> None:
    url = make_url(settings.database_url)

    if (
        settings.environment != "local"
        or url.drivername != "postgresql+asyncpg"
        or url.host != "postgres"
        or url.database != "obrportal_prodclone_20261101"
        or bool(url.query)
    ):
        raise HTTPException(status_code=404, detail="Not found")


router = APIRouter(
    prefix="/admin/mintrud/historical-reconciliation",
    tags=["admin"],
    dependencies=[Depends(require_local_clone)],
)


class HistoricalDryRunRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    obligation_id: UUID
    expected_approval_event_id: UUID

    expected_approval_fingerprint: str = Field(
        pattern=r"^[a-f0-9]{64}$",
    )
    expected_applicability_fingerprint: str = Field(
        pattern=r"^[a-f0-9]{64}$",
    )
    operator_reason: str = Field(
        min_length=30,
        max_length=500,
    )


class HistoricalDryRunResponse(BaseModel):
    applied: bool
    decision: str
    approval_hash_verified: bool
    protocol_values_verified: bool


@router.post(
    "/dry-run",
    response_model=HistoricalDryRunResponse,
)
async def historical_mintrud_dry_run(
    body: HistoricalDryRunRequest,
    current_user: User = Depends(get_current_user),
    auth_session: AsyncSession = Depends(get_db),
):
    # Never accept an actor identifier from the request body.
    actor_id = str(current_user.id)
    active = bool(current_user.is_active)

    # Auth dependencies use a shared C-fence transaction.
    # Release it before acquiring exclusive C in a NEW session.
    try:
        permissions = await get_user_permission_codes(
            current_user,
            auth_session,
        )

        global_admin_role = await auth_session.scalar(
            select(Role.id)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(
                UserRole.user_id == actor_id,
                UserRole.organization_id.is_(None),
                Role.code == "admin",
            )
            .limit(1)
        )

        authorized = (
            active
            and global_admin_role is not None
            and "mintrud.export" in permissions
            and "mintrud.approve" in permissions
        )

    finally:
        if auth_session.in_transaction():
            await auth_session.rollback()

    if not authorized:
        raise HTTPException(
            status_code=403,
            detail="Historical reconciliation is not authorized",
        )

    # Fresh transaction: no authorization query before exclusive C.
    async with AsyncSessionLocal() as action_session:
        try:
            result = await reconcile_historical_mintrud(
                session=action_session,
                actor_id=actor_id,
                obligation_id=str(body.obligation_id),
                expected_approval_event_id=str(
                    body.expected_approval_event_id
                ),
                expected_approval_fingerprint=(
                    body.expected_approval_fingerprint
                ),
                expected_applicability_fingerprint=(
                    body.expected_applicability_fingerprint
                ),
                operator_reason=body.operator_reason,
                apply=False,
            )

            if (
                result.get("applied") is not False
                or result.get("decision") != "required"
                or result.get("approval_hash_verified") is not True
                or result.get("protocol_values_verified") is not True
            ):
                raise HTTPException(
                    status_code=500,
                    detail="Unexpected reconciliation result",
                )

            return HistoricalDryRunResponse(
                applied=False,
                decision="required",
                approval_hash_verified=True,
                protocol_values_verified=True,
            )

        except HistoricalMintrudReconciliationError as exc:
            raise HTTPException(
                status_code=409,
                detail=str(exc),
            ) from exc

        finally:
            if action_session.in_transaction():
                await action_session.rollback()