from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PREFLIGHT_PATH = ROOT / "docs" / "production-server-preflight-execution.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"
REQUIRED_STAGE8_INVENTORY_COMMIT = "415f3dd"
REQUIRED_STAGE8_SERVER_FACTS_COMMIT = "f2b1d13"

REQUIRED_SECTIONS = [
    "# Production server preflight execution",
    "## Purpose",
    "## Release baseline",
    "## Source documents",
    "## Local preflight before server access",
    "## Server access preflight",
    "## Server capacity preflight",
    "## Docker and Git preflight",
    "## Directory preflight",
    "## Network and port preflight",
    "## Reverse proxy preflight",
    "## Production `.env` preflight",
    "## Backup preflight",
    "## Fact update workflow",
    "## Acceptance criteria",
    "## Preflight diagnostics",
]

REQUIRED_SOURCE_DOCUMENTS = [
    "docs/production-rollout-inventory.md",
    "docs/production-server-facts.md",
    "docs/production-deployment-runbook.md",
    "docs/production-environment-template.md",
    "docs/production-server-checklist.md",
    "docs/production-reverse-proxy-checklist.md",
    "docs/production-backup-monitoring-checklist.md",
]

REQUIRED_COMMANDS = [
    "git status --short",
    "git branch -vv",
    "git log --oneline --decorate -10",
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
    "python .\\scripts\\check_production_server_preflight_execution.py",
    "whoami",
    "pwd",
    "hostname",
    "hostnamectl || true",
    "uname -a",
    "id",
    "df -h",
    "free -h",
    "uptime",
    "docker --version",
    "docker compose version",
    "git --version",
    "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' || true",
    "test -d /opt/obrportal && echo '/opt/obrportal exists' || echo '/opt/obrportal missing'",
    "test -d /opt/obrportal-backups && echo '/opt/obrportal-backups exists' || echo '/opt/obrportal-backups missing'",
    "ls -ld /opt /opt/obrportal /opt/obrportal-backups 2>/dev/null || true",
    "ss -tulpen || true",
    "curl -I http://127.0.0.1 2>/dev/null || true",
    "curl -I http://127.0.0.1:8000/health 2>/dev/null || true",
    "curl -I http://127.0.0.1:5173 2>/dev/null || true",
    "nginx -v 2>&1 || true",
    "sudo nginx -t || true",
    "systemctl status nginx --no-pager || true",
    "caddy version || true",
    "caddy validate --config /etc/caddy/Caddyfile || true",
    "systemctl status caddy --no-pager || true",
    "test -f /opt/obrportal/.env && echo '.env exists' || echo '.env missing'",
    "ls -l /opt/obrportal/.env 2>/dev/null || true",
    "test -d /opt/obrportal-backups && echo 'backup root exists' || echo 'backup root missing'",
    "find /opt/obrportal-backups -maxdepth 2 -type d 2>/dev/null | sort || true",
]

REQUIRED_MARKERS = [
    "This document describes the safe execution order for collecting non-secret production server facts before real ObrPortal deployment.",
    "It must not contain passwords, tokens, private keys, production `.env` values or any other secrets.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Stage 8 rollout inventory checkpoint: `415f3dd`",
    "- Stage 8 server facts checkpoint: `f2b1d13`",
    "Run locally before connecting to the production server:",
    "Run on the production server and record only non-secret results in `docs/production-server-facts.md`:",
    "Record only capacity summary, not sensitive operational data.",
    "Expected production exposure model:",
    "- `22` restricted public SSH.",
    "- `80` public HTTP redirect.",
    "- `443` public HTTPS.",
    "- `8000` private or reverse proxy only.",
    "- `5173` private or reverse proxy only.",
    "- `5432` private only.",
    "- `6379` private only.",
    "- `9000` restricted or private.",
    "- `9001` restricted or private.",
    "Run only commands that match the selected reverse proxy.",
    "Do not print `.env` content.",
    "Never run `cat /opt/obrportal/.env` in shared logs.",
    "- update only non-secret fields in `docs/production-server-facts.md`;",
    "- keep `<pending>` for unknown facts;",
    "- do not commit passwords, tokens, private keys or `.env` values;",
    "- commit the updated facts document in `develop`.",
    "- `.env` preflight avoids printing secret values.",
    "- No secrets are committed to Git.",
]


def read_preflight() -> str:
    if not PREFLIGHT_PATH.exists():
        raise SystemExit("Required production server preflight execution document is missing: docs/production-server-preflight-execution.md")

    return PREFLIGHT_PATH.read_text(encoding="utf-8")


def get_production_server_preflight_execution_diagnostics(preflight_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in preflight_text]
    missing_source_documents = [document for document in REQUIRED_SOURCE_DOCUMENTS if f"`{document}`" not in preflight_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in preflight_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in preflight_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "requiredStage8InventoryCommit": REQUIRED_STAGE8_INVENTORY_COMMIT,
        "requiredStage8ServerFactsCommit": REQUIRED_STAGE8_SERVER_FACTS_COMMIT,
        "missingSections": missing_sections,
        "missingSourceDocuments": missing_source_documents,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections and not missing_source_documents and not missing_commands and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_server_preflight_execution_diagnostics(read_preflight())

    for key in ["missingSections", "missingSourceDocuments", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production server preflight execution diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production server preflight execution diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"source_documents={len(REQUIRED_SOURCE_DOCUMENTS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
