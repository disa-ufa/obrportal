from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FINAL_DOC_PATH = ROOT / "docs" / "stage-34-final-admin-users-incremental-refresh-acceptance.md"
BASELINE_PATH = ROOT / "docs" / "stage-34-admin-users-incremental-refresh-baseline.md"
ARCHIVE_PATH = ROOT / "docs" / "stage-34-users-only-refresh-archive.md"

LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
APP_PATH = ROOT / "frontend" / "src" / "App.jsx"
RENDERER_PATH = ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"

REQUIRED_CHECKS = [
    ROOT / "scripts" / "check_stage34_users_only_refresh_archive.py",
    ROOT / "scripts" / "check_stage34_admin_users_only_refresh_path.py",
    ROOT / "scripts" / "check_stage34_admin_users_incremental_refresh_baseline.py",
    ROOT / "scripts" / "check_stage33_final_frontend_fast_path_acceptance.py",
]

FINAL_MARKERS = [
    "Stage 34 final admin users incremental refresh acceptance - 2026-06-01",
    "stage34_final_acceptance=yes",
    "stage34_admin_users_incremental_refresh_accepted=yes",
    "stage34_ci_2116_success_recorded=yes",
    "stage34_users_only_refresh_accepted_final=yes",
    "stage34_full_bootstrap_preserved_final=yes",
    "stage34_develop_acceptance_only=yes",
    "stage34_no_runtime_change=yes",
    "stage34_no_backend_change=yes",
    "stage34_no_main_update=yes",
    "stage34_no_production_redeploy=yes",
]

BASELINE_FINAL_MARKERS = [
    "Stage 34 final admin users incremental refresh acceptance - 2026-06-01",
    "stage34_final_acceptance=yes",
    "stage34_admin_users_incremental_refresh_accepted=yes",
    "stage34_ci_2116_success_recorded=yes",
    "stage34_no_runtime_change=yes",
    "stage34_no_backend_change=yes",
    "stage34_no_main_update=yes",
    "stage34_no_production_redeploy=yes",
]

RUNTIME_MARKERS = {
    LOADER_PATH: [
        "async function loadAdminData(options = {})",
        "async function refreshAdminUsers(usersFilters = {}, roles = [])",
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
        FINAL_DOC_PATH,
        BASELINE_PATH,
        ARCHIVE_PATH,
        LOADER_PATH,
        APP_PATH,
        RENDERER_PATH,
        USERS_PAGE_PATH,
        *REQUIRED_CHECKS,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(FINAL_DOC_PATH), FINAL_MARKERS, "stage34 final acceptance doc")
    require_markers(read_text(BASELINE_PATH), BASELINE_FINAL_MARKERS, "stage34 baseline final section")

    archive_text = read_text(ARCHIVE_PATH)
    require("stage34_users_only_refresh_archive=yes" in archive_text, "stage34 archive marker missing")
    require("stage34_ci_2115_success=yes" in archive_text, "stage34 archive CI marker missing")

    for path, markers in RUNTIME_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 34 final admin users incremental refresh acceptance diagnostics passed: "
        "final_acceptance=yes, "
        "incremental_refresh_accepted=yes, "
        "ci_2116_recorded=yes, "
        "users_only_refresh_final=yes, "
        "full_bootstrap_preserved=yes, "
        "runtime_changed=no, "
        "backend_changed=no, "
        "main_updated=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
