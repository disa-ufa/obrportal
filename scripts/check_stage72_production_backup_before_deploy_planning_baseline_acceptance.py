from pathlib import Path

DOC = Path("docs/stage72-production-backup-before-deploy-planning-baseline-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.24 - Production backup-before-deploy planning baseline acceptance",
    "Status: accepted",
    "Base develop checkpoint: d55561e",
    "Backup planning baseline merge commit: af64961",
    "Backup planning baseline audit merge commit: d55561e",
    "Accepted fact collection result tag: v0.1.0-stage72-production-preflight-fact-collection-execution-result",
    "Stage 72.24 accepts the production backup-before-deploy planning baseline package.",
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
    "Accepted backup-before-deploy scope",
    "Accepted required backup categories",
    "Accepted backup destination",
    "/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/",
    "Accepted secret-safety rules",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "Accepted backup no-go criteria",
    "Stage 72 production backup-before-deploy planning baseline is accepted.",
    "No production backup was executed.",
    "No production deployment was executed.",
    "No production secrets were printed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.25 - Production backup-before-deploy planning package tag",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.24 production backup-before-deploy planning baseline acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.24 production backup-before-deploy planning baseline acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
