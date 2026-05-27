from pathlib import Path

DOC = Path("docs/stage-12-2-catalog-learner-workflow.md")
CATALOG_PAGE = Path("frontend/src/pages/CatalogPage.jsx")
COURSE_DETAIL_PAGE = Path("frontend/src/pages/CourseDetailPage.jsx")
API_CLIENT = Path("frontend/src/api/client.js")
APP = Path("frontend/src/App.jsx")
PUBLIC_ROUTES = Path("frontend/src/routes/PublicRoutes.jsx")

REQUIRED_FILES = [
    DOC,
    CATALOG_PAGE,
    COURSE_DETAIL_PAGE,
    API_CLIENT,
    APP,
    PUBLIC_ROUTES,
]

DOC_MARKERS = [
    "# Stage 12.2. Catalog learner workflow",
    "Status: in progress",
    "no database migrations",
    "no API contract changes unless a separate backend test is added first",
    "no authentication or RBAC weakening",
    "frontend_runtime_changed=no",
    "backend_runtime_changed=no",
    "public /catalog route exists",
    "public /courses/:slug route exists",
    "CatalogPage loads public courses through getPublicCourses",
    "CatalogPage loads learner enrollments through getAccountCourses when user is authenticated",
    "CourseDetailPage supports self-enrollment through enrollAccountCourse",
    "obrportal_pending_enrollment_slug",
    "GET /api/v1/public/courses",
    "GET /api/v1/public/courses/{slug}",
    "POST /api/v1/account/courses/{course_id}/enroll",
    "Stage 12.2 catalog learner workflow guard created",
]

CATALOG_MARKERS = [
    "getPublicCourses",
    "getAccountCourses",
    "formatApiError",
    "buildEnrollmentMap",
    "getEnrollmentStatusLabel",
    "getEnrollmentStatusTone",
    "Подробнее / записаться",
    "Открыть в кабинете",
    "Программа завершена",
    "CatalogDiagnostics",
    "catalog-public-diagnostics",
    "catalog-public-status",
    "catalog-public-summary",
    "catalog-public-filters",
    "catalog-public-attention",
    "catalog-public-links",
    'onPageChange("account")',
    'onPageChange("verify-document")',
    "onOpenCourse(course.slug)",
    "resetFilters",
]

COURSE_DETAIL_MARKERS = [
    "getPublicCourseDetail",
    "getPublicCourses",
    "getAccountCourses",
    "enrollAccountCourse",
    "CourseSelfEnrollmentDiagnostics",
    "course-self-enrollment-diagnostics",
    "course-self-enrollment-status",
    "course-self-enrollment-summary",
    "course-self-enrollment-attention",
    "course-self-enrollment-links",
    "Зарегистрироваться и записаться",
    "Записаться",
    "Открыть личный кабинет",
    "Посмотреть документы в кабинете",
    "obrportal_pending_enrollment_slug",
    "Курс добавлен в личный кабинет",
    "err.status === 409",
    'onPageChange("catalog")',
    'onPageChange("account")',
    'onPageChange("verify-document")',
]

API_MARKERS = [
    'request("/api/v1/account/summary")',
    'request("/api/v1/account/courses")',
    'request(`/api/v1/account/courses/${courseId}/enroll`,',
    'request(`/api/v1/public/courses${query ? `?${query}` : ""}`)',
    'request(`/api/v1/public/courses/${slug}`)',
]

ROUTE_MARKERS = [
    "PublicRoutes",
    "handleNavigatePublicPage",
    "handleOpenPublicCourse",
    "currentPublicPage",
    "PublicShell",
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
    catalog_text = read(CATALOG_PAGE)
    course_detail_text = read(COURSE_DETAIL_PAGE)
    api_text = read(API_CLIENT)
    app_text = read(APP)
    public_routes_text = read(PUBLIC_ROUTES)

    require_markers("doc", doc_text, DOC_MARKERS)
    require_markers("catalog_page", catalog_text, CATALOG_MARKERS)
    require_markers("course_detail_page", course_detail_text, COURSE_DETAIL_MARKERS)
    require_markers("api_client", api_text, API_MARKERS)
    require_markers("routes", app_text + "\n" + public_routes_text, ROUTE_MARKERS)

    sections = doc_text.count("\n## ")
    safety_markers = sum(1 for marker in [
        "no database migrations",
        "no API contract changes",
        "no authentication or RBAC weakening",
        "no secrets",
        "frontend_runtime_changed",
        "backend_runtime_changed",
        "RESULT=PASSED",
        "public /catalog returned HTTP 200",
        "public /api/v1/ready returned database=ok, redis=ok, storage=ok",
        "no production backend restart for frontend-only UX changes",
    ] if marker in doc_text)

    total_markers = (
        len(DOC_MARKERS)
        + len(CATALOG_MARKERS)
        + len(COURSE_DETAIL_MARKERS)
        + len(API_MARKERS)
        + len(ROUTE_MARKERS)
    )

    print(
        "stage 12.2 catalog learner workflow diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, markers={total_markers}"
    )

if __name__ == "__main__":
    main()
