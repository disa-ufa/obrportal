from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-course-builder-readiness.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "COURSE_BUILDER_READINESS_LABELS",
    "function getCourseBuilderReadiness",
    "function CourseBuilderReadinessPanel",
    'data-testid="course-builder-readiness-panel"',
    'data-testid="course-builder-readiness-score"',
    'data-testid="course-builder-readiness-blockers"',
    'data-testid="course-builder-readiness-checklist"',
    "modules={courseModules}",
    "lessonsByModuleId={lessonsByModuleId}",
    "publishable",
    "activeRequiredLessons",
]

REQUIRED_DOC_MARKERS = [
    "Stage 77.1 - Course builder readiness",
    "stage77_1_status=implementation_ready",
    "stage77_1_release_manifest_required=yes",
    "stage77_1_guard_required=yes",
    "stage77_1_frontend_only=yes",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "77.1"',
    '"id": "77.1"',
    '"name": "Course builder readiness"',
    '"branch": "stage77-course-builder-readiness"',
    '"frontend_admin_courses_page"',
    '"course_builder_readiness_panel"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.1 course builder readiness guard failed: {message}")


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
    print("stage 77.1 course builder readiness guard passed")


if __name__ == "__main__":
    main()
