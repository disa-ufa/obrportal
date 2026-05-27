from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-release-runbook.md"

REQUIRED_MARKERS = [
    "# Production release runbook",
    "Status: accepted",
    "Stage: 11.4",
    "Production domain: portal.rcdo02.ru",
    "Production hardened tag: v0.1.0-stage10-production-hardened",
    "A production release must update the server only after local checks",
    "do not force push to main",
    "do not deploy from an uncommitted working tree",
    "do not deploy if CI is red",
    "do not print .env",
    "do not print passwords",
    "do not print tokens",
    "do not commit server-only docker-compose.override.yml",
    "do not run docker compose down -v",
    "do not delete production volumes",
    "do not expose internal service ports publicly",
    "python scripts/check_production_monitoring_runbook.py",
    "python scripts/check_production_restore_drill_runbook.py",
    "python scripts/check_production_operations_runbook.py",
    "python scripts/check_frontend_static_serving.py",
    "python scripts/check_production_frontend_static_runbook.py",
    "python scripts/check_ci_local_gate.py",
    "python scripts/check_text_encoding.py",
    "python scripts/check_source_bom.py",
    "docker compose exec frontend npm run build",
    "docker compose exec backend pytest app/tests -q",
    "CI must be green before production sync",
    "allowed server-only files include docker-compose.override.yml, tmp/ and backups/",
    "docker compose exec -T backend alembic upgrade head",
    "manual schema edits",
    "dropping production database",
    "prefer targeted docker compose up -d --build backend frontend",
    "preserve docker-compose.override.yml",
    "frontend remains obrportal-frontend-static:prod",
    "frontend command remains nginx -g daemon off",
    "ports remain bound to 127.0.0.1 only",
    "http://127.0.0.1:5173/healthz returns ok",
    "https://portal.rcdo02.ru/api/v1/ready returns database=ok, redis=ok, storage=ok",
    "Rollback must be planned before risky release",
    "restore database backup only in a separate approved maintenance window",
    "/opt/obrportal/tmp",
    "secrets_printed=no",
    "release report is created",
    "/opt/obrportal/tmp/stage_11_4_1_release_runbook_server_check_20260527145103.txt",
    "release_runbook_server_check=passed",
    "Caddy service was enabled and active",
    "Docker service was enabled and active",
    "internal ports 5173, 8000, 5432, 6379, 9000 and 9001 were bound to 127.0.0.1",
    "public /admin returned HTTP 200",
    "public /login returned HTTP 200",
    "public / returned HTTP 200",
    "alembic heads: 6421_org_doc_profile (head)",
    "alembic current: 6421_org_doc_profile (head)",
    "server git status contained only allowed server-only files",
    "production release runbook guard passed",
    "production git head after sync: 6971ec7",
    "Server release runbook check result - 2026-05-27",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Release safety rules",
    "## 3. Local pre-release checklist",
    "## 4. CI gate",
    "## 5. Server preflight",
    "## 6. Database migration policy",
    "## 7. Runtime update policy",
    "## 8. Post-release smoke",
    "## 9. Rollback policy",
    "## 10. Release evidence",
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
        print("production release runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = text.count("do not") + text.count("Forbidden") + text.count("must")

    if sections < 11:
        raise SystemExit(f"expected at least 11 sections, got {sections}")

    if safety_markers < 14:
        raise SystemExit(f"expected at least 14 safety markers, got {safety_markers}")

    print(
        "production release runbook diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
