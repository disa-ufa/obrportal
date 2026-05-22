from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHECKLIST_PATH = ROOT / "docs" / "production-server-checklist.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"

REQUIRED_SECTIONS = [
    "# Production server checklist",
    "## Purpose",
    "## Release baseline",
    "## Server prerequisites",
    "## Recommended directories",
    "## First server preparation commands",
    "## Production environment preparation",
    "## Environment file permissions",
    "## Pre-deployment backup commands",
    "## Deployment commands",
    "## Migration commands",
    "## Initial seed commands",
    "## Health verification commands",
    "## Post-deployment smoke checklist",
    "## Rollback commands",
    "## Production acceptance criteria",
    "## Checklist diagnostics",
]

REQUIRED_COMMANDS = [
    "sudo mkdir -p /opt/obrportal",
    "sudo mkdir -p /opt/obrportal-backups",
    "sudo mkdir -p /opt/obrportal-backups/reverse-proxy",
    "git clone https://github.com/disa-ufa/obrportal.git .",
    "git fetch origin --tags",
    "git checkout v0.1.0-stage6",
    "git status --short",
    "git rev-list -n 1 v0.1.0-stage6",
    "chmod 600 .env",
    "git rev-parse HEAD > /opt/obrportal-backups/previous-commit.txt",
    "git describe --tags --always > /opt/obrportal-backups/previous-version.txt",
    "cp .env /opt/obrportal-backups/env.backup",
    "docker compose ps",
    "docker compose build",
    "docker compose up -d postgres redis minio",
    "docker compose up -d backend frontend",
    "docker compose exec -T backend alembic upgrade head",
    "docker compose exec -T backend python -m app.db.seed",
    "docker compose exec -T backend python -m app.db.seed_admin",
    "docker compose exec -T backend python -m app.db.seed_org",
    "curl -fsS http://localhost:8000/health",
    "curl -fsS http://localhost:8000/api/v1/ready",
    "docker compose logs --tail=100 backend",
    "docker compose logs --tail=100 frontend",
    "curl -fsS https://example.org/health",
    "curl -fsS https://example.org/api/v1/ready",
    "docker compose down",
    "git checkout $(cat /opt/obrportal-backups/previous-commit.txt)",
    "python .\\scripts\\check_production_server_checklist.py",
]

REQUIRED_MARKERS = [
    "Production deployment must checkout the release tag, not a moving development branch.",
    "- Docker installed.",
    "- Docker Compose plugin installed.",
    "- Git installed.",
    "- HTTPS-capable reverse proxy installed or planned.",
    "- Firewall rules prepared for HTTP/HTTPS and SSH.",
    "- Backup destination prepared outside disposable container lifecycle.",
    "- Application directory: `/opt/obrportal`",
    "- Environment file: `/opt/obrportal/.env`",
    "- Backup directory: `/opt/obrportal-backups`",
    "Expected release commit:",
    "ac6f339d40567a107dd19f02ec778fbeb5e19971",
    "Use `docs/production-environment-template.md` as the reference.",
    "Set `APP_ENV=production`.",
    "Set `APP_VERSION=0.1.0-stage6`.",
    "Run migrations after infrastructure services are healthy and before accepting traffic:",
    "Run only when preparing a new production installation:",
    "After first login, rotate temporary administrator credentials.",
    "Replace `https://example.org` with the real production domain.",
    "`/health` returns status `ok` and version `0.1.0-stage6`.",
    "`/api/v1/ready` returns ready status for database, Redis and storage.",
    "Database restore must be performed only when schema or data changes require it and only from a verified backup.",
    "- Release tag checkout is confirmed.",
    "- Backup and rollback path are verified.",
]


def read_checklist() -> str:
    if not CHECKLIST_PATH.exists():
        raise SystemExit("Required production server checklist is missing: docs/production-server-checklist.md")

    return CHECKLIST_PATH.read_text(encoding="utf-8")


def get_production_server_checklist_diagnostics(checklist_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in checklist_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in checklist_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in checklist_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "missingSections": missing_sections,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections and not missing_commands and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_server_checklist_diagnostics(read_checklist())

    for key in ["missingSections", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production server checklist diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production server checklist diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
