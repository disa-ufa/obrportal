from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ROUTES_PATH = ROOT / "frontend/src/routes/PublicRoutes.jsx"


def get_route_block(
    text: str,
    route_path: str,
    next_route_path: str,
) -> str:
    start_marker = f'path="{route_path}"'
    end_marker = f'path="{next_route_path}"'

    start = text.index(start_marker)
    end = text.index(end_marker, start + len(start_marker))

    return text[start:end]


def require_ordered(
    block: str,
    fragments: list[str],
    label: str,
) -> None:
    cursor = 0

    for fragment in fragments:
        position = block.find(fragment, cursor)

        if position < 0:
            print(f"{label} missing ordered fragment:")
            print(f" - {fragment}")
            raise SystemExit(1)

        cursor = position + len(fragment)


def main() -> None:
    text = ROUTES_PATH.read_text(encoding="utf-8")

    required_global = [
        "const authenticatedEntryPath = isAdmin",
        '? getAdminPathForPage("dashboard")',
        '? "/organization"',
        ': "/account";',
    ]

    for fragment in required_global:
        if fragment not in text:
            print(f"PublicRoutes missing fragment: {fragment}")
            raise SystemExit(1)

    redirect = (
        "<Navigate to={authenticatedEntryPath} replace />"
    )

    if text.count(redirect) != 2:
        print("Expected exactly two authenticated redirects")
        raise SystemExit(1)

    login = get_route_block(
        text,
        "/login",
        "/forgot-password",
    )

    require_ordered(
        login,
        [
            "initializingAuth ? (",
            "<PublicRouteLoadingFallback />",
            ") : user ? (",
            redirect,
            ") : (",
            "<AuthPage",
            "loading={authLoading}",
        ],
        "Login route",
    )

    register = get_route_block(
        text,
        "/register",
        "/set-password",
    )

    require_ordered(
        register,
        [
            "initializingAuth ? (",
            "<PublicRouteLoadingFallback />",
            ") : user ? (",
            redirect,
            ") : publicRegistrationLoading ? (",
            "<PublicRouteLoadingFallback />",
            ") : publicRegistrationEnabled ? (",
            "<RegisterPage",
            "loading={authLoading}",
        ],
        "Register route",
    )

    for label, block in (
        ("Login route", login),
        ("Register route", register),
    ):
        if "loading={authLoading || initializingAuth}" in block:
            print(
                f"{label} still uses legacy loading expression"
            )
            raise SystemExit(1)

    print("Auth entry route guards smoke: PASSED")
    print(" - initializing session renders loading state")
    print(" - authenticated admin redirects to /admin")
    print(" - authenticated org representative redirects to /organization")
    print(" - authenticated learner redirects to /account")
    print(" - guest login and registration pages remain available")


if __name__ == "__main__":
    main()
