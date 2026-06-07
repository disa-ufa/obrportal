from pathlib import Path

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


def require_markers(path: Path, markers: list[str]) -> None:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    print("stage 77.2 course builder card UX guard passed")


if __name__ == "__main__":
    main()
