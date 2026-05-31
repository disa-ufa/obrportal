from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ARCHIVE_PATH = ROOT / "docs" / "stage-33-frontend-fast-path-measurement-archive.md"
BASELINE_PATH = ROOT / "docs" / "stage-33-admin-users-frontend-fast-path-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"
CLIENT_PATH = ROOT / "frontend" / "src" / "api" / "client.js"
STAGE33_2_CHECK_PATH = ROOT / "scripts" / "check_stage33_admin_ui_fast_path_data_loading.py"

ARCHIVE_MARKERS = [
    "Stage 33.3 frontend fast-path measurement archive - 2026-05-31",
    "stage33_frontend_fast_path_archive=yes",
    "stage33_ci_2111_success=yes",
    "stage33_admin_users_limit_200_archived=yes",
    "stage33_admin_users_filter_mapping_archived=yes",
    "stage33_no_backend_change=yes",
    "stage33_no_main_update=yes",
    "stage33_no_production_redeploy=yes",
]

FAST_PATH_MARKERS = {
    CLIENT_PATH: [
        "export function buildQueryString(filters = {})",
        "export async function getAdminUsers(filters = {})",
        "return request(`/api/v1/admin/users${query}`);",
    ],
    LOADER_PATH: [
        "export const ADMIN_USERS_FAST_PATH_LIMIT = 200;",
        "export function buildAdminUsersFastPathFilters(usersFilters = {}, roles = [])",
        "filters.q = searchQuery;",
        "filters.is_active = true;",
        "filters.is_active = false;",
        "filters.role = roleCode;",
        "const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));",
    ],
    USERS_PAGE_PATH: [
        "function refreshUsersFastPath(filters = currentUserFastPathFilters)",
        "onRefreshAdminData({ usersFilters: filters });",
        "refreshUsersFastPath(nextFilters);",
        "onRefresh={() => refreshUsersFastPath()}",
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
        USERS_PAGE_PATH,
        CLIENT_PATH,
        STAGE33_2_CHECK_PATH,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(ARCHIVE_PATH), ARCHIVE_MARKERS, "stage33 archive")
    require_markers(read_text(BASELINE_PATH), ARCHIVE_MARKERS[:4], "stage33 baseline archive section")

    for path, markers in FAST_PATH_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 33 frontend fast-path measurement/archive diagnostics passed: "
        "archive=yes, "
        "ci_2111_success=yes, "
        "limit_200_archived=yes, "
        "filter_mapping_archived=yes, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
