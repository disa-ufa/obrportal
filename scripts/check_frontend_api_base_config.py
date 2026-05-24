from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "frontend" / "src" / "api" / "client.js"
ENV_EXAMPLE = ROOT / ".env.example"

REQUIRED_CLIENT_MARKERS = [
    "const RAW_API_BASE_URL = (",
    "import.meta.env.VITE_API_BASE_URL",
    "import.meta.env.VITE_API_URL",
    "import.meta.env.PROD ? \"\" : \"http://localhost:8000\"",
    "const API_BASE_URL = `${RAW_API_BASE_URL || \"\"}`.trim().replace(/\\/+$/, \"\");",
    "function buildApiUrl(path)",
    "return API_BASE_URL ? `${API_BASE_URL}${path}` : path;",
    "fetch(buildApiUrl(path), {",
    "fetch(buildApiUrl(`/api/v1/account/documents/${documentId}/download`), {",
]

REQUIRED_ENV_MARKERS = [
    "# Frontend",
    "VITE_API_BASE_URL=http://localhost:8000",
    "Legacy alias kept for compatibility",
    "VITE_API_URL=http://localhost:8000",
]

FORBIDDEN_CLIENT_MARKERS = [
    'const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";',
    "fetch(`${API_BASE_URL}${path}`, {",
    "fetch(`${API_BASE_URL}/api/v1/account/documents/${documentId}/download`, {",
]


def main() -> None:
    if not CLIENT.exists():
        raise SystemExit("frontend API client is missing")

    if not ENV_EXAMPLE.exists():
        raise SystemExit(".env.example is missing")

    client_text = CLIENT.read_text(encoding="utf-8")
    env_text = ENV_EXAMPLE.read_text(encoding="utf-8")

    missing_client = [marker for marker in REQUIRED_CLIENT_MARKERS if marker not in client_text]
    missing_env = [marker for marker in REQUIRED_ENV_MARKERS if marker not in env_text]
    forbidden_client = [marker for marker in FORBIDDEN_CLIENT_MARKERS if marker in client_text]

    if missing_client:
        print("frontend API base config diagnostics failed")
        print("missing client markers:")
        for marker in missing_client:
            print(f" - {marker}")
        raise SystemExit(1)

    if missing_env:
        print("frontend API base config diagnostics failed")
        print("missing .env.example markers:")
        for marker in missing_env:
            print(f" - {marker}")
        raise SystemExit(1)

    if forbidden_client:
        print("frontend API base config diagnostics failed")
        print("forbidden old client markers:")
        for marker in forbidden_client:
            print(f" - {marker}")
        raise SystemExit(1)

    vite_base_count = client_text.count("VITE_API_BASE_URL")
    vite_legacy_count = client_text.count("VITE_API_URL")
    build_url_count = client_text.count("buildApiUrl(")

    if vite_base_count < 1:
        raise SystemExit("expected VITE_API_BASE_URL usage")

    if vite_legacy_count < 1:
        raise SystemExit("expected VITE_API_URL legacy alias usage")

    if build_url_count < 3:
        raise SystemExit(f"expected at least 3 buildApiUrl markers, got {build_url_count}")

    print(
        "frontend API base config diagnostics passed: "
        f"vite_base_count={vite_base_count}, "
        f"vite_legacy_count={vite_legacy_count}, "
        f"build_url_count={build_url_count}, "
        f"client_markers={len(REQUIRED_CLIENT_MARKERS)}, "
        f"env_markers={len(REQUIRED_ENV_MARKERS)}"
    )


if __name__ == "__main__":
    main()
