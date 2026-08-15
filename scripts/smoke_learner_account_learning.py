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
        print(
            f"{relative_path} is missing required fragments:"
        )

        for fragment in missing:
            print(f" - {fragment}")

        raise SystemExit(1)


def main() -> None:
    require_contains(
        "frontend/src/components/account/LearnerAccountLearning.jsx",
        [
            "export function LearnerAccountLearning",
            'data-testid="learner-account-learning"',
            "aria-busy={loading}",
            'data-testid="learner-learning-loading"',
            'role="status"',
            'aria-live="polite"',
            'aria-label="Загружаем программы обучения"',
            'role="alert"',
            "const LEARNING_FILTERS = [",
            'value: "active"',
            'value: "assigned"',
            'value: "completed"',
            "function getStatusLabel(status)",
            "function getStatusTone(status)",
            "function getCourseActionLabel(status)",
            "function LearningCourseCard({",
            "function CourseProgress({",
            'data-testid="learner-learning-course-progress"',
            'data-testid="learner-learning-course-card"',
            'data-testid="learner-learning-course-list"',
            'data-testid="learner-learning-empty"',
            'data-testid="learner-learning-filter-empty"',
            'course.status === "assigned"',
            'course.status === "active"',
            'course.status === "completed"',
            '"Начать обучение"',
            '"Продолжить обучение"',
            '"Посмотреть программу"',
            "detail.progress_percent",
            "detail.lessons_completed",
            "detail.lessons_total",
            "onLoadCourseDetail",
            "onStartCourse",
            "onOpenCourse",
            "onOpenCatalog",
            'aria-label="Сводка по обучению"',
            "Моё обучение",
            "Всего программ",
            "В процессе",
            "Ожидают начала",
            "Завершено",
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            'import { LearnerAccountLearning } from "../components/account/LearnerAccountLearning";',
            'learning: "account-learning"',
            'const [learningStatusFilter, setLearningStatusFilter] = useState("");',
            "async function handleLoadLearningCourseDetail(course)",
            "const detail = await getAccountCourseDetail(enrollmentId);",
            "setSelectedCourseDetail(detail);",
            'id="account-learning"',
            "<LearnerAccountLearning",
            "courses={courses}",
            "selectedStatus={learningStatusFilter}",
            "selectedCourseDetail={selectedCourseDetail}",
            "detailLoadingEnrollmentId={courseDetailLoadingId}",
            'courseActionLoadingKey.endsWith(":start")',
            "onStatusChange={setLearningStatusFilter}",
            "onLoadCourseDetail={handleLoadLearningCourseDetail}",
            "handleStartCourse(course.enrollment_id)",
            "onOpenCourse={onOpenCourse}",
            'onOpenCatalog={() => onPageChange("catalog")}',
            'activeAccountSection === "learning"',
        ],
    )

    require_contains(
        "frontend/src/pages/AccountPage.jsx",
        [
            "function getInitialAccountSection()",
            '"obrportal_account_section"',
            "getInitialAccountSection",
            'sessionStorage.removeItem("obrportal_account_section");',
            'data-testid="learner-account-global-notice"',
        ],
    )

    require_contains(
        "frontend/src/pages/CourseDetailPage.jsx",
        [
            "function setAccountLearningEntryIntent(notice = null)",
            '"obrportal_account_section"',
            '"obrportal_account_notice"',
            "setAccountLearningEntryIntent();",
            "setAccountLearningEntryIntent({",
            'title: "Запись на курс"',
            'title: "Курс уже назначен"',
            "раздел «Моё обучение»",
            "Курс добавлен в личный кабинет",
            'onPageChange("account")',
        ],
    )

    require_contains(
        "frontend/src/hooks/usePendingEnrollment.js",
        [
            "function setAccountLearningSection()",
            '"obrportal_account_section"',
            '"learning"',
            "setAccountLearningSection();",
            'status: "created"',
            'status: "already_enrolled"',
        ],
    )

    print("Learner account learning smoke passed")
    print(" - learning page header contract covered")
    print(" - course status filters covered")
    print(" - learner course cards covered")
    print(" - lazy course progress contract covered")
    print(" - start/resume/completed action contract covered")
    print(" - loading and empty states covered")


if __name__ == "__main__":
    main()
