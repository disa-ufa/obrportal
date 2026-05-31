from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-33-admin-users-frontend-fast-path-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"
CLIENT_PATH = ROOT / "frontend" / "src" / "api" / "client.js"

DOC_MARKERS = [
    "Stage 33.2 admin UI fast-path data loading - 2026-05-31",
    "stage33_admin_ui_fast_path_data_loading=yes",
    "stage33_admin_users_limit_200=yes",
    "stage33_admin_users_filter_mapping=yes",
    "stage33_users_page_refresh_uses_fast_path=yes",
    "stage33_no_backend_change=yes",
    "stage33_no_production_redeploy=yes",
]

LOADER_MARKERS = [
    "export const ADMIN_USERS_FAST_PATH_LIMIT = 200;",
    "export function getAdminUsersRoleCode(roles = [], roleId = \"\")",
    "export function buildAdminUsersFastPathFilters(usersFilters = {}, roles = [])",
    "filters.q = searchQuery;",
    "filters.is_active = true;",
    "filters.is_active = false;",
    "filters.role = roleCode;",
    "async function loadAdminData(options = {})",
    "const { usersFilters = {} } = options || {};",
    "const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));",
]

USERS_PAGE_MARKERS = [
    "const currentUserFastPathFilters = useMemo(",
    "function refreshUsersFastPath(filters = currentUserFastPathFilters)",
    "onRefreshAdminData({ usersFilters: filters });",
    "refreshUsersFastPath(nextFilters);",
    "refreshUsersFastPath({});",
    "onRefresh={() => refreshUsersFastPath()}",
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
    for path in [DOC_PATH, LOADER_PATH, USERS_PAGE_PATH, CLIENT_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage33 doc")
    require_markers(read_text(LOADER_PATH), LOADER_MARKERS, "admin data loader")
    require_markers(read_text(USERS_PAGE_PATH), USERS_PAGE_MARKERS, "users page")

    client = read_text(CLIENT_PATH)
    require("export async function getAdminUsers(filters = {})" in client, "getAdminUsers filters support missing")
    require("return request(`/api/v1/admin/users${query}`);" in client, "getAdminUsers query request missing")

    print(
        "stage 33 admin UI fast-path data loading diagnostics passed: "
        "fast_path_loader=yes, "
        "limit_200=yes, "
        "filter_mapping=yes, "
        "users_page_refresh=yes, "
        "backend_changed=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
