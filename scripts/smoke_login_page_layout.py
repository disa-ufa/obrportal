from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

AUTH_PAGE_PATH = ROOT / "frontend/src/pages/AuthPage.jsx"
AUTH_PANEL_PATH = ROOT / "frontend/src/components/auth/AuthPanel.jsx"


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
            'import { AuthSecurityNotice }',
            'import { AuthSteps }',
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
        ],
    )

    auth_panel = require_fragments(
        AUTH_PANEL_PATH,
        [
            'import { AuthField } from "./AuthField";',
            'import { PasswordField } from "./PasswordField";',
            'autoComplete="username"',
            'autoComplete="current-password"',
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
    print(" - reusable accessible login fields")
    print(" - forgot-password link preserved")
    print(" - registration feature flag preserved")
    print(" - pending enrollment flow preserved")
    print(" - legacy admin-only labels removed")


if __name__ == "__main__":
    main()
