from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-34-admin-users-incremental-refresh-baseline.md"
STAGE33_FINAL_CHECK_PATH = ROOT / "scripts" / "check_stage33_final_frontend_fast_path_acceptance.py"
STAGE33_FAST_PATH_CHECK_PATH = ROOT / "scripts" / "check_stage33_admin_ui_fast_path_data_loading.py"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"

DOC_MARKERS = [
    "Stage 34 admin users incremental refresh baseline - 2026-06-01",
    "stage34_admin_users_incremental_refresh_baseline=yes",
    "stage34_current_global_reload_identified=yes",
    "stage34_users_only_refresh_planned=yes",
    "stage34_stage33_fast_path_dependency_confirmed=yes",
    "stage34_no_runtime_change=yes",
    "stage34_no_backend_change=yes",
    "stage34_no_main_update=yes",
    "stage34_no_production_redeploy=yes",
]

CURRENT_GLOBAL_RELOAD_MARKERS = {
    LOADER_PATH: [
        "async function loadAdminData(options = {})",
        "const { usersFilters = {} } = options || {};",
        "await Promise.all([",
        "getAdminOrganizations()",
        "getOrgLearningGroups()",
        "getAdminRoles()",
        "getAdminPermissions()",
        "getAdminAuditEvents()",
        "getAdminDashboardSummary()",
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
        DOC_PATH,
        STAGE33_FINAL_CHECK_PATH,
        STAGE33_FAST_PATH_CHECK_PATH,
        LOADER_PATH,
        USERS_PAGE_PATH,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage34 baseline doc")

    for path, markers in CURRENT_GLOBAL_RELOAD_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 34 admin users incremental refresh baseline diagnostics passed: "
        "baseline=yes, "
        "current_global_reload_identified=yes, "
        "users_only_refresh_planned=yes, "
        "stage33_fast_path_dependency_confirmed=yes, "
        "runtime_changed=no, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
