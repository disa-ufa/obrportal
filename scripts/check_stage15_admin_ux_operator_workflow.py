from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"
ROADMAP = ROOT / "docs" / "project-roadmap-after-stage9.md"
STAGE14_DOC = ROOT / "docs" / "stage-14-documents-certificates-verification.md"

REQUIRED_FILES = [
    DOC,
    ROADMAP,
    STAGE14_DOC,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage13_learning_flow.py",
    ROOT / "scripts" / "check_project_roadmap_after_stage9.py",
    ROOT / "scripts" / "check_ci_local_gate.py",
    ROOT / "frontend" / "src" / "pages" / "DashboardPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "UsersPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "OrganizationsPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "AdminEnrollmentsPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "DocumentsPage.jsx",
    ROOT / "frontend" / "src" / "pages" / "AuditPage.jsx",
    ROOT / "frontend" / "src" / "routes" / "AdminPageRenderer.jsx",
    ROOT / "backend" / "app" / "api" / "v1" / "admin.py",
    ROOT / "frontend" / "src" / "utils" / "apiErrors.js",
    ROOT / "frontend" / "src" / "utils" / "adminLinks.js",
    ROOT / "frontend" / "src" / "components" / "admin" / "AdminQuickFilterButtons.jsx",
    ROOT / "frontend" / "src" / "components" / "admin" / "AdminEmptyState.jsx",
]

DOC_MARKERS = [
    "Status: in progress",
    "Stage: 15",
    "Stage 15 Admin UX / operator workflow",
    "Stage 15 baseline",
    "v0.1.0-stage14-documents-verification-complete",
    "dashboard worklists",
    "user filters",
    "organization filters",
    "course filters",
    "enrollment worklists",
    "bulk actions",
    "audit view",
    "operator-friendly error messages",
    "admin_ux_runtime_changed=no",
    "secrets_printed=no",
    "Stage 15.1 admin UX inventory - 2026-05-29",
    "stage15_admin_ux_inventory=tmp/stage15_admin_ux_inventory.txt",
    "dashboard_page_existing=yes",
    "users_page_existing=yes",
    "organizations_page_existing=yes",
    "admin_courses_page_existing=yes",
    "admin_enrollments_page_existing=yes",
    "documents_page_existing=yes",
    "audit_page_existing=yes",
    "admin_route_renderer_existing=yes",
    "frontend_api_client_existing=yes",
    "backend_admin_api_anchor_existing=yes",
    "admin_ux_inventory_runtime_changed=no",
    "Stage 15.2 dashboard/worklists checkpoint - 2026-05-29",
    "stage15_dashboard_worklists_inventory=tmp/stage15_dashboard_worklists_inventory.txt",
    "dashboard_work_center_existing=yes",
    "dashboard_signal_cards_existing=yes",
    "dashboard_work_tasks_existing=yes",
    "dashboard_documents_task_existing=yes",
    "dashboard_enrollments_task_existing=yes",
    "admin_link_builder_existing=yes",
    "admin_work_center_component_existing=yes",
    "dashboard_worklists_runtime_changed=no",
    "Stage 15.3 list pages filters/errors inventory - 2026-05-29",
    "stage15_list_pages_filters_errors_inventory=tmp/stage15_list_pages_filters_errors_inventory.txt",
    "users_filters_errors_inventory=yes",
    "organizations_filters_errors_inventory=yes",
    "courses_filters_errors_inventory=yes",
    "enrollments_filters_errors_inventory=yes",
    "documents_filters_errors_inventory=yes",
    "audit_filters_errors_inventory=yes",
    "api_errors_utility_existing=yes",
    "admin_quick_filters_component_existing=yes",
    "admin_empty_state_component_existing=yes",
    "list_pages_filters_errors_runtime_changed=no",
]

ROADMAP_MARKERS = [
    "Stage 15 — Admin UX / operator workflow",
    "make admin panel convenient for real operators",
    "dashboard worklists",
    "user filters",
    "organization filters",
    "course filters",
    "enrollment worklists",
    "bulk actions",
    "audit view",
    "operator-friendly error messages",
]

STAGE14_MARKERS = [
    "Status: accepted",
    "Stage 14 accepted",
    "v0.1.0-stage14-documents-verification-complete",
    "documents_certificates_verification_accepted=yes",
    "public_verification_accepted=yes",
    "account_document_download_accepted=yes",
    "admin_document_visibility_accepted=yes",
    "214 passed",
]

FORBIDDEN_SECRET_MARKERS = [
    "BOT_" + "TOKEN=",
    "SECRET_" + "KEY=",
    "SERVICE_" + "SECRET=",
    "POSTGRES_" + "PASSWORD=",
    "MINIO_SECRET_" + "KEY=",
    "ACCESS_" + "TOKEN=",
]


def read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"[fail] required file is missing: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def require_markers(path: Path, markers: list[str]) -> int:
    text = read_text(path)
    missing = [marker for marker in markers if marker not in text]

    if missing:
        details = "\n".join(f"  missing marker: {marker}" for marker in missing)
        raise SystemExit(f"[fail] {path.relative_to(ROOT)}\n{details}")

    return len(markers)


def check_required_files() -> int:
    missing = [path for path in REQUIRED_FILES if not path.exists()]
    if missing:
        print("[fail] required Stage 15 anchor files missing:")
        for path in missing:
            print(f" - {path.relative_to(ROOT)}")
        raise SystemExit(1)
    return len(REQUIRED_FILES)


def check_no_secret_markers(path: Path) -> None:
    text = read_text(path)
    found = [marker for marker in FORBIDDEN_SECRET_MARKERS if marker in text]
    if found:
        print(f"[fail] possible secret markers in {path.relative_to(ROOT)}:")
        for marker in found:
            print(f" - {marker}")
        raise SystemExit(1)


def main() -> None:
    required_files_count = check_required_files()

    for path in [DOC, Path(__file__).resolve()]:
        check_no_secret_markers(path)

    doc_count = require_markers(DOC, DOC_MARKERS)
    roadmap_count = require_markers(ROADMAP, ROADMAP_MARKERS)
    stage14_count = require_markers(STAGE14_DOC, STAGE14_MARKERS)

    print(
        "stage 15 admin UX/operator workflow diagnostics passed: "
        f"doc_markers={doc_count}, roadmap_markers={roadmap_count}, "
        f"stage14_markers={stage14_count}, required_files={required_files_count}, "
        "secrets_printed=no, admin_ux_runtime_changed=no"
    )


if __name__ == "__main__":
    main()
