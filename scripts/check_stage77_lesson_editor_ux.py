from pathlib import Path
import json
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


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("77.4")

    if not stage:
        fail("release manifest misses stage 77.4")

    if stage.get("name") != "Lesson editor UX":
        fail("stage 77.4 name must be Lesson editor UX")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 77.4 deployment_type must be frontend-only")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed"}:
        fail("stage 77.4 status must be implementation_ready or production_deployed")

    if "lesson_editor_ux_panel" not in stage.get("runtime_scope", []):
        fail("stage 77.4 runtime_scope must include lesson_editor_ux_panel")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_lesson_editor_labels()
    require_manifest_stage()
    print("stage 77.4 lesson editor UX guard passed")


if __name__ == "__main__":
    main()
