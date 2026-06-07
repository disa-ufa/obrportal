from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-progress-final-qa.md"
SUMMARY_DOC = ROOT / "docs" / "learner-progress-final-qa-summary.md"

REQUIRED_STAGE_IDS = ["78.1", "78.2", "78.3", "78.4", "78.5", "78.6", "78.7", "78.8", "78.9"]

REQUIRED_COURSE_DETAIL_MARKERS = [
    "learner-course-progress-foundation-panel",
    "learner-course-progress-summary",
    "learner-course-progress-status",
    "learner-completion-action-complete-button",
    "learner-completion-action-success",
    "learner-completion-action-error",
    "learner-course-completion-panel",
    "learner-course-completion-complete-button",
    "learner-course-completion-success",
    "learner-course-completion-error",
    "learner-document-handoff-panel",
    "learner-document-handoff-documents-action",
    "learner-document-handoff-account-action",
    "learner-document-handoff-verify-action",
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 78.9 - Learner progress final QA",
    "learner_progress_final_qa_status=implementation_ready",
    "stage78_9_release_manifest_required=yes",
    "stage78_9_guard_required=yes",
    "stage78_9_docs_only=yes",
    "stage78_runtime_changes=no",
    "stage78_final_flow_closed=yes",
]

REQUIRED_SUMMARY_MARKERS = [
    "Learner progress final QA summary",
    "Stage 78.1",
    "Stage 78.2",
    "Stage 78.3",
    "Stage 78.4",
    "Stage 78.5",
    "Stage 78.6",
    "Stage 78.7",
    "Stage 78.8",
    "Stage 78.9",
    "Production head: 2f56902",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.9 learner progress final QA guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_manifest() -> dict:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("current_stage") not in {"78.9", "79.1", "79.2"}:
        fail("current_stage must be 78.9 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.1", "378d054"),
        ("78.8", "2f56902"),
        ("78.9", "689ada5"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 78.8/2f56902 or compatible later stage 78.9/689ada5")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    missing_stage_ids = [stage_id for stage_id in REQUIRED_STAGE_IDS if stage_id not in stages]
    if missing_stage_ids:
        fail(f"manifest misses stage records: {missing_stage_ids}")

    stage78_9 = stages["78.9"]
    if stage78_9.get("status") not in {"implementation_ready", "production_confirmed", "79.2"}:
        fail("stage 78.9 status must be implementation_ready or production_confirmed")
    if stage78_9.get("deployment_type") != "docs-and-qa-only":
        fail("stage 78.9 deployment_type must be docs-and-qa-only")
    if stage78_9.get("frontend_runtime_changed_expected") is not False:
        fail("stage 78.9 frontend_runtime_changed_expected must be false")
    if stage78_9.get("backend_runtime_changed_expected") is not False:
        fail("stage 78.9 backend_runtime_changed_expected must be false")
    if stage78_9.get("database_migration_expected") is not False:
        fail("stage 78.9 database_migration_expected must be false")

    return manifest


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(SUMMARY_DOC, REQUIRED_SUMMARY_MARKERS)
    require_manifest()
    print("stage 78.9 learner progress final QA guard passed")


if __name__ == "__main__":
    main()
