from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-course-progress-foundation.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS",
    "function getLearnerCourseProgressLessons",
    "function getLearnerCourseProgressStatus",
    "function getLearnerCourseProgressFoundationFacts",
    "function CourseLearnerProgressFoundationPanel",
    'data-testid="learner-course-progress-foundation-panel"',
    'data-testid="learner-course-progress-summary"',
    'data-testid="learner-course-progress-status"',
    'data-testid="learner-course-progress-next-step"',
    'data-testid="learner-course-progress-roadmap"',
    'data-testid="learner-course-progress-actions"',
    "<CourseLearnerProgressFoundationPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.1 - Learner course progress foundation",
    "stage78_1_status=implementation_ready",
    "stage78_1_release_manifest_required=yes",
    "stage78_1_guard_required=yes",
    "stage78_1_frontend_only=yes",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.1 learner course progress foundation guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_real_progress_labels() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    match = re.search(
        r"const LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS = \{.*?\};",
        text,
        re.DOTALL,
    )

    if not match:
        fail("LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS block is missing")

    block = match.group(0)
    forbidden = ["????", 'title: "-"', 'progress: "-"', 'nextStep: "-"']
    found = [marker for marker in forbidden if marker in block]

    if found:
        fail(f"LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS contains broken labels: {found}")

    required = [
        "\\u0421\\u0442\\u0430\\u0440\\u0442\\u043e\\u0432\\u0430\\u044f \\u043f\\u0430\\u043d\\u0435\\u043b\\u044c \\u043f\\u0440\\u043e\\u0433\\u0440\\u0435\\u0441\\u0441\\u0430",
        "\\u041f\\u0440\\u043e\\u0433\\u0440\\u0435\\u0441\\u0441 \\u043e\\u0431\\u0443\\u0447\\u0435\\u043d\\u0438\\u044f",
        "\\u0421\\u043b\\u0435\\u0434\\u0443\\u044e\\u0449\\u0438\\u0439 \\u0448\\u0430\\u0433",
        "\\u0427\\u0442\\u043e \\u0431\\u0443\\u0434\\u0435\\u0442 \\u0434\\u0430\\u043b\\u044c\\u0448\\u0435",
        "\\u041e\\u0442\\u043a\\u0440\\u044b\\u0442\\u044c \\u043b\\u0438\\u0447\\u043d\\u044b\\u0439 \\u043a\\u0430\\u0431\\u0438\\u043d\\u0435\\u0442",
    ]

    missing = [marker for marker in required if marker not in block]

    if missing:
        fail(f"LEARNER_COURSE_PROGRESS_FOUNDATION_LABELS misses real label markers: {missing}")


def require_panel_order() -> None:
    text = COURSE_DETAIL.read_text(encoding="utf-8")

    journey_position = text.find("<CourseDetailLearnerJourneyHint")
    progress_position = text.find("<CourseLearnerProgressFoundationPanel")
    diagnostics_position = text.find("<CourseSelfEnrollmentDiagnostics")

    if journey_position < 0 or progress_position < 0 or diagnostics_position < 0:
        fail("course detail panel order markers are missing")

    if not journey_position < progress_position < diagnostics_position:
        fail("learner progress panel must be placed between journey hint and diagnostics")


def require_manifest_stage() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    current_stage = manifest.get("current_stage")
    if current_stage not in {"78.1", "78.2", "78.3", "78.4", "78.5", "78.6", "78.7", "78.8", "78.9", "79.1", "79.2", "79.3", "79.4", "79.5", "79.6"}:
        fail("current_stage must be 78.1 or a compatible later stage")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("78.1")

    if not stage:
        fail("release manifest misses stage 78.1")

    if stage.get("name") != "Learner course progress foundation":
        fail("stage 78.1 name must be Learner course progress foundation")

    status = stage.get("status")
    if status not in {"implementation_ready", "production_deployed", "79.1", "79.2", "79.3", "79.4", "79.5", "79.6"}:
        fail("stage 78.1 status must be implementation_ready or production_deployed")

    if "learner_course_progress_foundation_panel" not in stage.get("runtime_scope", []):
        fail("stage 78.1 runtime_scope must include learner_course_progress_foundation_panel")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_real_progress_labels()
    require_panel_order()
    require_manifest_stage()
    print("stage 78.1 learner course progress foundation guard passed")


if __name__ == "__main__":
    main()
