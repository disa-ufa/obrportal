from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.organization import Organization  # noqa: F401
from app.models.role import Role, UserRole
from app.models.user import User
from app.services.user_password_tokens import (
    USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
    get_valid_user_password_token,
    mark_user_password_token_used,
)
from app.schemas.auth import CurrentUserResponse, CurrentUserRole, LoginRequest, RegisterRequest, SetPasswordRequest, SetPasswordResponse, TokenResponse


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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    normalized_email = payload.email.lower().strip()
    normalized_full_name = payload.full_name.strip() if payload.full_name else None
    normalized_phone = payload.phone.strip() if payload.phone else None

    existing_user = await get_user_by_email(session, normalized_email)
    if existing_user:
        await write_audit_event(
            session,
            action="register_failed",
            request=request,
            entity_type="user",
            payload={"email": normalized_email, "reason": "email_conflict"},
        )
        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    if normalized_phone:
        result = await session.execute(select(User).where(User.phone == normalized_phone))
        existing_phone_user = result.scalar_one_or_none()

        if existing_phone_user:
            await write_audit_event(
                session,
                action="register_failed",
                request=request,
                entity_type="user",
                payload={"email": normalized_email, "phone": normalized_phone, "reason": "phone_conflict"},
            )
            await session.commit()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this phone already exists",
            )

    user = User(
        email=normalized_email,
        phone=normalized_phone,
        full_name=normalized_full_name,
        hashed_password=get_password_hash(payload.password),
        is_active=True,
        is_email_verified=False,
        mfa_enabled=False,
    )
    session.add(user)
    await session.flush()

    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    await write_audit_event(
        session,
        action="register_success",
        request=request,
        actor_user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        payload={"email": user.email},
    )
    await session.commit()

    return TokenResponse(access_token=access_token)


@router.post("/set-password", response_model=SetPasswordResponse)
async def set_password(
    payload: SetPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> SetPasswordResponse:
    token_record = await get_valid_user_password_token(
        session,
        raw_token=payload.token,
        purpose=USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
    )

    if token_record is None:
        await write_audit_event(
            session,
            action="password_setup_failed",
            request=request,
            entity_type="user_password_token",
            payload={"reason": "invalid_or_expired_token"},
        )
        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password setup token",
        )

    result = await session.execute(select(User).where(User.id == token_record.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        await write_audit_event(
            session,
            action="password_setup_failed",
            request=request,
            entity_type="user_password_token",
            entity_id=token_record.id,
            payload={"reason": "user_not_found"},
        )
        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password setup token",
        )

    user.hashed_password = get_password_hash(payload.password)
    user.is_active = True
    user.is_email_verified = True

    await mark_user_password_token_used(session, record=token_record)

    await write_audit_event(
        session,
        action="password_setup_success",
        request=request,
        actor_user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        payload={
            "email": user.email,
            "purpose": token_record.purpose,
        },
    )
    await session.commit()

    return SetPasswordResponse(
        status="ok",
        user_id=user.id,
        email=user.email,
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
