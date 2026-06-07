from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-lesson-access-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_LESSON_ACCESS_UX_LABELS",
    "function getLearnerLessonAccessTypeLabel",
    "function getLearnerLessonAccessMode",
    "function getLearnerLessonAccessFacts",
    "function CourseLearnerLessonAccessPanel",
    'data-testid="learner-lesson-access-panel"',
    'data-testid="learner-lesson-access-summary"',
    'data-testid="learner-lesson-access-mode"',
    'data-testid="learner-lesson-access-map"',
    'data-testid="learner-lesson-access-module"',
    'data-testid="learner-lesson-access-lesson"',
    'data-testid="learner-lesson-access-actions"',
    "<CourseLearnerLessonAccessPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.2 - Learner lesson access UX",
    "stage78_2_status=implementation_ready",
    "stage78_2_release_manifest_required=yes",
    "stage78_2_guard_required=yes",
    "stage78_2_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "78.2"',
    '"id": "78.2"',
    '"name": "Learner lesson access UX"',
    '"branch": "stage78-learner-lesson-access-ux"',
    '"learner_lesson_access_panel"',
    '"learner_lesson_access_summary"',
    '"learner_lesson_access_map"',
    '"learner_lesson_access_actions"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.2 learner lesson access UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_lesson_access_labels() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    match = re.search(
        r"const LEARNER_LESSON_ACCESS_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("LEARNER_LESSON_ACCESS_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'lessonMap: "-"', 'firstStep: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"LEARNER_LESSON_ACCESS_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u041a\\u0430\\u0440\\u0442\\u0430 \\u0434\\u043e\\u0441\\u0442\\u0443\\u043f\\u0430 \\u043a \\u0443\\u0440\\u043e\\u043a\\u0430\\u043c",
        "\\u0414\\u043e\\u0441\\u0442\\u0443\\u043f\\u043d\\u044b\\u0435 \\u0443\\u0440\\u043e\\u043a\\u0438",
        "\\u041a\\u0430\\u0440\\u0442\\u0430 \\u0443\\u0440\\u043e\\u043a\\u043e\\u0432",
        "\\u041f\\u0435\\u0440\\u0432\\u044b\\u0439 \\u0448\\u0430\\u0433",
        "\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043b\\u0438\\u0447\\u043d\\u044b\\u0439 \\u043a\\u0430\\u0431\\u0438\\u043d\\u0435\\u0442",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"LEARNER_LESSON_ACCESS_UX_LABELS misses real label markers: {missing}")


def require_panel_order() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    progress_position = text.find("<CourseLearnerProgressFoundationPanel")
    lesson_access_position = text.find("<CourseLearnerLessonAccessPanel")
    diagnostics_position = text.find("<CourseSelfEnrollmentDiagnostics")

    if progress_position < 0 or lesson_access_position < 0 or diagnostics_position < 0:
        fail("course detail learner panel order markers are missing")

    if not progress_position < lesson_access_position < diagnostics_position:
        fail("lesson access panel must be placed between learner progress panel and diagnostics")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_lesson_access_labels()
    require_panel_order()
    print("stage 78.2 learner lesson access UX guard passed")


if __name__ == "__main__":
    main()
