from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-lesson-content-preview-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS",
    "function getLearnerLessonContentPreviewSummary",
    "function getLearnerLessonContentPreviewUrlHost",
    "function getLearnerLessonContentPreviewType",
    "function getLearnerLessonContentPreviewAction",
    "function getLearnerLessonContentPreviewFacts",
    "function CourseLearnerLessonContentPreviewPanel",
    'data-testid="learner-lesson-content-preview-panel"',
    'data-testid="learner-lesson-content-preview-status"',
    'data-testid="learner-lesson-content-preview-summary"',
    'data-testid="learner-lesson-content-preview-body"',
    'data-testid="learner-lesson-content-preview-open-link"',
    'data-testid="learner-lesson-content-preview-actions"',
    "<CourseLearnerLessonContentPreviewPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.3 - Learner lesson content preview UX",
    "stage78_3_status=implementation_ready",
    "stage78_3_release_manifest_required=yes",
    "stage78_3_guard_required=yes",
    "stage78_3_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "78.3"',
    '"id": "78.3"',
    '"name": "Learner lesson content preview UX"',
    '"branch": "stage78-learner-lesson-content-preview-ux"',
    '"learner_lesson_content_preview_panel"',
    '"learner_lesson_content_preview_summary"',
    '"learner_lesson_content_preview_body"',
    '"learner_lesson_content_preview_actions"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.3 learner lesson content preview UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_content_preview_labels() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    match = re.search(
        r"const LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'contentPreview: "-"', 'learnerAction: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u041f\\u0440\\u0435\\u0432\\u044c\\u044e \\u0441\\u043e\\u0434\\u0435\\u0440\\u0436\\u0438\\u043c\\u043e\\u0433\\u043e \\u0443\\u0440\\u043e\\u043a\\u043e\\u0432",
        "\\u0414\\u043e\\u0441\\u0442\\u0443\\u043f\\u043d\\u043e\\u0435 \\u043f\\u0440\\u0435\\u0432\\u044c\\u044e",
        "\\u0422\\u0438\\u043f \\u043c\\u0430\\u0442\\u0435\\u0440\\u0438\\u0430\\u043b\\u0430",
        "\\u041f\\u0440\\u0435\\u0432\\u044c\\u044e \\u043c\\u0430\\u0442\\u0435\\u0440\\u0438\\u0430\\u043b\\u0430",
        "\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043c\\u0430\\u0442\\u0435\\u0440\\u0438\\u0430\\u043b",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS misses real label markers: {missing}")


def require_panel_order() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    progress_position = text.find("<CourseLearnerProgressFoundationPanel")
    access_position = text.find("<CourseLearnerLessonAccessPanel")
    preview_position = text.find("<CourseLearnerLessonContentPreviewPanel")
    diagnostics_position = text.find("<CourseSelfEnrollmentDiagnostics")

    if progress_position < 0 or access_position < 0 or preview_position < 0 or diagnostics_position < 0:
        fail("course detail learner panel order markers are missing")

    if not progress_position < access_position < preview_position < diagnostics_position:
        fail("lesson content preview panel must be placed between lesson access panel and diagnostics")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_content_preview_labels()
    require_panel_order()
    print("stage 78.3 learner lesson content preview UX guard passed")


if __name__ == "__main__":
    main()
