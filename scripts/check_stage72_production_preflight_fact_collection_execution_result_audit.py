from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-result-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.20 - Production preflight fact collection execution result audit",
    "Status: audit",
    "Base develop checkpoint: 92eb8b8",
    "Fact collection result merge commit: 92eb8b8",
    "Stage 72.20 is audit and documentation only.",
    "host: 306733.fornex.cloud",
    "ssh_target: root@89.127.203.70",
    "project_dir: /opt/obrportal",
    "git_head: 9f358cd",
    "v0.1.0-stage57-production-protected-backup-execution",
    ".env: yes",
    "docker-compose.override.yml: yes",
    "backups/: yes",
    "/opt/obrportal/backups: 200K",
    "caddy: active",
    "obrportal-frontend: Up 28 hours, healthy",
    "obrportal-postgres: Up 7 days, healthy",
    "obrportal_minio_data",
    "obrportal_postgres_data",
    "anonymous volumes present: yes",
    "amnezia docker marker: yes",
    "amnezia-awg container: present",
    "Secret-safety audit",
    "Deployment risk audit",
    "No-go audit",
    "The Stage 72.19 production preflight fact collection execution result is safe to accept as a read-only result artifact.",
    "No production secrets were printed.",
    "No production deployment was executed.",
    "No production services were restarted.",
    "No production data was changed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.21 - Production preflight fact collection execution result acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.20 production preflight fact collection execution result audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.20 production preflight fact collection execution result audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
