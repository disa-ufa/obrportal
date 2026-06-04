from pathlib import Path

DOC = Path("docs/stage72-production-backup-before-deploy-execution-authorization-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.29 - Production backup-before-deploy execution authorization audit",
    "Status: audit",
    "Base develop checkpoint: f63e687",
    "Backup execution authorization merge commit: f63e687",
    "Previous accepted package: v0.1.0-stage72-production-backup-before-deploy-execution-preparation",
    "host: 306733.fornex.cloud",
    "ssh_target: root@89.127.203.70",
    "project_dir: /opt/obrportal",
    "production_git_head: 9f358cd",
    "v0.1.0-stage57-production-protected-backup-execution",
    ".env: yes",
    "docker-compose.override.yml: yes",
    "backups/: yes",
    "/opt/obrportal/backups: 200K",
    "obrportal-frontend: Up 28 hours, healthy",
    "obrportal-postgres: Up 7 days, healthy",
    "obrportal_minio_data",
    "obrportal_postgres_data",
    "amnezia docker marker: yes",
    "amnezia-awg container: present",
    "CONFIRM PRODUCTION BACKUP BEFORE DEPLOY",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/",
    "Future authorized backup artifacts audit",
    "postgres.dump",
    "sha256sums.txt",
    "Future authorized backup-only actions audit",
    "Forbidden actions audit",
    "Secret-safety audit",
    "No production backup was executed.",
    "No production deployment was executed.",
    "No production secrets were printed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.30 - Production backup-before-deploy execution authorization acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.29 production backup-before-deploy execution authorization audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.29 production backup-before-deploy execution authorization audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
