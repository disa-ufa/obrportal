from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(
    relative_path: str,
    fragments: list[str],
) -> None:
    text = read_text(relative_path)
    missing = [
        fragment
        for fragment in fragments
        if fragment not in text
    ]

    if missing:
        print(f"{relative_path} is missing required fragments:")

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)


def require_absent(
    relative_path: str,
    fragments: list[str],
) -> None:
    text = read_text(relative_path)
    present = [
        fragment
        for fragment in fragments
        if fragment in text
    ]

    if present:
        print(f"{relative_path} still contains retired fragments:")

        for fragment in present:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/api/client.js",
        [
            "export async function getAccountSummary()",
            "export async function getAccountCourses()",
            "export async function getAccountActivities()",
            "export async function getAccountDocuments()",
            "export async function getAccountCourseDetail(enrollmentId)",
            "export async function startAccountCourse(enrollmentId)",
            "export async function downloadAccountDocument(documentId)",
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            'import { useEffect, useState } from "react";',
            "downloadAccountDocument,",
            "getAccountActivities,",
            "getAccountCourseDetail,",
            "getAccountCourses,",
            "getAccountDocuments,",
            "getAccountSummary,",
            "startAccountCourse,",
            "LearnerAccountLayout",
            "LearnerAccountDashboard",
            "LearnerAccountLearning",
            "LearnerAccountAssignments",
            "LearnerAccountDocuments",
            "LearnerAccountProfile",
            "const ACCOUNT_SECTION_TARGETS = {",
            "function getInitialAccountSection()",
            (
                "export function AccountPage"
                "({ user, onPageChange, onOpenCourse })"
            ),
            'const [learningStatusFilter, setLearningStatusFilter] = useState("");',
            'const [activityStatusFilter, setActivityStatusFilter] = useState("");',
            'const [documentStatusFilter, setDocumentStatusFilter] = useState("");',
            "const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);",
            "const [overviewCourseDetail, setOverviewCourseDetail] = useState(null);",
            "async function loadAccountData()",
            "async function loadAccountActivities()",
            "async function refreshAccountSnapshot()",
            "async function refreshAccountActivities()",
            "async function handleStartCourse(enrollmentId)",
            "async function handleLoadLearningCourseDetail(course)",
            "async function handleDownload(documentId)",
            "function handleAccountSectionChange(section)",
            'id="account-overview"',
            'id="account-learning"',
            'id="account-assignments"',
            'id="account-documents"',
            'id="account-profile"',
            "<LearnerAccountDashboard",
            "<LearnerAccountLearning",
            "<LearnerAccountAssignments",
            "<LearnerAccountDocuments",
            "<LearnerAccountProfile",
            "actionErrorMessage={downloadError}",
            'handleAccountSectionChange("learning")',
        ],
    )

    require_absent(
        "frontend/src/pages/AccountPage.jsx",
        [
            "useMemo",
            "completeAccountCourse,",
            "completeAccountCourseLesson,",
            "AdminQuickFilterButtons",
            "DocumentVerificationQrBlock",
            "SectionCard",
            "ACCOUNT_COURSE_FILTERS",
            "ACCOUNT_DOCUMENT_FILTERS",
            "calculateStatusCounts",
            "AccountAccessDiagnostics",
            "LearningProgressDiagnostics",
            "CompletionDocumentsDiagnostics",
            "AccountCourseProgressSummary",
            "AccountCourseOutline",
            "AccountCourseDocumentCard",
            "AccountEmptyState",
            "courseStatusFilter",
            "visibleCourses",
            "visibleDocuments",
            "courseStatusCounts",
            "documentStatusCounts",
            "lessonProgressLoadingId",
            "handleToggleCourseOutline",
            "handleCompleteCourse",
            "handleCompleteLesson",
            'data-testid="learner-account-legacy-sections"',
            'id="account-documents-legacy"',
            'id="account-courses"',
        ],
    )

    # Course/lesson completion remains available in the actual
    # learner course workspace after removing the hidden legacy cabinet.
    require_contains(
        "frontend/src/pages/CourseDetailPage.jsx",
        [
            "completeAccountCourse",
            "completeAccountCourseLesson",
            "await completeAccountCourse(enrollmentId)",
            (
                "await completeAccountCourseLesson"
                "(enrollmentId, lesson.id)"
            ),
        ],
    )

    print("Account page behavior smoke passed")
    print(" - five learner workspaces covered")
    print(" - current account API loading covered")
    print(" - start/progress/download actions covered")
    print(" - hidden legacy cabinet removed")
    print(" - course completion remains in CourseDetailPage")


if __name__ == "__main__":
    main()