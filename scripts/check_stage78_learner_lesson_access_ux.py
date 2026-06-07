from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-lesson-access-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_LESSON_ACCESS_UX_LABELS",
    "function getLearnerLessonAccessTypeLabel",
    "function getLearnerLessonAccessMode",
    "function getLearnerLessonAccessFacts",
    "function CourseLearnerLessonAccessPanel",
    'data-testid="learner-lesson-access-panel"',
    'data-testid="learner-lesson-access-summary"',
    'data-testid="learner-lesson-access-mode"',
    'data-testid="learner-lesson-access-map"',
    'data-testid="learner-lesson-access-module"',
    'data-testid="learner-lesson-access-lesson"',
    'data-testid="learner-lesson-access-actions"',
    "<CourseLearnerLessonAccessPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.2 - Learner lesson access UX",
    "stage78_2_status=implementation_ready",
    "stage78_2_release_manifest_required=yes",
    "stage78_2_guard_required=yes",
    "stage78_2_frontend_only=yes",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.2 learner lesson access UX guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_lesson_access_labels() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    match = re.search(
        r"const LEARNER_LESSON_ACCESS_UX_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("LEARNER_LESSON_ACCESS_UX_LABELS block is missing")

    block = match.group(0)

    forbidden = ["????", 'title: "-"', 'lessonMap: "-"', 'firstStep: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"LEARNER_LESSON_ACCESS_UX_LABELS contains broken labels: {found}")


def require_panel_order() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    progress_position = text.find("<CourseLearnerProgressFoundationPanel")
    lesson_access_position = text.find("<CourseLearnerLessonAccessPanel")
    diagnostics_position = text.find("<CourseSelfEnrollmentDiagnostics")

    if progress_position < 0 or lesson_access_position < 0 or diagnostics_position < 0:
        fail("course detail learner panel order markers are missing")

    if not progress_position < lesson_access_position < diagnostics_position:
        fail("lesson access panel must be placed between learner progress panel and diagnostics")


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    current_stage = manifest.get("current_stage")
    if current_stage not in {"78.2", "78.3", "78.4", "78.5", "78.6", "78.7", "78.8", "78.9", "79.1", "79.2", "79.3", "79.4"}:
        fail("current_stage must be 78.2 or a compatible later stage")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("78.2")

    if not stage:
        fail("release manifest misses stage 78.2")

    if stage.get("name") != "Learner lesson access UX":
        fail("stage 78.2 name must be Learner lesson access UX")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed", "79.1", "79.2", "79.3", "79.4"}:
        fail("stage 78.2 status must be implementation_ready or production_deployed")

    if "learner_lesson_access_panel" not in stage.get("runtime_scope", []):
        fail("stage 78.2 runtime_scope must include learner_lesson_access_panel")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_lesson_access_labels()
    require_panel_order()
    require_manifest_stage()
    print("stage 78.2 learner lesson access UX guard passed")


if __name__ == "__main__":
    main()
