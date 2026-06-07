from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-course-builder-module-lesson-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "COURSE_BUILDER_MODULE_LESSON_UX_LABELS",
    "function getCourseBuilderLessonContentIssue",
    "function getCourseBuilderModuleLessonUxFacts",
    "function CourseBuilderModuleLessonUxPanel",
    'data-testid="course-builder-module-lesson-ux-panel"',
    'data-testid="course-builder-module-lesson-ux-metrics"',
    'data-testid="course-builder-module-lesson-ux-attention"',
    'data-testid="course-builder-module-lesson-ux-map"',
    "<CourseBuilderModuleLessonUxPanel",
    "module={module}",
    "lessons={moduleLessons}",
]

REQUIRED_DOC_MARKERS = [
    "Stage 77.3 - Course builder module lesson UX",
    "stage77_3_status=implementation_ready",
    "stage77_3_release_manifest_required=yes",
    "stage77_3_guard_required=yes",
    "stage77_3_frontend_only=yes",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.3 course builder module lesson UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_module_lesson_labels() -> None:
    text = ADMIN_COURSES.read_text(encoding="utf-8")

    match = re.search(
        r"const COURSE_BUILDER_MODULE_LESSON_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("COURSE_BUILDER_MODULE_LESSON_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'lessons: "-"', 'attention: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"COURSE_BUILDER_MODULE_LESSON_UX_LABELS contains broken labels: {found}")

    required = [
        "\\u0421\\u0432\\u043e\\u0434\\u043a\\u0430 \\u043c\\u043e\\u0434\\u0443\\u043b\\u044f",
        "\\u0423\\u0440\\u043e\\u043a\\u0438",
        "\\u0410\\u043a\\u0442\\u0438\\u0432\\u043d\\u044b\\u0435",
        "\\u041e\\u0431\\u044f\\u0437\\u0430\\u0442\\u0435\\u043b\\u044c\\u043d\\u044b\\u0435",
        "\\u0427\\u0442\\u043e \\u0442\\u0440\\u0435\\u0431\\u0443\\u0435\\u0442 \\u0432\\u043d\\u0438\\u043c\\u0430\\u043d\\u0438\\u044f",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"COURSE_BUILDER_MODULE_LESSON_UX_LABELS misses real label markers: {missing}")


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("77.3")

    if not stage:
        fail("release manifest misses stage 77.3")

    if stage.get("name") != "Course builder module lesson UX":
        fail("stage 77.3 name must be Course builder module lesson UX")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 77.3 deployment_type must be frontend-only")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed"}:
        fail("stage 77.3 status must be implementation_ready or production_deployed")

    if "course_builder_module_lesson_ux_panel" not in stage.get("runtime_scope", []):
        fail("stage 77.3 runtime_scope must include course_builder_module_lesson_ux_panel")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_module_lesson_labels()
    require_manifest_stage()
    print("stage 77.3 course builder module lesson UX guard passed")


if __name__ == "__main__":
    main()
