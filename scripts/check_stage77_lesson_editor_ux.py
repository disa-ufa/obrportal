from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-lesson-editor-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "COURSE_BUILDER_LESSON_EDITOR_UX_LABELS",
    "function getLessonEditorUxHint",
    "function getLessonEditorUxFacts",
    "function CourseLessonEditorUxPanel",
    'data-testid="lesson-editor-ux-panel"',
    'data-testid="lesson-editor-ux-content-type"',
    'data-testid="lesson-editor-ux-required-fields"',
    'data-testid="lesson-editor-ux-missing-fields"',
    'data-testid="lesson-editor-ux-publication-mode"',
    "<CourseLessonEditorUxPanel values={values} />",
]

REQUIRED_DOC_MARKERS = [
    "Stage 77.4 - Lesson editor UX",
    "stage77_4_status=implementation_ready",
    "stage77_4_release_manifest_required=yes",
    "stage77_4_guard_required=yes",
    "stage77_4_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "77.4"',
    '"id": "77.4"',
    '"name": "Lesson editor UX"',
    '"branch": "stage77-lesson-editor-ux"',
    '"lesson_editor_ux_panel"',
    '"lesson_editor_content_type_hints"',
    '"lesson_editor_required_fields"',
    '"lesson_editor_missing_fields"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.4 lesson editor UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_lesson_editor_labels() -> None:
    text = ADMIN_COURSES.read_text(encoding="utf-8")

    match = re.search(
        r"const COURSE_BUILDER_LESSON_EDITOR_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("COURSE_BUILDER_LESSON_EDITOR_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'contentType: "-"', 'requiredFields: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"COURSE_BUILDER_LESSON_EDITOR_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u041f\\u043e\\u0434\\u0441\\u043a\\u0430\\u0437\\u043a\\u0438 \\u043f\\u043e \\u0443\\u0440\\u043e\\u043a\\u0443",
        "\\u0422\\u0438\\u043f \\u043a\\u043e\\u043d\\u0442\\u0435\\u043d\\u0442\\u0430",
        "\\u041e\\u0431\\u044f\\u0437\\u0430\\u0442\\u0435\\u043b\\u044c\\u043d\\u043e \\u0434\\u043b\\u044f \\u044d\\u0442\\u043e\\u0433\\u043e \\u0442\\u0438\\u043f\\u0430",
        "\\u0427\\u0442\\u043e \\u0435\\u0449\\u0451 \\u043d\\u0443\\u0436\\u043d\\u043e",
        "\\u0420\\u0435\\u0436\\u0438\\u043c \\u0443\\u0440\\u043e\\u043a\\u0430",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"COURSE_BUILDER_LESSON_EDITOR_UX_LABELS misses real label markers: {missing}")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_lesson_editor_labels()
    print("stage 77.4 lesson editor UX guard passed")


if __name__ == "__main__":
    main()
