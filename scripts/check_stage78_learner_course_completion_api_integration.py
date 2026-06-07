from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
API_CLIENT = ROOT / "frontend" / "src" / "api" / "client.js"
STAGE_DOC = ROOT / "docs" / "stage78-learner-course-completion-api-integration.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "completeAccountCourse",
    "function getLearnerCourseCompletionFacts",
    "function CourseLearnerCourseCompletionPanel",
    "const [courseCompletionLoading, setCourseCompletionLoading]",
    "const [courseCompletionError, setCourseCompletionError]",
    "const [courseCompletionSuccess, setCourseCompletionSuccess]",
    "function handleCompleteCourse",
    "await completeAccountCourse(enrollmentId)",
    "setAccountCourseDetail(updatedCourseDetail)",
    "setExistingEnrollment(updatedCourseDetail)",
    'data-testid="learner-course-completion-panel"',
    'data-testid="learner-course-completion-status"',
    'data-testid="learner-course-completion-summary"',
    'data-testid="learner-course-completion-complete-button"',
    'data-testid="learner-course-completion-success"',
    'data-testid="learner-course-completion-error"',
    'data-testid="learner-course-completion-completed-badge"',
    "onCompleteCourse={handleCompleteCourse}",
    "courseCompletionLoading={courseCompletionLoading}",
    "courseCompletionError={courseCompletionError}",
    "courseCompletionSuccess={courseCompletionSuccess}",
]

REQUIRED_API_CLIENT_MARKERS = [
    "export async function completeAccountCourse",
    "/api/v1/account/courses/${enrollmentId}/complete",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.7 - Learner course completion API integration",
    "stage78_7_status=implementation_ready",
    "stage78_7_release_manifest_required=yes",
    "stage78_7_guard_required=yes",
    "stage78_7_frontend_only=yes",
    "stage78_7_uses_existing_backend_endpoint=yes",
    "stage78_7_database_changed=no",
    "stage78_7_migrations_added=no",
    "POST /api/v1/account/courses/{enrollment_id}/complete",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "78.7"',
    '"id": "78.7"',
    '"name": "Learner course completion API integration"',
    '"branch": "stage78-learner-course-completion-api-integration"',
    '"deployment_type": "frontend-only"',
    '"frontend_runtime_changed_expected": true',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.7 learner course completion API integration guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_manifest_stage() -> None:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("current_stage") != "78.7":
        fail("current_stage must be 78.7")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "78.6":
        fail("last confirmed runtime production stage must be 78.6")
    if checkpoint.get("last_confirmed_head") != "d8e86f0":
        fail("last confirmed runtime production head must be d8e86f0")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("78.7")

    if not stage:
        fail("release manifest misses stage 78.7")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 78.7 deployment_type must be frontend-only")
    if stage.get("backend_runtime_changed_expected") is not False:
        fail("stage 78.7 must not expect backend runtime changes")
    if stage.get("database_migration_expected") is not False:
        fail("stage 78.7 must not expect database migrations")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(API_CLIENT, REQUIRED_API_CLIENT_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_manifest_stage()
    print("stage 78.7 learner course completion API integration guard passed")


if __name__ == "__main__":
    main()
