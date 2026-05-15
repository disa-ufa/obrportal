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
            "export function getStoredToken()",
            'localStorage.getItem("obrportal_access_token")',
            "export function storeToken(token)",
            'localStorage.setItem("obrportal_access_token", token)',
            "export function clearToken()",
            'localStorage.removeItem("obrportal_access_token")',
            "async function request(path, options = {})",
            'Authorization": `Bearer ${token}`',
            "export async function login(email, password)",
            'const data = await request("/api/v1/auth/login",',
            "storeToken(data.access_token);",
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
            'import { getPublicCourseDetail } from "../api/client";',
            'import { AuthPanel } from "../components/auth/AuthPanel";',
            'import { Alert } from "../components/ui/Alert";',
            'import { SectionCard } from "../components/ui/SectionCard";',
            'const PENDING_ENROLLMENT_STORAGE_KEY = "obrportal_pending_enrollment_slug";',
            "function getPendingEnrollmentSlug()",
            "function formatCourseDocument(course)",
            "export function AuthPage",
            "const [pendingCourse, setPendingCourse] = useState(null);",
            "const [pendingCourseLoading, setPendingCourseLoading] = useState(false);",
            "const [pendingCourseError, setPendingCourseError] = useState(\"\");",
            "async function loadPendingCourse()",
            "getPublicCourseDetail(pendingSlug)",
            "setPendingCourse(course);",
            "setPendingCourseError(",
            "<AuthPanel",
            "email={email}",
            "password={password}",
            "loading={loading}",
            "onEmailChange={onEmailChange}",
            "onPasswordChange={onPasswordChange}",
            "onLogin={onLogin}",
            "onLogout={onLogout}",
            "onPageChange(\"register\")",
            "user.email",
        ],
    )

    require_contains(
        "frontend/src/pages/RegisterPage.jsx",
        [
            'import { useEffect, useState } from "react";',
            'import { getPublicCourseDetail } from "../api/client";',
            'import { Alert } from "../components/ui/Alert";',
            'import { SectionCard } from "../components/ui/SectionCard";',
            'const PENDING_ENROLLMENT_STORAGE_KEY = "obrportal_pending_enrollment_slug";',
            "function getPendingEnrollmentSlug()",
            "function formatCourseDocument(course)",
            "export function RegisterPage",
            "const [fullName, setFullName] = useState(\"\");",
            "const [email, setEmail] = useState(\"\");",
            "const [phone, setPhone] = useState(\"\");",
            "const [password, setPassword] = useState(\"\");",
            "const [consent, setConsent] = useState(false);",
            "const [localError, setLocalError] = useState(\"\");",
            "const [pendingCourse, setPendingCourse] = useState(null);",
            "const [pendingCourseLoading, setPendingCourseLoading] = useState(false);",
            "const [pendingCourseError, setPendingCourseError] = useState(\"\");",
            "async function loadPendingCourse()",
            "getPublicCourseDetail(pendingSlug)",
            "async function handleSubmit(event)",
            "event.preventDefault();",
            "if (!consent)",
            "await onRegister({",
            "email,",
            "password,",
            "full_name: fullName.trim() || null,",
            "phone: phone.trim() || null,",
            "onPageChange(\"login\")",
        ],
    )

    require_contains(
        "frontend/src/hooks/useAuthFlow.js",
        [
            'import { useNavigate } from "react-router-dom";',
            "checkAdminRbac,",
            "clearToken,",
            "getCurrentUser,",
            "getStoredToken,",
            "login,",
            "registerUser,",
            "storeToken,",
            "function getPostAuthPublicPage(user)",
            "function getPostAuthPublicPath(user)",
            "userHasRole(user, \"org_rep\") ? \"organization\" : \"account\"",
            "userHasRole(user, \"org_rep\") ? \"/organization\" : \"/account\"",
            "export function useAuthFlow",
            "completePendingEnrollmentIfNeeded,",
            "const navigate = useNavigate();",
            "async function bootstrapAuthState()",
            "const token = getStoredToken();",
            "clearToken();",
            "async function handleRegister(payload)",
            "const tokenResponse = await registerUser(payload);",
            "storeToken(tokenResponse.access_token);",
            "const currentUser = await getCurrentUser();",
            "await completePendingEnrollmentIfNeeded();",
            "navigate(getPostAuthPublicPath(currentUser), { replace: true });",
            "async function handleLogin(event)",
            "event.preventDefault();",
            "await login(email, password);",
            "async function handleRbacCheck()",
            "const data = await checkAdminRbac();",
            "function handleLogout()",
            "return {",
            "bootstrapAuthState,",
            "handleRegister,",
            "handleLogin,",
            "handleRbacCheck,",
            "handleLogout,",
        ],
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
            'import { AuthPage } from "../pages/AuthPage";',
            'import { RegisterPage } from "../pages/RegisterPage";',
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
        "backend/app/api/v1/auth.py",
        [
            "OAuth2PasswordBearer",
            'oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")',
            "async def get_user_by_email(",
            "async def get_current_user(",
            "async def build_current_user_response(",
            '@router.post("/register", response_model=TokenResponse',
            "async def register(",
            "RegisterRequest",
            "create_access_token(",
            "register_success",
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
            "class LoginRequest(BaseModel):",
            "email: str = Field(min_length=3, max_length=255)",
            "password: str = Field(min_length=1)",
            "class RegisterRequest(BaseModel):",
            "password: str = Field(min_length=8, max_length=255)",
            "full_name: str | None = Field(default=None, min_length=1, max_length=255)",
            "phone: str | None = Field(default=None, min_length=5, max_length=32)",
            "class TokenResponse(BaseModel):",
            "access_token: str",
            'token_type: str = "bearer"',
            "class CurrentUserRole(BaseModel):",
            "class CurrentUserResponse(BaseModel):",
            "roles: list[CurrentUserRole]",
        ],
    )

    print("Auth/register page behavior smoke passed")


if __name__ == "__main__":
    main()
