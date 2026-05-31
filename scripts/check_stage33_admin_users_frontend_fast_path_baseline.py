from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-33-admin-users-frontend-fast-path-baseline.md"
CLIENT_PATH = ROOT / "frontend" / "src" / "api" / "client.js"
LOADER_PATH = ROOT / "frontend" / "src" / "hooks" / "useAdminDataLoader.js"
USERS_PAGE_PATH = ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx"
STAGE32_FINAL_CHECK_PATH = ROOT / "scripts" / "check_stage32_final_performance_stability_acceptance.py"

DOC_MARKERS = [
    "Stage 33 admin users frontend fast-path baseline - 2026-05-31",
    "stage33_admin_users_frontend_fast_path_baseline=yes",
    "stage33_backend_fast_path_reuse_planned=yes",
    "stage33_frontend_unbounded_users_load_identified=yes",
    "stage33_no_runtime_change=yes",
    "stage33_no_production_redeploy=yes",
]

CURRENT_FRONTEND_MARKERS = {
    CLIENT_PATH: [
        "export function buildQueryString(filters = {})",
        "export async function getAdminUsers(filters = {})",
        "return request(`/api/v1/admin/users${query}`);",
    ],
    LOADER_PATH: [
        "getAdminUsers()",
        "Promise.all([",
    ],
    USERS_PAGE_PATH: [
        "function userMatchesSearch(user, query)",
        "function userMatchesActivityFilter(user, activityFilter)",
        "function userMatchesRoleFilter(user, roleId)",
        "const filteredUsers = useMemo(",
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
        CLIENT_PATH,
        LOADER_PATH,
        USERS_PAGE_PATH,
        STAGE32_FINAL_CHECK_PATH,
    ]

    for path in required_paths:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage33 baseline doc")

    for path, markers in CURRENT_FRONTEND_MARKERS.items():
        require_markers(read_text(path), markers, path.relative_to(ROOT).as_posix())

    print(
        "stage 33 admin users frontend fast-path baseline diagnostics passed: "
        "baseline=yes, "
        "frontend_loader_unbounded_users_load_still_identified=yes, "
        "backend_fast_path_reuse_planned=yes, "
        "runtime_changed=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
