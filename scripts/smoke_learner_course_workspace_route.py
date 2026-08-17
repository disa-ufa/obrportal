from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

ROUTES = ROOT / "frontend/src/routes/PublicRoutes.jsx"
PUBLIC_ROUTES = ROOT / "frontend/src/utils/publicRoutes.js"
PAGE = ROOT / "frontend/src/pages/LearnerCoursePage.jsx"


def read(path: Path) -> str:
    assert path.exists(), path
    return path.read_text(encoding="utf-8")


def test_authenticated_learner_course_routes_exist() -> None:
    routes = read(ROUTES)

    assert 'import("../pages/LearnerCoursePage")' in routes
    assert '"LearnerCoursePage"' in routes

    assert 'path="/account/courses/:enrollmentId"' in routes

    assert (
        'path="/account/courses/:enrollmentId/lessons/:lessonId"'
        in routes
    )

    assert routes.count(
        "element={learnerCourseElement}"
    ) == 2

    assert "<LearnerCoursePage />" in routes
    assert '<Navigate to="/login" replace />' in routes


def test_learner_route_is_classified_as_account_page() -> None:
    source = read(PUBLIC_ROUTES)

    assert (
        'pathname.startsWith("/account/courses/")'
        in source
    )

    assert (
        'title: "Обучение — ОбрПортал"'
        in source
    )

    assert (
        'expectedPage: "account", expectedTitle: "Обучение — ОбрПортал"'
        in source
    )


def test_workspace_uses_account_api_only() -> None:
    page = read(PAGE)

    assert "getAccountCourseDetail" in page
    assert "startAccountCourse" in page

    assert "getPublicCourseDetail" not in page
    assert "getPublicCourses" not in page
    assert "course_slug" not in page


def test_workspace_supports_enrollment_and_lesson_deep_links() -> None:
    page = read(PAGE)

    assert "useParams" in page
    assert "enrollmentId" in page
    assert "lessonId" in page

    assert (
        "`/account/courses/${enrollmentId}/lessons/${nextLessonId}`"
        in page
    )

    assert "(lesson) => !lesson.is_completed" in page


def test_workspace_uses_effective_progress_and_statuses() -> None:
    page = read(PAGE)

    assert "required_progress_percent" in page
    assert "lessons_completed" in page
    assert "lessons_total" in page

    assert 'detail.status === "assigned"' in page
    assert 'detail.status === "completed"' in page
    assert 'detail.status === "cancelled"' in page


def test_workspace_has_stable_ui_markers() -> None:
    page = read(PAGE)

    for marker in (
        'data-testid="learner-course-loading"',
        'data-testid="learner-course-error"',
        'data-testid="learner-course-workspace"',
        'data-testid="learner-course-active-lesson"',
        'data-testid="learner-course-lesson-not-found"',
    ):
        assert marker in page


def test_changed_frontend_files_have_clean_eof() -> None:
    for path in (
        ROUTES,
        PUBLIC_ROUTES,
        PAGE,
    ):
        text = read(path)

        assert text.endswith("\n")
        assert not text.endswith("\n\n")

        for number, line in enumerate(
            text.splitlines(),
            start=1,
        ):
            assert line == line.rstrip(), (
                f"{path}:{number}: trailing whitespace"
            )


def test_account_primary_actions_open_authenticated_workspace() -> None:
    account = read(
        ROOT / "frontend/src/pages/AccountPage.jsx"
    )

    assert "useNavigate" in account
    assert "handleOpenLearningCourse" in account

    assert (
        "`/account/courses/${enrollmentId}`"
        in account
    )

    assert (
        "`/account/courses/${enrollmentId}/lessons/${lessonId}`"
        in account
    )

    assert "startAccountCourse" not in account
    assert "courseActionLoadingKey" not in account
    assert "courseActionError" not in account


def test_dashboard_actions_open_authenticated_workspace() -> None:
    dashboard = read(
        ROOT
        / "frontend/src/components/account/LearnerAccountDashboard.jsx"
    )

    assert "onOpenLearningCourse" in dashboard
    assert "required_progress_percent" in dashboard

    assert (
        "lesson.is_required && !lesson.is_completed"
        not in dashboard
    )

    assert "onOpenCourse" not in dashboard


def test_learning_primary_action_opens_workspace_and_public_info_remains() -> None:
    learning = read(
        ROOT
        / "frontend/src/components/account/LearnerAccountLearning.jsx"
    )

    assert (
        "onOpenLearningCourse?.(course)"
        in learning
    )

    assert "onStartCourse" not in learning
    assert "actionLoadingEnrollmentId" not in learning

    assert (
        "detail.required_progress_percent"
        in learning
    )

    assert (
        "onOpenCourse(course.course_slug)"
        in learning
    )

    assert 'case "cancelled":' in learning


def test_assignment_action_uses_authenticated_enrollment_workspace() -> None:
    assignments = read(
        ROOT
        / "frontend/src/components/account/LearnerAccountAssignments.jsx"
    )

    assert "onOpenLearningCourse" in assignments
    assert "activity.enrollment_id" in assignments

    assert "activity.course_slug" not in assignments
    assert "onOpenCourse" not in assignments


def test_assignment_action_opens_exact_authenticated_lesson() -> None:
    assignments = read(
        ROOT
        / "frontend/src/components/account/LearnerAccountAssignments.jsx"
    )

    assert "onOpenLearningCourse" in assignments
    assert "activity.enrollment_id" in assignments
    assert "activity.lesson_id" in assignments

    assert assignments.count(
        "activity.lesson_id"
    ) == 2

    assert (
        "onOpenLearningCourse?.("
        in assignments
    )

    assert "activity.course_slug" not in assignments

# STEP_7H_B1
def test_quiz_block_uses_authenticated_account_api_only() -> None:
    quiz = read(
        ROOT
        / "frontend/src/components/learner/LearnerQuizBlock.jsx"
    )

    assert (
        "getAccountCourseLessonQuizAttempts"
        in quiz
    )
    assert (
        "submitAccountCourseLessonQuizAttempt"
        in quiz
    )

    assert "../../api/client" in quiz

    assert "getPublicCourseDetail" not in quiz
    assert "getPublicCourses" not in quiz
    assert "/api/v1/" not in quiz


def test_quiz_block_supports_safe_question_types() -> None:
    quiz = read(
        ROOT
        / "frontend/src/components/learner/LearnerQuizBlock.jsx"
    )

    assert 'if (type === "single_choice")' in quiz
    assert 'if (type === "multiple_choice")' in quiz
    assert 'if (type === "true_false")' in quiz
    assert 'if (type === "short_text")' in quiz
    assert 'if (type === "number")' in quiz

    assert (
        r"\u0422\u0438\u043f "
        r"\u0432\u043e\u043f\u0440\u043e\u0441\u0430 "
        r"\u043d\u0435 "
        r"\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f."
        in quiz
    )


def test_quiz_block_has_no_client_side_grading_or_answer_keys() -> None:
    quiz = read(
        ROOT
        / "frontend/src/components/learner/LearnerQuizBlock.jsx"
    )

    forbidden = [
        "quizGrading",
        "gradeQuiz",
        "gradeQuizAttempt",
        "is_correct",
        "accepted_answers",
        "correct_value",
        "correct_number",
    ]

    for marker in forbidden:
        assert marker not in quiz

    assert "result?.correct_answer" in quiz
    assert quiz.count("correct_answer") == 1


def test_workspace_wires_quiz_active_only_and_preserves_other_blocks() -> None:
    page = read(PAGE)

    assert (
        'import { LearnerQuizBlock } '
        'from "../components/learner/LearnerQuizBlock";'
        in page
    )

    assert (
        'const readOnly = detail?.status !== "active";'
        in page
    )

    assert 'block.block_type === "quiz"' in page
    assert "<LearnerQuizBlock" in page

    assert "block={block}" in page
    assert "enrollmentId={enrollmentId}" in page
    assert "lessonId={selectedLesson.id}" in page
    assert "disabled={readOnly}" in page

    assert "{block.block_type}" in page

# STEP_7H_B2_B0
def test_assignment_block_uses_authenticated_account_api_only() -> None:
    assignment = read(
        ROOT
        / "frontend/src/components/learner/LearnerAssignmentBlock.jsx"
    )

    assert (
        "getAccountCourseLessonAssignmentSubmission"
        in assignment
    )
    assert (
        "submitAccountCourseLessonAssignmentAnswer"
        in assignment
    )
    assert (
        "completeAccountCourseLessonAssignment"
        in assignment
    )

    assert "../../api/client" in assignment

    assert "getPublicCourseDetail" not in assignment
    assert "getPublicCourses" not in assignment
    assert "/api/v1/" not in assignment


def test_assignment_block_preserves_review_modes_and_feedback() -> None:
    assignment = read(
        ROOT
        / "frontend/src/components/learner/LearnerAssignmentBlock.jsx"
    )

    assert '"self_check"' in assignment
    assert '"submit_only"' in assignment
    assert '"manual_review"' in assignment

    assert (
        'data-testid="learner-assignment-answer-textarea"'
        in assignment
    )
    assert (
        'data-testid="learner-assignment-submit-answer-button"'
        in assignment
    )
    assert (
        'data-testid="learner-assignment-review-result"'
        in assignment
    )
    assert (
        'data-testid="learner-assignment-review-comment"'
        in assignment
    )
    assert (
        'data-testid="learner-assignment-complete-button"'
        in assignment
    )

    assert "submission?.score" in assignment
    assert "submission?.max_score" in assignment
    assert "submission?.review_comment" in assignment
    assert "submission?.reviewed_at" in assignment


def test_assignment_block_mutations_are_active_only() -> None:
    assignment = read(
        ROOT
        / "frontend/src/components/learner/LearnerAssignmentBlock.jsx"
    )

    assert "disabled = false" in assignment

    assert (
        "disabled\n      || submitting"
        in assignment
    )

    assert (
        "disabled\n      || completing"
        in assignment
    )

    assert (
        'data-testid="learner-assignment-read-only"'
        in assignment
    )

    assert (
        "disabled={disabled || submitting || loading}"
        in assignment
    )

    assert (
        'reviewMode === "manual_review"'
        in assignment
    )


def test_workspace_wires_assignment_active_only_and_preserves_quiz() -> None:
    page = read(PAGE)

    assert (
        'import { LearnerAssignmentBlock } '
        'from "../components/learner/LearnerAssignmentBlock";'
        in page
    )

    assert (
        'const readOnly = detail?.status !== "active";'
        in page
    )

    assert 'block.block_type === "assignment"' in page
    assert "<LearnerAssignmentBlock" in page
    assert "block={block}" in page
    assert "enrollmentId={enrollmentId}" in page
    assert "lessonId={selectedLesson.id}" in page
    assert "disabled={readOnly}" in page

    assert 'block.block_type === "quiz"' in page
    assert "<LearnerQuizBlock" in page

    assert "{block.block_type}" in page

# STEP_7H_B2_B1
def test_learner_content_block_supports_stable_content_types() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert 'blockType === "video"' in content
    assert 'blockType === "file_link"' in content
    assert 'blockType === "callout"' in content

    assert (
        'data-testid="learner-content-rich-text"'
        in content
    )
    assert (
        'data-testid="learner-content-video"'
        in content
    )
    assert (
        'data-testid="learner-content-file-link"'
        in content
    )
    assert (
        'data-testid="learner-content-callout"'
        in content
    )


def test_learner_content_block_is_text_and_url_safe() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert "dangerouslySetInnerHTML" not in content
    assert "new URL(raw)" in content
    assert 'parsed.protocol !== "http:"' in content
    assert 'parsed.protocol !== "https:"' in content
    assert 'raw.startsWith("/")' in content
    assert '!raw.startsWith("//")' in content

    assert "extractStructuredText" in content
    assert "Array.isArray(value.content)" in content


def test_workspace_wires_content_blocks_without_regressing_quiz_assignment() -> None:
    page = read(PAGE)

    assert (
        'import { LearnerContentBlock } '
        'from "../components/learner/LearnerContentBlock";'
        in page
    )

    assert "<LearnerContentBlock" in page

    for block_type in [
        '"rich_text"',
        '"text"',
        '"video"',
        '"file_link"',
        '"file"',
        '"link"',
        '"callout"',
    ]:
        assert block_type in page

    assert 'block.block_type === "quiz"' in page
    assert "<LearnerQuizBlock" in page

    assert 'block.block_type === "assignment"' in page
    assert "<LearnerAssignmentBlock" in page

    assert "{block.block_type}" in page


def test_audio_remains_deferred_from_stable_content_block_scope() -> None:
    page = read(PAGE)
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    content_branch_start = page.index(
        '] .includes(block.block_type)'
        if '] .includes(block.block_type)' in page
        else '].includes(block.block_type)'
    )

    nearby = page[
        max(0, content_branch_start - 300):
        content_branch_start + 300
    ]

    assert '"audio"' not in nearby
    assert 'blockType === "audio"' not in content

# STEP_7H_B2_B1_AUDIO
def test_learner_audio_renderer_uses_saved_audio_contract() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert 'blockType === "audio"' in content
    assert "function getAudioSourceUrl(block)" in content

    for marker in [
        "content.audio_url",
        "content.stream_url",
        "content.url",
        "content.content_url",
        "content.src",
        "content.file_url",
        "content.href",
        "content.original_url",
        "content.download_url",
        "content.original_filename",
        "content.filename",
        "content.show_download !== false",
    ]:
        assert marker in content

    assert (
        'data-testid="learner-content-audio"'
        in content
    )
    assert (
        'data-testid="learner-content-audio-player"'
        in content
    )
    assert (
        'data-testid="learner-content-audio-download"'
        in content
    )

    assert "<audio" in content
    assert "controls" in content
    assert 'preload="metadata"' in content


def test_learner_audio_renderer_is_url_safe_and_read_only() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert "getSafeHref(rawSource)" in content
    assert "getSafeHref(rawDownload)" in content
    assert "new URL(raw)" in content

    assert 'parsed.protocol !== "http:"' in content
    assert 'parsed.protocol !== "https:"' in content
    assert 'raw.startsWith("/")' in content
    assert '!raw.startsWith("//")' in content

    assert "uploadAdminLessonAudioAsset" not in content
    assert "../../api/client" not in content
    assert "../api/client" not in content
    assert "dangerouslySetInnerHTML" not in content

    assert (
        'data-testid="learner-content-audio-unavailable"'
        in content
    )


def test_workspace_routes_audio_through_content_renderer() -> None:
    page = read(PAGE)

    assert '"audio"' in page
    assert "<LearnerContentBlock" in page

    assert 'block.block_type === "quiz"' in page
    assert "<LearnerQuizBlock" in page

    assert 'block.block_type === "assignment"' in page
    assert "<LearnerAssignmentBlock" in page

    assert "{block.block_type}" in page
