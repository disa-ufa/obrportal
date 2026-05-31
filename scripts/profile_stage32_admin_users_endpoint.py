from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ADMIN_API_PATH = ROOT / "backend" / "app" / "api" / "v1" / "admin.py"
STAGE32_DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"

STATIC_MARKERS = [
    "async def get_user_roles(",
    "select(",
    "UserRole.id.label(\"id\")",
    ".where(UserRole.user_id == user_id)",
    "async def list_users(",
    "users_result = await session.execute(select(User).order_by(User.email))",
    "users = users_result.scalars().all()",
    "for user in users:",
    "roles = await get_user_roles(str(user.id), session)",
    "response.append(build_admin_user_item(user, roles))",
]

MISSING_EXPECTED_QUERY_PARAMS = [
    "limit: int",
    "q: str",
    "role: str",
    "is_active: bool",
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    require(ADMIN_API_PATH.exists(), f"missing admin api file: {ADMIN_API_PATH.relative_to(ROOT)}")
    require(STAGE32_DOC_PATH.exists(), f"missing stage32 doc: {STAGE32_DOC_PATH.relative_to(ROOT)}")

    admin_py = ADMIN_API_PATH.read_text(encoding="utf-8")
    doc = STAGE32_DOC_PATH.read_text(encoding="utf-8")

    missing_markers = [marker for marker in STATIC_MARKERS if marker not in admin_py]
    require(not missing_markers, f"admin users endpoint profile markers missing: {missing_markers}")

    list_users_section = admin_py.split("async def list_users(", 1)[1].split("@router.", 1)[0]

    unexpected_supported_query_params = [
        marker for marker in MISSING_EXPECTED_QUERY_PARAMS if marker in list_users_section
    ]

    require(
        not unexpected_supported_query_params,
        "Stage 32.2 profile expected current endpoint to lack query pagination/filter params, "
        f"but found: {unexpected_supported_query_params}",
    )

    doc_markers = [
        "Stage 32.2 admin users endpoint profiling - 2026-05-31",
        "stage32_admin_users_endpoint_profiling=yes",
        "stage32_admin_users_n_plus_one_confirmed=yes",
        "stage32_admin_users_limit_query_ignored_confirmed=yes",
        "stage32_admin_users_optimization_deferred=yes",
        "stage32_no_production_redeploy=yes",
    ]

    missing_doc_markers = [marker for marker in doc_markers if marker not in doc]
    require(not missing_doc_markers, f"stage32 doc missing profile markers: {missing_doc_markers}")

    print(
        "stage 32 admin users endpoint profiling passed: "
        "n_plus_one_confirmed=yes, "
        "limit_query_ignored_confirmed=yes, "
        "optimization_deferred=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
