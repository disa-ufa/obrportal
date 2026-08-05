from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_SHELL_PATH = ROOT / "frontend/src/components/layout/PublicShell.jsx"
APP_PATH = ROOT / "frontend/src/App.jsx"


def require_contains(text: str, fragments: list[str], label: str) -> None:
    missing = [fragment for fragment in fragments if fragment not in text]

    if missing:
        print(f"{label} is missing required fragments:")

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)


def require_not_contains(text: str, fragments: list[str], label: str) -> None:
    forbidden = [fragment for fragment in fragments if fragment in text]

    if forbidden:
        print(f"{label} contains forbidden legacy fragments:")

        for fragment in forbidden:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    public_shell = PUBLIC_SHELL_PATH.read_text(encoding="utf-8")
    app = APP_PATH.read_text(encoding="utf-8")

    require_contains(
        public_shell,
        [
            "initializingAuth,",
            'data-testid="public-header-auth-actions"',
            'data-testid="public-header-auth-loading"',
            'data-testid="public-header-cabinet-button"',
            'data-testid="public-header-register-button"',
            'data-testid="public-header-login-button"',
            "{initializingAuth ? (",
            ") : user ? (",
            "{publicRegistrationEnabled && (",
            'onClick={() => onPageChange("register")}',
            'onClick={() => onPageChange("login")}',
            "onClick={() => onPageChange(cabinetTarget.page)}",
            'aria-label="Регистрация"',
            'aria-label="Войти"',
            "aria-label={cabinetTarget.label}",
            '{ page: "dashboard", label: "Панель администратора" }',
            '{ page: "organization", label: "Кабинет организации" }',
            '{ page: "account", label: "Личный кабинет" }',
        ],
        "PublicShell",
    )

    require_not_contains(
        public_shell,
        [
            "LockKeyhole",
            "page: user",
            '? "register"\n              : "login"',
        ],
        "PublicShell",
    )

    require_contains(
        app,
        [
            "<PublicShell",
            "user={user}",
            "isAdmin={isAdmin}",
            "initializingAuth={initializingAuth}",
            "publicRegistrationEnabled={publicRegistrationEnabled}",
        ],
        "App",
    )

    loading_position = public_shell.index(
        'data-testid="public-header-auth-loading"'
    )
    cabinet_position = public_shell.index(
        'data-testid="public-header-cabinet-button"'
    )
    register_position = public_shell.index(
        'data-testid="public-header-register-button"'
    )
    login_position = public_shell.index(
        'data-testid="public-header-login-button"'
    )

    if not (
        loading_position
        < cabinet_position
        < register_position
        < login_position
    ):
        print("Public header authentication branches are in an unexpected order.")
        raise SystemExit(1)

    guest_branch_position = public_shell.index(
        ") : (",
        cabinet_position,
    )
    registration_condition_position = public_shell.index(
        "{publicRegistrationEnabled && (",
        guest_branch_position,
    )

    if not (
        guest_branch_position
        < registration_condition_position
        < register_position
        < login_position
    ):
        print(
            "Guest registration/login controls are not located "
            "inside the expected guest branch."
        )
        raise SystemExit(1)

    print("Public header auth states smoke: PASSED")
    print(" - initializing state: skeleton only")
    print(" - authenticated state: cabinet button only")
    print(" - guest state: registration flag + login button")
    print(" - legacy guest cabinet fallback: absent")


if __name__ == "__main__":
    main()
