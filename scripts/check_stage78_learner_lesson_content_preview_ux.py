from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-lesson-content-preview-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS",
    "function getLearnerLessonContentPreviewSummary",
    "function getLearnerLessonContentPreviewUrlHost",
    "function getLearnerLessonContentPreviewType",
    "function getLearnerLessonContentPreviewAction",
    "function getLearnerLessonContentPreviewFacts",
    "function CourseLearnerLessonContentPreviewPanel",
    'data-testid="learner-lesson-content-preview-panel"',
    'data-testid="learner-lesson-content-preview-status"',
    'data-testid="learner-lesson-content-preview-summary"',
    'data-testid="learner-lesson-content-preview-body"',
    'data-testid="learner-lesson-content-preview-open-link"',
    'data-testid="learner-lesson-content-preview-actions"',
    "<CourseLearnerLessonContentPreviewPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.3 - Learner lesson content preview UX",
    "stage78_3_status=implementation_ready",
    "stage78_3_release_manifest_required=yes",
    "stage78_3_guard_required=yes",
    "stage78_3_frontend_only=yes",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.3 learner lesson content preview UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_content_preview_labels() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    match = re.search(
        r"const LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'contentPreview: "-"', 'learnerAction: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"LEARNER_LESSON_CONTENT_PREVIEW_UX_LABELS contains broken labels: {found}")


def require_panel_order() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    progress_position = text.find("<CourseLearnerProgressFoundationPanel")
    access_position = text.find("<CourseLearnerLessonAccessPanel")
    preview_position = text.find("<CourseLearnerLessonContentPreviewPanel")
    diagnostics_position = text.find("<CourseSelfEnrollmentDiagnostics")

    if progress_position < 0 or access_position < 0 or preview_position < 0 or diagnostics_position < 0:
        fail("course detail learner panel order markers are missing")

    if not progress_position < access_position < preview_position < diagnostics_position:
        fail("lesson content preview panel must be placed between lesson access panel and diagnostics")


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    current_stage = manifest.get("current_stage")
    if current_stage not in {"78.3", "78.4", "78.5"}:
        fail("current_stage must be 78.3 or a compatible later stage")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("78.3")

    if not stage:
        fail("release manifest misses stage 78.3")

    if stage.get("name") != "Learner lesson content preview UX":
        fail("stage 78.3 name must be Learner lesson content preview UX")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed"}:
        fail("stage 78.3 status must be implementation_ready or production_deployed")

    if "learner_lesson_content_preview_panel" not in stage.get("runtime_scope", []):
        fail("stage 78.3 runtime_scope must include learner_lesson_content_preview_panel")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_content_preview_labels()
    require_panel_order()
    require_manifest_stage()
    print("stage 78.3 learner lesson content preview UX guard passed")


if __name__ == "__main__":
    main()
