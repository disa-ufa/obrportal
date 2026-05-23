from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHECKLIST_PATH = ROOT / "docs" / "production-reverse-proxy-checklist.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"

REQUIRED_SECTIONS = [
    "# Production reverse proxy checklist",
    "## Purpose",
    "## Release baseline",
    "## Reverse proxy goals",
    "## Domain and DNS checklist",
    "## HTTPS checklist",
    "## Frontend routing requirements",
    "## Backend routing requirements",
    "## Recommended upstreams",
    "## Nginx checklist",
    "## Caddy checklist",
    "## Reverse proxy backup commands",
    "## Production verification commands",
    "## Post-deployment browser verification",
    "## Rollback checklist",
    "## Acceptance criteria",
    "## Checklist diagnostics",
]

REQUIRED_COMMANDS = [
    "sudo nginx -t",
    "sudo systemctl reload nginx",
    "sudo systemctl status nginx --no-pager",
    "caddy validate --config /etc/caddy/Caddyfile",
    "sudo systemctl reload caddy",
    "sudo systemctl status caddy --no-pager",
    "sudo mkdir -p /opt/obrportal-backups/reverse-proxy",
    "date -u +%Y%m%dT%H%M%SZ",
    "sudo cp -a /etc/nginx /opt/obrportal-backups/reverse-proxy/nginx-backup || true",
    "sudo cp -a /etc/caddy /opt/obrportal-backups/reverse-proxy/caddy-backup || true",
    "curl -fsS http://localhost:8000/health",
    "curl -fsS http://localhost:8000/api/v1/ready",
    "docker compose ps",
    "curl -fsS https://example.org/health",
    "curl -fsS https://example.org/api/v1/ready",
    "curl -I https://example.org/",
    "curl -I https://example.org/catalog",
    "curl -I https://example.org/admin",
    "curl -I https://example.org/verify-document",
    "python .\\scripts\\check_production_reverse_proxy_checklist.py",
]

REQUIRED_MARKERS = [
    "This checklist describes the production reverse proxy, HTTPS, domain, routing and verification requirements",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "Production deployment must checkout the release tag, not a moving development branch.",
    "- Serve the frontend through HTTPS.",
    "- Proxy backend API requests to the backend service.",
    "- Keep `/health` and `/api/v1/ready` reachable through the production domain.",
    "- Support SPA fallback to `index.html` for frontend routes.",
    "- Redirect HTTP to HTTPS.",
    "- DNS `A` or `AAAA` record points to the production server.",
    "- HTTPS certificate is issued for the production domain.",
    "- Certificate auto-renewal is enabled.",
    "- `/admin` serves the frontend application.",
    "- Unknown frontend routes fallback to `index.html`.",
    "- `/health` proxies to backend `/health`.",
    "- `/api/v1/ready` proxies to backend `/api/v1/ready`.",
    "- `/api/` proxies to the backend API service.",
    "- Request headers `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto` are preserved.",
    "- Frontend upstream: `http://frontend:5173`",
    "- Backend upstream: `http://backend:8000`.",
    "Replace `https://example.org` with the real production domain.",
    "- Server block for port `80` redirects to HTTPS.",
    "- Server block for port `443` enables SSL.",
    "- Production domain is configured in `Caddyfile`.",
    "- Browser does not show mixed content warnings.",
    "- Page refresh works on nested frontend routes.",
    "- Restore previous reverse proxy configuration from backup.",
    "- Production domain resolves to the server.",
    "- HTTPS certificate is valid.",
    "- Health and readiness endpoints work through the domain.",
]


def read_checklist() -> str:
    if not CHECKLIST_PATH.exists():
        raise SystemExit("Required production reverse proxy checklist is missing: docs/production-reverse-proxy-checklist.md")

    return CHECKLIST_PATH.read_text(encoding="utf-8")


def get_production_reverse_proxy_checklist_diagnostics(checklist_text: str) -> dict[str, object]:
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
    diagnostics = get_production_reverse_proxy_checklist_diagnostics(read_checklist())

    for key in ["missingSections", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production reverse proxy checklist diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production reverse proxy checklist diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
