from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=255)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=5, max_length=32)


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
