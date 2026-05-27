from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-frontend-static-runbook.md"

REQUIRED_MARKERS = [
    "# Production frontend static serving runbook",
    "Status: accepted",
    "Stage: 10.12",
    "Production domain: portal.rcdo02.ru",
    "Vite dev frontend server",
    "static nginx frontend serving",
    "frontend/Dockerfile.prod",
    "frontend/nginx.conf",
    "scripts/check_frontend_static_serving.py",
    "docker build -f frontend/Dockerfile.prod -t obrportal-frontend-static:test ./frontend",
    "/opt/obrportal/docker-compose.override.yml",
    "dockerfile: Dockerfile.prod",
    "image: obrportal-frontend-static:prod",
    '"127.0.0.1:5173:5173"',
    "volumes: []",
    "command: null",
    "docker compose build frontend",
    "docker compose up -d frontend",
    "curl -fsS http://127.0.0.1:5173/healthz",
    "curl -kfsS https://portal.rcdo02.ru/api/v1/ready",
    "production admin login works",
    "docker compose down -v",
    "volume deletion",
    "database restore",
    "MinIO restore",
    "Caddy remains public HTTPS entrypoint",
    "static_frontend_enabled=yes",
    "Production switch result - 2026-05-26",
    "Caddy systemd service: enabled and active",
    "Docker systemd service: enabled and active",
    "frontend restart policy: unless-stopped",
    "static_frontend_stable=yes",
    "restart_policy_applied=yes",
    "static_frontend_persistent=yes",
    "Autostart persistence result - 2026-05-26",
    "frontend restart",
    "backend restart",
    "postgres restart",
    "frontend health after stable check: healthy",
    "static_frontend_healthy_after_restart=yes",
    "controlled_restart_stable=yes",
    "static_frontend_after_restart=yes",
    "controlled_restart_verified=yes",
    "Controlled restart verification result - 2026-05-27",
    "public_surface_audit_server_side=passed",
    "external_internal_ports_closed=yes",
    "compose_ports_localhost_only=yes",
    "Docker Compose published ports are bound to 127.0.0.1 only",
    "9001/tcp MinIO console: closed",
    "9000/tcp MinIO API: closed",
    "6379/tcp Redis: closed",
    "5432/tcp Postgres: closed",
    "8000/tcp backend internal: closed",
    "5173/tcp frontend internal: closed",
    "443/tcp HTTPS/Caddy: open",
    "22/tcp SSH: open",
    "Production public surface audit result - 2026-05-27",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current production issue",
    "## 3. Target production state",
    "## 4. Repository artifacts",
    "## 5. Server-only override template",
    "## 6. Pre-switch checks",
    "## 7. Switch procedure",
    "## 8. Post-switch smoke",
    "## 9. Rollback",
    "## 10. Acceptance criteria",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")
    missing = [marker for marker in [*REQUIRED_MARKERS, *REQUIRED_SECTIONS] if marker not in text]

    if missing:
        print("production frontend static runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    commands = text.count("docker ") + text.count("curl ") + text.count("python ")
    safety_markers = text.count("Do not") + text.count("must not") + text.count("not printed")

    if sections < 10:
        raise SystemExit(f"expected at least 10 sections, got {sections}")

    if commands < 10:
        raise SystemExit(f"expected at least 10 command markers, got {commands}")

    if safety_markers < 4:
        raise SystemExit(f"expected at least 4 safety markers, got {safety_markers}")

    print(
        "production frontend static runbook diagnostics passed: "
        f"sections={sections}, commands={commands}, "
        f"safety_markers={safety_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
