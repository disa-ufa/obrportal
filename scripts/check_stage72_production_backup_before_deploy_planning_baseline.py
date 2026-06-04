from pathlib import Path

DOC = Path("docs/stage72-production-backup-before-deploy-planning-baseline.md")

REQUIRED_MARKERS = [
    "# Stage 72.22 - Production backup-before-deploy planning baseline",
    "Status: baseline",
    "Base develop checkpoint: c263f31",
    "Accepted fact collection result tag: v0.1.0-stage72-production-preflight-fact-collection-execution-result",
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
    "Backup-before-deploy planning scope",
    "Required backup categories",
    "Forbidden backup actions in this stage",
    "Future backup execution constraints",
    "/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "Backup no-go criteria",
    "No production backup was executed.",
    "No production deployment was executed.",
    "No production secrets were printed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.23 - Production backup-before-deploy planning baseline audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.22 production backup-before-deploy planning baseline guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.22 production backup-before-deploy planning baseline guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
