from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

COURSE_DETAIL = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"
STAGE_DOC = ROOT / "docs" / "stage78-learner-document-handoff-ux.md"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_COURSE_DETAIL_MARKERS = [
    "LEARNER_DOCUMENT_HANDOFF_UX_LABELS",
    "function getLearnerDocumentHandoffFacts",
    "function CourseLearnerDocumentHandoffPanel",
    'data-testid="learner-document-handoff-panel"',
    'data-testid="learner-document-handoff-status"',
    'data-testid="learner-document-handoff-summary"',
    'data-testid="learner-document-handoff-next-step"',
    'data-testid="learner-document-handoff-actions"',
    'data-testid="learner-document-handoff-documents-action"',
    'data-testid="learner-document-handoff-account-action"',
    'data-testid="learner-document-handoff-verify-action"',
    "<CourseLearnerDocumentHandoffPanel",
]

REQUIRED_DOC_MARKERS = [
    "Stage 78.8 - Learner document handoff UX",
    "stage78_8_status=implementation_ready",
    "stage78_8_release_manifest_required=yes",
    "stage78_8_guard_required=yes",
    "stage78_8_frontend_only=yes",
    "stage78_8_database_changed=no",
    "stage78_8_migrations_added=no",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.8 learner document handoff UX guard failed: {message}")


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

    if manifest.get("current_stage") not in {"78.8", "78.9", "79.1", "79.2", "79.3", "79.4", "79.5"}:
        fail("current_stage must be 78.8 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.4", "f1eacbe"),
        ("79.3", "0b679f9"),
        ("79.2", "9efd5d2"),
        ("79.1", "378d054"),
        ("78.9", "689ada5"),
        ("78.7", "44910ab"),
        ("78.8", "2f56902"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 78.7/44910ab or compatible later stage 78.8/2f56902")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    stage = stages.get("78.8")

    if not stage:
        fail("release manifest misses stage 78.8")

    if stage.get("deployment_type") != "frontend-only":
        fail("stage 78.8 deployment_type must be frontend-only")
    if stage.get("backend_runtime_changed_expected") is not False:
        fail("stage 78.8 must not expect backend runtime changes")
    if stage.get("database_migration_expected") is not False:
        fail("stage 78.8 must not expect database migrations")


def main() -> None:
    require_markers(COURSE_DETAIL, REQUIRED_COURSE_DETAIL_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_manifest_stage()
    print("stage 78.8 learner document handoff UX guard passed")


if __name__ == "__main__":
    main()
