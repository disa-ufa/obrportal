from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNBOOK_PATH = ROOT / "docs" / "production-deployment-runbook.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"

REQUIRED_SECTIONS = [
    "# Production deployment runbook",
    "## Purpose",
    "## Release baseline",
    "## Source documents",
    "## Local pre-deployment gate",
    "## Server preparation summary",
    "## Production environment summary",
    "## Backup before deployment",
    "## Deployment order",
    "## Initial seed order",
    "## Reverse proxy and HTTPS",
    "## Post-deployment verification",
    "## Browser verification",
    "## Rollback order",
    "## Final acceptance criteria",
    "## Runbook diagnostics",
]

REQUIRED_SOURCE_DOCUMENTS = [
    "docs/production-deployment-plan.md",
    "docs/production-environment-template.md",
    "docs/production-server-checklist.md",
    "docs/production-reverse-proxy-checklist.md",
    "docs/production-backup-monitoring-checklist.md",
    "docs/release-handoff.md",
    "CHANGELOG.md",
]

REQUIRED_COMMANDS = [
    "python .\\scripts\\secret_scan.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_frontend_api_errors.py",
    "python .\\scripts\\check_frontend_mojibake.py",
    "python .\\scripts\\frontend_guard.py",
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_release_versioning.py",
    "python .\\scripts\\check_release_candidate.py",
    "python .\\scripts\\check_release_tag.py",
    "python .\\scripts\\check_production_deployment_plan.py",
    "python .\\scripts\\check_production_environment_template.py",
    "python .\\scripts\\check_production_server_checklist.py",
    "python .\\scripts\\check_production_reverse_proxy_checklist.py",
    "python .\\scripts\\check_production_backup_monitoring_checklist.py",
    "python .\\scripts\\check_production_deployment_runbook.py",
    "docker compose exec backend pytest app/tests -q",
    "python .\\scripts\\smoke_auth_rbac.py",
    "python .\\scripts\\smoke_document_generation_flow.py",
    "python .\\scripts\\smoke_documents_page.py",
    "python .\\scripts\\smoke_admin_components.py",
    "python .\\scripts\\smoke_frontend_admin_pages.py",
    "python .\\scripts\\smoke_public_pages.py",
    "python .\\scripts\\smoke_account_page.py",
    "python .\\scripts\\smoke_frontend_hooks_layout.py",
    "python .\\scripts\\smoke_frontend_utils_routes.py",
    "python .\\scripts\\smoke_frontend_core.py",
    "python .\\scripts\\check_frontend_smoke_coverage.py",
    "python .\\scripts\\check_backend_smoke_coverage.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "docker compose exec frontend npm run build",
    "python .\\scripts\\check_frontend_bundle_encoding.py",
    "sudo mkdir -p /opt/obrportal",
    "sudo mkdir -p /opt/obrportal-backups",
    "git clone https://github.com/disa-ufa/obrportal.git .",
    "git fetch origin --tags",
    "git checkout v0.1.0-stage6",
    "git rev-list -n 1 v0.1.0-stage6",
    "BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)",
    "cp .env /opt/obrportal-backups/env/env-$BACKUP_TS.backup",
    "chmod 600 /opt/obrportal-backups/env/env-$BACKUP_TS.backup",
    "docker compose exec -T postgres pg_dump -U \"$POSTGRES_USER\" \"$POSTGRES_DB\" > /opt/obrportal-backups/postgres/postgres-$BACKUP_TS.sql",
    "docker compose build",
    "docker compose up -d postgres redis minio",
    "docker compose exec -T backend alembic upgrade head",
    "docker compose up -d backend frontend",
    "docker compose exec -T backend python -m app.db.seed",
    "docker compose exec -T backend python -m app.db.seed_admin",
    "docker compose exec -T backend python -m app.db.seed_org",
    "curl -fsS http://localhost:8000/health",
    "curl -fsS http://localhost:8000/api/v1/ready",
    "curl -fsS https://example.org/health",
    "curl -fsS https://example.org/api/v1/ready",
    "curl -I https://example.org/",
    "curl -I https://example.org/catalog",
    "curl -I https://example.org/admin",
    "curl -I https://example.org/verify-document",
    "docker compose down",
    "git checkout $(cat /opt/obrportal-backups/deployment/commit-YYYYMMDDTHHMMSSZ.txt)",
]

REQUIRED_MARKERS = [
    "This runbook consolidates the production deployment process for ObrPortal after release `v0.1.0-stage6`.",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Production deployment must checkout the release tag, not a moving branch.",
    "Run locally before touching production:",
    "Use `docs/production-server-checklist.md` as the detailed source.",
    "Expected commit:",
    "ac6f339d40567a107dd19f02ec778fbeb5e19971",
    "Use `docs/production-environment-template.md` as the detailed source.",
    "- Production `.env` is created manually on the server.",
    "- Production `.env` is never committed to Git.",
    "- `APP_ENV=production`.",
    "- `APP_VERSION=0.1.0-stage6`.",
    "Use `docs/production-backup-monitoring-checklist.md` as the detailed source.",
    "Use `docs/production-reverse-proxy-checklist.md` as the detailed source.",
    "- Production domain resolves to the server.",
    "- HTTPS certificate is valid.",
    "- Frontend SPA routes fallback to `index.html`.",
    "- `/health` proxies to backend `/health`.",
    "- `/api/v1/ready` proxies to backend `/api/v1/ready`.",
    "Replace `https://example.org` with the real production domain.",
    "- Document generation works.",
    "- Public document verification works.",
    "Database restore must be performed only when schema or data changes require it and only from a verified backup.",
    "- Release tag checkout is confirmed.",
    "- Production `.env` exists only on the server.",
    "- Backups are created before deployment.",
    "- Monitoring commands are documented.",
    "- Rollback path is documented.",
]


def read_runbook() -> str:
    if not RUNBOOK_PATH.exists():
        raise SystemExit("Required production deployment runbook is missing: docs/production-deployment-runbook.md")

    return RUNBOOK_PATH.read_text(encoding="utf-8")


def get_production_deployment_runbook_diagnostics(runbook_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in runbook_text]
    missing_documents = [document for document in REQUIRED_SOURCE_DOCUMENTS if f"`{document}`" not in runbook_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in runbook_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in runbook_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "missingSections": missing_sections,
        "missingSourceDocuments": missing_documents,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections and not missing_documents and not missing_commands and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_deployment_runbook_diagnostics(read_runbook())

    for key in ["missingSections", "missingSourceDocuments", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production deployment runbook diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production deployment runbook diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"source_documents={len(REQUIRED_SOURCE_DOCUMENTS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
