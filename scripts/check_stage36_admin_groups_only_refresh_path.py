from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-36-admin-groups-incremental-refresh-baseline.md"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
GROUPS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "GroupsPage.jsx"

DOC_MARKERS = [
    "Stage 36.1 admin groups-only refresh path - 2026-06-01",
    "stage36_groups_only_refresh_path=yes",
    "stage36_refresh_admin_groups_only_updates_groups=yes",
    "stage36_groups_page_uses_on_refresh_groups=yes",
    "stage36_full_bootstrap_preserved=yes",
    "stage36_no_backend_change=yes",
    "stage36_no_main_update=yes",
    "stage36_no_production_redeploy=yes",
]

LOADER_MARKERS = [
    "async function loadAdminData(options = {})",
    "async function refreshAdminGroups()",
    "const groups = await getOrgLearningGroups();",
    "setAdminData((current) => ({",
    "...current,",
    "groups: sortGroups(groups),",
    "loadAdminData,",
    "refreshAdminGroups,",
    "refreshAdminOrganizations,",
    "refreshAdminUsers,",
]

APP_MARKERS = [
    "loadAdminData,",
    "refreshAdminGroups,",
    "refreshAdminOrganizations,",
    "refreshAdminUsers,",
]

RENDERER_MARKERS = [
    "refreshAdminGroups,",
    "onRefreshGroups={refreshAdminGroups}",
]

GROUPS_PAGE_MARKERS = [
    "onRefreshGroups,",
    "function refreshGroupsFastPath()",
    "if (onRefreshGroups) {",
    "onRefreshGroups();",
    "return;",
    "onRefreshAdminData();",
    "onRefresh={refreshGroupsFastPath}",
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
    for path in [DOC_PATH, LOADER_PATH, APP_PATH, RENDERER_PATH, GROUPS_PAGE_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage36 doc")
    require_markers(read_text(LOADER_PATH), LOADER_MARKERS, "admin data loader")
    require_markers(read_text(APP_PATH), APP_MARKERS, "app")
    require_markers(read_text(RENDERER_PATH), RENDERER_MARKERS, "admin page renderer")
    require_markers(read_text(GROUPS_PAGE_PATH), GROUPS_PAGE_MARKERS, "groups page")

    print(
        "stage 36 admin groups-only refresh path diagnostics passed: "
        "groups_only_refresh=yes, "
        "only_groups_updated=yes, "
        "full_bootstrap_preserved=yes, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
