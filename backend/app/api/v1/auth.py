from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, verify_password
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.organization import Organization  # noqa: F401
from app.models.role import Role, UserRole
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, CurrentUserRole, LoginRequest, TokenResponse


router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _request_ip(request: Request) -> str | None:
    if request.client:
        return request.client.host
    return None


def _request_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


async def write_audit_event(
    session: AsyncSession,
    *,
    action: str,
    request: Request,
    actor_user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    payload: dict | None = None,
) -> None:
    session.add(
        AuditEvent(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=_request_ip(request),
            user_agent=_request_user_agent(request),
            payload=payload or {},
        )
    )


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email.lower().strip()))
    return result.scalar_one_or_none()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def build_current_user_response(session: AsyncSession, user: User) -> CurrentUserResponse:
    result = await session.execute(
        select(Role.code, Role.name, UserRole.organization_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
        .order_by(Role.code)
    )

    roles = [
        CurrentUserRole(
            code=row.code,
            name=row.name,
            organization_id=row.organization_id,
        )
        for row in result.all()
    ]

    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        mfa_enabled=user.mfa_enabled,
        roles=roles,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await get_user_by_email(session, payload.email)

    if not user or not verify_password(payload.password, user.hashed_password):
        await write_audit_event(
            session,
            action="login_failed",
            request=request,
            entity_type="user",
            payload={"email": payload.email, "reason": "invalid_credentials"},
        )
        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        await write_audit_event(
            session,
            action="login_failed",
            request=request,
            actor_user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            payload={"email": user.email, "reason": "inactive_user"},
        )
        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    await write_audit_event(
        session,
        action="login_success",
        request=request,
        actor_user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        payload={"email": user.email},
    )
    await session.commit()

    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=CurrentUserResponse)
async def me(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    return await build_current_user_response(session, current_user)
