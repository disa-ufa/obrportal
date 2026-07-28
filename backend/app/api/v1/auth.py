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
from app.models.base import utcnow
from app.models.organization import Organization  # noqa: F401
from app.models.role import Role, UserRole
from app.models.user import User
from app.services.email_delivery import (
    EMAIL_DELIVERY_STATUS_SENT,
    send_public_registration_email,
)
from app.services.public_registration import (
    PUBLIC_REGISTRATION_ACCEPTED_MESSAGE,
    PUBLIC_REGISTRATION_ACCEPTED_STATUS,
    normalize_public_registration_data,
    prepare_public_registration,
)
from app.services.user_password_tokens import (
    USER_PASSWORD_TOKEN_PURPOSE_INITIAL_PASSWORD_SETUP,
    build_password_setup_url,
    get_valid_user_password_token,
    mark_user_password_token_used,
)
from app.schemas.auth import (
    CurrentUserResponse,
    CurrentUserRole,
    LoginRequest,
    PublicRegistrationAcceptedResponse,
    PublicRegistrationRequest,
    PublicRegistrationStatusResponse,
    SetPasswordRequest,
    SetPasswordResponse,
    TokenResponse,
)


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


@router.get(
    "/registration-status",
    response_model=PublicRegistrationStatusResponse,
)
async def registration_status() -> PublicRegistrationStatusResponse:
    return PublicRegistrationStatusResponse(
        enabled=settings.public_registration_enabled,
    )

@router.post(
    "/register",
    response_model=PublicRegistrationAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def register(
    payload: PublicRegistrationRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> PublicRegistrationAcceptedResponse:
    if not settings.public_registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Public registration is temporarily unavailable."
            ),
        )
    normalized_data = normalize_public_registration_data(
        last_name=payload.last_name,
        first_name=payload.first_name,
        middle_name=payload.middle_name,
        email=payload.email,
        phone=payload.phone,
    )

    await write_audit_event(
        session,
        action="public_registration.requested",
        request=request,
        entity_type="user",
        payload={"email": normalized_data.email},
    )

    prepared = await prepare_public_registration(
        session,
        data=normalized_data,
    )
    entity_id = (
        prepared.user.id
        if prepared.user is not None
        else None
    )

    await write_audit_event(
        session,
        action=f"public_registration.{prepared.outcome}",
        request=request,
        entity_type="user",
        entity_id=entity_id,
        payload={"email": normalized_data.email},
    )
    await session.commit()

    if (
        prepared.user is not None
        and prepared.created_token is not None
    ):
        delivery_status = "failed"
        delivery_error: str | None = None

        try:
            setup_url = build_password_setup_url(
                settings.public_base_url,
                prepared.created_token.raw_token,
            )
            delivery_result = send_public_registration_email(
                recipient=prepared.user.email,
                user_email=prepared.user.email,
                setup_url=setup_url,
                expires_at=(
                    prepared.created_token.record.expires_at
                ),
            )
            delivery_status = delivery_result.status
            delivery_error = delivery_result.error

            if delivery_result.sent:
                prepared.created_token.record.sent_at = utcnow()
        except Exception as error:
            delivery_error = error.__class__.__name__

        email_action = (
            "public_registration.email_sent"
            if delivery_status
            == EMAIL_DELIVERY_STATUS_SENT
            else "public_registration.email_failed"
        )

        await write_audit_event(
            session,
            action=email_action,
            request=request,
            entity_type="user_password_token",
            entity_id=prepared.created_token.record.id,
            payload={
                "email": prepared.user.email,
                "delivery_status": delivery_status,
                "error": delivery_error,
            },
        )
        await session.commit()

    return PublicRegistrationAcceptedResponse(
        status=PUBLIC_REGISTRATION_ACCEPTED_STATUS,
        message=PUBLIC_REGISTRATION_ACCEPTED_MESSAGE,
    )

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
