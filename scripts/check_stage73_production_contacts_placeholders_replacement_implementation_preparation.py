from pathlib import Path

DOC = Path("docs/stage73-production-contacts-placeholders-replacement-implementation-preparation.md")

REQUIRED_MARKERS = [
    "# Stage 73.10 - Production contacts placeholders replacement implementation preparation",
    "Status: preparation",
    "Base develop checkpoint: ed5d52a",
    "Previous source inspection tag: v0.1.0-stage73-production-contacts-placeholders-source-inspection",
    "Previous planning tag: v0.1.0-stage73-production-contacts-placeholders-replacement-planning",
    "official_public_phone=+7 (347) 200 10 17",
    "official_public_email=rcdodist@gmail.com",
    "official_support_email=rcdodist@gmail.com",
    "official_working_hours=Пн-Пт, 09:00-18:00",
    "phone_placeholder=+7 (000) 000-00-00",
    "public_email_placeholder=info@obrportal.local",
    "support_email_placeholder=support@obrportal.local",
    "working_hours_current=Пн-Пт, 09:00-18:00",
    "primary_contacts_source=frontend/src/pages/ContactsPage.jsx",
    "contacts_route_source=frontend/src/routes/PublicRoutes.jsx",
    "contacts_meta_source=frontend/src/utils/publicRoutes.js",
    "file=frontend/src/pages/ContactsPage.jsx",
    "replace_phone=+7 (000) 000-00-00 -> +7 (347) 200 10 17",
    "replace_public_email=info@obrportal.local -> rcdodist@gmail.com",
    "replace_support_email=support@obrportal.local -> rcdodist@gmail.com",
    "keep_working_hours=Пн-Пт, 09:00-18:00",
    "The replacement is planned as a frontend-only static content change.",
    "No backend-managed contacts source was identified during source inspection.",
    "No database-backed contacts configuration was identified during source inspection.",
    "No production database write is required for this implementation.",
    "step_2=edit frontend/src/pages/ContactsPage.jsx only",
    "step_11=deploy only in a later explicitly authorized production deployment stage",
    "placeholder_phone_removed=yes",
    "placeholder_info_email_removed=yes",
    "placeholder_support_email_removed=yes",
    "official_public_phone_present=yes",
    "official_public_email_present=yes",
    "official_support_email_present=yes",
    "no_backend_change=yes",
    "no_database_change=yes",
    "no source code implementation in this preparation stage",
    "no production SSH",
    "no production deploy",
    "no production restart",
    "no production migrations",
    "no production database writes",
    "no Docker cleanup",
    "no Amnezia/AWG changes",
    "The official public contact values are confirmed.",
    "The implementation should be a minimal frontend-only replacement in frontend/src/pages/ContactsPage.jsx.",
    "The support email should use the same confirmed email address as the public email.",
    "The working hours should remain unchanged.",
    "No production changes are authorized by this preparation stage.",
    "Stage 73.11 - Production contacts placeholders replacement implementation",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 73.10 production contacts placeholders replacement implementation preparation guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 73.10 production contacts placeholders replacement implementation preparation guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
