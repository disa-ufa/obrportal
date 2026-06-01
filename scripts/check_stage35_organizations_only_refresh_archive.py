from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ARCHIVE_PATH = ROOT / "docs" / "stage-35-organizations-only-refresh-archive.md"
BASELINE_PATH = ROOT / "docs" / "stage-35-admin-organizations-incremental-refresh-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
ORGANIZATIONS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "OrganizationsPage.jsx"
STAGE35_1_CHECK_PATH = ROOT / "scripts" / "check_stage35_admin_organizations_only_refresh_path.py"

ARCHIVE_MARKERS = [
    "Stage 35.2 organizations-only refresh archive - 2026-06-01",
    "stage35_organizations_only_refresh_archive=yes",
    "stage35_ci_2119_success=yes",
    "stage35_organizations_only_refresh_accepted=yes",
    "stage35_full_bootstrap_preserved_archived=yes",
    "stage35_unrelated_admin_datasets_preserved=yes",
    "stage35_no_runtime_change=yes",
    "stage35_no_backend_change=yes",
    "stage35_no_main_update=yes",
    "stage35_no_production_redeploy=yes",
]

BASELINE_ARCHIVE_MARKERS = [
    "Stage 35.2 organizations-only refresh archive - 2026-06-01",
    "stage35_organizations_only_refresh_archive=yes",
    "stage35_ci_2119_success=yes",
    "stage35_organizations_only_refresh_accepted=yes",
    "stage35_no_runtime_change=yes",
    "stage35_no_backend_change=yes",
    "stage35_no_main_update=yes",
    "stage35_no_production_redeploy=yes",
]

RUNTIME_MARKERS = {
    LOADER_PATH: [
        "async function loadAdminData(options = {})",
        "async function refreshAdminOrganizations()",
        "const organizations = await getAdminOrganizations();",
        "setAdminData((current) => ({",
        "...current,",
        "organizations: sortOrganizations(organizations),",
        "loadAdminData,",
        "refreshAdminOrganizations,",
        "refreshAdminUsers,",
    ],
    APP_PATH: [
        "loadAdminData,",
        "refreshAdminOrganizations,",
        "refreshAdminUsers,",
    ],
    RENDERER_PATH: [
        "refreshAdminOrganizations,",
        "onRefreshOrganizations={refreshAdminOrganizations}",
    ],
    ORGANIZATIONS_PAGE_PATH: [
        "onRefreshOrganizations,",
        "function refreshOrganizationsFastPath()",
        "if (onRefreshOrganizations) {",
        "onRefreshOrganizations();",
        "onRefreshAdminData();",
        "onRefresh={refreshOrganizationsFastPath}",
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
        ORGANIZATIONS_PAGE_PATH,
        STAGE35_1_CHECK_PATH,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(ARCHIVE_PATH), ARCHIVE_MARKERS, "stage35 archive")
    require_markers(read_text(BASELINE_PATH), BASELINE_ARCHIVE_MARKERS, "stage35 baseline archive section")

    for path, markers in RUNTIME_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 35 organizations-only refresh archive diagnostics passed: "
        "archive=yes, "
        "ci_2119_success=yes, "
        "organizations_only_refresh_accepted=yes, "
        "full_bootstrap_preserved=yes, "
        "unrelated_admin_datasets_preserved=yes, "
        "runtime_changed=no, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
