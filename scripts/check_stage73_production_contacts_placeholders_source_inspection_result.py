from pathlib import Path

DOC = Path("docs/stage73-production-contacts-placeholders-source-inspection-result.md")

REQUIRED_MARKERS = [
    "# Stage 73.6 - Production contacts placeholders source inspection result",
    "Status: result",
    "Base develop checkpoint: e6b6674",
    "Previous planning tag: v0.1.0-stage73-production-contacts-placeholders-replacement-planning",
    "develop_head=e6b6674",
    "stage72_closure_tag=v0.1.0-stage72-production-release-closure",
    "stage73_contacts_planning_tag=v0.1.0-stage73-production-contacts-placeholders-replacement-planning",
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
    "working_hours_line=ContactCard title=\"Режим работы\" value=\"Пн–Пт, 09:00–18:00\"",
    "file=frontend/src/routes/PublicRoutes.jsx",
    "contacts_route_path=/contacts",
    "file=frontend/src/utils/publicRoutes.js",
    "contacts_route=/contacts",
    "contacts_title=Контакты — ObrPortal",
    "file=frontend/src/pages/DashboardPage.jsx",
    "public_contacts_meta_link=/contacts",
    "public_pages_smoke_link=/contacts",
    "Contacts placeholders appear to be static frontend content in ContactsPage.jsx.",
    "No backend-managed contacts source was identified during this local source inspection.",
    "No database-backed contacts configuration was identified during this local source inspection.",
    "official_public_phone=required",
    "official_public_email=required",
    "official_support_email=required",
    "no source code implementation in this inspection stage",
    "no production SSH",
    "no production deploy",
    "no production restart",
    "no production migrations",
    "no production database writes",
    "no Docker cleanup",
    "no Amnezia/AWG changes",
    "The source inspection is complete.",
    "The placeholder values are located in frontend/src/pages/ContactsPage.jsx.",
    "No production changes are authorized by this inspection stage.",
    "Stage 73.7 - Production contacts placeholders source inspection audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 73.6 production contacts placeholders source inspection result guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 73.6 production contacts placeholders source inspection result guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
