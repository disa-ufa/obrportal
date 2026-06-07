from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

DOCUMENTS_PAGE = ROOT / "frontend" / "src" / "pages" / "DocumentsPage.jsx"
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage79-learner-documents-ux-foundation.md"

REQUIRED_DOCUMENTS_PAGE_MARKERS = [
    "LEARNER_DOCUMENTS_UX_FOUNDATION_LABELS",
    "Stage 79.3 - Learner Documents UX Foundation",
    "function getLearnerDocumentsUXStats",
    "function LearnerDocumentsUXFoundationPanel",
    'data-testid="learner-documents-ux-foundation-panel"',
    'data-testid="learner-documents-ux-summary"',
    'data-testid="learner-documents-ux-loading-state"',
    'data-testid="learner-documents-ux-error-state"',
    'data-testid="learner-documents-ux-empty-state"',
    'data-testid="learner-documents-completed-handoff"',
    'data-testid="learner-documents-primary-document-card"',
    'data-testid="learner-documents-ux-actions"',
    'data-testid="learner-documents-available-action"',
    'data-testid="learner-documents-completed-action"',
    'data-testid="learner-documents-verify-action"',
    'data-testid="learner-documents-all-action"',
    "<LearnerDocumentsUXFoundationPanel",
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 79.3 - Learner documents UX foundation",
    "learner_documents_ux_foundation_status=implementation_ready",
    "stage79_3_release_manifest_required=yes",
    "stage79_3_guard_required=yes",
    "stage79_3_frontend_only=yes",
    "stage79_3_backend_runtime_changes=no",
    "stage79_3_database_changes=no",
    "stage79_3_migrations_added=no",
]

REQUIRED_MANIFEST_MARKERS = [
    '"id": "79.3"',
    '"name": "Learner documents UX foundation"',
    '"deployment_type": "frontend-only"',
    '"frontend_runtime_changed_expected": true',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 79.3 learner documents UX foundation guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_manifest() -> None:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("current_stage") not in {"79.3", "79.4", "79.5", "79.6", "80.1"}:
        fail("current_stage must be 79.3 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.6", "4c5efe7"),
        ("79.5", "89a9acf"),
        ("79.4", "f1eacbe"),
        ("79.2", "9efd5d2"),
        ("79.3", "0b679f9"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 79.2/9efd5d2 or compatible later stage 79.3/0b679f9")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["79.1", "79.2", "79.3"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_2 = stages["79.2"]
    if stage79_2.get("status") != "production_confirmed":
        fail("stage 79.2 status must be production_confirmed")
    if stage79_2.get("head") != "9efd5d2":
        fail("stage 79.2 head must be 9efd5d2")

    stage79_3 = stages["79.3"]
    if stage79_3.get("status") not in {"implementation_ready", "production_deployed", "79.5", "79.6", "80.1"}:
        fail("stage 79.3 status must be implementation_ready or production_deployed")
    if stage79_3.get("deployment_type") != "frontend-only":
        fail("stage 79.3 deployment_type must be frontend-only")
    if stage79_3.get("frontend_runtime_changed_expected") is not True:
        fail("stage 79.3 frontend_runtime_changed_expected must be true")
    if stage79_3.get("backend_runtime_changed_expected") is not False:
        fail("stage 79.3 backend_runtime_changed_expected must be false")
    if stage79_3.get("database_migration_expected") is not False:
        fail("stage 79.3 database_migration_expected must be false")


def main() -> None:
    require_markers(DOCUMENTS_PAGE, REQUIRED_DOCUMENTS_PAGE_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_manifest()
    print("stage 79.3 learner documents UX foundation guard passed")


if __name__ == "__main__":
    main()
