from pathlib import Path

DOC = Path("docs/stage73-production-contacts-deploy-result.md")

REQUIRED_MARKERS = [
    "# Stage 73 - Production contacts deploy result",
    "Status: deployed",
    "Base develop checkpoint: fd12874",
    "Implementation tag: v0.1.0-stage73-production-contacts-placeholders-replacement-implementation",
    "Production URL: https://portal.rcdo02.ru",
    "Production contacts URL: https://portal.rcdo02.ru/contacts",
    "Server IP: 89.127.203.70",
    "Server project path: /opt/obrportal",
    "server_head_before=9e0ed0a",
    "server_head_after=fd12874",
    "remote_develop=fd12874",
    "backup_dir=backups/stage73-contacts-deploy-20260606-181016",
    "env_backup=yes",
    "docker_compose_yml_backup=yes",
    "docker_compose_override_backup=yes",
    "postgres_backup=postgres.sql.gz",
    "git_pull_ff_only_origin_develop=yes",
    "docker_compose_build_frontend=yes",
    "docker_compose_up_no_deps_frontend=yes",
    "backend_restarted=no",
    "database_migration_run=no",
    "frontend_container=obrportal-frontend",
    "frontend_status=Up healthy",
    "backend_container=obrportal-backend",
    "postgres_status=Up healthy",
    "redis_status=Up healthy",
    "minio_status=Up healthy",
    "built_frontend_contains_phone=+7 (347) 200 10 17",
    "built_frontend_contains_email=rcdodist@gmail.com",
    "built_frontend_contains_working_hours=Пн-Пт, 09:00-18:00",
    "placeholder_phone_removed=+7 (000) 000-00-00",
    "placeholder_info_email_removed=info@obrportal.local",
    "placeholder_support_email_removed=support@obrportal.local",
    "local_contacts_status=HTTP/1.1 200 OK",
    "public_contacts_status=HTTP/2 200",
    "manual_browser_smoke=passed",
    "visible_phone=+7 (347) 200 10 17",
    "visible_public_email=rcdodist@gmail.com",
    "visible_support_email=rcdodist@gmail.com",
    "visible_working_hours=Пн-Пт, 09:00-18:00",
    "production_database_changed=no",
    "production_backend_restarted=no",
    "production_frontend_rebuilt=yes",
    "production_frontend_restarted=yes",
    "server_untracked_backups_preserved=yes",
    "server_untracked_docker_compose_override_preserved=yes",
    "secrets_printed=no",
    "amnezia_awg_changed=no",
    "Stage 73 production contacts deployment is complete.",
    "The public contacts page displays the confirmed official phone and email values.",
    "The production backup was created and PostgreSQL dump was compressed.",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 73 production contacts deploy result guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 73 production contacts deploy result guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
