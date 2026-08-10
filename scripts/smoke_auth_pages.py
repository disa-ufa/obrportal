from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
    text = read_text(relative_path)
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{relative_path} is missing required fragments:")
        for fragment in missing:
            print(f" - {fragment}")
        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            'const ACCESS_TOKEN_STORAGE_KEY = "obrportal_access_token";',
            "export function getStoredToken()",
            "sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)",
            "localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)",
            "export function storeToken(token, { persist = false } = {})",
            "if (persist)",
            "localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)",
            "sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)",
            "export function clearToken()",
            "sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)",
            "localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)",
            "async function request(path, options = {})",
            'Authorization": `Bearer ${token}`',
            "export async function login(",
            "{ persist = false } = {}",
            'const data = await request("/api/v1/auth/login",',
            "storeToken(data.access_token, { persist });",
            "export async function registerUser(payload)",
            'return request("/api/v1/auth/register",',
            "export async function getCurrentUser()",
            'return request("/api/v1/auth/me");',
        ],
    )

    require_contains(
        "frontend/src/pages/AuthPage.jsx",
        [
            'import { useEffect, useState } from "react";',
            'import { Link } from "react-router-dom";',
            'import { getPublicCourseDetail } from "../api/client";',
            'import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";',
            'import { AuthCard } from "../components/auth/AuthCard";',
            'import { AuthLayout } from "../components/auth/AuthLayout";',
            'import { AuthPanel } from "../components/auth/AuthPanel";',
            'import { AuthSecurityNotice } from "../components/auth/AuthSecurityNotice";',
            'import { AuthSteps } from "../components/auth/AuthSteps";',
            'import { Alert } from "../components/ui/Alert";',
            'const PENDING_ENROLLMENT_STORAGE_KEY =',
            '"obrportal_pending_enrollment_slug";',
            "function getPendingEnrollmentSlug()",
            "function formatCourseDocument(course)",
            "export function AuthPage",
            "const [pendingCourse, setPendingCourse] = useState(null);",
            "const [pendingCourseLoading, setPendingCourseLoading] =",
            'const [pendingCourseError, setPendingCourseError] = useState("");',
            "async function loadPendingCourse()",
            "getPublicCourseDetail(pendingSlug)",
            "setPendingCourse(course);",
            "setPendingCourseError(",
            "<AuthLayout",
            "<AuthBrandPanel",
            "<AuthSteps",
            "<AuthCard",
            "<AuthPanel",
            "email={email}",
            "password={password}",
            "loading={loading}",
            "onEmailChange={onEmailChange}",
            "onPasswordChange={onPasswordChange}",
            "onLogin={onLogin}",
            'to="/forgot-password"',
            'onPageChange("register")',
            "publicRegistrationLoading",
            "publicRegistrationEnabled",
        ],
    )

    require_contains(
        "frontend/src/components/auth/AuthPanel.jsx",
        [
            'import { useState } from "react";',
            'import { Lock, Mail } from "lucide-react";',
            'import { AuthField } from "./AuthField";',
            'import { PasswordField } from "./PasswordField";',
            "export function AuthPanel",
            'const [rememberMe, setRememberMe] = useState(false);',
            'onSubmit={(event) => onLogin(event, rememberMe)}',
            'id="login-email"',
            'type="email"',
            'autoComplete="username"',
            'id="login-password"',
            'autoComplete="current-password"',
            'icon={Mail}',
            'icon={Lock}',
            'id="login-remember-me"',
            'checked={rememberMe}',
            'setRememberMe(event.target.checked)',
            'Запомнить меня',
            'aria-busy={loading}',
            '{loading ? "Входим..." : "Войти"}',
        ],
    )

    require_contains(
        "frontend/src/pages/RegisterPage.jsx",
        [
            'import { useEffect, useState } from "react";',
            'import { Link } from "react-router-dom";',
            'import { getPublicCourseDetail } from "../api/client";',
            'import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";',
            'import { AuthCard } from "../components/auth/AuthCard";',
            'import { AuthField } from "../components/auth/AuthField";',
            'import { AuthLayout } from "../components/auth/AuthLayout";',
            'import { AuthSecurityNotice } from "../components/auth/AuthSecurityNotice";',
            'import { AuthSteps } from "../components/auth/AuthSteps";',
            'import { Alert } from "../components/ui/Alert";',
            'const PENDING_ENROLLMENT_STORAGE_KEY =',
            '"obrportal_pending_enrollment_slug";',
            'const DEFAULT_ACCEPTED_MESSAGE =',
            'function getPendingEnrollmentSlug()',
            'function formatCourseDocument(course)',
            'export function RegisterPage',
            'const [lastName, setLastName] = useState("");',
            'const [firstName, setFirstName] = useState("");',
            'const [middleName, setMiddleName] = useState("");',
            'const [email, setEmail] = useState("");',
            'const [phone, setPhone] = useState("");',
            'const [personalDataConsent, setPersonalDataConsent] = useState(false);',
            'const [termsAccepted, setTermsAccepted] = useState(false);',
            'const [localError, setLocalError] = useState("");',
            'const [acceptedMessage, setAcceptedMessage] = useState("");',
            'const [submittedEmail, setSubmittedEmail] = useState("");',
            'const [pendingCourse, setPendingCourse] = useState(null);',
            'const [pendingCourseLoading, setPendingCourseLoading] =',
            'const [pendingCourseError, setPendingCourseError] = useState("");',
            'async function loadPendingCourse()',
            'getPublicCourseDetail(pendingSlug)',
            'async function handleSubmit(event)',
            'event.preventDefault();',
            'if (!personalDataConsent)',
            'if (!termsAccepted)',
            'const response = await onRegister({',
            'last_name: lastName.trim(),',
            'first_name: firstName.trim(),',
            'middle_name: middleName.trim() || null,',
            'email: email.trim(),',
            'phone: phone.trim() || null,',
            'personal_data_consent: true,',
            'terms_accepted: true,',
            'setSubmittedEmail(email.trim());',
            'setAcceptedMessage(',
            '<AuthLayout',
            '<AuthBrandPanel',
            '<AuthSteps',
            '<AuthCard',
            '<AuthField',
            '<AuthSecurityNotice',
            '<Alert title="Заявка принята" tone="green">',
            'Проверьте почту',
            'id="register-personal-data-consent"',
            'htmlFor="register-personal-data-consent"',
            'to="/privacy"',
            'target="_blank"',
            'rel="noreferrer"',
            'Политика обработки персональных данных',
            'id="register-terms-accepted"',
            'htmlFor="register-terms-accepted"',
            'to="/offer"',
            'Условия использования портала',
            'onPageChange("login")',
        ]
    )

    require_contains(
        "frontend/src/hooks/useAuthFlow.js",
        [
            'import { useNavigate } from "react-router-dom";',
            'checkAdminRbac,',
            'clearToken,',
            'getCurrentUser,',
            'getStoredToken,',
            'login,',
            'registerUser,',
            'function getPostAuthPublicPage(user)',
            'function getPostAuthPublicPath(user)',
            'if (userHasRole(user, "org_rep"))',
            'return "organization";',
            'userHasRole(user, "ministry_admin") ? "ministry" : "account"',
            'return "/organization";',
            'userHasRole(user, "ministry_admin") ? "/ministry" : "/account"',
            'export function useAuthFlow',
            'completePendingEnrollmentIfNeeded,',
            'const navigate = useNavigate();',
            'async function bootstrapAuthState()',
            'const token = getStoredToken();',
            'clearToken();',
            'async function handleRegister(payload)',
            'setAuthLoading(true);',
            'setError("");',
            'return await registerUser(payload);',
            'setError(formatApiError(err, "Не удалось отправить заявку на регистрацию."));',
            'throw err;',
            'setAuthLoading(false);',
            'async function handleLogin(event, rememberMe = false)',
            'event.preventDefault();',
            'await login(email, password, { persist: rememberMe });',
            'const currentUser = await getCurrentUser();',
            'await completePendingEnrollmentIfNeeded();',
            'navigate(getPostAuthPublicPath(currentUser), { replace: true });',
            'async function handleRbacCheck()',
            'const data = await checkAdminRbac();',
            'function handleLogout()',
            'return {',
            'bootstrapAuthState,',
            'handleRegister,',
            'handleLogin,',
            'handleRbacCheck,',
            'handleLogout,',
        ]
    )

    require_contains(
        "frontend/src/hooks/usePendingEnrollment.js",
        [
            'localStorage.getItem("obrportal_pending_enrollment_slug")',
            'localStorage.removeItem("obrportal_pending_enrollment_slug")',
            "completePendingEnrollmentIfNeeded",
        ],
    )

    require_contains(
        "frontend/src/routes/PublicRoutes.jsx",
        [
            "const AuthPage = lazyNamed(() => import(\"../pages/AuthPage\"), \"AuthPage\");",
            "const RegisterPage = lazyNamed(() => import(\"../pages/RegisterPage\"), \"RegisterPage\");",
            "handleLogin,",
            "handleLogout,",
            "handleRegister,",
            'path="/login"',
            "<AuthPage",
            "onLogin={handleLogin}",
            "onLogout={handleLogout}",
            'path="/register"',
            "<RegisterPage",
            "onRegister={handleRegister}",
            'path="/account"',
            '<Navigate to="/login" replace />',
        ],
    )

    require_contains(
        "frontend/src/utils/publicRoutes.js",
        [
            'login: "/login"',
            'register: "/register"',
            'if (pathname === "/login") return "login";',
            'if (pathname === "/register") return "register";',
            'if (pathname === "/login")',
            'if (pathname === "/register")',
        ],
    )

    require_contains(
        'frontend/src/hooks/usePublicRegistrationStatus.js',
        [
            'import { useCallback, useEffect, useState } from "react";',
            'import { getPublicRegistrationStatus } from "../api/client";',
            'export function usePublicRegistrationStatus()',
            'const [publicRegistrationEnabled, setPublicRegistrationEnabled] =',
            'const [publicRegistrationLoading, setPublicRegistrationLoading] =',
            'const loadPublicRegistrationStatus = useCallback(async () => {',
            'const response = await getPublicRegistrationStatus();',
            'setPublicRegistrationEnabled(response?.enabled === true);',
            'setPublicRegistrationEnabled(false);',
            'setPublicRegistrationLoading(false);',
            'void loadPublicRegistrationStatus();',
            'publicRegistrationEnabled,',
            'publicRegistrationLoading,',
        ],
    )

    require_contains(
        'frontend/src/pages/ForgotPasswordPage.jsx',
        [
            'import { useState } from "react";',
            'import { Link } from "react-router-dom";',
            'import { requestPasswordReset } from "../api/client";',
            'import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";',
            'import { AuthCard } from "../components/auth/AuthCard";',
            'import { AuthField } from "../components/auth/AuthField";',
            'import { AuthLayout } from "../components/auth/AuthLayout";',
            'import { formatApiError } from "../utils/apiErrors";',
            'export function ForgotPasswordPage({ onPageChange })',
            'const [email, setEmail] = useState("");',
            'async function handleSubmit(event)',
            'const normalizedEmail = email.trim();',
            'await requestPasswordReset(normalizedEmail);',
            'setSuccess(true);',
            'setError(formatApiError(err, TEXT.errorFallback));',
            'to="/login"',
            '<AuthLayout',
            '<AuthBrandPanel',
            '<AuthCard',
            '<AuthField',
            'Система не раскрывает наличие учётной записи.',
            'Одинаковый ответ показывается для существующих и неизвестных адресов.',
        ],
    )

    require_contains(
        'frontend/src/pages/ResetPasswordPage.jsx',
        [
            'import { useMemo, useState } from "react";',
            'import { Link, useSearchParams } from "react-router-dom";',
            'import { resetPasswordWithToken } from "../api/client";',
            'import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";',
            'import { AuthCard } from "../components/auth/AuthCard";',
            'import { AuthLayout } from "../components/auth/AuthLayout";',
            'import { PasswordField } from "../components/auth/PasswordField";',
            'import { formatApiError } from "../utils/apiErrors";',
            'function getPasswordValidationError(password, passwordConfirmation)',
            'export function ResetPasswordPage({ onPageChange })',
            'const [searchParams] = useSearchParams();',
            '() => searchParams.get("token")?.trim() || "",',
            'const [password, setPassword] = useState("");',
            'const [passwordConfirmation, setPasswordConfirmation] = useState(',
            'const hasToken = Boolean(token);',
            'const validationError = getPasswordValidationError(',
            'await resetPasswordWithToken(token, password);',
            'setPasswordConfirmation(',
            'to="/forgot-password"',
            'disabled={loading || !hasToken}',
            '<AuthLayout',
            '<AuthBrandPanel',
            '<AuthCard',
            '<PasswordField',
        ],
    )

    require_contains(
        'frontend/src/pages/SetPasswordPage.jsx',
        [
            'import { setPasswordWithToken } from "../api/client";',
            'import { AuthBrandPanel } from "../components/auth/AuthBrandPanel";',
            'import { AuthCard } from "../components/auth/AuthCard";',
            'import { AuthLayout } from "../components/auth/AuthLayout";',
            'import { PasswordField } from "../components/auth/PasswordField";',
            'function getPasswordValidationError(password, passwordConfirmation)',
            'export function SetPasswordPage({ onPageChange })',
            'const [successPayload, setSuccessPayload] = useState(null);',
            'await setPasswordWithToken(token, password);',
            'disabled={loading || !hasToken}',
            '<AuthLayout',
            '<AuthBrandPanel',
            '<AuthCard',
            '<PasswordField',
        ],
    )

    require_contains(
        "backend/app/api/v1/auth.py",
        [
            "OAuth2PasswordBearer",
            'oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")',
            "async def get_user_by_email(",
            "async def get_current_user(",
            "async def build_current_user_response(",
            '    "/register",',
            "response_model=PublicRegistrationAcceptedResponse",
            "status_code=status.HTTP_202_ACCEPTED",
            "async def register(",
            "payload: PublicRegistrationRequest",
            "PUBLIC_REGISTRATION_ACCEPTED_STATUS",
            "PUBLIC_REGISTRATION_ACCEPTED_MESSAGE",
            '@router.post("/login", response_model=TokenResponse)',
            "async def login(",
            "LoginRequest",
            "verify_password(",
            "login_success",
            '@router.get("/me", response_model=CurrentUserResponse)',
            "async def me(",
        ],
    )

    require_contains(
        "backend/app/schemas/auth.py",
        [
            'class LoginRequest(BaseModel):',
            'email: str = Field(min_length=3, max_length=255)',
            'password: str = Field(min_length=1)',
            'class PublicRegistrationRequest(BaseModel):',
            'model_config = ConfigDict(extra="forbid")',
            'last_name: str = Field(min_length=1, max_length=128)',
            'first_name: str = Field(min_length=1, max_length=128)',
            'middle_name: str | None = Field(',
            'email: str = Field(min_length=3, max_length=320)',
            'phone: str | None = Field(',
            'personal_data_consent: Literal[True]',
            'terms_accepted: Literal[True]',
            'class PublicRegistrationAcceptedResponse(BaseModel):',
            'status: Literal["accepted"]',
            'message: str = Field(min_length=1, max_length=512)',
            'class TokenResponse(BaseModel):',
            'access_token: str',
            'token_type: str = "bearer"',
            'class CurrentUserRole(BaseModel):',
            'class CurrentUserResponse(BaseModel):',
            'roles: list[CurrentUserRole]',
        ]
    )

    print("Auth/register page behavior smoke passed")


if __name__ == "__main__":
    main()
