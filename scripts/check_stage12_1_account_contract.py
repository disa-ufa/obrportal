from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

FILES = {
    "backend_account": ROOT / "backend" / "app" / "api" / "v1" / "account.py",
    "enrollment_completion": ROOT / "backend" / "app" / "services" / "enrollment_completion.py",
    "backend_account_schema": ROOT / "backend" / "app" / "schemas" / "account.py",
    "frontend_account": ROOT / "frontend" / "src" / "pages" / "AccountPage.jsx",
    "frontend_learner_course": ROOT / "frontend" / "src" / "pages" / "LearnerCoursePage.jsx",
    "frontend_client": ROOT / "frontend" / "src" / "api" / "client.js",
    "frontend_auth_flow": ROOT / "frontend" / "src" / "hooks" / "useAuthFlow.js",
    "frontend_pending_enrollment": ROOT / "frontend" / "src" / "hooks" / "usePendingEnrollment.js",
    "test_course_detail": ROOT / "backend" / "app" / "tests" / "test_account_course_detail_api.py",
    "test_lesson_progress": ROOT / "backend" / "app" / "tests" / "test_account_lesson_progress_api.py",
    "test_auth_rbac_admin_api": ROOT / "backend" / "app" / "tests" / "test_auth_rbac_admin_api.py",
}

REQUIRED_MARKERS = {
    "backend_account": [
        'router = APIRouter(prefix="/account", tags=["account"])',
        '@router.get("/summary", response_model=AccountSummaryResponse)',
        '@router.get("/courses", response_model=AccountCoursesResponse)',
        '@router.get("/documents", response_model=AccountDocumentsResponse)',
        '@router.get("/documents/{document_id}/download")',
        '@router.get("/courses/{enrollment_id}", response_model=AccountCourseDetailResponse)',
        '"/courses/{enrollment_id}/lessons/{lesson_id}/complete"',
        '"/courses/{course_id}/enroll"',
        '"/courses/{enrollment_id}/start"',
        '"/courses/{enrollment_id}/complete"',
        "Enrollment.user_id == current_user.id",
        "DocumentRecord.user_id == current_user.id",
        "Enrollment.id == enrollment_id",
        "DocumentRecord.id == document_id",
        "Complete required lessons before completing course",
        "Completed course cannot be changed",
        "ensure_enrollment_completed",
    ],
    "enrollment_completion": [
        "async def ensure_enrollment_completed(",
        "ensure_completion_document_for_enrollment(",
        "ensure_registry_obligations_for_completed_enrollment(",
        "await session.flush()",
    ],
    "backend_account_schema": [
        "class AccountSummaryResponse",
        "class AccountCourseItemResponse",
        "class AccountCourseDetailResponse",
        "class AccountCoursesResponse",
        "class AccountDocumentItemResponse",
        "class AccountDocumentsResponse",
        "download_available",
        "file_available",
        "verification_code",
        "revocation_reason",
    ],
    "frontend_account": [
        "export function AccountPage",
        "getAccountSummary",
        "getAccountCourses",
        "getAccountDocuments",
        "getAccountActivities",
        "getAccountCourseDetail",
        "downloadAccountDocument",
        "formatApiError",
        "LearnerAccountLayout",
        "LearnerAccountDashboard",
        "LearnerAccountLearning",
        "LearnerAccountAssignments",
        "LearnerAccountDocuments",
        "LearnerAccountProfile",
        'overview: "account-overview"',
        'learning: "account-learning"',
        'assignments: "account-assignments"',
        'documents: "account-documents"',
        'profile: "account-profile"',
        'id="account-overview"',
        'id="account-learning"',
        'id="account-assignments"',
        'id="account-documents"',
        'id="account-profile"',
        "handleLoadLearningCourseDetail",
        "handleDownload",
        "actionErrorMessage={downloadError}",
    ],
    "frontend_learner_course": [
        "export function LearnerCoursePage",
        "getAccountCourseDetail",
        "startAccountCourse",
        "handleStartCourse",
        "await startAccountCourse(enrollmentId)",
        "setDetail(response)",
    ],
    "frontend_client": [        'request("/api/v1/account/summary")',
        'request("/api/v1/account/courses")',
        'request(`/api/v1/account/courses/${enrollmentId}`)',
        'request(`/api/v1/account/courses/${enrollmentId}/lessons/${lessonId}/complete`',
        'request(`/api/v1/account/courses/${courseId}/enroll`',
        'request(`/api/v1/account/courses/${enrollmentId}/start`',
        'request(`/api/v1/account/courses/${enrollmentId}/complete`',
        'request("/api/v1/account/documents")',
        '`/api/v1/account/documents/${documentId}/download`',
        "Authorization",
        "Bearer",
    ],
    "frontend_auth_flow": [
        'if (userHasRole(user, "org_rep"))',
        'return "organization";',
        'userHasRole(user, "ministry_admin") ? "ministry" : "account"',
        'return "/organization";',
        'userHasRole(user, "ministry_admin") ? "/ministry" : "/account"',
        "completePendingEnrollmentIfNeeded",
        "navigate(getPostAuthPublicPath(currentUser), { replace: true })",
    ],
    "frontend_pending_enrollment": [
        "obrportal_pending_enrollment_slug",
        "obrportal_account_notice",
        "completePendingEnrollmentIfNeeded",
        "enrollAccountCourse",
        "already_enrolled",
        "not_found",
        "failed",
    ],
    "test_course_detail": [
        "test_account_course_detail_returns_own_active_outline_only_sorted",
        "test_account_course_detail_rejects_foreign_enrollment_and_missing_token",
        "assert status == 404",
        "assert status == 401",
        "hidden_module",
        "hidden_lesson",
    ],
    "test_lesson_progress": [
        "test_learner_can_complete_lesson_and_detail_returns_progress",
        "test_lesson_auto_completion_rejects_repeat_mutation",
        "test_lesson_complete_rejects_foreign_enrollment_foreign_lesson_and_guest",
        "test_course_completion_requires_required_lessons",
        "test_lesson_complete_rejects_completed_course",
        "assert status == 404",
        "assert status == 401",
        "Complete required lessons before completing course",
        "Completed course cannot be changed",
    ],
    "test_auth_rbac_admin_api": [
        "test_admin_can_get_account_summary",
        "test_learner_can_get_account_summary",
        "test_account_summary_without_token_returns_401",
        "test_admin_can_get_account_courses",
        "test_learner_can_get_account_courses",
        "test_account_courses_without_token_returns_401",
        "test_admin_can_get_account_documents",
        "test_account_documents_without_token_returns_401",
        "test_admin_can_get_account_document_download",
        "test_foreign_user_cannot_get_account_document_download",
        "test_account_document_download_without_token_returns_401",
        "test_account_course_progress_dates_are_returned",
        "test_learner_account_documents_include_revocation_metadata",
    ],
}


def read_file(label: str, path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"missing required file for {label}: {path.relative_to(ROOT)}")

    return path.read_text(encoding="utf-8")


def main() -> None:
    missing: list[str] = []

    for label, path in FILES.items():
        text = read_file(label, path)

        for marker in REQUIRED_MARKERS[label]:
            if marker not in text:
                missing.append(f"{label}: {marker}")

    if missing:
        print("stage 12.1 account contract diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    backend_text = read_file("backend_account", FILES["backend_account"])
    ownership_markers = backend_text.count("current_user.id")
    account_routes = backend_text.count("@router.")

    frontend_text = read_file("frontend_account", FILES["frontend_account"])
    frontend_account_calls = (
        frontend_text.count("getAccount")
        + frontend_text.count("Account")
        + frontend_text.count("Document")
        + frontend_text.count("Course")
    )

    if ownership_markers < 8:
        raise SystemExit(f"expected at least 8 current_user.id ownership markers, got {ownership_markers}")

    if account_routes < 8:
        raise SystemExit(f"expected at least 8 account routes, got {account_routes}")

    if frontend_account_calls < 30:
        raise SystemExit(f"expected at least 30 frontend account markers, got {frontend_account_calls}")

    print(
        "stage 12.1 account contract diagnostics passed: "
        f"files={len(FILES)}, "
        f"marker_groups={len(REQUIRED_MARKERS)}, "
        f"ownership_markers={ownership_markers}, "
        f"account_routes={account_routes}, "
        f"frontend_account_markers={frontend_account_calls}"
    )


if __name__ == "__main__":
    main()
