from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-course-publication-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "COURSE_PUBLICATION_UX_LABELS",
    "function getCoursePublicationUxFacts",
    "function CoursePublicationUxPanel",
    'data-testid="course-publication-ux-panel"',
    'data-testid="course-publication-ux-decision"',
    'data-testid="course-publication-ux-blockers"',
    'data-testid="course-publication-ux-next-steps"',
    'data-testid="course-publication-ux-actions"',
    "<CoursePublicationUxPanel",
    "getCourseBuilderReadiness(course, modules, lessonsByModuleId)",
]

REQUIRED_DOC_MARKERS = [
    "Stage 77.6 - Course publication UX",
    "stage77_6_status=implementation_ready",
    "stage77_6_release_manifest_required=yes",
    "stage77_6_guard_required=yes",
    "stage77_6_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "77.6"',
    '"id": "77.6"',
    '"name": "Course publication UX"',
    '"branch": "stage77-course-publication-ux"',
    '"course_publication_ux_panel"',
    '"course_publication_decision"',
    '"course_publication_blockers"',
    '"course_publication_next_steps"',
    '"course_publication_actions"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.6 course publication UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_publication_labels() -> None:
    text = ADMIN_COURSES.read_text(encoding="utf-8")

    match = re.search(
        r"const COURSE_PUBLICATION_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("COURSE_PUBLICATION_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'decision: "-"', 'blockers: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"COURSE_PUBLICATION_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u0424\\u0438\\u043d\\u0430\\u043b\\u044c\\u043d\\u0430\\u044f \\u043f\\u0443\\u0431\\u043b\\u0438\\u043a\\u0430\\u0446\\u0438\\u044f \\u043a\\u0443\\u0440\\u0441\\u0430",
        "\\u0420\\u0435\\u0448\\u0435\\u043d\\u0438\\u0435 \\u043f\\u043e \\u043f\\u0443\\u0431\\u043b\\u0438\\u043a\\u0430\\u0446\\u0438\\u0438",
        "\\u0427\\u0442\\u043e \\u0431\\u043b\\u043e\\u043a\\u0438\\u0440\\u0443\\u0435\\u0442 \\u043f\\u0443\\u0431\\u043b\\u0438\\u043a\\u0430\\u0446\\u0438\\u044e",
        "\\u0421\\u043b\\u0435\\u0434\\u0443\\u044e\\u0449\\u0438\\u0435 \\u0448\\u0430\\u0433\\u0438",
        "\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043f\\u0443\\u0431\\u043b\\u0438\\u0447\\u043d\\u0443\\u044e \\u043a\\u0430\\u0440\\u0442\\u043e\\u0447\\u043a\\u0443",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"COURSE_PUBLICATION_UX_LABELS misses real label markers: {missing}")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_real_publication_labels()
    print("stage 77.6 course publication UX guard passed")


if __name__ == "__main__":
    main()
