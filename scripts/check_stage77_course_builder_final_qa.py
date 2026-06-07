from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

ADMIN_COURSES = ROOT / "frontend" / "src" / "pages" / "AdminCoursesPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage77-course-builder-final-qa.md"
SUMMARY_DOC = ROOT / "docs" / "course-builder-final-qa-summary.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_ADMIN_MARKERS = [
    "function CourseBuilderReadinessPanel",
    "<CourseBuilderReadinessPanel",
    "function CourseBuilderCardUxPanel",
    "<CourseBuilderCardUxPanel",
    "function CourseBuilderModuleLessonUxPanel",
    "<CourseBuilderModuleLessonUxPanel",
    "function CourseLessonEditorUxPanel",
    "<CourseLessonEditorUxPanel",
    "function CourseLessonContentPreviewPanel",
    "<CourseLessonContentPreviewPanel",
    "function CoursePublicationUxPanel",
    "<CoursePublicationUxPanel",
    'data-testid="course-publication-ux-panel"',
    'data-testid="lesson-content-preview-panel"',
    'data-testid="lesson-editor-ux-panel"',
    'data-testid="course-builder-module-lesson-ux-panel"',
    'data-testid="course-builder-card-ux-panel"',
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 77.7 - Course builder final QA",
    "stage77_7_status=implementation_ready",
    "stage77_7_release_manifest_required=yes",
    "stage77_7_guard_required=yes",
    "stage77_7_repository_qa_only=yes",
    "stage77_7_frontend_runtime_changed=no",
]

REQUIRED_SUMMARY_MARKERS = [
    "course_builder_stage_77_1_ready=yes",
    "course_builder_stage_77_2_ready=yes",
    "course_builder_stage_77_3_ready=yes",
    "course_builder_stage_77_4_ready=yes",
    "course_builder_stage_77_5_ready=yes",
    "course_builder_stage_77_6_ready=yes",
    "course_builder_customer_summary_ready=yes",
    "course_builder_order_guard_ready=yes",
    "The next large milestone should be learner-side course progress",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 77.7 course builder final QA guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_order(text: str, markers: list[str], label: str) -> None:
    positions = []

    for marker in markers:
        position = text.find(marker)
        if position < 0:
            fail(f"{label}: missing marker {marker}")
        positions.append(position)

    if positions != sorted(positions):
        fail(f"{label}: markers are not in expected order")


def require_manifest() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    current_stage = manifest.get("current_stage")
    if current_stage not in {"77.7", "78.1", "78.2", "78.3", "78.4", "78.5", "78.6", "78.7", "78.8", "78.9", "79.1", "79.2", "79.3", "79.4", "79.5"}:
        fail("current_stage must be 77.7 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint", {})
    checkpoint_stage = checkpoint.get("last_confirmed_stage")
    checkpoint_head = checkpoint.get("last_confirmed_head")
    allowed_checkpoints = {
        ("79.4", "f1eacbe"),
        ("79.3", "0b679f9"),
        ("79.2", "9efd5d2"),
        ("79.1", "378d054"),
        ("78.9", "689ada5"),
        ("77.6", "0bd101a"),
        ("78.1", "2903611"),
        ("78.2", "ad9167e"),
        ("78.3", "0c06af3"),
        ("78.4", "3beee80"),
        ("78.6", "d8e86f0"),
        ("78.7", "44910ab"),
        ("78.8", "2f56902"),
    }

    if (checkpoint_stage, checkpoint_head) not in allowed_checkpoints:
        fail("production checkpoint must reference 77.6/0bd101a, 78.1/2903611, 78.2/ad9167e, 78.3/0c06af3, or compatible later stage 78.4/3beee80")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["77.1", "77.2", "77.3", "77.4", "77.5", "77.6", "77.7"]:
        if stage_id not in stages:
            fail(f"release manifest misses stage {stage_id}")

    if stages["77.6"].get("status") != "production_deployed":
        fail("stage 77.6 status must be production_deployed")
    if stages["77.6"].get("head") != "0bd101a":
        fail("stage 77.6 head must be 0bd101a")

    stage77_7 = stages["77.7"]
    if stage77_7.get("status") not in {"implementation_ready", "merged_to_develop", "79.1", "79.2", "79.3", "79.4", "79.5"}:
        fail("stage 77.7 status must be implementation_ready or merged_to_develop")
    if stage77_7.get("deployment_type") != "repository-qa":
        fail("stage 77.7 deployment_type must be repository-qa")
    if stage77_7.get("frontend_runtime_changed_expected") is not False:
        fail("stage 77.7 frontend_runtime_changed_expected must be false")
    if stage77_7.get("backend_runtime_changed_expected") is not False:
        fail("stage 77.7 backend_runtime_changed_expected must be false")
    if stage77_7.get("database_migration_expected") is not False:
        fail("stage 77.7 database_migration_expected must be false")


def main() -> None:
    admin_text = require_markers(ADMIN_COURSES, REQUIRED_ADMIN_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(SUMMARY_DOC, REQUIRED_SUMMARY_MARKERS)
    require_manifest()

    if "????" in admin_text:
        fail("AdminCoursesPage.jsx contains broken question-mark labels")

    require_order(
        admin_text,
        [
            "<CourseBuilderReadinessPanel",
            "<CourseBuilderCardUxPanel",
            "<CoursePublicationUxPanel",
        ],
        "course-level panels",
    )

    require_order(
        admin_text,
        [
            "<CourseLessonEditorUxPanel",
            "<CourseLessonContentPreviewPanel",
        ],
        "lesson form panels",
    )

    print("stage 77.7 course builder final QA guard passed")


if __name__ == "__main__":
    main()
