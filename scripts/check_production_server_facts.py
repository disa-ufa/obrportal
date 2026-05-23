from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FACTS_PATH = ROOT / "docs" / "production-server-facts.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"
REQUIRED_STAGE8_INVENTORY_COMMIT = "415f3dd"

REQUIRED_SECTIONS = [
    "# Production server facts",
    "## Purpose",
    "## Release baseline",
    "## Server identity",
    "## Deployment paths",
    "## Domain and HTTPS facts",
    "## Reverse proxy facts",
    "## Docker and runtime facts",
    "## Port exposure facts",
    "## Production environment facts",
    "## Backup and rollback facts",
    "## Server preflight commands",
    "## Production acceptance criteria",
    "## Facts diagnostics",
]

REQUIRED_TABLE_ITEMS = [
    "Provider",
    "Server name",
    "Server public IP",
    "Server private IP",
    "Operating system",
    "CPU/RAM/Disk",
    "SSH user",
    "SSH access policy",
    "Application directory",
    "Backup directory",
    "Environment file",
    "Reverse proxy config path",
    "Docker Compose file",
    "Storage volume/path",
    "Primary domain",
    "Frontend URL",
    "Backend public URL",
    "API prefix",
    "Health URL",
    "Readiness URL",
    "HTTPS provider",
    "Certificate auto-renewal",
    "Reverse proxy",
    "HTTP to HTTPS redirect",
    "SPA fallback configured",
    "`/health` proxy configured",
    "`/api/v1/ready` proxy configured",
    "`/api/` proxy configured",
    "Reverse proxy backup prepared",
    "Docker installed",
    "Docker Compose installed",
    "Git installed",
    "Deployment mode",
    "Backend service",
    "Frontend service",
    "PostgreSQL service",
    "Redis service",
    "Object storage service",
    "`.env` exists on server",
    "`APP_ENV`",
    "`APP_VERSION`",
    "`SECRET_KEY` generated",
    "PostgreSQL credentials generated",
    "Storage credentials generated",
    "CORS production origins configured",
    "Backup root exists",
    "PostgreSQL backup tested",
    "Object storage backup selected",
    "`.env` backup prepared",
    "Rollback commit recorded",
    "Rollback tag recorded",
]

REQUIRED_PORTS = [
    "`22`",
    "`80`",
    "`443`",
    "`8000`",
    "`5173`",
    "`5432`",
    "`6379`",
    "`9000`",
    "`9001`",
]

REQUIRED_COMMANDS = [
    "docker --version",
    "docker compose version",
    "git --version",
    "df -h",
    "free -h",
    "uname -a",
    "python .\\scripts\\check_production_server_facts.py",
]

REQUIRED_MARKERS = [
    "This document records non-secret facts about the real production deployment target for ObrPortal.",
    "It must not contain passwords, tokens, private keys, production `.env` values or any other secrets.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Stage 8 rollout inventory baseline: `415f3dd`",
    "| Application directory | `/opt/obrportal` | Main application checkout. |",
    "| Backup directory | `/opt/obrportal-backups` | Backups outside disposable container lifecycle. |",
    "| Environment file | `/opt/obrportal/.env` | Must exist only on server. |",
    "| Docker Compose file | `/opt/obrportal/docker-compose.yml` | Main compose file. |",
    "| API prefix | `/api/` | Backend route prefix. |",
    "| Health URL | `<pending>/health` | Replace with real domain. |",
    "| Readiness URL | `<pending>/api/v1/ready` | Replace with real domain. |",
    "| Reverse proxy | `<pending>` | Nginx or Caddy. |",
    "| HTTP to HTTPS redirect | `<pending>` | Must be enabled. |",
    "| SPA fallback configured | `<pending>` | Required for frontend routes. |",
    "| Deployment mode | `docker compose` | Current rollout mode. |",
    "| Backend service | `backend` | FastAPI service. |",
    "| Frontend service | `frontend` | Vite/frontend service. |",
    "| PostgreSQL service | `postgres` | Database service. |",
    "| Redis service | `redis` | Cache/session/support service. |",
    "| Object storage service | `minio` | Or external S3-compatible storage. |",
    "| `5432` | private only | `<pending>` | PostgreSQL must not be public. |",
    "| `6379` | private only | `<pending>` | Redis must not be public. |",
    "| `APP_ENV` | `production` | Required value. |",
    "| `APP_VERSION` | `0.1.0-stage6` | Required value. |",
    "| `SECRET_KEY` generated | `<pending>` | Do not record the value here. |",
    "| PostgreSQL credentials generated | `<pending>` | Do not record the values here. |",
    "| Storage credentials generated | `<pending>` | Do not record the values here. |",
    "| Rollback tag recorded | `v0.1.0-stage6` | Release fallback tag. |",
    "Run on the production server and record only non-secret results:",
    "- Real production server identity is recorded.",
    "- Production `.env` status is recorded without secrets.",
    "- No secrets are committed to Git.",
]


def read_facts() -> str:
    if not FACTS_PATH.exists():
        raise SystemExit("Required production server facts document is missing: docs/production-server-facts.md")

    return FACTS_PATH.read_text(encoding="utf-8")


def get_production_server_facts_diagnostics(facts_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in facts_text]
    missing_table_items = [item for item in REQUIRED_TABLE_ITEMS if item not in facts_text]
    missing_ports = [port for port in REQUIRED_PORTS if port not in facts_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in facts_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in facts_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "requiredStage8InventoryCommit": REQUIRED_STAGE8_INVENTORY_COMMIT,
        "missingSections": missing_sections,
        "missingTableItems": missing_table_items,
        "missingPorts": missing_ports,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections
        and not missing_table_items
        and not missing_ports
        and not missing_commands
        and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_server_facts_diagnostics(read_facts())

    for key in [
        "missingSections",
        "missingTableItems",
        "missingPorts",
        "missingCommands",
        "missingMarkers",
    ]:
        if diagnostics[key]:
            print(f"Production server facts diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production server facts diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"table_items={len(REQUIRED_TABLE_ITEMS)}, "
        f"ports={len(REQUIRED_PORTS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
