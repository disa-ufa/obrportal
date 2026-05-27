from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-operations-runbook.md"

REQUIRED_MARKERS = [
    "# Production operations runbook",
    "Status: drafted",
    "Stage: 11",
    "Production domain: portal.rcdo02.ru",
    "Production hardened tag: v0.1.0-stage10-production-hardened",
    "public entrypoint is Caddy on 80/tcp and 443/tcp",
    "frontend runs as static nginx image obrportal-frontend-static:prod",
    "internal service ports are bound to 127.0.0.1 only",
    "PostgreSQL custom-format dump",
    "docker-compose.override.yml server-only file",
    "metadata without secrets",
    "do not print .env",
    "do not print passwords",
    "do not commit server-only override",
    "Restore drill must be performed in an isolated environment only",
    "docker compose down -v",
    "deleting production volumes",
    "force push to main",
    "manual database schema edits",
    "https://portal.rcdo02.ru/api/v1/ready",
    "frontend container health is healthy",
    "Docker service is active",
    "Caddy service is active",
    "df -h",
    "du -sh /opt/obrportal/backups",
    "capture backend and frontend logs",
    "incident response baseline",
    "no secrets are added to repository",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Accepted production baseline",
    "## 3. Backup policy",
    "## 4. Restore drill policy",
    "## 5. Production update policy",
    "## 6. Monitoring baseline",
    "## 7. Log and disk baseline",
    "## 8. Incident response baseline",
    "## 9. Acceptance criteria for Stage 11 baseline",
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
        print("production operations runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = text.count("do not") + text.count("Forbidden") + text.count("must not")

    if sections < 9:
        raise SystemExit(f"expected at least 9 sections, got {sections}")

    if safety_markers < 8:
        raise SystemExit(f"expected at least 8 safety markers, got {safety_markers}")

    print(
        "production operations runbook diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
