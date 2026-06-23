from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-33-admin-users-frontend-fast-path-baseline.md"
CLIENT_PATH = ROOT / "frontend" / "src" / "api" / "client.js"
SMOKE_PATH = ROOT / "scripts" / "smoke_frontend_api_client.py"

DOC_MARKERS = [
    "Stage 33.1 frontend API query builder - 2026-05-31",
    "stage33_frontend_api_query_builder=yes",
    "stage33_get_admin_users_filters_supported=yes",
    "stage33_get_admin_users_backward_compatible=yes",
    "stage33_no_backend_change=yes",
    "stage33_no_production_redeploy=yes",
]

CLIENT_MARKERS = [
    "export function buildQueryString(filters = {})",
    "Object.entries(filters).forEach(([key, value]) => {",
    'if (value === undefined || value === null || `${value}`.trim() === "")',
    "params.set(key, value);",
    "return query ? `?${query}` : \"\";",
    "export async function getAdminUsers(filters = {})",
    "const query = buildQueryString(filters);",
    "return request(`/api/v1/admin/users${query}`);",
]

SMOKE_MARKERS = [
    "export function buildQueryString(filters = {})",
    "export async function getAdminUsers(filters = {})",
    "return request(`/api/v1/admin/users${query}`);",
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
    for path in [DOC_PATH, CLIENT_PATH, SMOKE_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    client = read_text(CLIENT_PATH)

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage33 doc")
    require_markers(client, CLIENT_MARKERS, "frontend api client")
    require_markers(read_text(SMOKE_PATH), SMOKE_MARKERS, "frontend api smoke")

    require(
        'export async function getAdminUsers()' not in client,
        "old unparameterized getAdminUsers signature still exists",
    )

    print(
        "stage 33 frontend API query builder diagnostics passed: "
        "query_builder=yes, "
        "get_admin_users_filters_supported=yes, "
        "backward_compatible=yes, "
        "backend_changed=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
