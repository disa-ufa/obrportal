from pathlib import Path

DOC = Path("docs/stage-12-7-import-export-reporting.md")
ROADMAP = Path("docs/stage-12-product-roadmap.md")
PREVIOUS_STAGE_DOC = Path("docs/stage-12-6-ux-ui-navigation-empty-states.md")
USERS_PAGE = Path("frontend/src/pages/UsersPage.jsx")
EXPORT_CSV = Path("frontend/src/utils/exportCsv.js")

REQUIRED_FILES = [
    DOC,
    ROADMAP,
    PREVIOUS_STAGE_DOC,
    USERS_PAGE,
    EXPORT_CSV,
]

DOC_MARKERS = [
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
    export_count = require_markers(EXPORT_CSV, EXPORT_UTIL_MARKERS)

    print(
        "stage 12.7 import/export and reporting diagnostics passed: "
        f"doc_markers={doc_count}, roadmap_markers={roadmap_count}, "
        f"previous_stage_markers={previous_count}, frontend_markers={frontend_count}, "
        f"export_markers={export_count}, secrets_printed=no, "
        "frontend_runtime_changed=yes, backend_runtime_changed=no"
    )


if __name__ == "__main__":
    main()
