from pathlib import Path

DOC = Path("docs/stage73-production-contacts-placeholders-replacement-implementation.md")
CONTACTS_PAGE = Path("frontend/src/pages/ContactsPage.jsx")

DOC_REQUIRED_MARKERS = [
    "# Stage 73.11 - Production contacts placeholders replacement implementation",
    "Status: implemented",
    "Base develop checkpoint: fe8d7fa",
    "Previous preparation merge commit: fe8d7fa",
    "Previous source inspection tag: v0.1.0-stage73-production-contacts-placeholders-source-inspection",
    "Previous planning tag: v0.1.0-stage73-production-contacts-placeholders-replacement-planning",
    "file=frontend/src/pages/ContactsPage.jsx",
    "implementation_type=frontend_static_content_only",
    "backend_changed=no",
    "database_changed=no",
    "production_changed=no",
    "phone_placeholder_removed=+7 (000) 000-00-00",
    "public_email_placeholder_removed=info@obrportal.local",
    "support_email_placeholder_removed=support@obrportal.local",
    "official_public_phone=+7 (347) 200 10 17",
    "official_public_email=rcdodist@gmail.com",
    "official_support_email=rcdodist@gmail.com",
    "official_working_hours=Пн-Пт, 09:00-18:00",
    "placeholder_phone_removed=yes",
    "placeholder_info_email_removed=yes",
    "placeholder_support_email_removed=yes",
    "official_public_phone_present=yes",
    "official_public_email_present=yes",
    "official_support_email_present=yes",
    "no_backend_change=yes",
    "no_database_change=yes",
    "no production SSH",
    "no production deploy",
    "no production restart",
    "no production migrations",
    "no production database writes",
    "No production changes are authorized by this implementation stage.",
    "Stage 73.12 - Production contacts placeholders replacement implementation audit",
]

CONTACTS_REQUIRED_MARKERS = [
    "+7 (347) 200 10 17",
    "rcdodist@gmail.com",
    "Пн-Пт, 09:00-18:00",
]

CONTACTS_FORBIDDEN_MARKERS = [
    "+7 (000) 000-00-00",
    "info@obrportal.local",
    "support@obrportal.local",
]

def check_markers(path: Path, required: list[str], label: str) -> list[str]:
    if not path.exists():
        return [f"Missing file: {path}"]
    text = path.read_text(encoding="utf-8-sig")
    return [f"{label} missing marker: {marker}" for marker in required if marker not in text]

def check_forbidden(path: Path, forbidden: list[str], label: str) -> list[str]:
    if not path.exists():
        return [f"Missing file: {path}"]
    text = path.read_text(encoding="utf-8-sig")
    return [f"{label} forbidden marker still present: {marker}" for marker in forbidden if marker in text]

def main() -> int:
    problems = []
    problems.extend(check_markers(DOC, DOC_REQUIRED_MARKERS, "document"))
    problems.extend(check_markers(CONTACTS_PAGE, CONTACTS_REQUIRED_MARKERS, "contacts page"))
    problems.extend(check_forbidden(CONTACTS_PAGE, CONTACTS_FORBIDDEN_MARKERS, "contacts page"))

    if problems:
        print("Stage 73.11 production contacts placeholders replacement implementation guard failed:")
        for problem in problems:
            print(f" - {problem}")
        return 1

    print("Stage 73.11 production contacts placeholders replacement implementation guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
