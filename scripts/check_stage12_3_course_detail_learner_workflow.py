from pathlib import Path

DOC = Path("docs/stage-12-3-course-detail-learner-workflow.md")
COURSE_DETAIL_PAGE = Path("frontend/src/pages/CourseDetailPage.jsx")
CATALOG_PAGE = Path("frontend/src/pages/CatalogPage.jsx")
API_CLIENT = Path("frontend/src/api/client.js")
APP = Path("frontend/src/App.jsx")
PUBLIC_ROUTES = Path("frontend/src/routes/PublicRoutes.jsx")

REQUIRED_FILES = [
    DOC,
    COURSE_DETAIL_PAGE,
    CATALOG_PAGE,
    API_CLIENT,
    APP,
    PUBLIC_ROUTES,
]

DOC_MARKERS = [
    "# Stage 12.3. Course detail learner workflow",
    "Status: in progress",
    "no database migrations",
    "no API contract changes unless a separate backend test is added first",
    "no authentication or RBAC weakening",
    "frontend_runtime_changed=no",
    "backend_runtime_changed=no",
    "current git head before Stage 12.3 implementation: 4fd61c4",
    "tag v0.1.0-stage12-1-account-ux-polish exists",
    "tag v0.1.0-stage12-2-catalog-ux-polish exists",
    "public /courses/:slug route exists",
    "CourseDetailPage loads public course detail through getPublicCourseDetail",
    "CourseDetailPage supports self-enrollment through enrollAccountCourse",
    "CourseDetailPage stores obrportal_pending_enrollment_slug for anonymous registration flow",
    "CourseDetailPage handles 409 enrollment conflict",
    "CourseDetailPage renders CourseSelfEnrollmentDiagnostics",
    "GET /api/v1/public/courses/{slug}",
    "POST /api/v1/account/courses/{course_id}/enroll",
    "Stage 12.3 course detail learner workflow guard created",
]

COURSE_DETAIL_MARKERS = [
    "getPublicCourseDetail",
    "getPublicCourses",
    "getAccountCourses",
    "enrollAccountCourse",
    "formatApiError",
    "formatCourseDocument",
    "formatCoursePrice",
    "getEnrollmentStatusLabel",
    "getEnrollmentStatusTone",
    "getCourseLessonTypeLabel",
    "getCourseStructureStats",
    "getCourseDetailDiagnostics",
    "CourseSelfEnrollmentDiagnostics",
    "CourseDetailPage",
    "CourseOutlineSection",
    "getPrimaryActionLabel",
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
    "Программа не найдена",
    "Загружаем карточку программы",
    'onPageChange("catalog")',
    'onPageChange("account")',
    'onPageChange("verify-document")',
    "onOpenCourse(item.slug)",
]

CATALOG_MARKERS = [
    "CatalogLearnerJourneyHint",
    "CatalogEmptyState",
    "onOpenCourse(course.slug)",
    "Подробнее / записаться",
    "Открыть в кабинете",
    "Программа завершена",
]

API_MARKERS = [
    'request("/api/v1/account/courses")',
    'request(`/api/v1/account/courses/${courseId}/enroll`,',
    'request(`/api/v1/public/courses${query ? `?${query}` : ""}`)',
    'request(`/api/v1/public/courses/${slug}`)',
]

ROUTE_MARKERS = [
    "PublicRoutes",
    "CourseDetailPublicRoute",
    'path="/courses/:slug"',
    "handleNavigatePublicPage",
    "handleOpenPublicCourse",
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
    course_detail_text = read(COURSE_DETAIL_PAGE)
    catalog_text = read(CATALOG_PAGE)
    api_text = read(API_CLIENT)
    route_text = read(APP) + "\n" + read(PUBLIC_ROUTES)

    require_markers("doc", doc_text, DOC_MARKERS)
    require_markers("course_detail_page", course_detail_text, COURSE_DETAIL_MARKERS)
    require_markers("catalog_page", catalog_text, CATALOG_MARKERS)
    require_markers("api_client", api_text, API_MARKERS)
    require_markers("routes", route_text, ROUTE_MARKERS)

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

    state_markers = sum(1 for marker in [
        "anonymous visitor",
        "authenticated learner without enrollment",
        "authenticated learner with assigned enrollment",
        "authenticated learner with active enrollment",
        "authenticated learner with completed enrollment",
        "authenticated learner with cancelled enrollment",
        "loading course detail",
        "course detail not found",
        "self-enrollment loading",
        "self-enrollment success",
        "self-enrollment error",
        "self-enrollment conflict 409",
    ] if marker in doc_text)

    total_markers = (
        len(DOC_MARKERS)
        + len(COURSE_DETAIL_MARKERS)
        + len(CATALOG_MARKERS)
        + len(API_MARKERS)
        + len(ROUTE_MARKERS)
    )

    print(
        "stage 12.3 course detail learner workflow diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"state_markers={state_markers}, markers={total_markers}"
    )

if __name__ == "__main__":
    main()
