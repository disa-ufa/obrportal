from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DECISION_PATH = ROOT / "docs" / "production-domain-reverse-proxy-decision.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"
REQUIRED_STAGE7_COMMIT = "c7cd9ac4763bfab9f905b311eaf1ef4df9f30381"
REQUIRED_STAGE8_CHECKPOINT = "27b8588"

REQUIRED_SECTIONS = [
    "# Production domain and reverse proxy decision",
    "## Purpose",
    "## Release baseline",
    "## Source documents",
    "## Current server state",
    "## Domain decision",
    "## Reverse proxy options",
    "## Target routing model",
    "## Port exposure model",
    "## Caddy target configuration outline",
    "## Nginx target configuration outline",
    "## Required decisions before installation",
    "## Safe verification commands",
    "## Acceptance criteria",
    "## Domain/proxy decision diagnostics",
]

REQUIRED_SOURCE_DOCUMENTS = [
    "docs/production-server-facts.md",
    "docs/production-fact-collection-result.md",
    "docs/production-server-remediation-plan.md",
    "docs/production-reverse-proxy-checklist.md",
    "docs/production-deployment-runbook.md",
    "docs/production-environment-template.md",
]

REQUIRED_TABLE_ITEMS = [
    "Server",
    "Docker Engine",
    "Docker Compose",
    "Application directory",
    "Backup directory",
    "Production `.env`",
    "Reverse proxy",
    "Existing container",
    "Existing UDP port",
    "Public HTTP/HTTPS listeners",
    "Production domain",
    "Frontend public URL",
    "Backend public URL",
    "API prefix",
    "Health URL",
    "Readiness URL",
    "DNS A record",
    "DNS AAAA record",
    "Caddy",
    "Nginx",
    "Production domain selected",
    "DNS A record points to `89.127.203.70`",
    "Reverse proxy selected",
    "HTTPS strategy selected",
    "Backend public model selected",
    "Existing `amnezia-awg` preserved",
]

REQUIRED_ROUTES = [
    "| `/` | frontend service | SPA frontend. |",
    "| `/assets/*` | frontend service | Static frontend assets. |",
    "| `/api/*` | backend service | FastAPI routes. |",
    "| `/health` | backend service | Backend health endpoint. |",
    "| `/api/v1/ready` | backend service | Backend readiness endpoint. |",
    "| unknown frontend route | frontend SPA fallback | Required for client-side routes. |",
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
    "`34503/udp`",
]

REQUIRED_COMMANDS = [
    "Resolve-DnsName <production-domain>",
    "Test-NetConnection <production-domain> -Port 80",
    "Test-NetConnection <production-domain> -Port 443",
    "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
    "ss -tulpen || true",
    "curl -I http://127.0.0.1 || true",
    "curl -I http://127.0.0.1:8000/health || true",
    "curl -I http://127.0.0.1:5173 || true",
    "python .\\scripts\\check_production_domain_reverse_proxy_decision.py",
]

REQUIRED_MARKERS = [
    "This document defines the production domain, reverse proxy and HTTPS entrypoint decision before real ObrPortal rollout.",
    "It must not contain passwords, tokens, private keys, production `.env` values, DNS account credentials or any other secrets.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`",
    "- Stage 8 current checkpoint: `27b8588`",
    "| Server | `306733.fornex.cloud` | Public IP: `89.127.203.70`. |",
    "| Docker Compose | `installed` | Compose `2.40.3+ds1-0ubuntu1~24.04.1`. |",
    "| Production `.env` | `missing` | Must be created manually later. |",
    "| Reverse proxy | `not installed yet` | Decision required before installation. |",
    "| Existing container | `amnezia-awg running` | Must not be broken. |",
    "| Existing UDP port | `34503/udp active` | Must not be changed without separate decision. |",
    "| Production domain | `<pending>` | Must point to `89.127.203.70`. |",
    "| Backend public URL | `<pending>` | Same-domain `/api/` is preferred for this rollout. |",
    "| DNS A record | `<pending>` | Domain must resolve to `89.127.203.70`. |",
    "| Caddy | `<recommended>` | Simpler HTTPS automation and compact config. | Requires Caddy installation from package repository. |",
    "| Nginx | `<alternative>` | Common production reverse proxy. | HTTPS automation requires Certbot or provider-specific certificate flow. |",
    "- Use Caddy for first production rollout unless there is an existing operational requirement for Nginx.",
    "- Keep same-domain routing: frontend at `/`, backend under `/api/`, health at `/health`, readiness at `/api/v1/ready`.",
    "- Do not expose backend, PostgreSQL, Redis or MinIO ports publicly.",
    "Use only after the production domain is selected and DNS points to the server.",
    "<production-domain> {",
    "reverse_proxy 127.0.0.1:8000",
    "reverse_proxy 127.0.0.1:5173",
    "server_name <production-domain>;",
    "proxy_pass http://127.0.0.1:8000/api/;",
    "proxy_pass http://127.0.0.1:5173;",
    "| Backend public model selected | `same-domain /api/` | Preferred. |",
    "| Existing `amnezia-awg` preserved | `required` | Must remain untouched. |",
    "- Production domain decision is documented.",
    "- DNS A record requirement is documented.",
    "- Reverse proxy decision is documented.",
    "- HTTPS strategy is documented.",
    "- Same-domain API routing model is documented.",
    "- Public/private port exposure model is documented.",
    "- Existing `amnezia-awg` and UDP `34503` preservation is documented.",
    "- No secrets are committed to Git.",
]


def read_decision() -> str:
    if not DECISION_PATH.exists():
        raise SystemExit(
            "Required production domain and reverse proxy decision document is missing: "
            "docs/production-domain-reverse-proxy-decision.md"
        )

    return DECISION_PATH.read_text(encoding="utf-8")


def get_production_domain_reverse_proxy_decision_diagnostics(decision_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in decision_text]
    missing_source_documents = [document for document in REQUIRED_SOURCE_DOCUMENTS if f"`{document}`" not in decision_text]
    missing_table_items = [item for item in REQUIRED_TABLE_ITEMS if item not in decision_text]
    missing_routes = [route for route in REQUIRED_ROUTES if route not in decision_text]
    missing_ports = [port for port in REQUIRED_PORTS if port not in decision_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in decision_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in decision_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "requiredStage7Commit": REQUIRED_STAGE7_COMMIT,
        "requiredStage8Checkpoint": REQUIRED_STAGE8_CHECKPOINT,
        "missingSections": missing_sections,
        "missingSourceDocuments": missing_source_documents,
        "missingTableItems": missing_table_items,
        "missingRoutes": missing_routes,
        "missingPorts": missing_ports,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections
        and not missing_source_documents
        and not missing_table_items
        and not missing_routes
        and not missing_ports
        and not missing_commands
        and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_domain_reverse_proxy_decision_diagnostics(read_decision())

    for key in [
        "missingSections",
        "missingSourceDocuments",
        "missingTableItems",
        "missingRoutes",
        "missingPorts",
        "missingCommands",
        "missingMarkers",
    ]:
        if diagnostics[key]:
            print(f"Production domain reverse proxy decision diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production domain reverse proxy decision diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"source_documents={len(REQUIRED_SOURCE_DOCUMENTS)}, "
        f"table_items={len(REQUIRED_TABLE_ITEMS)}, "
        f"routes={len(REQUIRED_ROUTES)}, "
        f"ports={len(REQUIRED_PORTS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
