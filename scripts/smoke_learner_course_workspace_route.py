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

    assert "const isOverviewRoute = !lessonId;" in page

    assert (
        "const lessonAccessBlocked = Boolean("
        in page
    )

    assert (
        'data-testid="learner-course-overview-state"'
        in page
    )

    assert (
        'data-testid="learner-course-start-required"'
        in page
    )

    selected_start = page.index(
        "  const selectedLesson = useMemo(() => {"
    )

    selected_end = page.index(
        "  const nextIncompleteLesson = useMemo(",
        selected_start,
    )

    selected_source = page[
        selected_start:selected_end
    ]

    assert "!lessonId" in selected_source

    assert (
        'detail?.status === "assigned"'
        in selected_source
    )

    assert "allLessons[0]" not in selected_source

    assert (
        "(lesson) => !lesson.is_completed"
        not in selected_source
    )

    assert (
        "`/account/courses/${enrollmentId}/lessons/${nextLessonId}`"
        in page
    )

    assert (
        "`/account/courses/${enrollmentId}/lessons/${firstLesson.id}`"
        in page
    )

    assert "firstLesson?.id" in page
    assert "(lesson) => !lesson.is_completed" in page

    sidebar_index = page.index(
        'data-testid={active ? "learner-course-active-lesson"'
    )

    sidebar_end = page.index(
        "                      </button>",
        sidebar_index,
    )

    sidebar_source = page[
        sidebar_index:sidebar_end
    ]

    assert (
        'disabled={detail.status === "assigned"}'
        in sidebar_source
    )

    assert (
        'detail.status === "assigned"'
        in sidebar_source
    )

    assert (
        "cursor-not-allowed bg-slate-50 text-slate-400"
        in sidebar_source
    )

    assert "LockKeyhole" in sidebar_source

    assert (
        page.count(
            'data-testid="learner-course-toolbar-next-lesson-button"'
        )
        == 0
    )

    assert (
        page.count(
            'data-testid="learner-course-previous-lesson-button"'
        )
        == 0
    )

    assert (
        page.count(
            'data-testid="learner-course-lesson-bottom-navigation"'
        )
        == 1
    )

    assert (
        page.count(
            'data-testid="learner-course-next-lesson-button"'
        )
        == 1
    )


def test_workspace_uses_effective_progress_and_statuses() -> None:
    page = read(PAGE)

    assert "required_progress_percent" in page
    assert "lessons_completed" in page
    assert "lessons_total" in page

    assert 'detail.status === "assigned"' in page
    assert 'detail.status === "completed"' in page
    assert 'detail.status === "cancelled"' in page

    assert (
        'return "Не начато";'
        in page
    )

    assert (
        'isOverviewRoute && detail.status === "assigned"'
        in page
    )

    assert (
        'isOverviewRoute\n'
        '          && detail.status === "active"\n'
        '          && nextIncompleteLesson'
        in page
    )


def test_workspace_has_stable_ui_markers() -> None:
    page = read(PAGE)

    for marker in (
        'data-testid="learner-course-loading"',
        'data-testid="learner-course-error"',
        'data-testid="learner-course-workspace"',
        '"learner-course-active-lesson"',
        '"learner-course-completed-lesson"',
        '"learner-course-sidebar-lesson"',
        'data-testid="learner-course-lesson-not-found"',
        'data-testid="learner-course-overview-state"',
        'data-testid="learner-course-start-required"',
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

    assert (
        'currentCourse?.status === "active"'
        in dashboard
    )

    assert (
        'Можно начать '
        'обучение по '
        'программе'
        in dashboard
    )

    assert (
        'label="Не начаты"'
        in dashboard
    )

    assert (
        '? "Начать обучение"'
        in dashboard
    )

    assert (
        'currentCourse?.status === "assigned" ? ('
        in dashboard
    )

    assert (
        'currentCourse.status !== "cancelled" && ('
        in dashboard
    )

    assert (
        'currentCourse?.status === "cancelled" ? ('
        in dashboard
    )

    assert (
        '["active", "completed"].includes('
        in dashboard
    )

    assert (
        '{detail\n'
        '                  && ["active", "completed"].includes(\n'
        '                    currentCourse.status\n'
        '                  ) && ('
        in dashboard
    )

    assert (
        'currentCourse.status === "completed"'
        in dashboard
    )

    assert "nextLesson?.title ||" in dashboard

    assert "Отменена" in dashboard
    assert "Вам назначена программа" not in dashboard
    assert 'label="Ожидают начала"' not in dashboard


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

    assert (
        'return "Не начато";'
        in learning
    )

    assert (
        'label: "Не начаты"'
        in learning
    )

    assert (
        'course.status !== "assigned"'
        in learning
    )

    assert (
        'course.status !== "cancelled"'
        in learning
    )

    assert "{actionLabel && (" in learning

    cancelled_index = learning.index(
        'case "cancelled":',
        learning.index(
            "function getCourseActionLabel(status)"
        ),
    )

    default_index = learning.index(
        "    default:",
        cancelled_index,
    )

    assert (
        'return "";'
        in learning[
            cancelled_index:default_index
        ]
    )

    assert (
        'Здесь собраны '
        'ваши программы '
        'обучения'
        in learning
    )

    assert "Ожидает начала" not in learning
    assert "Ожидают начала" not in learning


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

    assert "function getText(block)" in content
    assert (
        "content.text\n"
        "    || content.content_text\n"
        "    || content.body\n"
        "    || content.description\n"
        "    || content.note\n"
        "    || content.message"
    ) in content
    assert "Array.isArray(value.content)" in content

    assert "function getUrl(block)" in content
    assert (
        "content.url\n"
        "    || content.content_url\n"
        "    || content.file_url\n"
        "    || content.href\n"
        "    || content.link\n"
        "    || content.video_url"
    ) in content


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


def test_audio_is_integrated_after_deferred_stable_scope() -> None:
    page = read(PAGE)
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert '"audio"' in page
    assert 'blockType === "audio"' in content


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

# STEP_7H_B2_B2
def test_workspace_completion_uses_account_api_active_only() -> None:
    page = read(PAGE)

    assert "completeAccountCourseLesson" in page
    assert "await completeAccountCourseLesson(" in page
    assert "async function handleCompleteLesson()" in page

    assert (
        'data-testid="learner-course-lesson-completion"'
        in page
    )
    assert (
        'data-testid="learner-course-complete-lesson-button"'
        in page
    )
    assert "readOnly" in page
    assert "selectedLesson.is_completed" in page
    assert "disabled={lessonCompletionLoading}" in page

    assert "getPublicCourseDetail" not in page
    assert "getPublicCourses" not in page


def test_workspace_completion_maps_required_backend_gates() -> None:
    page = read(PAGE)

    assert "getLessonCompletionErrorMessage" in page
    assert '"required_quiz_not_passed"' in page
    assert '"required_assignment_not_completed"' in page

    assert "err?.payload?.detail" in page

    assert (
        'data-testid="learner-course-lesson-completion-error"'
        in page
    )
    assert (
        'data-testid="learner-course-lesson-completion-success"'
        in page
    )


def test_workspace_completion_updates_detail_and_opens_next_incomplete_lesson() -> None:
    page = read(PAGE)

    assert "function getNextIncompleteLesson(" in page
    assert "const nextLesson = useMemo(" in page
    assert "const nextIncompleteLesson =" in page
    assert "flattenCourseLessons(response)" in page
    assert "setDetail(response);" in page

    assert "nextIncompleteLesson.id" in page

    assert (
        "`/account/courses/${enrollmentId}/lessons/${nextIncompleteLesson.id}`"
        in page
    )

    assert (
        'data-testid="learner-course-next-lesson-button"'
        in page
    )

    assert "handleOpenLesson(nextLesson.id)" in page


def test_workspace_completion_has_completed_and_read_only_states() -> None:
    page = read(PAGE)

    assert (
        'data-testid="learner-course-lesson-completed"'
        in page
    )
    assert (
        'data-testid="learner-course-lesson-completion-read-only"'
        in page
    )

    assert "selectedLesson.is_completed" in page
    assert 'detail?.status !== "active"' in page

    assert (
        "Изменение "
        "прогресса "
        "для этой "
        "программы "
        "недоступно."
        in page
    )

    escaped_prefix = (
        chr(92)
        + "u0418"
        + chr(92)
        + "u0437"
        + chr(92)
        + "u043c"
    )

    assert escaped_prefix not in page


# STEP_7H_B2_B3_MEDIA
def test_workspace_routes_presentation_through_content_renderer() -> None:
    page = read(PAGE)

    anchor = page.index(
        '"rich_text",'
    )

    end = page.index(
        "].includes(block.block_type)",
        anchor,
    )

    routed = page[
        anchor:end
    ]

    assert '"audio",' in routed
    assert '"presentation",' in routed
    assert '"file_link",' in routed
    assert "<LearnerContentBlock" in page


def test_learner_image_material_renders_inline_safely() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert "function isImageMaterialBlock(block)" in content
    assert 'getMaterialKind(block) === "image"' in content

    assert "content.image_url" in content
    assert "content.content_url" in content
    assert "content.original_url" in content
    assert "content.download_url" in content

    assert "getSafeHref(rawSource)" in content
    assert "getSafeHref(rawDownload)" in content

    assert "<img" in content

    assert (
        'data-testid="learner-content-image"'
        in content
    )

    assert (
        'data-testid="learner-content-image-element"'
        in content
    )

    assert (
        'data-testid="learner-content-image-unavailable"'
        in content
    )

    assert "dangerouslySetInnerHTML" not in content


def test_learner_presentation_renders_pdf_safely() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    assert (
        'blockType === "presentation"'
        in content
    )

    assert (
        "function getPresentationViewerUrl(block)"
        in content
    )

    assert "content.viewer_url" in content
    assert "content.url" in content
    assert "content.content_url" in content
    assert "content.original_url" in content
    assert "content.download_url" in content

    assert "getSafeHref(rawViewer)" in content
    assert "getSafeHref(rawDownload)" in content

    assert "<iframe" in content

    assert (
        'data-testid="learner-content-presentation"'
        in content
    )

    assert (
        'data-testid="learner-content-presentation-viewer"'
        in content
    )

    assert (
        'data-testid="learner-content-presentation-unavailable"'
        in content
    )


def test_media_renderers_preserve_open_download_and_fallback_contracts() -> None:
    content = read(
        ROOT
        / "frontend/src/components/learner/LearnerContentBlock.jsx"
    )

    for marker in (
        'data-testid="learner-content-image-open"',
        'data-testid="learner-content-image-download"',
        'data-testid="learner-content-presentation-open"',
        'data-testid="learner-content-presentation-download"',
    ):
        assert marker in content

    assert "content.open_full_size !== false" in content
    assert "content.full_width !== false" in content
    assert "content.show_download !== false" in content
    assert "content.conversion_status" in content

    assert "isImageMaterialBlock(block)" in content
    assert "<FileLinkBlock block={block} />" in content


# STEP_7H_B2_B4_COURSE_COMPLETE
def test_course_completion_uses_existing_account_api_active_only() -> None:
    page = read(PAGE)

    assert "completeAccountCourse," in page

    assert (
        "async function handleCompleteCourse()"
        in page
    )

    assert (
        "await completeAccountCourse("
        in page
    )

    assert (
        'detail?.status !== "active"'
        in page
    )

    assert (
        'isOverviewRoute && detail.status === "active" ? ('
        in page
    )

    assert (
        'data-testid="learner-course-complete-course-button"'
        in page
    )

    assert "getPublicCourseDetail" not in page


def test_course_completion_eligibility_uses_server_required_progress() -> None:
    page = read(PAGE)

    assert (
        "detail?.required_lessons_total"
        in page
    )

    assert (
        "detail?.required_lessons_completed"
        in page
    )

    assert (
        "requiredLessonsCompleted"
        in page
    )

    assert (
        "requiredLessonsTotal"
        in page
    )

    assert (
        "courseCompletionEligible"
        in page
    )

    assert (
        "requiredLessonsCompleted"
        "\n      >= requiredLessonsTotal"
        in page
    )

    assert (
        'data-testid="learner-course-course-completion-eligible"'
        in page
    )

    assert (
        'data-testid="learner-course-course-completion-blocked"'
        in page
    )


def test_course_completion_refreshes_detail_and_maps_backend_gate() -> None:
    page = read(PAGE)

    assert (
        '"Complete required lessons before completing course"'
        in page
    )

    assert (
        "function getCourseCompletionErrorMessage(err)"
        in page
    )

    assert (
        "const completedCourse ="
        in page
    )

    assert (
        "await getAccountCourseDetail("
        in page
    )

    assert (
        "setDetail(refreshedDetail);"
        in page
    )

    assert (
        'data-testid="learner-course-course-completion-error"'
        in page
    )

    assert (
        'data-testid="learner-course-course-completion-success"'
        in page
    )


def test_course_completion_has_terminal_completed_state_without_action() -> None:
    page = read(PAGE)

    assert (
        'data-testid="learner-course-course-completion"'
        in page
    )

    assert (
        'data-testid="learner-course-course-completed"'
        in page
    )

    assert (
        'detail.status === "completed" ? ('
        in page
    )

    assert (
        'detail.status === "cancelled" ? ('
        in page
    )

    assert (
        'const readOnly = detail?.status !== "active";'
        in page
    )


# STEP_7H_B2_B5_POST_COMPLETION_DOCUMENT_ACTION
def test_completed_course_offers_account_documents_action() -> None:
    page = read(PAGE)

    assert (
        'data-testid="learner-course-course-completed"'
        in page
    )

    assert (
        'data-testid="learner-course-open-documents-button"'
        in page
    )

    assert (
        "onClick={handleOpenDocuments}"
        in page
    )

    completed_index = page.index(
        'data-testid="learner-course-course-completed"'
    )

    button_index = page.index(
        'data-testid="learner-course-open-documents-button"'
    )

    cancelled_index = page.index(
        'detail.status === "cancelled" ? ('
    )

    assert (
        completed_index
        < button_index
        < cancelled_index
    )


def test_post_completion_document_action_targets_account_documents_section() -> None:
    page = read(PAGE)

    account_page = read(
        ROOT
        / "frontend/src/pages/AccountPage.jsx"
    )

    assert (
        "function handleOpenDocuments()"
        in page
    )

    assert (
        '"obrportal_account_section"'
        in page
    )

    assert (
        '"documents"'
        in page
    )

    assert (
        'navigate("/account");'
        in page
    )

    assert (
        'documents: "account-documents"'
        in account_page
    )

    assert (
        'sessionStorage.getItem("obrportal_account_section")'
        in account_page
    )

    assert (
        'activeAccountSection === "documents"'
        in account_page
    )

    assert (
        "<LearnerAccountDocuments"
        in account_page
    )


def test_post_completion_document_action_reuses_existing_document_api() -> None:
    page = read(PAGE)

    client = read(
        ROOT
        / "frontend/src/api/client.js"
    )

    assert (
        "export async function getAccountDocuments("
        in client
    )

    assert (
        "export async function downloadAccountDocument("
        in client
    )

    assert (
        "getAccountDocuments"
        not in page
    )

    assert (
        "downloadAccountDocument"
        not in page
    )

    assert (
        'const readOnly = detail?.status !== "active";'
        in page
    )


def run_smoke_suite() -> None:
    import inspect

    tests = sorted(
        (
            name,
            value,
        )
        for name, value in globals().items()
        if (
            name.startswith("test_")
            and callable(value)
        )
    )

    print(
        "SMOKE_TEST_COUNT="
        + str(len(tests))
    )

    assert len(tests) == 42, (
        "Expected exactly 42 workspace smoke tests, "
        f"found {len(tests)}"
    )

    for name, test in tests:
        signature = inspect.signature(test)

        assert not signature.parameters, (
            "Smoke test requires parameters: "
            + name
        )

        test()

        print(
            "SMOKE_TEST "
            + name
            + "=PASS"
        )

    print(
        "WORKSPACE_SMOKE_42=PASS"
    )


if __name__ == "__main__":
    run_smoke_suite()
