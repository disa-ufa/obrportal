from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"
ARCHIVE_PATH = ROOT / "docs" / "stage-32-post-optimization-stability-measurement-archive.md"
OPTIMIZATION_CHECK_PATH = ROOT / "scripts" / "check_stage32_admin_users_endpoint_optimization.py"
ARCHIVE_CHECK_PATH = ROOT / "scripts" / "check_stage32_post_optimization_stability_archive.py"
ADMIN_API_PATH = ROOT / "backend" / "app" / "api" / "v1" / "admin.py"

DOC_MARKERS = [
    "Stage 32 final performance/stability acceptance - 2026-05-31",
    "stage32_final_performance_stability_accepted=yes",
    "stage32_admin_users_n_plus_one_removed=yes",
    "stage32_admin_users_filters_accepted=yes",
    "stage32_ci_2105_success=yes",
    "stage32_no_production_redeploy=yes",
    "stage32_main_remains_stage30=yes",
]

CHAIN_MARKERS = [
    "Stage 32.1 admin endpoint stability measurements - 2026-05-31",
    "Stage 32.2 admin users endpoint profiling - 2026-05-31",
    "Stage 32.3 admin users endpoint optimization - 2026-05-31",
    "Stage 32.4 post-optimization stability measurement archive - 2026-05-31",
]

ADMIN_MARKERS = [
    "async def get_users_roles(",
    "UserRole.user_id.in_(user_ids)",
    "roles_by_user_id = await get_users_roles([user.id for user in users], session)",
    "limit: int | None = Query(default=None, ge=1, le=200)",
    "q: str | None = Query(default=None, max_length=320)",
    "role: str | None = Query(default=None, max_length=64)",
    "is_active: bool | None = Query(default=None)",
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
    for path in [DOC_PATH, ARCHIVE_PATH, OPTIMIZATION_CHECK_PATH, ARCHIVE_CHECK_PATH, ADMIN_API_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    doc = read_text(DOC_PATH)
    admin_py = read_text(ADMIN_API_PATH)

    require_markers(doc, DOC_MARKERS, "stage32 final doc")
    require_markers(doc, CHAIN_MARKERS, "stage32 chain")
    require_markers(read_text(ARCHIVE_PATH), ["stage32_post_optimization_stability_archive=yes"], "stage32 archive")
    require_markers(admin_py, ADMIN_MARKERS, "admin users optimized endpoint")

    list_users_section = admin_py.split("async def list_users(", 1)[1].split("@router.", 1)[0]
    require(
        "roles = await get_user_roles(str(user.id), session)" not in list_users_section,
        "admin list_users still contains per-user role query",
    )

    print(
        "stage 32 final performance/stability acceptance diagnostics passed: "
        "accepted=yes, "
        "admin_users_n_plus_one_removed=yes, "
        "filters_accepted=yes, "
        "ci_2105_success=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
