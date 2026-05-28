from pathlib import Path

DOC = Path("docs/stage-12-6-ux-ui-navigation-empty-states.md")
ROADMAP = Path("docs/stage-12-product-roadmap.md")
API_CLIENT = Path("frontend/src/api/client.js")
API_ERRORS = Path("frontend/src/utils/apiErrors.js")
ADMIN_RENDERER = Path("frontend/src/routes/AdminPageRenderer.jsx")

FRONTEND_FILES = [
    Path("frontend/src/pages/HomePage.jsx"),
    Path("frontend/src/pages/CatalogPage.jsx"),
    Path("frontend/src/pages/CourseDetailPage.jsx"),
    Path("frontend/src/pages/AccountPage.jsx"),
    Path("frontend/src/pages/AuthPage.jsx"),
    Path("frontend/src/pages/RegisterPage.jsx"),
    Path("frontend/src/pages/VerifyDocumentPage.jsx"),
    Path("frontend/src/pages/DashboardPage.jsx"),
    Path("frontend/src/pages/UsersPage.jsx"),
    Path("frontend/src/pages/OrganizationsPage.jsx"),
    Path("frontend/src/pages/GroupsPage.jsx"),
    Path("frontend/src/pages/AdminCoursesPage.jsx"),
    Path("frontend/src/pages/AdminEnrollmentsPage.jsx"),
    Path("frontend/src/pages/DocumentsPage.jsx"),
    Path("frontend/src/pages/RolesPage.jsx"),
    Path("frontend/src/pages/PermissionsPage.jsx"),
    Path("frontend/src/pages/AuditPage.jsx"),
]

REQUIRED_FILES = [DOC, ROADMAP, API_CLIENT, API_ERRORS, ADMIN_RENDERER, *FRONTEND_FILES]

DOC_MARKERS = [
    "Stage 12.6 production deploy record - 2026-05-28",
    "production git head: dc176d6",
    "frontend_runtime_changed=yes after deploy",
    "public_login_http=200",
    "public_admin_http=200",
    "public_ready_status=ok",
    "Stage 12.6 admin users loading and empty states - 2026-05-28",
    "admin-users-loading-state",
    "admin-users-empty-state",
    "admin-users-table-state",
    "# Stage 12.6 UX/UI navigation and empty states",
    "Status: in progress",
    "Baseline tag: v0.1.0-stage12-5-admin-moderation-audit-workflow",
    "Stage 12.6 must explicitly handle these UX states",
    "Navigation contract",
    "Frontend safety contract",
    "raw backend error objects must not be rendered directly",
    "direct routes must remain supported",
    "backend_runtime_changed must be explicit",
    "frontend_runtime_changed must be explicit",
    "Forbidden in this baseline step",
]

ROADMAP_MARKERS = [
    "Stage 12.6 UX/UI navigation and empty states",
    "Stage 12.6 UX/UI improvements",
    "improve navigation consistency",
    "improve loading states",
    "improve error messages",
    "improve empty states",
    "keep frontend API error handling safe",
    "no raw backend error objects are rendered",
    "direct routes remain supported",
    "build remains green",
]

ADMIN_RENDERER_MARKERS = [
    "AdminPageRenderer",
    "getAdminPageFromPathname",
    "DashboardPage",
    "UsersPage",
    "OrganizationsPage",
    "GroupsPage",
    "AdminCoursesPage",
    "AdminEnrollmentsPage",
    "DocumentsPage",
    "RolesPage",
    "PermissionsPage",
    "AuditPage",
]

API_CLIENT_MARKERS = ["async function request", "response.ok", "throw"]
API_ERROR_MARKERS = ["getApiErrorMessage"]

USERS_PAGE_STATE_MARKERS = [
    "admin-users-page",
    "admin-users-loading-state",
    "admin-users-empty-state",
    "admin-users-table-state",
    "getFilteredEmptyText",
    "LoadingBlock",
    "SmallTable",
]


def read(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"[fail] missing file: {path}")
    return path.read_text(encoding="utf-8")


def check_markers(label: str, path: Path, markers: list[str]) -> int:
    text = read(path)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise SystemExit(f"[fail] {label}: missing markers in {path}: {missing}")
    return len(markers)


def check_page_exports() -> int:
    checked = 0

    for path in FRONTEND_FILES:
        text = read(path)
        marker = "AuthPage" if path.stem == "AuthPage" else path.stem

        if marker not in text:
            raise SystemExit(f"[fail] frontend page marker missing in {path}: {marker}")

        checked += 1

    return checked


def main() -> None:
    for path in REQUIRED_FILES:
        read(path)

    markers = 0
    markers += check_markers("stage 12.6 doc", DOC, DOC_MARKERS)
    markers += check_markers("stage 12 roadmap", ROADMAP, ROADMAP_MARKERS)
    markers += check_markers("admin renderer", ADMIN_RENDERER, ADMIN_RENDERER_MARKERS)
    markers += check_markers("api client", API_CLIENT, API_CLIENT_MARKERS)
    markers += check_markers("api errors", API_ERRORS, API_ERROR_MARKERS)
    markers += check_markers(
        "users page Stage 12.6 loading and empty states",
        Path("frontend/src/pages/UsersPage.jsx"),
        USERS_PAGE_STATE_MARKERS,
    )
    markers += check_page_exports()

    doc_text = read(DOC)
    sections = doc_text.count("\n## ")

    safety_markers = sum(
        1
        for marker in [
            "database migrations",
            "backend API contract changes",
            "authentication weakening",
            "RBAC weakening",
            "object-level access weakening",
            "exposing internal ports publicly",
            "changing production docker-compose.override.yml in git",
            "rendering raw backend error objects",
            "broad unrelated refactoring",
            "secrets_printed=no",
        ]
        if marker in doc_text
    )

    state_markers = sum(
        1
        for marker in [
            "visitor opens home page",
            "visitor opens catalog page",
            "visitor opens course detail page",
            "visitor opens login page",
            "visitor opens register page",
            "learner opens account page",
            "visitor opens document verification page",
            "admin opens dashboard page",
            "admin opens direct admin routes",
            "user sees loading state",
            "user sees empty state",
            "user sees filtered empty state",
            "user sees validation error",
            "user sees API error",
            "unauthenticated user sees protected-route state",
            "unauthorized user does not receive admin-only data",
        ]
        if marker in doc_text
    )

    if sections < 10:
        raise SystemExit(f"[fail] stage 12.6 doc sections too low: {sections}")

    if safety_markers < 9:
        raise SystemExit(f"[fail] stage 12.6 safety markers too low: {safety_markers}")

    if state_markers < 16:
        raise SystemExit(f"[fail] stage 12.6 state markers too low: {state_markers}")

    print(
        "stage 12.6 ux/ui navigation and empty states diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"state_markers={state_markers}, markers={markers}"
    )


if __name__ == "__main__":
    main()
