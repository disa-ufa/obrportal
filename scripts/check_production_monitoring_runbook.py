from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-monitoring-runbook.md"

REQUIRED_MARKERS = [
    "# Production monitoring smoke runbook",
    "Status: accepted",
    "Stage: 11.3",
    "Production domain: portal.rcdo02.ru",
    "Production hardened tag: v0.1.0-stage10-production-hardened",
    "The monitoring smoke must check production availability without changing production data",
    "Monitoring must be read-only",
    "do not run docker compose down -v",
    "do not delete volumes",
    "do not restart containers during monitoring smoke",
    "do not print .env",
    "do not print passwords",
    "do not print tokens",
    "do not expose internal service ports publicly",
    "https://portal.rcdo02.ru/api/v1/ready returns database=ok, redis=ok, storage=ok",
    "public_root_http=200",
    "public_login_http=200",
    "public_admin_http=200",
    "http://127.0.0.1:5173/healthz returns ok",
    "http://127.0.0.1:8000/api/v1/ready returns database=ok, redis=ok, storage=ok",
    "frontend image is obrportal-frontend-static:prod",
    "frontend command is nginx -g daemon off",
    "frontend health is healthy",
    "frontend restart policy is unless-stopped",
    "Docker service is enabled",
    "Caddy service is active",
    "df -h /",
    "du -sh /opt/obrportal/backups",
    "du -sh /opt/obrportal/tmp",
    "root filesystem usage above 80%",
    "Monitoring must not delete backups automatically",
    "/opt/obrportal/tmp",
    "secrets_printed=no",
    "monitoring report is created",
    "/opt/obrportal/tmp/stage_11_3_1_monitoring_smoke_20260527143628.txt",
    "monitoring_smoke_result=passed",
    "monitoring_smoke_report_created=yes",
    "post_hardening_backup_present=yes",
    "/opt/obrportal/tmp size: 184K",
    "/opt/obrportal/backups size: 92K",
    "root filesystem usage: 40%",
    "backend status: running",
    "minio health: healthy",
    "redis health: healthy",
    "postgres health: healthy",
    "local_backend_ready=ok",
    "local_frontend_healthz=ok",
    "public_ready=ok",
    "production git head after sync: 562b04a",
    "Production monitoring smoke result - 2026-05-27",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Monitoring scope",
    "## 3. Safety rules",
    "## 4. Public endpoint checks",
    "## 5. Local internal checks",
    "## 6. Container checks",
    "## 7. System service checks",
    "## 8. Disk and retention checks",
    "## 9. Evidence",
    "## 10. Acceptance criteria",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")

    missing = [
        marker
        for marker in [*REQUIRED_MARKERS, *REQUIRED_SECTIONS]
        if marker not in text
    ]

    if missing:
        print("production monitoring runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = text.count("do not") + text.count("must not") + text.count("Forbidden")

    if sections < 10:
        raise SystemExit(f"expected at least 10 sections, got {sections}")

    if safety_markers < 8:
        raise SystemExit(f"expected at least 8 safety markers, got {safety_markers}")

    print(
        "production monitoring runbook diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
