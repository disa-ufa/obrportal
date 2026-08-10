from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, EmailStr


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    """Legacy immediate-registration request kept until endpoint cutover."""

    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    phone: str | None = Field(
        default=None,
        min_length=5,
        max_length=32,
    )


class PublicRegistrationRequest(BaseModel):
    """Target request for email-confirmed public registration."""

    model_config = ConfigDict(extra="forbid")

    last_name: str = Field(min_length=1, max_length=128)
    first_name: str = Field(min_length=1, max_length=128)
    middle_name: str | None = Field(
        default=None,
        max_length=128,
    )
    email: str = Field(min_length=3, max_length=320)
    phone: str | None = Field(
        default=None,
        min_length=5,
        max_length=32,
    )
    personal_data_consent: Literal[True]
    terms_accepted: Literal[True]


class PublicRegistrationResendRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class PublicRegistrationAcceptedResponse(BaseModel):
    status: Literal["accepted"]
    message: str = Field(min_length=1, max_length=512)

class PublicRegistrationStatusResponse(BaseModel):
    enabled: bool


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordAcceptedResponse(BaseModel):
    status: Literal["accepted"]
    message: str = Field(min_length=1, max_length=512)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=512)
    password: str = Field(min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    status: Literal["ok"] = "ok"


class SetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=512)
    password: str = Field(min_length=8, max_length=128)


class SetPasswordResponse(BaseModel):
    status: str = "ok"
    user_id: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserRole(BaseModel):
    code: str
    name: str
    organization_id: str | None = None


class CurrentUserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    is_active: bool
    is_email_verified: bool
    mfa_enabled: bool
    roles: list[CurrentUserRole]
