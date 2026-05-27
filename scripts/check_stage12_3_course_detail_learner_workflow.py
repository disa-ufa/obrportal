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
    "Stage 12.3 improves course detail service and empty states",
    "Stage 12.3 course detail empty and service states - 2026-05-27",
    "/opt/obrportal/tmp/stage_12_3_5_course_detail_empty_states_frontend_deploy_retry_20260527203631.txt",
    "stage12_3_course_detail_empty_states_frontend_deploy=passed",
    "stage12_3_course_detail_empty_states_frontend_deploy_retry=passed",
    "source marker CourseOutlineModuleEmptyState render was present",
    "source marker CourseOutlineEmptyState render was present",
    "source marker CourseDetailServiceState loading render was present",
    "source marker CourseOutlineModuleEmptyState was present",
    "source marker CourseOutlineEmptyState was present",
    "source marker course-detail-not-found-state was present",
    "source marker course-detail-loading-state was present",
    "source marker CourseDetailServiceState was present",
    "production git head: cbb5d3a",
    "Stage 12.3 course detail empty states frontend deploy - 2026-05-27",
    "CourseDetailLearnerJourneyHint is rendered before CourseSelfEnrollmentDiagnostics",
    "Stage 12.3 adds a frontend-only learner journey hint",
    "Stage 12.3 course detail learner journey hint - 2026-05-27",
    "/opt/obrportal/tmp/stage_12_3_3_course_detail_journey_hint_frontend_deploy_20260527201137.txt",
    "stage12_3_course_detail_journey_hint_frontend_deploy=passed",
    "frontend_runtime_changed=yes",
    "frontend health became healthy",
    "frontend container was recreated",
    "frontend static image was rebuilt",
    "source marker primary handler handleEnroll was present",
    "source marker course detail learner journey heading was present",
    "source marker CourseDetailLearnerJourneyHint render was present",
    "source marker CourseDetailLearnerJourneyHint was present",
    "production git head: 763ba3b",
    "Stage 12.3 course detail learner journey hint frontend deploy - 2026-05-27",
    "/opt/obrportal/tmp/stage_12_3_1_course_detail_workflow_docs_sync_20260527195749.txt",
    "stage12_3_course_detail_workflow_docs_sync=passed",
    "API marker enrollAccountCourse was present",
    "API marker getPublicCourseDetail was present",
    "route marker CourseDetailPublicRoute was present",
    "route marker /courses/:slug was present",
    "source marker err.status === 409 was present",
    "source marker obrportal_pending_enrollment_slug was present",
    "source marker CourseOutlineSection was present",
    "source marker CourseSelfEnrollmentDiagnostics was present",
    "source marker CourseDetailPage was present",
    "Stage 12.2 catalog UX polish tag head verified: 1d5c91f",
    "Stage 12.3 course detail learner workflow guard passed",
    "production git head: 9329159",
    "Stage 12.3 course detail workflow docs sync - 2026-05-27",
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
    "<CourseOutlineModuleEmptyState",
    "<CourseOutlineEmptyState",
    "<CourseDetailServiceState",
    '<CourseDetailServiceState variant="loading"',
    "Уроки в этом модуле пока готовятся",
    "Программа курса пока готовится к публикации",
    "По этому адресу нет опубликованной карточки курса",
    "course-outline-module-empty-title",
    "course-outline-empty-title",
    "course-outline-module-empty-state",
    "course-outline-empty-state",
    "CourseOutlineModuleEmptyState",
    "CourseOutlineEmptyState",
    "course-detail-state-verify-action",
    "course-detail-state-catalog-action",
    "course-detail-state-description",
    "course-detail-state-title",
    "course-detail-not-found-state",
    "course-detail-loading-state",
    "CourseDetailServiceState",
    "После записи курс откроется в личном кабинете",
    "Карточка курса → запись → личный кабинет",
    "course-detail-learner-journey-verify-action",
    "course-detail-learner-journey-account-action",
    "course-detail-learner-journey-primary-action",
    "course-detail-learner-journey-next-step",
    "course-detail-learner-journey-steps",
    "course-detail-learner-journey",
    "<CourseDetailLearnerJourneyHint",
    "CourseDetailLearnerJourneyHint",
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
