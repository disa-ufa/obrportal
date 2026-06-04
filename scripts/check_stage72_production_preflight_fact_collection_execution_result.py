from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-result.md")

REQUIRED_MARKERS = [
    "# Stage 72.19 - Production preflight fact collection execution result",
    "Status: collected",
    "Base develop checkpoint: 54d0a93",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "host: 306733.fornex.cloud",
    "ssh_target: root@89.127.203.70",
    "project_dir: /opt/obrportal",
    "git_head: 9f358cd",
    "v0.1.0-stage57-production-protected-backup-execution",
    "?? backups/",
    "?? docker-compose.override.yml",
    ".env: yes",
    "docker-compose.override.yml: yes",
    "caddy: active",
    "obrportal-frontend: Up 28 hours, healthy",
    "obrportal-postgres: Up 7 days, healthy",
    "obrportal_minio_data",
    "obrportal_postgres_data",
    "/opt/obrportal/backups: 200K",
    "root_filesystem_use_percent: 43%",
    "amnezia docker marker: yes",
    "amnezia-awg container: present",
    "Any future deployment must preserve `.env`, `docker-compose.override.yml`, Docker volumes and backups.",
    "Any future deployment must not touch `amnezia-awg`.",
    "No production secrets were printed.",
    "No production deployment was executed.",
    "No production services were restarted.",
    "No production data was changed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.20 - Production preflight fact collection execution result audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.19 production preflight fact collection execution result guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.19 production preflight fact collection execution result guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
