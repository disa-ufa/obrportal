"""Opt-in read-only preview of confirmed registry applicability decisions."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user, oauth2_scheme
from app.api.v1.rbac import get_user_permission_codes, require_permission
from app.db.session import get_db
from app.models.user import User
from app.services.registry_applicability_preview import (
    read_registry_applicability_preview,
)

from app.services.registry_action_scope import discover_registry_action_scope
from app.services.registry_applicability_confirmation import (
    confirm_automatic_applicability,
    conflict,
    get_target,
    inspect_automatic_applicability,
)
from app.services.registry_batch_transaction import KEY, get_registry_batch_db
from app.services.registry_queue_preview import read_legacy_registry_queue_preview

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


@router.get("/frdo/queue-triage-preview")
async def preview_frdo_legacy_queue(
    _: User = Depends(require_permission("frdo.read")),
    session: AsyncSession = Depends(get_db),
):
    return await read_legacy_registry_queue_preview(
        session=session, registry="frdo"
    )


@router.get("/mintrud/queue-triage-preview")
async def preview_mintrud_legacy_queue(
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
):
    return await read_legacy_registry_queue_preview(
        session=session, registry="mintrud"
    )

RegistryName = Literal["mintrud", "frdo"]


class ConfirmAutomaticApplicability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_version: int = Field(ge=0)
    expected_rule_version: str = Field(min_length=1, max_length=64)
    expected_input_fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")


def _allow(permissions, registry, *, confirm=False):
    for action in ("read", "applicability.confirm") if confirm else ("read",):
        permission = f"{registry}.{action}"
        if permission not in permissions:
            raise HTTPException(403, f"Permission required: {permission}")


@router.get("/{registry}/obligations/{obligation_id}/applicability")
async def inspect_obligation_applicability(
    registry: RegistryName,
    obligation_id: UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    permissions = await get_user_permission_codes(user, session)
    _allow(permissions, registry)
    try:
        target = await get_target(session, registry, str(obligation_id))
        view, _ = await inspect_automatic_applicability(
            session, target, can_write=f"{registry}.applicability.confirm" in permissions,
        )
        return view
    except ValueError as exc:
        raise conflict("unverified", "Связи и входные данные обязательства требуют проверки.") from exc


@router.post("/{registry}/obligations/{obligation_id}/applicability/confirm-auto")
async def confirm_obligation_applicability(
    registry: RegistryName,
    obligation_id: UUID,
    body: ConfirmAutomaticApplicability,
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_registry_batch_db),
):
    """Exclusive catalog fence precedes authorization, source, decision and row locks."""
    try:
        user = await get_current_user(token=token, session=session)
        _allow(await get_user_permission_codes(user, session), registry, confirm=True)
        await get_target(session, registry, str(obligation_id))
        scope_args = dict(session=session, actor_id=str(user.id), registry=registry,
                          obligation_ids=(str(obligation_id),))
        scope = await discover_registry_action_scope(**scope_args)
        fence = session.info[KEY]
        fence.require_session(session, "exclusive")
        (target,) = await fence.action_lockset(
            source_fences=scope.source_fences, obligation_targets=scope.targets,
        )
        if scope != await discover_registry_action_scope(**scope_args):
            raise conflict("changed", "Данные обязательства изменились. Обновите расчёт.")
        user = await get_current_user(token=token, session=session)
        _allow(await get_user_permission_codes(user, session), registry, confirm=True)
        result = await confirm_automatic_applicability(session, target, expectation=body, actor_id=user.id)
        await session.commit()
        return result
    except ValueError as exc:
        raise conflict("unverified", "Решение требует проверки связей или истории обязательства.") from exc
    except SQLAlchemyError as exc:
        raise HTTPException(503, {
            "code": "registry.applicability_save_unconfirmed",
            "message": "Подтверждение сохранения не получено. Обновите расчёт перед следующим действием.",
        }) from exc
