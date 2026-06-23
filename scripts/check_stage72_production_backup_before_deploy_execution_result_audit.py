from pathlib import Path

DOC = Path("docs/stage72-production-backup-before-deploy-execution-result-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.37 - Production backup-before-deploy execution result audit",
    "Status: audit",
    "Base develop checkpoint: 9871cee",
    "Backup execution result merge commit: 9871cee",
    "Previous accepted package: v0.1.0-stage72-production-backup-before-deploy-execution-readiness-checkpoint",
    "CONFIRM PRODUCTION BACKUP BEFORE DEPLOY",
    "status=ok",
    "host=306733.fornex.cloud",
    "ssh_target=root@89.127.203.70",
    "project_dir=/opt/obrportal",
    "backup_dir=/opt/obrportal/backups/stage72-before-deploy-20260604-213321",
    "backup_dir_size=144K",
    "postgres.dump: 57478 bytes",
    "postgres-dump-verify.txt: 31 bytes",
    "minio-data.tar.gz: 4536 bytes",
    "sha256sums.txt: 1622 bytes",
    "verification.txt: 416 bytes",
    "postgres.dump verification: ok",
    "final_verification_status: status=ok",
    "/opt/obrportal/backups/stage72-before-deploy-20260604-212214",
    "/opt/obrportal/backups/stage72-before-deploy-20260604-212421",
    "/opt/obrportal/backups/stage72-before-deploy-20260604-212834",
    "/opt/obrportal/backups/stage72-before-deploy-20260604-213015",
    "/opt/obrportal/backups/stage72-before-deploy-20260604-213321",
    "no git pull/fetch/checkout",
    "no docker compose up/down/restart",
    "no migrations",
    "no docker cleanup",
    "no amnezia-awg touch",
    "no .env printing",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "The Stage 72.36 production backup-before-deploy execution result is safe to accept as a result artifact.",
    "The backup is valid because `verification.txt` reports `status=ok`.",
    "No production deployment was executed.",
    "No production service was restarted.",
    "No production migration was executed.",
    "No production Docker cleanup was executed.",
    "No production secrets were printed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.38 - Production backup-before-deploy execution result acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.37 production backup-before-deploy execution result audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.37 production backup-before-deploy execution result audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
