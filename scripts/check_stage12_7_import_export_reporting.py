from pathlib import Path

DOC = Path("docs/stage-12-7-import-export-reporting.md")
ROADMAP = Path("docs/stage-12-product-roadmap.md")
PREVIOUS_STAGE_DOC = Path("docs/stage-12-6-ux-ui-navigation-empty-states.md")
USERS_PAGE = Path("frontend/src/pages/UsersPage.jsx")
ORGANIZATIONS_PAGE = Path("frontend/src/pages/OrganizationsPage.jsx")
GROUPS_PAGE = Path("frontend/src/pages/GroupsPage.jsx")
ADMIN_COURSES_PAGE = Path("frontend/src/pages/AdminCoursesPage.jsx")
ADMIN_ENROLLMENTS_PAGE = Path("frontend/src/pages/AdminEnrollmentsPage.jsx")
EXPORT_CSV = Path("frontend/src/utils/exportCsv.js")

REQUIRED_FILES = [
    DOC,
    ROADMAP,
    PREVIOUS_STAGE_DOC,
    USERS_PAGE,
    ORGANIZATIONS_PAGE,
    GROUPS_PAGE,
    ADMIN_COURSES_PAGE,
    ADMIN_ENROLLMENTS_PAGE,
    EXPORT_CSV,
]

DOC_MARKERS = [
    "Stage 12.7 admin enrollments CSV export - 2026-05-28",
    "enrollments list export for admin role only",
    "admin-enrollments-export-summary",
    "admin-enrollments-export-csv-button",
    "obrportal-admin-enrollments",
    "Stage 12.7 admin courses CSV export production deploy - 2026-05-28",
    "production git head: aa976e9",
    "admin courses CSV export deployed",
    "local_frontend_http=200",
    "public_login_http=200",
    "public_admin_http=200",
    "public_ready_http=200",
    "Stage 12.7 admin courses CSV export - 2026-05-28",
    "courses list export for admin role only",
    "admin-courses-export-summary",
    "admin-courses-export-csv-button",
    "obrportal-admin-courses",
    "Stage 12.7 admin groups CSV export production deploy - 2026-05-28",
    "production git head: 69f38ab",
    "admin groups CSV export deployed",
    "local_frontend_http=200",
    "public_login_http=200",
    "public_admin_http=200",
    "public_ready_http=200",
    "Stage 12.7 admin groups CSV export - 2026-05-28",
    "groups list export for admin role only",
    "admin-groups-export-summary",
    "admin-groups-export-csv-button",
    "obrportal-admin-groups",
    "Stage 12.7 admin organizations CSV export production deploy - 2026-05-28",
    "production git head: 07917d7",
    "admin organizations CSV export deployed",
    "local_frontend_http=200",
    "public_login_http=200",
    "public_admin_http=200",
    "public_ready_http=200",
    "Stage 12.7 admin users CSV export production deploy - 2026-05-28",
    "production git head: 203832d",
    "stage12_7_admin_users_csv_export_production_deploy=passed",
    "Stage 12.7 admin organizations CSV export - 2026-05-28",
    "admin-organizations-export-summary",
    "admin-organizations-export-csv-button",
    "obrportal-admin-organizations",
    "Stage 12.7 admin users CSV export - 2026-05-28",
    "admin-users-export-summary",
    "admin-users-export-csv-button",
    "obrportal-admin-users",
    "downloadCsvFile",
    "buildDatedCsvFilename",
    "frontend_runtime_changed=yes",
    "backend_runtime_changed=no",
    "database_migrations_added=no",
    "api_contract_changed=no",
    "# Stage 12.7 Import/export and reporting",
    "Status: in progress",
    "Stage: 12.7",
    "Baseline tag: v0.1.0-stage12-6-ux-navigation-empty-states",
    "documentation-only and guard-only",
    "define safe import/export requirements",
    "avoid destructive imports without validation",
    "keep exported data scoped by role",
    "exports must be access-controlled",
    "exports must be role-scoped",
    "imports must have validation before write operations",
    "destructive imports are forbidden without a separate accepted plan",
    "users list export for admin role only",
    "organizations list export for admin role only",
    "enrollments report with status filters",
    "document metadata report without raw binary leakage",
    "audit summary export as read-only administrative evidence",
    "first implementation must be dry-run or validation-first",
    "row-level validation errors must be visible before writing",
    "Reports must not expose data beyond the current user's role and object-level permissions",
    "database migrations",
    "backend API contract changes",
    "frontend runtime changes",
    "authentication weakening",
    "RBAC weakening",
    "object-level access weakening",
    "committing secrets",
    "stage 12.7 import/export and reporting diagnostics passed",
    "secrets_printed=no",
    "runtime_changed=no",
]

ROADMAP_MARKERS = [
    "Stage 12.7 import/export and reporting",
    "define safe import/export requirements",
    "avoid implementing destructive imports without validation",
    "keep exported data scoped by role",
    "import format is documented before implementation",
    "export endpoints are access-controlled",
    "no secrets or internal configs are exported",
]

PREVIOUS_STAGE_MARKERS = [
    "# Stage 12.6 UX/UI navigation and empty states",
    "Stage 12.6 production deploy record - 2026-05-28",
    "production git head: dc176d6",
    "frontend_runtime_changed=yes after deploy",
    "public_login_http=200",
    "public_admin_http=200",
    "public_ready_status=ok",
]


FRONTEND_STAGE_MARKERS = [
    "UsersPage",
    "filteredUsers",
    "USER_CSV_EXPORT_COLUMNS",
    "formatUserExportRoles",
    "handleExportUsersCsv",
    "admin-users-export-summary",
    "admin-users-export-csv-button",
    "obrportal-admin-users",
]


ORGANIZATION_FRONTEND_STAGE_MARKERS = [
    "OrganizationsPage",
    "filteredOrganizations",
    "ORGANIZATION_CSV_EXPORT_COLUMNS",
    "handleExportOrganizationsCsv",
    "admin-organizations-export-summary",
    "admin-organizations-export-csv-button",
    "obrportal-admin-organizations",
]


GROUP_FRONTEND_STAGE_MARKERS = [
    "GroupsPage",
    "filteredGroups",
    "GROUP_CSV_EXPORT_COLUMNS",
    "handleExportGroupsCsv",
    "admin-groups-export-summary",
    "admin-groups-export-csv-button",
    "obrportal-admin-groups",
]



COURSE_FRONTEND_STAGE_MARKERS = [
    "AdminCoursesPage",
    "courses",
    "COURSE_CSV_EXPORT_COLUMNS",
    "handleExportCoursesCsv",
    "admin-courses-export-summary",
    "admin-courses-export-csv-button",
    "obrportal-admin-courses",
]



ENROLLMENT_FRONTEND_STAGE_MARKERS = [
    "AdminEnrollmentsPage",
    "visibleEnrollments",
    "ENROLLMENT_CSV_EXPORT_COLUMNS",
    "handleExportEnrollmentsCsv",
    "admin-enrollments-export-summary",
    "admin-enrollments-export-csv-button",
    "obrportal-admin-enrollments",
]


EXPORT_UTIL_MARKERS = [
    "CSV_UTF8_BOM",
    "DEFAULT_CSV_DELIMITER",
    "buildCsvContent",
    "buildDatedCsvFilename",
    "downloadCsvFile",
    "text/csv;charset=utf-8",
    "createObjectURL",
    "revokeObjectURL",
]

SECRET_MARKERS = [
    "BOT_TOKEN=",
    "SECRET_KEY=",
    "POSTGRES_PASSWORD=",
    "MINIO_SECRET_KEY=",
    "ACCESS_TOKEN=",
    "BEGIN PRIVATE KEY",
    "sk-",
]


def read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"[fail] missing required file: {path}")
    return path.read_text(encoding="utf-8")


def require_markers(path: Path, markers: list[str]) -> int:
    text = read_text(path)
    missing = [marker for marker in markers if marker not in text]

    if missing:
        print(f"[fail] {path}")
        for marker in missing:
            print(f"  missing marker: {marker}")
        raise SystemExit(1)

    return len(markers)


def check_no_secret_markers(path: Path) -> None:
    text = read_text(path)
    found = [marker for marker in SECRET_MARKERS if marker in text]

    if found:
        print(f"[fail] {path}")
        for marker in found:
            print(f"  forbidden secret-like marker: {marker}")
        raise SystemExit(1)


def main() -> None:
    for path in REQUIRED_FILES:
        read_text(path)
        check_no_secret_markers(path)

    doc_count = require_markers(DOC, DOC_MARKERS)
    roadmap_count = require_markers(ROADMAP, ROADMAP_MARKERS)
    previous_count = require_markers(PREVIOUS_STAGE_DOC, PREVIOUS_STAGE_MARKERS)
    frontend_count = require_markers(USERS_PAGE, FRONTEND_STAGE_MARKERS)
    organization_frontend_count = require_markers(ORGANIZATIONS_PAGE, ORGANIZATION_FRONTEND_STAGE_MARKERS)
    group_frontend_count = require_markers(GROUPS_PAGE, GROUP_FRONTEND_STAGE_MARKERS)
    course_frontend_count = require_markers(ADMIN_COURSES_PAGE, COURSE_FRONTEND_STAGE_MARKERS)
    enrollment_frontend_count = require_markers(ADMIN_ENROLLMENTS_PAGE, ENROLLMENT_FRONTEND_STAGE_MARKERS)
    export_count = require_markers(EXPORT_CSV, EXPORT_UTIL_MARKERS)

    print(
        "stage 12.7 import/export and reporting diagnostics passed: "
        f"doc_markers={doc_count}, roadmap_markers={roadmap_count}, "
        f"previous_stage_markers={previous_count}, frontend_markers={frontend_count}, "
        f"organization_frontend_markers={organization_frontend_count}, "
        f"group_frontend_markers={group_frontend_count}, "
        f"course_frontend_markers={course_frontend_count}, "
        f"enrollment_frontend_markers={enrollment_frontend_count}, "
        f"export_markers={export_count}, secrets_printed=no, "
        "frontend_runtime_changed=yes, backend_runtime_changed=no"
    )


if __name__ == "__main__":
    main()
