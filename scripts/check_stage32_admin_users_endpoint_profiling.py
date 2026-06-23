from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"
PROFILE_PATH = ROOT / "scripts" / "profile_stage32_admin_users_endpoint.py"
ADMIN_API_PATH = ROOT / "backend" / "app" / "api" / "v1" / "admin.py"

DOC_MARKERS = [
    "Stage 32.2 admin users endpoint profiling - 2026-05-31",
    "stage32_admin_users_endpoint_profiling=yes",
    "stage32_admin_users_n_plus_one_confirmed=yes",
    "stage32_admin_users_limit_query_ignored_confirmed=yes",
    "Stage 32.3 admin users endpoint optimization - 2026-05-31",
    "stage32_admin_users_endpoint_optimized=yes",
]

PROFILE_MARKERS = [
    "n_plus_one_confirmed=historical",
    "limit_query_ignored_confirmed=historical",
    "optimization_applied=yes",
    "production_redeploy=no",
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
    for path in [DOC_PATH, PROFILE_PATH, ADMIN_API_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    admin_py = read_text(ADMIN_API_PATH)
    list_users_section = admin_py.split("async def list_users(", 1)[1].split("@router.", 1)[0]

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage32 doc")
    require_markers(read_text(PROFILE_PATH), PROFILE_MARKERS, "stage32 profile script")
    require_markers(admin_py, ADMIN_MARKERS, "admin api")
    require(
        "roles = await get_user_roles(str(user.id), session)" not in list_users_section,
        "admin list_users still contains per-user get_user_roles call",
    )

    print(
        "stage 32 admin users endpoint profiling diagnostics passed: "
        "historical_profile_preserved=yes, "
        "optimization_applied=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
