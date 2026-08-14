from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_text(relative_path: str) -> str:
    path = ROOT / relative_path

    if not path.exists():
        raise SystemExit(f"File not found: {relative_path}")

    return path.read_text(encoding="utf-8")


def require_contains(relative_path: str, fragments: list[str]) -> None:
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


def main() -> None:
    require_contains(
        "frontend/src/components/account/LearnerAccountDashboard.jsx",
        [
            "export function LearnerAccountDashboard",
            'data-testid="learner-account-dashboard"',
            "export function getLearnerDashboardCurrentCourse(courses)",
            "function getMatchingCourseDetail(",
            "function getNextLesson(detail)",
            "function getLearningActivities(detail)",
            "DashboardStatCard",
            'label="Всего программ"',
            'label="В процессе"',
            'label="Ожидают начала"',
            'label="Документы"',
            'title="Текущая программа"',
            'title="Все мои программы"',
            'title="Задания и тесты"',
            'title="Мои документы"',
            'title="Профиль"',
            'currentCourseDetail = null',
            'course.status === "active"',
            'course.status === "assigned"',
            'block.block_type === "quiz"',
            'block.block_type === "assignment"',
            "detail?.progress_percent",
            'openSection("learning")',
            'openSection("assignments")',
            'openSection("documents")',
            'openSection("profile")',
            "user?.is_email_verified",
            "Перед завершением обучения проверьте персональные данные",
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            "getLearnerDashboardCurrentCourse,",
            "LearnerAccountDashboard,",
            'const [overviewCourseDetail, setOverviewCourseDetail] = useState(null);',
            "const currentCourse = getLearnerDashboardCurrentCourse(",
            "coursesResponse?.items || []",
            "async function loadOverviewCourseDetail()",
            "getAccountCourseDetail(",
            "currentCourse.enrollment_id",
            "setOverviewCourseDetail(detail);",
            "<LearnerAccountDashboard",
            "user={profile}",
            "summary={summary}",
            "courses={courses}",
            "documents={documents}",
            "currentCourseDetail={overviewCourseDetail}",
            "loading={loading}",
            "errorMessage={error}",
            "onSectionChange={handleAccountSectionChange}",
            "onOpenCourse={onOpenCourse}",
            'data-testid="learner-account-legacy-sections"',
            'activeAccountSection === "overview"',
        ],
    )

    print("Learner account dashboard smoke passed")
    print(" - overview hero contract covered")
    print(" - real course summary contract covered")
    print(" - current course progress contract covered")
    print(" - learning activities preview contract covered")
    print(" - document preview contract covered")
    print(" - profile state contract covered")


if __name__ == "__main__":
    main()
