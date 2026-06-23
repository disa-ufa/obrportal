from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-35-admin-organizations-incremental-refresh-baseline.md"
STAGE34_FINAL_CHECK_PATH = ROOT / "scripts" / "check_stage34_final_admin_users_incremental_refresh_acceptance.py"
STAGE34_USERS_REFRESH_CHECK_PATH = ROOT / "scripts" / "check_stage34_admin_users_only_refresh_path.py"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
ORGANIZATIONS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "OrganizationsPage.jsx"

DOC_MARKERS = [
    "Stage 35 admin organizations incremental refresh baseline - 2026-06-01",
    "stage35_admin_organizations_incremental_refresh_baseline=yes",
    "stage35_current_global_reload_identified=yes",
    "stage35_organizations_only_refresh_planned=yes",
    "stage35_stage34_users_only_refresh_dependency_confirmed=yes",
    "stage35_no_runtime_change=yes",
    "stage35_no_backend_change=yes",
    "stage35_no_main_update=yes",
    "stage35_no_production_redeploy=yes",
]

CURRENT_GLOBAL_RELOAD_MARKERS = {
    LOADER_PATH: [
        "async function loadAdminData(options = {})",
        "await Promise.all([",
        "getAdminOrganizations()",
        "getOrgLearningGroups()",
        "getAdminRoles()",
        "getAdminPermissions()",
        "getAdminAuditEvents()",
        "getAdminDashboardSummary()",
        "const users = await getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles));",
        "async function refreshAdminUsers(usersFilters = {}, roles = [])",
        "refreshAdminUsers,",
    ],
    RENDERER_PATH: [
        "<OrganizationsPage",
        "organizations={adminData.organizations}",
        "onRefreshAdminData={loadAdminData}",
    ],
    ORGANIZATIONS_PAGE_PATH: [
        "export function OrganizationsPage({",
        "onRefreshAdminData,",
        "function buildOrganizationFilters(overrides = {})",
        "function navigateToOrganizationFilters(filters, options = { replace: true })",
        "function handleSearchChange(value)",
        "function handleScopeChange(value)",
        "function resetFilters()",
        "onRefreshAdminData,",
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
        STAGE34_FINAL_CHECK_PATH,
        STAGE34_USERS_REFRESH_CHECK_PATH,
        LOADER_PATH,
        RENDERER_PATH,
        ORGANIZATIONS_PAGE_PATH,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage35 baseline doc")

    for path, markers in CURRENT_GLOBAL_RELOAD_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 35 admin organizations incremental refresh baseline diagnostics passed: "
        "baseline=yes, "
        "current_global_reload_identified=yes, "
        "organizations_only_refresh_planned=yes, "
        "stage34_users_only_refresh_dependency_confirmed=yes, "
        "runtime_changed=no, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
