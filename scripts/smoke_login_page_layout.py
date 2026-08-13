from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

AUTH_PAGE_PATH = ROOT / "frontend/src/pages/AuthPage.jsx"
AUTH_PANEL_PATH = ROOT / "frontend/src/components/auth/AuthPanel.jsx"
AUTH_FIELD_PATH = ROOT / "frontend/src/components/auth/AuthField.jsx"
PASSWORD_FIELD_PATH = ROOT / "frontend/src/components/auth/PasswordField.jsx"
CLIENT_PATH = ROOT / "frontend/src/api/client.js"
AUTH_FLOW_PATH = ROOT / "frontend/src/hooks/useAuthFlow.js"


def require_fragments(
    path: Path,
    fragments: list[str],
) -> str:
    if not path.exists():
        raise SystemExit(f"File not found: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")

    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if missing:
        print(f"{path.relative_to(ROOT)} is missing fragments:")

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)

    return text


def reject_fragments(
    path: Path,
    text: str,
    fragments: list[str],
) -> None:
    present = [
        fragment
        for fragment in fragments
        if fragment in text
    ]

    if present:
        print(
            f"{path.relative_to(ROOT)} contains legacy fragments:"
        )

        for fragment in present:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    auth_page = require_fragments(
        AUTH_PAGE_PATH,
        [
            'import { AuthLayout }',
            'import { AuthBrandPanel }',
            'import { AuthCard }',
            'import { AuthSteps }',
            'title="Образовательный портал РЦДО"',
            'title="Вход в ОбрПортал"',
            'to="/forgot-password"',
            'onPageChange("register")',
            "publicRegistrationLoading",
            "publicRegistrationEnabled",
            "pendingCourseLoading",
            "pendingCourseError",
            "<AuthPanel",
        ],
    )

    reject_fragments(
        AUTH_PAGE_PATH,
        auth_page,
        [
            'import { SectionCard }',
            'title="Что будет дальше"',
            "Активная сессия:",
            "Безопасное соединение",
            "Самостоятельная регистрация временно недоступна",
            "Один вход для слушателей, представителей организаций и администраторов.",
            "Обучение и документы — в одном кабинете",
        ],
    )

    auth_panel = require_fragments(
        AUTH_PANEL_PATH,
        [
            'import { useState } from "react";',
            'import { Lock, Mail } from "lucide-react";',
            'import { AuthField } from "./AuthField";',
            'import { PasswordField } from "./PasswordField";',
            'autoComplete="username"',
            'autoComplete="current-password"',
            'icon={Mail}',
            'icon={Lock}',
            'const [rememberMe, setRememberMe] = useState(false);',
            'onSubmit={(event) => onLogin(event, rememberMe)}',
            'id="login-remember-me"',
            'checked={rememberMe}',
            'Запомнить меня',
            'aria-busy={loading}',
            '{loading ? "Входим..." : "Войти"}',
        ],
    )

    reject_fragments(
        AUTH_PANEL_PATH,
        auth_panel,
        [
            "Вход администратора",
            "seed_admin.py",
            "Войти и загрузить admin API",
            "Выйти",
            'import { SectionCard }',
        ],
    )

    require_fragments(
        AUTH_FIELD_PATH,
        [
            "icon: Icon,",
            "{Icon && (",
            'aria-hidden="true"',
            'Icon ? "pl-11 pr-4" : "px-4"',
        ],
    )

    require_fragments(
        PASSWORD_FIELD_PATH,
        [
            "icon: Icon,",
            "{Icon && (",
            'Icon ? "pl-11" : "pl-4"',
            'aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}',
        ],
    )

    require_fragments(
        CLIENT_PATH,
        [
            'const ACCESS_TOKEN_STORAGE_KEY = "obrportal_access_token";',
            "sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)",
            "localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)",
            "export function storeToken(token, { persist = false } = {})",
            "sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)",
            "localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)",
            "sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)",
            "localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)",
            "storeToken(data.access_token, { persist });",
        ],
    )

    require_fragments(
        AUTH_FLOW_PATH,
        [
            "async function handleLogin(event, rememberMe = false)",
            "await login(email, password, { persist: rememberMe });",
        ],
    )

    command = "python scripts/smoke_login_page_layout.py"

    require_fragments(
        ROOT / ".github/workflows/ci.yml",
        [command],
    )

    require_fragments(
        ROOT / "scripts/check_ci_local_gate.py",
        [command],
    )

    print("Login page shared layout smoke: PASSED")
    print(" - shared auth layout and brand panel")
    print(" - reusable accessible login fields with icons")
    print(" - remember-me controls local vs session token persistence")
    print(" - forgot-password link preserved")
    print(" - registration feature flag preserved")
    print(" - pending enrollment flow preserved")
    print(" - redundant login notices removed")
    print(" - legacy admin-only labels removed")


if __name__ == "__main__":
    main()
