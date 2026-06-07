from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

DOCUMENTS_PAGE = ROOT / "frontend" / "src" / "pages" / "DocumentsPage.jsx"
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage79-learner-document-download-ux.md"

REQUIRED_DOCUMENTS_PAGE_MARKERS = [
    "LEARNER_DOCUMENT_DOWNLOAD_UX_LABELS",
    "Stage 79.5 - Learner Document Download UX Integration",
    "function getLearnerDocumentDownloadUrl",
    "function isLearnerDocumentDownloadReady",
    "function getLearnerDocumentDownloadStats",
    "function LearnerDocumentDownloadUXPanel",
    'data-testid="learner-document-download-ux-panel"',
    'data-testid="learner-document-download-ux-summary"',
    'data-testid="learner-document-download-ready-count"',
    'data-testid="learner-document-download-pending-count"',
    'data-testid="learner-document-download-primary-card"',
    'data-testid="learner-document-download-empty-state"',
    'data-testid="learner-document-download-actions"',
    'data-testid="learner-document-download-open-action"',
    'data-testid="learner-document-download-verify-action"',
    'data-testid="learner-document-download-documents-action"',
    'data-testid="learner-document-download-completed-action"',
    'data-testid="learner-document-download-all-action"',
    "<LearnerDocumentDownloadUXPanel",
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 79.5 - Learner document download UX integration",
    "learner_document_download_ux_status=implementation_ready",
    "stage79_5_release_manifest_required=yes",
    "stage79_5_guard_required=yes",
    "stage79_5_frontend_only=yes",
    "stage79_5_backend_runtime_changes=no",
    "stage79_5_database_changes=no",
    "stage79_5_migrations_added=no",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 79.5 learner document download UX guard failed: {message}")


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

    if manifest.get("current_stage") not in {"79.5", "79.6", "80.1"}:
        fail("current_stage must be 79.5 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.6", "4c5efe7"),
        ("79.4", "f1eacbe"),
        ("79.5", "89a9acf"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 79.4/f1eacbe or compatible later stage 79.5/89a9acf")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["79.1", "79.2", "79.3", "79.4", "79.5"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_5 = stages["79.5"]
    if stage79_5.get("status") not in {"implementation_ready", "production_deployed", "80.1"}:
        fail("stage 79.5 status must be implementation_ready or production_deployed")
    if stage79_5.get("deployment_type") != "frontend-only":
        fail("stage 79.5 deployment_type must be frontend-only")
    if stage79_5.get("frontend_runtime_changed_expected") is not True:
        fail("stage 79.5 frontend_runtime_changed_expected must be true")
    if stage79_5.get("backend_runtime_changed_expected") is not False:
        fail("stage 79.5 backend_runtime_changed_expected must be false")
    if stage79_5.get("database_migration_expected") is not False:
        fail("stage 79.5 database_migration_expected must be false")


def main() -> None:
    require_markers(DOCUMENTS_PAGE, REQUIRED_DOCUMENTS_PAGE_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_manifest()
    print("stage 79.5 learner document download UX guard passed")


if __name__ == "__main__":
    main()
