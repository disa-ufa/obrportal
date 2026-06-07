from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
API_CLIENT = ROOT / "frontend" / "src" / "api" / "client.js"
STAGE_DOC = ROOT / "docs" / "stage78-learner-lesson-completion-api-integration.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "completeAccountCourseLesson",
    "getAccountCourseDetail",
    "function getEnrollmentId",
    "function getLessonCompleted",
    "function mergeCourseWithAccountCourseDetail",
    "const [accountCourseDetail, setAccountCourseDetail]",
    "const [lessonCompletionLoading, setLessonCompletionLoading]",
    "const [lessonCompletionError, setLessonCompletionError]",
    "const [lessonCompletionSuccess, setLessonCompletionSuccess]",
    "function handleCompleteLesson",
    "await completeAccountCourseLesson(enrollmentId, lesson.id)",
    "setAccountCourseDetail(updatedCourseDetail)",
    "setExistingEnrollment(updatedCourseDetail)",
    'data-testid="learner-completion-action-complete-button"',
    'data-testid="learner-completion-action-success"',
    'data-testid="learner-completion-action-error"',
    'data-testid="learner-completion-action-completed-badge"',
    "course={learnerCourse}",
    "onCompleteLesson={handleCompleteLesson}",
    "lessonCompletionLoading={lessonCompletionLoading}",
    "lessonCompletionError={lessonCompletionError}",
    "lessonCompletionSuccess={lessonCompletionSuccess}",
]

REQUIRED_API_CLIENT_MARKERS = [
    "export async function getAccountCourseDetail",
    "export async function completeAccountCourseLesson",
    "/api/v1/account/courses/${enrollmentId}/lessons/${lessonId}/complete",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.6 - Learner lesson completion API integration",
    "stage78_6_status=implementation_ready",
    "stage78_6_release_manifest_required=yes",
    "stage78_6_guard_required=yes",
    "stage78_6_frontend_only=yes",
    "stage78_6_uses_existing_backend_endpoint=yes",
    "stage78_6_database_changed=no",
    "stage78_6_migrations_added=no",
    "POST /api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.6 learner lesson completion API integration guard failed: {message}")


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

    if manifest.get("current_stage") not in {"78.6", "78.7", "78.8", "78.9"}:
        fail("current_stage must be 78.6 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("78.4", "3beee80"),
        ("78.6", "d8e86f0"),
        ("78.7", "44910ab"),
        ("78.8", "2f56902"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 78.4/3beee80 or compatible later stage 78.6/d8e86f0")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("78.6")

    if not stage:
        fail("release manifest misses stage 78.6")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 78.6 deployment_type must be frontend-only")
    if stage.get("backend_runtime_changed_expected") is not False:
        fail("stage 78.6 must not expect backend runtime changes")
    if stage.get("database_migration_expected") is not False:
        fail("stage 78.6 must not expect database migrations")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(API_CLIENT, REQUIRED_API_CLIENT_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_manifest_stage()
    print("stage 78.6 learner lesson completion API integration guard passed")


if __name__ == "__main__":
    main()
