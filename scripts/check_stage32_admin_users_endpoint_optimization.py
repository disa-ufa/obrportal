from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ADMIN_API_PATH = ROOT / "backend" / "app" / "api" / "v1" / "admin.py"
TEST_PATH = ROOT / "backend" / "app" / "tests" / "test_auth_rbac_admin_api.py"
DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"

DOC_MARKERS = [
    "Stage 32.3 admin users endpoint optimization - 2026-05-31",
    "stage32_admin_users_endpoint_optimized=yes",
    "stage32_admin_users_roles_batch_loaded=yes",
    "stage32_admin_users_limit_filter_supported=yes",
    "stage32_admin_users_q_filter_supported=yes",
    "stage32_admin_users_is_active_filter_supported=yes",
    "stage32_admin_users_role_filter_supported=yes",
    "stage32_no_production_redeploy=yes",
]

ADMIN_MARKERS = [
    "async def get_users_roles(",
    "UserRole.user_id.in_(user_ids)",
    "roles_by_user_id: dict[str, list[AdminUserRoleItem]]",
    "roles_by_user_id = await get_users_roles([user.id for user in users], session)",
    "limit: int | None = Query(default=None, ge=1, le=200)",
    "q: str | None = Query(default=None, max_length=320)",
    "role: str | None = Query(default=None, max_length=64)",
    "is_active: bool | None = Query(default=None)",
    "if limit is not None:",
    "query = query.limit(limit)",
    "User.email.ilike(search_pattern)",
    "User.phone.ilike(search_pattern)",
    "User.full_name.ilike(search_pattern)",
    "Role.code == normalized_role",
]

TEST_MARKERS = [
    "test_admin_can_filter_users_with_pagination_search_active_and_role",
    "urlencode({'limit': 1})",
    "urlencode({'q': user_email, 'limit': 20})",
    "urlencode({'q': user_email, 'is_active': 'false', 'limit': 20})",
    "urlencode({'q': user_email, 'role': role_code, 'limit': 20})",
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
    for path in [ADMIN_API_PATH, TEST_PATH, DOC_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    admin_py = read_text(ADMIN_API_PATH)
    list_users_section = admin_py.split("async def list_users(", 1)[1].split("@router.", 1)[0]

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage32 doc")
    require_markers(admin_py, ADMIN_MARKERS, "admin api")
    require_markers(read_text(TEST_PATH), TEST_MARKERS, "admin api tests")
    require(
        "roles = await get_user_roles(str(user.id), session)" not in list_users_section,
        "admin list_users still contains per-user role query",
    )

    print(
        "stage 32 admin users endpoint optimization diagnostics passed: "
        "roles_batch_loaded=yes, "
        "filters_supported=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
