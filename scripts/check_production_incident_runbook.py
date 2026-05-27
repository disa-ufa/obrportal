from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-incident-runbook.md"

REQUIRED_MARKERS = [
    "# Production incident response and log retention runbook",
    "Status: drafted",
    "Stage: 11.5",
    "Production domain: portal.rcdo02.ru",
    "Production hardened tag: v0.1.0-stage10-production-hardened",
    "Incident response must preserve production data",
    "do not run docker compose down -v",
    "do not delete production volumes",
    "do not delete database backups",
    "do not restore database dumps over production without approved maintenance window",
    "do not print .env",
    "do not print passwords",
    "do not print tokens",
    "do not commit incident reports containing secrets",
    "do not expose internal service ports publicly",
    "do not hide failed command output",
    "docker compose ps",
    "curl -fsS http://127.0.0.1:8000/api/v1/ready",
    "curl -kfsS https://portal.rcdo02.ru/api/v1/ready",
    "docker compose logs --tail=200 backend",
    "docker compose logs --tail=200 frontend",
    "journalctl -u caddy --no-pager -n 200",
    "frontend image is obrportal-frontend-static:prod",
    "frontend command is nginx -g daemon off",
    "do not delete postgres volume",
    "restart Caddy only if Caddy is inactive",
    "restart frontend only if frontend container is unhealthy",
    "restart backend only if backend is unhealthy",
    "Recovery actions requiring explicit approval",
    "/opt/obrportal/tmp",
    "/opt/obrportal/backups",
    "backups must not be deleted automatically",
    "incident reports must not contain secrets",
    "Safe tmp cleanup policy",
    "rm -rf /opt/obrportal/backups",
    "docker system prune --volumes",
    "docker volume prune",
    "Escalation evidence must include",
    "Incident report format",
    "secrets_printed=no",
    "no secrets are added to repository",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Incident safety rules",
    "## 3. First response checklist",
    "## 4. Evidence collection",
    "## 5. Common incident scenarios",
    "## 6. Recovery policy",
    "## 7. Log retention policy",
    "## 8. Safe tmp cleanup policy",
    "## 9. Escalation policy",
    "## 10. Incident report format",
    "## 11. Acceptance criteria",
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
        print("production incident runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = text.count("do not") + text.count("must not") + text.count("Forbidden")
    evidence_markers = text.count("logs") + text.count("evidence") + text.count("readiness")

    if sections < 11:
        raise SystemExit(f"expected at least 11 sections, got {sections}")

    if safety_markers < 16:
        raise SystemExit(f"expected at least 16 safety markers, got {safety_markers}")

    if evidence_markers < 8:
        raise SystemExit(f"expected at least 8 evidence markers, got {evidence_markers}")

    print(
        "production incident runbook diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"evidence_markers={evidence_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
