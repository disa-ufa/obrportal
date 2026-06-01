from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ARCHIVE_PATH = ROOT / "docs" / "stage-34-users-only-refresh-archive.md"
BASELINE_PATH = ROOT / "docs" / "stage-34-admin-users-incremental-refresh-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"
STAGE34_1_CHECK_PATH = ROOT / "scripts" / "check_stage34_admin_users_only_refresh_path.py"

ARCHIVE_MARKERS = [
    "Stage 34.2 users-only refresh archive - 2026-06-01",
    "stage34_users_only_refresh_archive=yes",
    "stage34_ci_2115_success=yes",
    "stage34_users_only_refresh_accepted=yes",
    "stage34_full_bootstrap_preserved_archived=yes",
    "stage34_unrelated_admin_datasets_preserved=yes",
    "stage34_no_runtime_change=yes",
    "stage34_no_backend_change=yes",
    "stage34_no_main_update=yes",
    "stage34_no_production_redeploy=yes",
]

BASELINE_ARCHIVE_MARKERS = [
    "Stage 34.2 users-only refresh archive - 2026-06-01",
    "stage34_users_only_refresh_archive=yes",
    "stage34_ci_2115_success=yes",
    "stage34_users_only_refresh_accepted=yes",
    "stage34_no_runtime_change=yes",
    "stage34_no_backend_change=yes",
    "stage34_no_main_update=yes",
    "stage34_no_production_redeploy=yes",
]

FAST_PATH_MARKERS = {
    LOADER_PATH: [
        "async function loadAdminData(options = {})",
        "async function refreshAdminUsers(usersFilters = {}, roles = [])",
        "const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));",
        "setAdminData((current) => ({",
        "...current,",
        "users: sortUsers(users),",
        "loadAdminData,",
        "refreshAdminUsers,",
    ],
    APP_PATH: [
        "loadAdminData,",
        "refreshAdminUsers,",
    ],
    RENDERER_PATH: [
        "refreshAdminUsers,",
        "onRefreshUsers={refreshAdminUsers}",
    ],
    USERS_PAGE_PATH: [
        "onRefreshUsers,",
        "if (onRefreshUsers) {",
        "onRefreshUsers(filters, roles);",
        "onRefreshAdminData({ usersFilters: filters });",
    ],
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def require_markers(text: str, markers: list[str], label: str) -> None:
    missing = [marker for marker in markers if marker not in text]
    require(not missing, f"{label} missing markers: {missing}")


def main() -> None:
    required_paths = [
        ARCHIVE_PATH,
        BASELINE_PATH,
        LOADER_PATH,
        APP_PATH,
        RENDERER_PATH,
        USERS_PAGE_PATH,
        STAGE34_1_CHECK_PATH,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(ARCHIVE_PATH), ARCHIVE_MARKERS, "stage34 archive")
    require_markers(read_text(BASELINE_PATH), BASELINE_ARCHIVE_MARKERS, "stage34 baseline archive section")

    for path, markers in FAST_PATH_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 34 users-only refresh archive diagnostics passed: "
        "archive=yes, "
        "ci_2115_success=yes, "
        "users_only_refresh_accepted=yes, "
        "full_bootstrap_preserved=yes, "
        "unrelated_admin_datasets_preserved=yes, "
        "runtime_changed=no, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
