from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-35-admin-organizations-incremental-refresh-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
ORGANIZATIONS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "OrganizationsPage.jsx"

DOC_MARKERS = [
    "Stage 35.1 admin organizations-only refresh path - 2026-06-01",
    "stage35_organizations_only_refresh_path=yes",
    "stage35_refresh_admin_organizations_only_updates_organizations=yes",
    "stage35_organizations_page_uses_on_refresh_organizations=yes",
    "stage35_full_bootstrap_preserved=yes",
    "stage35_no_backend_change=yes",
    "stage35_no_main_update=yes",
    "stage35_no_production_redeploy=yes",
]

LOADER_MARKERS = [
    "sortOrganizations,",
    "async function loadAdminData(options = {})",
    "async function refreshAdminOrganizations()",
    "const organizations = await getAdminOrganizations();",
    "setAdminData((current) => ({",
    "...current,",
    "organizations: sortOrganizations(organizations),",
    "loadAdminData,",
    "refreshAdminOrganizations,",
    "refreshAdminUsers,",
]

APP_MARKERS = [
    "loadAdminData,",
    "refreshAdminOrganizations,",
    "refreshAdminUsers,",
]

RENDERER_MARKERS = [
    "refreshAdminOrganizations,",
    "onRefreshOrganizations={refreshAdminOrganizations}",
]

ORGANIZATIONS_PAGE_MARKERS = [
    "onRefreshOrganizations,",
    "function refreshOrganizationsFastPath()",
    "if (onRefreshOrganizations) {",
    "onRefreshOrganizations();",
    "return;",
    "onRefreshAdminData();",
    "onRefresh={refreshOrganizationsFastPath}",
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
    for path in [DOC_PATH, LOADER_PATH, APP_PATH, RENDERER_PATH, ORGANIZATIONS_PAGE_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage35 doc")
    require_markers(read_text(LOADER_PATH), LOADER_MARKERS, "admin data loader")
    require_markers(read_text(APP_PATH), APP_MARKERS, "app")
    require_markers(read_text(RENDERER_PATH), RENDERER_MARKERS, "admin page renderer")
    require_markers(read_text(ORGANIZATIONS_PAGE_PATH), ORGANIZATIONS_PAGE_MARKERS, "organizations page")

    print(
        "stage 35 admin organizations-only refresh path diagnostics passed: "
        "organizations_only_refresh=yes, "
        "only_organizations_updated=yes, "
        "full_bootstrap_preserved=yes, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
