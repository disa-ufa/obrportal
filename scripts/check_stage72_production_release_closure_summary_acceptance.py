from pathlib import Path

DOC = Path("docs/stage72-production-release-closure-summary-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.50 - Production release closure summary acceptance",
    "Status: accepted",
    "Base develop checkpoint: d29eecf",
    "Closure summary merge commit: e40ab7d",
    "Closure summary audit merge commit: d29eecf",
    "stage72_production_backup_before_deploy=done",
    "stage72_production_deployment_execution=done",
    "stage72_production_post_deploy_manual_smoke=done",
    "stage72_closure_summary=accepted",
    "v0.1.0-stage72-production-backup-before-deploy-execution-result",
    "v0.1.0-stage72-production-deployment-execution-result",
    "v0.1.0-stage72-production-post-deploy-manual-smoke-result",
    "production_url=portal.rcdo02.ru",
    "production_application_git_head=9e0ed0a",
    "production_develop_documentation_head=d29eecf",
    "deployment_scope=backend_frontend_only",
    "deployment_status=ok",
    "post_deploy_manual_smoke_status=ok",
    "closure_summary_status=accepted",
    "backup_dir=/opt/obrportal/backups/stage72-before-deploy-20260604-213321",
    "backup_verification=status=ok",
    "postgres_dump=created_and_verified",
    "minio_volume_backup=created",
    "frontend_http_code=200",
    "backend_docs_http_code=200",
    "backend_openapi_http_code=200",
    "caddy=active",
    "obrportal-backend=up",
    "obrportal-frontend=up_healthy",
    "obrportal-postgres=up_healthy",
    "obrportal-redis=up_healthy",
    "obrportal-minio=up_healthy",
    "amnezia-awg=present_untouched",
    "main_page=ok",
    "catalog_page=ok_public_programs_0",
    "admin_login=ok",
    "admin_users=ok_users_3",
    "admin_roles=ok_roles_9",
    "admin_permissions=ok_permissions_43",
    "admin_audit=ok_audit_events_50",
    "verify_document=ok_missing_document_returns_not_found",
    "guest_admin_access=redirects_to_login",
    "no_docker_compose_down",
    "no_docker_compose_down_v",
    "no_docker_system_prune",
    "no_docker_volume_rm",
    "no_production_secrets_printed",
    "no_amnezia_awg_touch",
    "production catalog is empty because production courses/programs count is 0",
    "contacts page contains placeholder data: +7 (000) 000-00-00, info@obrportal.local, support@obrportal.local",
    "RBAC page shows 43 permissions without role bindings",
    "/verify returns not found while /verify-document is the working route",
    "Stage 73.1 - replace public contacts placeholders",
    "Stage 73.2 - decide production seed/content plan for organizations and courses",
    "Stage 73.3 - review RBAC permission-role bindings",
    "Stage 73.4 - decide whether to add /verify redirect to /verify-document",
    "The Stage 72 production release closure summary is accepted.",
    "No blocking post-deploy issues were found.",
    "All observed remaining items are content, configuration, RBAC, routing convenience, or UI polish tasks for Stage 73.",
    "Stage 72 is ready for final closure package tagging after local checks pass.",
    "Stage 72.51 - Production release closure package tag",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.50 production release closure summary acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.50 production release closure summary acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
