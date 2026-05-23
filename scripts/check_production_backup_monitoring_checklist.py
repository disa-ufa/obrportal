from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHECKLIST_PATH = ROOT / "docs" / "production-backup-monitoring-checklist.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"

REQUIRED_SECTIONS = [
    "# Production backup monitoring checklist",
    "## Purpose",
    "## Release baseline",
    "## Backup goals",
    "## Backup scope",
    "## Backup directories",
    "## Backup preparation commands",
    "## PostgreSQL backup commands",
    "## PostgreSQL restore commands",
    "## Object storage backup checklist",
    "## Environment backup commands",
    "## Deployment metadata commands",
    "## Reverse proxy backup commands",
    "## Monitoring checklist",
    "## Monitoring commands",
    "## Maintenance checklist",
    "## Incident response checklist",
    "## Rollback readiness checklist",
    "## Acceptance criteria",
    "## Checklist diagnostics",
]

REQUIRED_COMMANDS = [
    "sudo mkdir -p /opt/obrportal-backups/postgres",
    "sudo mkdir -p /opt/obrportal-backups/storage",
    "sudo mkdir -p /opt/obrportal-backups/env",
    "sudo mkdir -p /opt/obrportal-backups/reverse-proxy",
    "sudo mkdir -p /opt/obrportal-backups/deployment",
    "sudo chown -R $USER:$USER /opt/obrportal-backups",
    "BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)",
    "docker compose exec -T postgres pg_dump -U \"$POSTGRES_USER\" \"$POSTGRES_DB\" > /opt/obrportal-backups/postgres/postgres-$BACKUP_TS.sql",
    "ls -lh /opt/obrportal-backups/postgres/postgres-$BACKUP_TS.sql",
    "docker compose stop backend frontend",
    "cat /opt/obrportal-backups/postgres/postgres-YYYYMMDDTHHMMSSZ.sql | docker compose exec -T postgres psql -U \"$POSTGRES_USER\" \"$POSTGRES_DB\"",
    "docker compose start backend frontend",
    "curl -fsS http://localhost:8000/health",
    "curl -fsS http://localhost:8000/api/v1/ready",
    "cp .env /opt/obrportal-backups/env/env-$BACKUP_TS.backup",
    "chmod 600 /opt/obrportal-backups/env/env-$BACKUP_TS.backup",
    "git rev-parse HEAD > /opt/obrportal-backups/deployment/commit-$BACKUP_TS.txt",
    "git describe --tags --always > /opt/obrportal-backups/deployment/version-$BACKUP_TS.txt",
    "docker compose ps > /opt/obrportal-backups/deployment/compose-ps-$BACKUP_TS.txt",
    "sudo cp -a /etc/nginx /opt/obrportal-backups/reverse-proxy/nginx-$BACKUP_TS || true",
    "sudo cp -a /etc/caddy /opt/obrportal-backups/reverse-proxy/caddy-$BACKUP_TS || true",
    "docker compose ps",
    "docker compose logs --tail=100 backend",
    "docker compose logs --tail=100 frontend",
    "df -h",
    "python .\\scripts\\check_production_backup_monitoring_checklist.py",
]

REQUIRED_MARKERS = [
    "This checklist describes production backup, monitoring, maintenance and incident response requirements",
    "- Release tag: `v0.1.0-stage6`",
    "- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "- Production deployment must keep backups and monitoring outside disposable container lifecycle.",
    "- Keep recoverable PostgreSQL backups.",
    "- Keep recoverable object storage backups.",
    "- Keep production `.env` backup in a secure location.",
    "- Keep reverse proxy configuration backup.",
    "- Verify backup restore procedure on a staging or production-like environment.",
    "- Backup root: `/opt/obrportal-backups`",
    "- Database backups: `/opt/obrportal-backups/postgres`",
    "- Storage backups: `/opt/obrportal-backups/storage`",
    "- Environment backups: `/opt/obrportal-backups/env`",
    "- Reverse proxy backups: `/opt/obrportal-backups/reverse-proxy`",
    "- Deployment metadata: `/opt/obrportal-backups/deployment`",
    "Restore only from a verified backup and only after stopping application traffic:",
    "- Identify whether storage is MinIO volume, S3 bucket or provider-managed object storage.",
    "- Monitor backend health endpoint `/health`.",
    "- Monitor readiness endpoint `/api/v1/ready`.",
    "- Monitor frontend HTTPS availability.",
    "- Monitor PostgreSQL container status.",
    "- Monitor Redis container status.",
    "- Monitor object storage availability.",
    "- Monitor disk usage.",
    "- Monitor certificate expiration.",
    "- Review backups regularly.",
    "- Test restore procedure on staging or production-like environment.",
    "- Rotate temporary administrator credentials.",
    "- Record incident timestamp.",
    "- Decide whether rollback is required.",
    "- PostgreSQL backup is available.",
    "- Storage backup is available.",
    "- `.env` backup is available.",
    "- Reverse proxy config backup is available.",
    "- Rollback commands are documented in `docs/production-server-checklist.md`.",
]


def read_checklist() -> str:
    if not CHECKLIST_PATH.exists():
        raise SystemExit("Required production backup monitoring checklist is missing: docs/production-backup-monitoring-checklist.md")

    return CHECKLIST_PATH.read_text(encoding="utf-8")


def get_production_backup_monitoring_checklist_diagnostics(checklist_text: str) -> dict[str, object]:
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
    diagnostics = get_production_backup_monitoring_checklist_diagnostics(read_checklist())

    for key in ["missingSections", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production backup monitoring checklist diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production backup monitoring checklist diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
