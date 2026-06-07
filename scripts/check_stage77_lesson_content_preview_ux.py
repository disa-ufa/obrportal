from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-lesson-content-preview-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS",
    "function getLessonContentPreviewSummary",
    "function getLessonContentPreviewUrlHost",
    "function getLessonContentPreviewFacts",
    "function CourseLessonContentPreviewPanel",
    'data-testid="lesson-content-preview-panel"',
    'data-testid="lesson-content-preview-kind"',
    'data-testid="lesson-content-preview-body"',
    'data-testid="lesson-content-preview-open-link"',
    "<CourseLessonContentPreviewPanel values={values} />",
]

REQUIRED_DOC_MARKERS = [
    "Stage 77.5 - Lesson content preview UX",
    "stage77_5_status=implementation_ready",
    "stage77_5_release_manifest_required=yes",
    "stage77_5_guard_required=yes",
    "stage77_5_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "77.5"',
    '"id": "77.5"',
    '"name": "Lesson content preview UX"',
    '"branch": "stage77-lesson-content-preview-ux"',
    '"lesson_content_preview_panel"',
    '"lesson_content_preview_kind"',
    '"lesson_content_preview_body"',
    '"lesson_content_preview_open_link"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.5 lesson content preview UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_preview_labels() -> None:
    text = ADMIN_COURSES.read_text(encoding="utf-8")

    match = re.search(
        r"const COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'previewType: "-"', 'learnerView: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u041f\\u0440\\u0435\\u0434\\u043f\\u0440\\u043e\\u0441\\u043c\\u043e\\u0442\\u0440 \\u0443\\u0440\\u043e\\u043a\\u0430",
        "\\u0422\\u0438\\u043f \\u043f\\u0440\\u0435\\u0432\\u044c\\u044e",
        "\\u0412\\u0438\\u0434 \\u0434\\u043b\\u044f \\u0441\\u043b\\u0443\\u0448\\u0430\\u0442\\u0435\\u043b\\u044f",
        "\\u0422\\u0435\\u043a\\u0441\\u0442\\u043e\\u0432\\u044b\\u0439 \\u043c\\u0430\\u0442\\u0435\\u0440\\u0438\\u0430\\u043b",
        "\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043c\\u0430\\u0442\\u0435\\u0440\\u0438\\u0430\\u043b",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"COURSE_BUILDER_LESSON_CONTENT_PREVIEW_UX_LABELS misses real label markers: {missing}")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_preview_labels()
    print("stage 77.5 lesson content preview UX guard passed")


if __name__ == "__main__":
    main()
