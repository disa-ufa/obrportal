from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_PATH = ROOT / "docs" / "production-environment-template.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"

REQUIRED_SECTIONS = [
    "# Production environment template",
    "## Purpose",
    "## Release baseline",
    "## Environment file location",
    "## Application settings",
    "## Backend URLs and CORS",
    "## PostgreSQL",
    "## Redis",
    "## Object storage",
    "## Initial administrator",
    "## Organization seed placeholders",
    "## Reverse proxy requirements",
    "## Files and permissions",
    "## Production environment acceptance checklist",
    "## Template diagnostics",
]

REQUIRED_VARIABLES = [
    "APP_NAME",
    "APP_ENV",
    "APP_VERSION",
    "SECRET_KEY",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "BACKEND_PUBLIC_URL",
    "FRONTEND_PUBLIC_URL",
    "CORS_ORIGINS",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "DATABASE_URL",
    "REDIS_URL",
    "S3_ENDPOINT_URL",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "S3_BUCKET_NAME",
    "S3_REGION",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "ADMIN_FULL_NAME",
    "ORG_NAME",
    "ORG_INN",
    "ORG_KPP",
    "ORG_ADDRESS",
]

REQUIRED_MARKERS = [
    "The real production `.env` file must be created manually on the server and must never be committed to Git.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- `/opt/obrportal/.env`",
    "Must not be `local` in production.",
    "Unique production secret, never reuse local/dev value.",
    "Only production origins, comma-separated if needed.",
    "Strong secret, stored only in server `.env`.",
    "HTTPS must be enabled.",
    "HTTP must redirect to HTTPS.",
    "Frontend routes must fallback to `index.html`.",
    "Backend API must be proxied to the backend service.",
    "Production `.env` must not be committed.",
    "Backups must be stored outside disposable container lifecycle.",
    "python .\\scripts\\check_production_environment_template.py",
]


def read_template() -> str:
    if not TEMPLATE_PATH.exists():
        raise SystemExit("Required production environment template is missing: docs/production-environment-template.md")

    return TEMPLATE_PATH.read_text(encoding="utf-8")


def get_production_environment_template_diagnostics(template_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in template_text]
    missing_variables = [variable for variable in REQUIRED_VARIABLES if f"`{variable}`" not in template_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in template_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "missingSections": missing_sections,
        "missingVariables": missing_variables,
        "missingMarkers": missing_markers,
        "ok": not missing_sections and not missing_variables and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_environment_template_diagnostics(read_template())

    for key in ["missingSections", "missingVariables", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production environment template diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production environment template diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"variables={len(REQUIRED_VARIABLES)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
