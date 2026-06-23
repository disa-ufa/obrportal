from pathlib import Path
import json
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


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("77.5")

    if not stage:
        fail("release manifest misses stage 77.5")

    if stage.get("name") != "Lesson content preview UX":
        fail("stage 77.5 name must be Lesson content preview UX")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 77.5 deployment_type must be frontend-only")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed"}:
        fail("stage 77.5 status must be implementation_ready or production_deployed")

    if "lesson_content_preview_panel" not in stage.get("runtime_scope", []):
        fail("stage 77.5 runtime_scope must include lesson_content_preview_panel")


def main() -> None:
    require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_preview_labels()
    require_manifest_stage()
    print("stage 77.5 lesson content preview UX guard passed")


if __name__ == "__main__":
    main()
