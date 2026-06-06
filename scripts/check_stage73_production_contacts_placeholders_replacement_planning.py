from pathlib import Path

DOC = Path("docs/stage73-production-contacts-placeholders-replacement-planning.md")

REQUIRED_MARKERS = [
    "# Stage 73.2 - Production contacts placeholders replacement planning",
    "Status: planning",
    "Previous stage: Stage 73.1 - Production polish planning",
    "Base develop checkpoint: d5a4f63",
    "Previous release closure tag: v0.1.0-stage72-production-release-closure",
    "stage72_status=closed",
    "stage72_final_tag=v0.1.0-stage72-production-release-closure",
    "stage73_planning_merge_commit=d5a4f63",
    "production_url=portal.rcdo02.ru",
    "production_application_git_head=9e0ed0a",
    "blocking_post_deploy_issues=none",
    "contacts_page=opened_successfully",
    "phone_placeholder=+7 (000) 000-00-00",
    "public_email_placeholder=info@obrportal.local",
    "support_email_placeholder=support@obrportal.local",
    "The production contacts page is technically available, but it contains placeholder values.",
    "confirm official public phone",
    "confirm official public email",
    "confirm official support email",
    "confirm organization name spelling for the contacts page",
    "confirm public address if shown on the contacts page",
    "confirm working hours if shown on the contacts page",
    "step_1=locate contacts page source files locally",
    "step_2=confirm exact replacement contact values with owner",
    "step_3=replace static placeholders in frontend only if contacts are static",
    "step_6=open PR to develop",
    "step_9=deploy only in a later explicitly authorized production deployment stage",
    "frontend/src/pages/ContactsPage.jsx",
    "Contacts replacement should be treated as a content/UI change, not as a database operation",
    "risk_level=low_if_static_frontend_text_only",
    "placeholder_phone_removed=yes",
    "placeholder_info_email_removed=yes",
    "placeholder_support_email_removed=yes",
    "contacts_page_has_confirmed_official_values=yes",
    "no source code implementation in this planning stage",
    "no production SSH",
    "no production deploy",
    "no production restart",
    "no production migrations",
    "no production database writes",
    "no Docker cleanup",
    "no Amnezia/AWG changes",
    "Exact official contact values must be confirmed before any code change.",
    "No production changes are authorized by this planning stage.",
    "Stage 73.3 - Production contacts placeholders replacement planning audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 73.2 production contacts placeholders replacement planning guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 73.2 production contacts placeholders replacement planning guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
