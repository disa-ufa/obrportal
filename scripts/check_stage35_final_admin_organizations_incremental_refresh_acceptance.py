from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FINAL_DOC_PATH = ROOT / "docs" / "stage-35-final-admin-organizations-incremental-refresh-acceptance.md"
BASELINE_PATH = ROOT / "docs" / "stage-35-admin-organizations-incremental-refresh-baseline.md"
ARCHIVE_PATH = ROOT / "docs" / "stage-35-organizations-only-refresh-archive.md"

LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
ORGANIZATIONS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "OrganizationsPage.jsx"

REQUIRED_CHECKS = [
    ROOT / "scripts" / "check_stage35_organizations_only_refresh_archive.py",
    ROOT / "scripts" / "check_stage35_admin_organizations_only_refresh_path.py",
    ROOT / "scripts" / "check_stage35_admin_organizations_incremental_refresh_baseline.py",
    ROOT / "scripts" / "check_stage34_final_admin_users_incremental_refresh_acceptance.py",
]

FINAL_MARKERS = [
    "Stage 35 final admin organizations incremental refresh acceptance - 2026-06-01",
    "stage35_final_acceptance=yes",
    "stage35_admin_organizations_incremental_refresh_accepted=yes",
    "stage35_ci_2120_success_recorded=yes",
    "stage35_organizations_only_refresh_accepted_final=yes",
    "stage35_full_bootstrap_preserved_final=yes",
    "stage35_develop_acceptance_only=yes",
    "stage35_no_runtime_change=yes",
    "stage35_no_backend_change=yes",
    "stage35_no_main_update=yes",
    "stage35_no_production_redeploy=yes",
]

BASELINE_FINAL_MARKERS = [
    "Stage 35 final admin organizations incremental refresh acceptance - 2026-06-01",
    "stage35_final_acceptance=yes",
    "stage35_admin_organizations_incremental_refresh_accepted=yes",
    "stage35_ci_2120_success_recorded=yes",
    "stage35_no_runtime_change=yes",
    "stage35_no_backend_change=yes",
    "stage35_no_main_update=yes",
    "stage35_no_production_redeploy=yes",
]

RUNTIME_MARKERS = {
    LOADER_PATH: [
        "async function loadAdminData(options = {})",
        "async function refreshAdminOrganizations()",
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
        FINAL_DOC_PATH,
        BASELINE_PATH,
        ARCHIVE_PATH,
        LOADER_PATH,
        APP_PATH,
        RENDERER_PATH,
        ORGANIZATIONS_PAGE_PATH,
        *REQUIRED_CHECKS,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(FINAL_DOC_PATH), FINAL_MARKERS, "stage35 final acceptance doc")
    require_markers(read_text(BASELINE_PATH), BASELINE_FINAL_MARKERS, "stage35 baseline final section")

    archive_text = read_text(ARCHIVE_PATH)
    require("stage35_organizations_only_refresh_archive=yes" in archive_text, "stage35 archive marker missing")
    require("stage35_ci_2119_success=yes" in archive_text, "stage35 archive CI marker missing")

    for path, markers in RUNTIME_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 35 final admin organizations incremental refresh acceptance diagnostics passed: "
        "final_acceptance=yes, "
        "incremental_refresh_accepted=yes, "
        "ci_2120_recorded=yes, "
        "organizations_only_refresh_final=yes, "
        "full_bootstrap_preserved=yes, "
        "runtime_changed=no, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
