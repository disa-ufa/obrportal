from pathlib import Path

DOC = Path("docs/stage72-production-deployment-execution-result-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.42 - Production deployment execution result acceptance",
    "Status: accepted",
    "Base develop checkpoint: 0dec94b",
    "Deployment execution result merge commit: f370e51",
    "Deployment execution result audit merge commit: 0dec94b",
    "Previous accepted backup package: v0.1.0-stage72-production-backup-before-deploy-execution-result",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "backup_dir=/opt/obrportal/backups/stage72-before-deploy-20260604-213321",
    "backup_verification=status=ok",
    "status=ok",
    "host=306733.fornex.cloud",
    "ssh_target=root@89.127.203.70",
    "project_dir=/opt/obrportal",
    "deployed_git_head=9e0ed0a",
    "deployed_branch=develop",
    "deployment_scope=backend_frontend_only",
    "verification_source=post-deploy diagnostic and final verification",
    "obrportal-backend: Up",
    "obrportal-frontend: Up, healthy",
    "obrportal-postgres: Up, healthy",
    "obrportal-redis: Up, healthy",
    "obrportal-minio: Up, healthy",
    "caddy: active",
    "frontend_http_code=200",
    "backend_docs_http_code=200",
    "backend_openapi_http_code=200",
    "alembic.ini found: running migrations",
    "migrations: ok",
    "Initial backend checks returned connection errors immediately after startup.",
    "Final verification confirmed backend and frontend HTTP checks returned 200.",
    "no docker compose down",
    "no docker system prune",
    "no docker volume rm",
    "no docker compose down -v",
    "no .env printing",
    "no amnezia-awg touch",
    "backend/frontend deploy only",
    ".env: yes",
    "docker-compose.override.yml: yes",
    "backups: yes",
    "amnezia docker marker: present, untouched",
    "Stage 72 production deployment execution result is accepted.",
    "Production is deployed at git head `9e0ed0a`.",
    "Frontend verification passed.",
    "Backend verification passed.",
    "Caddy is active.",
    "The pre-deploy backup remains available.",
    "No production secrets were printed.",
    "No Docker cleanup was executed.",
    "No Docker volumes were removed.",
    "`amnezia-awg` was not touched.",
    "Stage 72.43 - Production deployment execution result package tag",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.42 production deployment execution result acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.42 production deployment execution result acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
