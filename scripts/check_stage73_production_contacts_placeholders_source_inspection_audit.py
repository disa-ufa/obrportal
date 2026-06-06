from pathlib import Path

DOC = Path("docs/stage73-production-contacts-placeholders-source-inspection-audit.md")

REQUIRED_MARKERS = [
    "# Stage 73.7 - Production contacts placeholders source inspection audit",
    "Status: audit",
    "Previous stage: Stage 73.6 - Production contacts placeholders source inspection result",
    "Base develop checkpoint: 8ba4b46",
    "Contacts placeholders source inspection result merge commit: 8ba4b46",
    "Previous planning tag: v0.1.0-stage73-production-contacts-placeholders-replacement-planning",
    "develop_head=8ba4b46",
    "stage72_closure_tag=v0.1.0-stage72-production-release-closure",
    "stage73_contacts_planning_tag=v0.1.0-stage73-production-contacts-placeholders-replacement-planning",
    "contacts_source_inspection_result_merge_commit=8ba4b46",
    "production_url=portal.rcdo02.ru",
    "production_application_git_head=9e0ed0a",
    "primary_contacts_source=frontend/src/pages/ContactsPage.jsx",
    "contacts_route_source=frontend/src/routes/PublicRoutes.jsx",
    "contacts_meta_source=frontend/src/utils/publicRoutes.js",
    "contacts_dashboard_smoke_links=frontend/src/pages/DashboardPage.jsx",
    "phone_placeholder=+7 (000) 000-00-00",
    "public_email_placeholder=info@obrportal.local",
    "support_email_placeholder=support@obrportal.local",
    "file=frontend/src/pages/ContactsPage.jsx",
    "component=ContactsPage",
    "phone_placeholder_line=ContactCard title=\"Телефон\" value=\"+7 (000) 000-00-00\"",
    "public_email_placeholder_line=ContactCard title=\"E-mail\" value=\"info@obrportal.local\"",
    "support_email_placeholder_line=ContactCard title=\"Поддержка\" value=\"support@obrportal.local\"",
    "working_hours_line=ContactCard title=\"Режим работы\" value=\"Пн-Пт, 09:00-18:00\"",
    "contacts_route_path=/contacts",
    "contacts_route_element=ContactsPage",
    "contacts_route=/contacts",
    "contacts_title=Контакты - ObrPortal",
    "public_contacts_meta_link=/contacts",
    "public_pages_smoke_link=/contacts",
    "The Stage 73.6 source inspection result is complete and consistent with the local search output.",
    "The placeholder values are static frontend content in frontend/src/pages/ContactsPage.jsx.",
    "No backend-managed contacts source was identified during source inspection.",
    "No database-backed contacts configuration was identified during source inspection.",
    "official_public_phone=required",
    "official_public_email=required",
    "official_support_email=required",
    "no source code implementation in this audit stage",
    "no production SSH",
    "no production deploy",
    "no production restart",
    "no production migrations",
    "no production database writes",
    "no Docker cleanup",
    "no Amnezia/AWG changes",
    "The Stage 73.6 contacts placeholders source inspection result is complete and safe to accept.",
    "Exact official contact values must be confirmed before editing ContactsPage.jsx.",
    "No production changes are authorized by this audit stage.",
    "Stage 73.8 - Production contacts placeholders source inspection acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 73.7 production contacts placeholders source inspection audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 73.7 production contacts placeholders source inspection audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
