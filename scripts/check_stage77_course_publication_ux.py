from pathlib import Path
import json
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


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("77.6")

    if not stage:
        fail("release manifest misses stage 77.6")

    if stage.get("name") != "Course publication UX":
        fail("stage 77.6 name must be Course publication UX")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 77.6 deployment_type must be frontend-only")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed"}:
        fail("stage 77.6 status must be implementation_ready or production_deployed")

    if "course_publication_ux_panel" not in stage.get("runtime_scope", []):
        fail("stage 77.6 runtime_scope must include course_publication_ux_panel")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_publication_labels()
    require_manifest_stage()
    print("stage 77.6 course publication UX guard passed")


if __name__ == "__main__":
    main()
