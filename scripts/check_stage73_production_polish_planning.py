from pathlib import Path

DOC = Path("docs/stage73-production-polish-planning.md")

REQUIRED_MARKERS = [
    "# Stage 73.1 - Production polish planning",
    "Status: planning",
    "Base develop checkpoint: f4cf2cb",
    "Previous release closure tag: v0.1.0-stage72-production-release-closure",
    "stage72_status=closed",
    "stage72_final_tag=v0.1.0-stage72-production-release-closure",
    "production_url=portal.rcdo02.ru",
    "production_application_git_head=9e0ed0a",
    "production_release_closure_head=f4cf2cb",
    "deployment_status=ok",
    "post_deploy_manual_smoke_status=ok",
    "blocking_post_deploy_issues=none",
    "production catalog is empty because production courses/programs count is 0",
    "production organizations/groups/courses/documents/assignments are empty",
    "contacts page contains placeholder data: +7 (000) 000-00-00, info@obrportal.local, support@obrportal.local",
    "there is a disabled user-like record related to Blocked invalid admin seed attempt",
    "RBAC page shows 43 permissions without role bindings",
    "audit table renders rows but is visually tall and has horizontal scrolling",
    "/verify returns not found while /verify-document is the working route",
    "do not touch production before a separate execution authorization stage",
    "do not change production data without backup and rollback plan",
    "separate content changes from code changes",
    "Stage 73.2 - Production contacts placeholders replacement planning",
    "Stage 73.3 - Production content seed plan for organizations and courses",
    "Stage 73.4 - RBAC permission-role bindings review plan",
    "Stage 73.5 - Public verify route redirect plan",
    "Stage 73.6 - Audit table layout polish plan",
    "Stage 73.7 - Disabled invalid admin seed record review plan",
    "Stage 73.8 - Production polish execution readiness checkpoint",
    "phone=+7 (000) 000-00-00",
    "email=info@obrportal.local",
    "support=support@obrportal.local",
    "public_programs=0",
    "organizations=0",
    "groups=0",
    "courses=0",
    "assignments=0",
    "documents=0",
    "permissions=43",
    "/verify should redirect to /verify-document",
    "no production SSH",
    "no production deploy",
    "no production restart",
    "no production migrations",
    "no production database writes",
    "no Docker cleanup",
    "no Amnezia/AWG changes",
    "No production changes are authorized by this planning stage.",
    "Stage 73.2 - Production contacts placeholders replacement planning",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 73.1 production polish planning guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 73.1 production polish planning guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
