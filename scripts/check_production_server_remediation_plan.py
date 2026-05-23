from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "docs" / "production-server-remediation-plan.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"
REQUIRED_STAGE8_CHECKPOINT = "861886c"

REQUIRED_SECTIONS = [
    "# Production server remediation plan",
    "## Purpose",
    "## Release baseline",
    "## Source documents",
    "## Current sanitized server state",
    "## Remediation order",
    "## Step 1 - preserve existing container",
    "## Step 2 - install Docker Compose plugin",
    "## Step 3 - create directories",
    "## Step 4 - choose reverse proxy",
    "## Step 5A - install Caddy",
    "## Step 5B - install Nginx",
    "## Step 6 - clone repository",
    "## Step 7 - production `.env` creation",
    "## Step 8 - post-remediation verification",
    "## Acceptance criteria",
    "## Remediation diagnostics",
]

REQUIRED_SOURCE_DOCUMENTS = [
    "docs/production-server-facts.md",
    "docs/production-fact-collection-result.md",
    "docs/production-server-preflight-execution.md",
    "docs/production-deployment-runbook.md",
    "docs/production-environment-template.md",
]

REQUIRED_TABLE_ITEMS = [
    "Server",
    "OS",
    "Docker Engine",
    "Docker Compose plugin",
    "Git",
    "Application directory",
    "Backup directory",
    "Production `.env`",
    "Reverse proxy",
    "Existing container",
    "Existing UDP port",
    "Public HTTP/HTTPS",
    "Nginx",
    "Caddy",
]

REQUIRED_COMMANDS = [
    "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
    "docker inspect amnezia-awg --format '{{.Name}} {{.State.Status}} {{json .NetworkSettings.Ports}}' || true",
    "apt-get update",
    "apt-get install -y docker-compose-v2",
    "docker compose version",
    "apt-cache search docker-compose",
    "apt-get install -y docker-compose-plugin",
    "mkdir -p /opt/obrportal",
    "mkdir -p /opt/obrportal-backups",
    "mkdir -p /opt/obrportal-backups/env",
    "mkdir -p /opt/obrportal-backups/postgres",
    "mkdir -p /opt/obrportal-backups/storage",
    "mkdir -p /opt/obrportal-backups/proxy",
    "mkdir -p /opt/obrportal-backups/deployment",
    "chmod 700 /opt/obrportal-backups/env",
    "ls -ld /opt/obrportal /opt/obrportal-backups /opt/obrportal-backups/env",
    "apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl",
    "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg",
    "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list",
    "apt-get install -y caddy",
    "caddy version",
    "systemctl status caddy --no-pager",
    "apt-get install -y nginx",
    "nginx -v",
    "nginx -t",
    "systemctl status nginx --no-pager",
    "cd /opt/obrportal",
    "git clone https://github.com/disa-ufa/obrportal.git .",
    "git fetch origin --tags",
    "git status --short",
    "git branch -vv || true",
    "git tag --list v0.1.0-stage6",
    "test -f /opt/obrportal/.env && echo '.env exists' || echo '.env missing'",
    "ls -l /opt/obrportal/.env",
    "docker --version",
    "git --version",
    "test -d /opt/obrportal && echo '/opt/obrportal exists'",
    "test -d /opt/obrportal-backups && echo '/opt/obrportal-backups exists'",
    "ss -tulpen || true",
    "python .\\scripts\\check_production_fact_collection_result.py",
    "python .\\scripts\\check_production_server_preflight_execution.py",
    "python .\\scripts\\check_production_server_facts.py",
    "python .\\scripts\\check_production_rollout_inventory.py",
    "python .\\scripts\\check_production_deployment_runbook.py",
    "python .\\scripts\\check_production_backup_monitoring_checklist.py",
    "python .\\scripts\\check_production_reverse_proxy_checklist.py",
    "python .\\scripts\\check_production_server_checklist.py",
    "python .\\scripts\\check_production_environment_template.py",
    "python .\\scripts\\check_production_deployment_plan.py",
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_production_server_remediation_plan.py",
]

REQUIRED_MARKERS = [
    "This document defines the safe remediation plan required before real ObrPortal rollout to the production server.",
    "It is based on sanitized server facts collected on 2026-05-23 and must not contain passwords, tokens, private keys, production `.env` values or any other secrets.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Stage 8 current checkpoint: `861886c`",
    "| Server | `306733.fornex.cloud` | Public IP: `89.127.203.70`. |",
    "| OS | `Ubuntu 24.04.4 LTS` | Kernel `6.8.0-110-generic`. |",
    "| Docker Engine | `installed` | Docker `29.1.3`. |",
    "| Docker Compose plugin | `missing` | `docker compose` unavailable. |",
    "| Existing container | `amnezia-awg` | Must not be removed or broken. |",
    "| Existing UDP port | `34503/udp` | Used by `amnezia-awg`. |",
    "1. Confirm existing `amnezia-awg` container must remain untouched.",
    "2. Install Docker Compose plugin.",
    "3. Create application and backup directories.",
    "4. Create backup subdirectories.",
    "5. Choose reverse proxy: Nginx or Caddy.",
    "6. Install selected reverse proxy.",
    "7. Create production `.env` manually on the server.",
    "8. Clone repository into `/opt/obrportal`.",
    "9. Checkout the required release tag or approved deployment commit.",
    "10. Run safe verification commands.",
    "- `amnezia-awg` remains running after remediation.",
    "- UDP `34503` remains untouched unless explicitly migrated outside this plan.",
    "- `docker compose version` returns a valid version.",
    "- `/opt/obrportal` exists.",
    "- `/opt/obrportal-backups` exists.",
    "- `/opt/obrportal-backups/env` is restricted.",
    "Production `.env` must be created manually on the server.",
    "- Do not commit `.env`.",
    "- Do not paste `.env` into chat or logs.",
    "- Do not print `.env` with `cat` in shared output.",
    "- Use `docs/production-environment-template.md` as the source checklist.",
    "- Existing `amnezia-awg` container is preserved.",
    "- Docker Compose plugin is available.",
    "- Backup subdirectories exist.",
    "- Reverse proxy decision is made.",
    "- Selected reverse proxy is installed or explicitly deferred.",
    "- Production `.env` creation procedure is documented.",
    "- Production `.env` is not committed.",
    "- Safe verification commands are documented.",
    "- No secrets are committed to Git.",
]


def read_plan() -> str:
    if not PLAN_PATH.exists():
        raise SystemExit("Required production server remediation plan is missing: docs/production-server-remediation-plan.md")

    return PLAN_PATH.read_text(encoding="utf-8")


def get_production_server_remediation_plan_diagnostics(plan_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in plan_text]
    missing_source_documents = [document for document in REQUIRED_SOURCE_DOCUMENTS if f"`{document}`" not in plan_text]
    missing_table_items = [item for item in REQUIRED_TABLE_ITEMS if item not in plan_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in plan_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in plan_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "requiredStage8Checkpoint": REQUIRED_STAGE8_CHECKPOINT,
        "missingSections": missing_sections,
        "missingSourceDocuments": missing_source_documents,
        "missingTableItems": missing_table_items,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections
        and not missing_source_documents
        and not missing_table_items
        and not missing_commands
        and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_server_remediation_plan_diagnostics(read_plan())

    for key in ["missingSections", "missingSourceDocuments", "missingTableItems", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production server remediation plan diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production server remediation plan diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"source_documents={len(REQUIRED_SOURCE_DOCUMENTS)}, "
        f"table_items={len(REQUIRED_TABLE_ITEMS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
