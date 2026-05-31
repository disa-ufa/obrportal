from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ADMIN_API_PATH = ROOT / "backend" / "app" / "api" / "v1" / "admin.py"
STAGE32_DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def require_markers(text: str, markers: list[str], label: str) -> None:
    missing = [marker for marker in markers if marker not in text]
    require(not missing, f"{label} missing markers: {missing}")


def main() -> None:
    require(ADMIN_API_PATH.exists(), f"missing admin api file: {ADMIN_API_PATH.relative_to(ROOT)}")
    require(STAGE32_DOC_PATH.exists(), f"missing stage32 doc: {STAGE32_DOC_PATH.relative_to(ROOT)}")

    admin_py = ADMIN_API_PATH.read_text(encoding="utf-8")
    doc = STAGE32_DOC_PATH.read_text(encoding="utf-8")

    require_markers(
        doc,
        [
            "Stage 32.2 admin users endpoint profiling - 2026-05-31",
            "stage32_admin_users_n_plus_one_confirmed=yes",
            "stage32_admin_users_limit_query_ignored_confirmed=yes",
            "Stage 32.3 admin users endpoint optimization - 2026-05-31",
            "stage32_admin_users_endpoint_optimized=yes",
        ],
        "stage32 doc",
    )

    require_markers(
        admin_py,
        [
            "async def get_users_roles(",
            "UserRole.user_id.in_(user_ids)",
            "roles_by_user_id = await get_users_roles([user.id for user in users], session)",
            "limit: int | None = Query(default=None, ge=1, le=200)",
            "q: str | None = Query(default=None, max_length=320)",
            "role: str | None = Query(default=None, max_length=64)",
            "is_active: bool | None = Query(default=None)",
        ],
        "optimized admin users endpoint",
    )

    list_users_section = admin_py.split("async def list_users(", 1)[1].split("@router.", 1)[0]
    require(
        "roles = await get_user_roles(str(user.id), session)" not in list_users_section,
        "optimized list_users must not call get_user_roles inside the users loop",
    )

    print(
        "stage 32 admin users endpoint profiling passed: "
        "n_plus_one_confirmed=historical, "
        "limit_query_ignored_confirmed=historical, "
        "optimization_applied=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
