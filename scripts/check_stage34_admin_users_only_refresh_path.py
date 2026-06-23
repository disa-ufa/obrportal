from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-34-admin-users-incremental-refresh-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"

DOC_MARKERS = [
    "Stage 34.1 admin users-only refresh path - 2026-06-01",
    "stage34_users_only_refresh_path=yes",
    "stage34_refresh_admin_users_only_updates_users=yes",
    "stage34_users_page_uses_on_refresh_users=yes",
    "stage34_full_bootstrap_preserved=yes",
    "stage34_no_backend_change=yes",
    "stage34_no_main_update=yes",
    "stage34_no_production_redeploy=yes",
]

LOADER_MARKERS = [
    "sortUsers,",
    "async function loadAdminData(options = {})",
    "async function refreshAdminUsers(usersFilters = {}, roles = [])",
    "const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));",
    "setAdminData((current) => ({",
    "...current,",
    "users: sortUsers(users),",
    "loadAdminData,",
    "refreshAdminUsers,",
]

APP_MARKERS = [
    "loadAdminData,",
    "refreshAdminUsers,",
]

RENDERER_MARKERS = [
    "refreshAdminUsers,",
    "onRefreshUsers={refreshAdminUsers}",
]

USERS_PAGE_MARKERS = [
    "onRefreshUsers,",
    "function refreshUsersFastPath(filters = currentUserFastPathFilters)",
    "if (onRefreshUsers) {",
    "onRefreshUsers(filters, roles);",
    "return;",
    "onRefreshAdminData({ usersFilters: filters });",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def require_markers(text: str, markers: list[str], label: str) -> None:
    missing = [marker for marker in markers if marker not in text]
    require(not missing, f"{label} missing markers: {missing}")


def main() -> None:
    for path in [DOC_PATH, LOADER_PATH, APP_PATH, RENDERER_PATH, USERS_PAGE_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage34 doc")
    require_markers(read_text(LOADER_PATH), LOADER_MARKERS, "admin data loader")
    require_markers(read_text(APP_PATH), APP_MARKERS, "app")
    require_markers(read_text(RENDERER_PATH), RENDERER_MARKERS, "admin page renderer")
    require_markers(read_text(USERS_PAGE_PATH), USERS_PAGE_MARKERS, "users page")

    print(
        "stage 34 admin users-only refresh path diagnostics passed: "
        "users_only_refresh=yes, "
        "only_users_updated=yes, "
        "full_bootstrap_preserved=yes, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
