from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "docs" / "production-rollout-inventory.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"

REQUIRED_SECTIONS = [
    "# Production rollout inventory",
    "## Purpose",
    "## Release baseline",
    "## Deployment target",
    "## Domain inventory",
    "## Required production services",
    "## Required server ports",
    "## Production environment status",
    "## Backup readiness",
    "## Preflight commands",
    "## Rollout acceptance criteria",
    "## Inventory diagnostics",
]

REQUIRED_TABLE_ITEMS = [
    "Production server provider",
    "Server name",
    "Server OS",
    "SSH user",
    "Application directory",
    "Backup directory",
    "Reverse proxy",
    "Deployment mode",
    "Public frontend domain",
    "Public backend URL",
    "API route prefix",
    "Health endpoint",
    "Readiness endpoint",
    "HTTPS status",
    "Backup directory exists",
    "PostgreSQL backup command tested",
    "Object storage backup strategy selected",
    "Reverse proxy config backup path prepared",
    "Rollback commit/tag recorded",
]

REQUIRED_SERVICES = [
    "`postgres`",
    "`redis`",
    "`minio` or external S3-compatible storage",
    "`backend`",
    "`frontend`",
    "reverse proxy",
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
    "git status --short",
    "git branch -vv",
    "git log --oneline --decorate -10",
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_production_deployment_runbook.py",
    "python .\\scripts\\check_production_backup_monitoring_checklist.py",
    "python .\\scripts\\check_production_reverse_proxy_checklist.py",
    "python .\\scripts\\check_production_server_checklist.py",
    "python .\\scripts\\check_production_environment_template.py",
    "python .\\scripts\\check_production_deployment_plan.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_production_rollout_inventory.py",
    "docker --version",
    "docker compose version",
    "git --version",
    "df -h",
    "free -h",
    "uname -a",
]

REQUIRED_MARKERS = [
    "This document fixes the target production rollout inventory for ObrPortal before executing real server deployment.",
    "It must not contain secrets.",
    "Real passwords, tokens, private keys and production `.env` values must never be committed to Git.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Current post-release preparation commit: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Main branch contains Stage 7 production documentation and guards.",
    "| Application directory | `/opt/obrportal` | Recommended production app path. |",
    "| Backup directory | `/opt/obrportal-backups` | Must be outside disposable container lifecycle. |",
    "| Deployment mode | `docker compose` | Current supported rollout mode. |",
    "| Public frontend domain | `https://example.org` | Replace with real domain before rollout. |",
    "| API route prefix | `/api/` | Proxies to backend service. |",
    "| Health endpoint | `/health` | Must be reachable through production domain. |",
    "| Readiness endpoint | `/api/v1/ready` | Must be reachable through production domain. |",
    "| `5432` | PostgreSQL | no | Must not be publicly exposed. |",
    "| `6379` | Redis | no | Must not be publicly exposed. |",
    "| `.env` created on server | `<pending>` | Must be created manually. |",
    "| `APP_ENV=production` | `<pending>` | Must not be `local`. |",
    "| `APP_VERSION=0.1.0-stage6` | `<pending>` | Must match release baseline. |",
    "| `SECRET_KEY` generated | `<pending>` | Must be production-specific. |",
    "| CORS origins configured | `<pending>` | Must contain only production origins. |",
    "- Private service ports are not publicly exposed.",
    "- No secrets are committed to Git.",
]


def read_inventory() -> str:
    if not INVENTORY_PATH.exists():
        raise SystemExit("Required production rollout inventory is missing: docs/production-rollout-inventory.md")

    return INVENTORY_PATH.read_text(encoding="utf-8")


def get_production_rollout_inventory_diagnostics(inventory_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in inventory_text]
    missing_table_items = [item for item in REQUIRED_TABLE_ITEMS if item not in inventory_text]
    missing_services = [service for service in REQUIRED_SERVICES if service not in inventory_text]
    missing_ports = [port for port in REQUIRED_PORTS if port not in inventory_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in inventory_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in inventory_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "missingSections": missing_sections,
        "missingTableItems": missing_table_items,
        "missingServices": missing_services,
        "missingPorts": missing_ports,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections
        and not missing_table_items
        and not missing_services
        and not missing_ports
        and not missing_commands
        and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_rollout_inventory_diagnostics(read_inventory())

    for key in [
        "missingSections",
        "missingTableItems",
        "missingServices",
        "missingPorts",
        "missingCommands",
        "missingMarkers",
    ]:
        if diagnostics[key]:
            print(f"Production rollout inventory diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production rollout inventory diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"table_items={len(REQUIRED_TABLE_ITEMS)}, "
        f"services={len(REQUIRED_SERVICES)}, "
        f"ports={len(REQUIRED_PORTS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
