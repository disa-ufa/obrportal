from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-course-builder-card-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "COURSE_BUILDER_CARD_UX_LABELS",
    "function getCourseBuilderCardUxFacts",
    "function CourseBuilderCardUxPanel",
    'data-testid="course-builder-card-ux-panel"',
    'data-testid="course-builder-card-ux-sections"',
    'data-testid="course-builder-card-ux-quick-actions"',
    'data-testid="course-builder-card-ux-public-link"',
    "<CourseBuilderCardUxPanel",
    "buildEnrollmentsPath({ course_id: course.id })",
    'buildAuditPath({ entity_type: "course" })',
]

REQUIRED_DOC_MARKERS = [
    "Stage 77.2 - Course builder card UX",
    "stage77_2_status=implementation_ready",
    "stage77_2_release_manifest_required=yes",
    "stage77_2_guard_required=yes",
    "stage77_2_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "77.2"',
    '"id": "77.2"',
    '"name": "Course builder card UX"',
    '"branch": "stage77-course-builder-card-ux"',
    '"course_builder_card_ux_panel"',
    '"course_builder_quick_actions"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.2 course builder card UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_card_ux_labels() -> None:
    text = ADMIN_COURSES.read_text(encoding="utf-8")

    match = re.search(
        r"const COURSE_BUILDER_CARD_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("COURSE_BUILDER_CARD_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'basic: "-"', 'structure: "-"', 'publicCard: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"COURSE_BUILDER_CARD_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u041a\\u0430\\u0440\\u0442\\u0430 \\u043a\\u0430\\u0440\\u0442\\u043e\\u0447\\u043a\\u0438",
        "\\u041e\\u0441\\u043d\\u043e\\u0432\\u043d\\u044b\\u0435 \\u0441\\u0432\\u0435\\u0434\\u0435\\u043d\\u0438\\u044f",
        "\\u0421\\u0442\\u0440\\u0443\\u043a\\u0442\\u0443\\u0440\\u0430 \\u043a\\u0443\\u0440\\u0441\\u0430",
        "\\u041f\\u0443\\u0431\\u043b\\u0438\\u0447\\u043d\\u0430\\u044f \\u043a\\u0430\\u0440\\u0442\\u043e\\u0447\\u043a\\u0430",
        "\\u041d\\u0430\\u0437\\u043d\\u0430\\u0447\\u0435\\u043d\\u0438\\u044f",
        "\\u0410\\u0443\\u0434\\u0438\\u0442",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"COURSE_BUILDER_CARD_UX_LABELS misses real label markers: {missing}")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_card_ux_labels()
    print("stage 77.2 course builder card UX guard passed")


if __name__ == "__main__":
    main()
