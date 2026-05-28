from pathlib import Path

DOC = Path("docs/stage-12-5-admin-moderation-audit-workflow.md")
ROADMAP = Path("docs/stage-12-product-roadmap.md")
APP = Path("frontend/src/App.jsx")
ADMIN_RENDERER = Path("frontend/src/routes/AdminPageRenderer.jsx")
DASHBOARD_PAGE = Path("frontend/src/pages/DashboardPage.jsx")
USERS_PAGE = Path("frontend/src/pages/UsersPage.jsx")
ORGANIZATIONS_PAGE = Path("frontend/src/pages/OrganizationsPage.jsx")
GROUPS_PAGE = Path("frontend/src/pages/GroupsPage.jsx")
COURSES_PAGE = Path("frontend/src/pages/AdminCoursesPage.jsx")
ENROLLMENTS_PAGE = Path("frontend/src/pages/AdminEnrollmentsPage.jsx")
DOCUMENTS_PAGE = Path("frontend/src/pages/DocumentsPage.jsx")
ROLES_PAGE = Path("frontend/src/pages/RolesPage.jsx")
PERMISSIONS_PAGE = Path("frontend/src/pages/PermissionsPage.jsx")
AUDIT_PAGE = Path("frontend/src/pages/AuditPage.jsx")
USER_DETAIL_PANEL = Path("frontend/src/components/admin/UserDetailPanel.jsx")
USER_FORM = Path("frontend/src/components/admin/UserForm.jsx")
ORG_DETAIL_PANEL = Path("frontend/src/components/admin/OrganizationDetailPanel.jsx")
ORG_FORM = Path("frontend/src/components/admin/OrganizationForm.jsx")
ROLE_DETAIL_PANEL = Path("frontend/src/components/admin/RoleDetailPanel.jsx")
ROLE_FORM = Path("frontend/src/components/admin/RoleForm.jsx")
API_CLIENT = Path("frontend/src/api/client.js")

REQUIRED_FILES = [
    DOC,
    ROADMAP,
    APP,
    ADMIN_RENDERER,
    DASHBOARD_PAGE,
    USERS_PAGE,
    ORGANIZATIONS_PAGE,
    GROUPS_PAGE,
    COURSES_PAGE,
    ENROLLMENTS_PAGE,
    DOCUMENTS_PAGE,
    ROLES_PAGE,
    PERMISSIONS_PAGE,
    AUDIT_PAGE,
    USER_DETAIL_PANEL,
    USER_FORM,
    ORG_DETAIL_PANEL,
    ORG_FORM,
    ROLE_DETAIL_PANEL,
    ROLE_FORM,
    API_CLIENT,
]

DOC_MARKERS = [
    "# Stage 12.5. Admin moderation and audit workflow",
    "Status: in progress",
    "no database migrations in the baseline documentation step",
    "no API contract changes unless backend tests are added first",
    "no authentication or RBAC weakening",
    "no object-level access weakening",
    "audit page remains read-only unless a separate accepted checkpoint changes it",
    "no production config changes",
    "no secrets in docs, logs, screenshots or reports",
    "frontend_runtime_changed=no",
    "backend_runtime_changed=no",
    "current git head before Stage 12.5 implementation: 130c8d4",
    "tag v0.1.0-stage12-1-account-ux-polish exists",
    "tag v0.1.0-stage12-2-catalog-ux-polish exists",
    "tag v0.1.0-stage12-3-course-detail-ux-polish exists",
    "tag v0.1.0-stage12-4-document-verification-ux-polish exists",
    "Stage 12 product roadmap defines Stage 12.5 as admin moderation and audit workflow",
    "admin audit page exists",
    "audit page is read-only by default",
    "raw backend error objects must not be rendered directly",
    "Stage 12.5 admin moderation and audit workflow guard created",
    "/opt/obrportal/tmp/stage_12_5_1_admin_moderation_audit_workflow_docs_sync_retry_20260528075808.txt",
    "stage12_5_admin_moderation_audit_workflow_docs_sync=passed",
    "public /admin/enrollments returned HTTP 200",
    "public /admin/users returned HTTP 200",
    "public /admin/audit returned HTTP 200",
    "public /admin returned HTTP 200",
    "admin route marker audit was present",
    "admin route marker enrollments was present",
    "admin route marker users was present",
    "admin route marker dashboard was present",
    "source marker DocumentsPage was present",
    "source marker AdminEnrollmentsPage was present",
    "source marker UsersPage was present",
    "source marker AuditPage was present",
    "Stage 12.5 audit read-only marker was present",
    "Stage 12.5 guard created marker was present",
    "Stage 12.5 baseline head marker was present",
    "Stage 12.5 document title marker was present",
    "Stage 12.4 document verification UX polish tag head verified: 417e65a",
    "Stage 12.4 document verification workflow guard passed",
    "Stage 12.5 admin moderation and audit workflow guard passed",
    "production git head: 9803b47",
    "Stage 12.5 admin moderation and audit workflow docs sync - 2026-05-28",
    "frontend_runtime_changed=yes after deploy",
    "audit_events are inspected, not mutated",
    "AuditPage remains read-only",
    "existing getAdminAuditEventDetail detail loading remains unchanged",
    "existing getAdminAuditEvents filters remain unchanged",
    "no backend API changes",
    "frontend-only change",
    "Stage 12.5 adds stable frontend markers and service-state boundaries for the admin audit page",
    "Stage 12.5 audit page service states - 2026-05-28",
    "/opt/obrportal/tmp/stage_12_5_3_admin_audit_service_states_frontend_deploy_retry_20260528101536.txt",
    "stage12_5_admin_audit_service_states_frontend_deploy=passed",
    "frontend_runtime_changed=yes",
    "frontend health became healthy",
    "frontend container was recreated",
    "frontend static image was rebuilt",
    "source marker admin-audit-detail-panel was present",
    "source marker admin-audit-empty-state was present",
    "source marker admin-audit-loading-state was present",
    "source marker admin-audit-readonly-notice was present",
    "source marker admin-audit-page was present",
    "production git head: d51be52",
    "Stage 12.5 audit page service states frontend deploy - 2026-05-28",
    "enrollment moderation actions remain explicit admin actions",
    "existing getAdminWorklistSummary loading remains unchanged",
    "existing deleteAdminEnrollment mutation remains unchanged",
    "existing updateAdminEnrollment mutation remains unchanged",
    "existing createAdminGroupEnrollments mutation remains unchanged",
    "existing createAdminEnrollment mutation remains unchanged",
    "existing getAdminEnrollments list loading remains unchanged",
    "Stage 12.5 adds stable frontend markers and service-state boundaries for the admin enrollment moderation workflow",
    "Stage 12.5 enrollment moderation service states - 2026-05-28",
    "/opt/obrportal/tmp/stage_12_5_5_admin_enrollment_moderation_states_frontend_deploy_20260528103648.txt",
    "stage12_5_admin_enrollment_moderation_states_frontend_deploy=passed",
    "source marker admin-enrollment-delete-action was present",
    "source marker admin-enrollment-edit-action was present",
    "source marker admin-enrollment-complete-action was present",
    "source marker admin-enrollment-card was present",
    "source marker admin-enrollments-empty-state was present",
    "source marker admin-enrollments-loading-state was present",
    "source marker admin-enrollments-moderation-notice was present",
    "source marker admin-enrollments-page was present",
    "production git head: bd968e3",
    "Stage 12.5 enrollment moderation states frontend deploy - 2026-05-28",
]

ROADMAP_MARKERS = [
    "Stage 12.5 admin moderation and audit workflow",
    "make audit events easier to inspect",
    "audit page remains read-only unless explicitly changed",
    "admin pages remain accessible only to allowed roles",
    "forms show validation errors clearly",
    "tests cover critical admin access paths",
]

ADMIN_ROUTE_MARKERS = [
    "dashboard",
    "users",
    "organizations",
    "groups",
    "courses",
    "enrollments",
    "documents",
    "roles",
    "permissions",
    "audit",
]

ADMIN_PAGE_MARKERS = [
    ("dashboard_page", DASHBOARD_PAGE, ["DashboardPage"]),
    ("users_page", USERS_PAGE, ["UsersPage"]),
    ("organizations_page", ORGANIZATIONS_PAGE, ["OrganizationsPage"]),
    ("groups_page", GROUPS_PAGE, ["GroupsPage"]),
    ("courses_page", COURSES_PAGE, ["AdminCoursesPage"]),
    ("enrollments_page", ENROLLMENTS_PAGE, [
        "AdminEnrollmentsPage",
        "admin-enrollments-page",
        "admin-enrollments-moderation-notice",
        "admin-enrollments-error-state",
        "admin-enrollments-success-state",
        "admin-enrollments-create-section",
        "admin-enrollments-create-form",
        "admin-enrollments-bulk-section",
        "admin-enrollments-bulk-form",
        "admin-enrollments-list-section",
        "admin-enrollments-filters",
        "admin-enrollments-search-input",
        "admin-enrollments-status-filter",
        "admin-enrollments-apply-filters-action",
        "admin-enrollments-reset-filters-action",
        "admin-enrollments-loading-state",
        "admin-enrollments-empty-state",
        "admin-enrollments-list",
        "admin-enrollment-card",
        "admin-enrollment-complete-action",
        "admin-enrollment-edit-action",
        "admin-enrollment-delete-action",
        "admin-enrollment-edit-form",
        'role="alert"',
        'aria-live="assertive"',
        'aria-live="polite"',
    ]),
    ("documents_page", DOCUMENTS_PAGE, ["DocumentsPage"]),
    ("roles_page", ROLES_PAGE, ["RolesPage"]),
    ("permissions_page", PERMISSIONS_PAGE, ["PermissionsPage"]),
    ("audit_page", AUDIT_PAGE, [
        "AuditPage",
        "admin-audit-page",
        "admin-audit-unauthorized-state",
        "admin-audit-readonly-notice",
        "admin-audit-filters",
        "admin-audit-filter-action",
        "admin-audit-filter-entity-type",
        "admin-audit-filter-entity-id",
        "admin-audit-filter-actor-user-id",
        "admin-audit-filter-limit",
        "admin-audit-filter-actions",
        "admin-audit-apply-filters-action",
        "admin-audit-reset-filters-action",
        "admin-audit-filter-error-state",
        "admin-audit-quick-action-filter",
        "admin-audit-quick-entity-type-filter",
        "admin-audit-result-summary",
        "admin-audit-loading-state",
        "admin-audit-empty-state",
        "admin-audit-table",
        "admin-audit-row-actions",
        "admin-audit-open-detail-action",
        "admin-audit-detail-panel",
        "admin-audit-detail-loading",
        "admin-audit-detail-error",
        'role="alert"',
        'aria-live="assertive"',
        'aria-live="polite"',
        "не изменяет audit_events",
    ]),
]

ADMIN_COMPONENT_MARKERS = [
    ("user_detail_panel", USER_DETAIL_PANEL, ["UserDetailPanel"]),
    ("user_form", USER_FORM, ["UserForm"]),
    ("organization_detail_panel", ORG_DETAIL_PANEL, ["OrganizationDetailPanel"]),
    ("organization_form", ORG_FORM, ["OrganizationForm"]),
    ("role_detail_panel", ROLE_DETAIL_PANEL, ["RoleDetailPanel"]),
    ("role_form", ROLE_FORM, ["RoleForm"]),
]

API_MARKERS = [
    "admin",
    "users",
    "organizations",
    "groups",
    "courses",
    "enrollments",
    "documents",
    "roles",
    "permissions",
    "audit",
]

def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")
    return path.read_text(encoding="utf-8")

def require_markers(name: str, text: str, markers: list[str]) -> None:
    missing = [marker for marker in markers if marker not in text]
    if missing:
        print(f"{name}: missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

def main() -> None:
    for path in REQUIRED_FILES:
        if not path.exists():
            raise SystemExit(f"Missing required file: {path}")

    doc_text = read(DOC)
    roadmap_text = read(ROADMAP)
    app_text = read(APP)
    renderer_text = read(ADMIN_RENDERER)
    api_text = read(API_CLIENT)

    require_markers("doc", doc_text, DOC_MARKERS)
    require_markers("roadmap", roadmap_text, ROADMAP_MARKERS)
    require_markers("admin_routes", app_text + "\n" + renderer_text, ADMIN_ROUTE_MARKERS)
    require_markers("api_client", api_text, API_MARKERS)

    for name, path, markers in ADMIN_PAGE_MARKERS:
        require_markers(name, read(path), markers)

    for name, path, markers in ADMIN_COMPONENT_MARKERS:
        require_markers(name, read(path), markers)

    sections = doc_text.count("\n## ")
    safety_markers = sum(1 for marker in [
        "no database migrations",
        "no API contract changes",
        "no authentication or RBAC weakening",
        "no object-level access weakening",
        "no audit mutation workflow",
        "audit page remains read-only",
        "no production config changes",
        "no secrets",
        "frontend_runtime_changed",
        "backend_runtime_changed",
    ] if marker in doc_text)

    state_markers = sum(1 for marker in [
        "admin opens dashboard",
        "admin opens users list",
        "admin opens user detail panel",
        "admin opens organizations list",
        "admin opens organization detail panel",
        "admin opens groups list",
        "admin opens courses list",
        "admin opens enrollment review page",
        "admin opens documents page",
        "admin opens roles page",
        "admin opens permissions page",
        "admin opens audit page",
        "admin sees loading state",
        "admin sees empty state",
        "admin sees validation error",
        "admin sees API error",
        "unauthorized user must not access admin pages",
    ] if marker in doc_text)

    total_markers = (
        len(DOC_MARKERS)
        + len(ROADMAP_MARKERS)
        + len(ADMIN_ROUTE_MARKERS)
        + len(API_MARKERS)
        + sum(len(markers) for _, _, markers in ADMIN_PAGE_MARKERS)
        + sum(len(markers) for _, _, markers in ADMIN_COMPONENT_MARKERS)
    )

    print(
        "stage 12.5 admin moderation and audit workflow diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"state_markers={state_markers}, markers={total_markers}"
    )

if __name__ == "__main__":
    main()
