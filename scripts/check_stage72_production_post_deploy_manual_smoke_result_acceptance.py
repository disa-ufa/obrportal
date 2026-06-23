from pathlib import Path

DOC = Path("docs/stage72-production-post-deploy-manual-smoke-result-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.46 - Production post-deploy manual smoke result acceptance",
    "Status: accepted",
    "Base develop checkpoint: b3d1165",
    "Manual smoke result merge commit: 52d1f7b",
    "Manual smoke result audit merge commit: b3d1165",
    "Production deployment package tag: v0.1.0-stage72-production-deployment-execution-result",
    "Production backup package tag: v0.1.0-stage72-production-backup-before-deploy-execution-result",
    "Production application git head: 9e0ed0a",
    "portal.rcdo02.ru",
    "status=ok",
    "manual_browser_check=completed",
    "production_application_git_head=9e0ed0a",
    "/catalog: opened successfully, public programs count is 0",
    "/admin after login: opened successfully",
    "/admin/users: opened successfully, users count is 3",
    "/admin/organizations: opened successfully, organizations count is 0",
    "/admin/courses: opened successfully, courses count is 0",
    "/admin/documents: opened successfully, documents count is 0",
    "/admin/roles: opened successfully, roles count is 9",
    "/admin/permissions: opened successfully, permissions count is 43",
    "/admin/audit-events: opened successfully, audit events count is 50",
    "admin login: successful",
    "admin api loaded: yes",
    "authenticated badge: visible",
    "/admin as guest: redirected to /login",
    "registration to login navigation: works",
    "route=/verify-document",
    "test_query=TEST-NOT-FOUND-123",
    "result=not_found",
    "message=Документ не найден",
    "public_programs=0",
    "users=3",
    "organizations=0",
    "groups=0",
    "courses=0",
    "assignments=0",
    "documents=0",
    "roles=9",
    "permissions=43",
    "audit_events=50",
    "contacts page contains placeholder data: +7 (000) 000-00-00, info@obrportal.local, support@obrportal.local",
    "there is a disabled user-like record related to Blocked invalid admin seed attempt",
    "RBAC page shows 43 permissions without role bindings",
    "/verify returns not found while /verify-document is the working route",
    "no SSH commands were executed in this stage",
    "no production deployment was executed in this stage",
    "no production restart was executed in this stage",
    "no production migrations were executed in this stage",
    "Stage 72 production post-deploy manual smoke result is accepted.",
    "No blocking post-deploy browser issues were found.",
    "The observed empty catalog and placeholder contacts are content/data tasks, not deployment blockers.",
    "Stage 72.47 - Production post-deploy manual smoke result package tag",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.46 production post-deploy manual smoke result acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.46 production post-deploy manual smoke result acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
