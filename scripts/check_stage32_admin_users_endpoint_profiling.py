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
    "stage32_admin_users_optimization_deferred=yes",
    "stage32_no_production_redeploy=yes",
]

PROFILE_MARKERS = [
    "n_plus_one_confirmed=yes",
    "limit_query_ignored_confirmed=yes",
    "optimization_deferred=yes",
    "production_redeploy=no",
    "roles = await get_user_roles(str(user.id), session)",
    "users_result = await session.execute(select(User).order_by(User.email))",
]

ADMIN_MARKERS = [
    "async def get_user_roles(",
    "async def list_users(",
    "users = users_result.scalars().all()",
    "for user in users:",
    "roles = await get_user_roles(str(user.id), session)",
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

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage32 doc")
    require_markers(read_text(PROFILE_PATH), PROFILE_MARKERS, "stage32 profile script")
    require_markers(read_text(ADMIN_API_PATH), ADMIN_MARKERS, "admin api")

    print(
        "stage 32 admin users endpoint profiling diagnostics passed: "
        "n_plus_one_confirmed=yes, "
        "limit_query_ignored_confirmed=yes, "
        "optimization_deferred=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
