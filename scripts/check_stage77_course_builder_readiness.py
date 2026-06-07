from pathlib import Path
import json

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


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.1 course builder readiness guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("77.1")

    if not stage:
        fail("release manifest misses stage 77.1")

    if stage.get("name") != "Course builder readiness":
        fail("stage 77.1 name must be Course builder readiness")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 77.1 deployment_type must be frontend-only")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed"}:
        fail("stage 77.1 status must be implementation_ready or production_deployed")

    if "course_builder_readiness_panel" not in stage.get("runtime_scope", []):
        fail("stage 77.1 runtime_scope must include course_builder_readiness_panel")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_manifest_stage()
    print("stage 77.1 course builder readiness guard passed")


if __name__ == "__main__":
    main()
