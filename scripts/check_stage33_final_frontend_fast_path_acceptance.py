from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FINAL_DOC_PATH = ROOT / "docs" / "stage-33-final-frontend-fast-path-acceptance.md"
BASELINE_PATH = ROOT / "docs" / "stage-33-admin-users-frontend-fast-path-baseline.md"
ARCHIVE_PATH = ROOT / "docs" / "stage-33-frontend-fast-path-measurement-archive.md"

CLIENT_PATH = ROOT / "frontend" / "src" / "api" / "client.js"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"

REQUIRED_CHECKS = [
    ROOT / "scripts" / "check_stage33_frontend_fast_path_measurement_archive.py",
    ROOT / "scripts" / "check_stage33_admin_ui_fast_path_data_loading.py",
    ROOT / "scripts" / "check_stage33_frontend_api_query_builder.py",
    ROOT / "scripts" / "check_stage33_admin_users_frontend_fast_path_baseline.py",
]

FINAL_MARKERS = [
    "Stage 33 final frontend fast-path acceptance - 2026-06-01",
    "stage33_final_acceptance=yes",
    "stage33_frontend_admin_users_fast_path_accepted=yes",
    "stage33_ci_2112_success_recorded=yes",
    "stage33_admin_users_limit_200_accepted=yes",
    "stage33_admin_users_filter_mapping_accepted=yes",
    "stage33_develop_acceptance_only=yes",
    "stage33_no_main_update=yes",
    "stage33_no_production_redeploy=yes",
]

BASELINE_FINAL_MARKERS = [
    "Stage 33 final frontend fast-path acceptance - 2026-06-01",
    "stage33_final_acceptance=yes",
    "stage33_frontend_admin_users_fast_path_accepted=yes",
    "stage33_ci_2112_success_recorded=yes",
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
        "export function getAdminUsersRoleCode(roles = [], roleId = \"\")",
        "export function buildAdminUsersFastPathFilters(usersFilters = {}, roles = [])",
        "async function loadAdminData(options = {})",
        "const { usersFilters = {} } = options || {};",
        "const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));",
    ],
    USERS_PAGE_PATH: [
        "const currentUserFastPathFilters = useMemo(",
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
        FINAL_DOC_PATH,
        BASELINE_PATH,
        ARCHIVE_PATH,
        CLIENT_PATH,
        LOADER_PATH,
        USERS_PAGE_PATH,
        *REQUIRED_CHECKS,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(FINAL_DOC_PATH), FINAL_MARKERS, "stage33 final acceptance doc")
    require_markers(read_text(BASELINE_PATH), BASELINE_FINAL_MARKERS, "stage33 baseline final section")

    archive_text = read_text(ARCHIVE_PATH)
    require("stage33_frontend_fast_path_archive=yes" in archive_text, "stage33 archive marker missing")
    require("stage33_ci_2111_success=yes" in archive_text, "stage33 archive CI marker missing")

    for path, markers in FAST_PATH_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 33 final frontend fast-path acceptance diagnostics passed: "
        "final_acceptance=yes, "
        "frontend_fast_path_accepted=yes, "
        "ci_2112_recorded=yes, "
        "limit_200_accepted=yes, "
        "filter_mapping_accepted=yes, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
