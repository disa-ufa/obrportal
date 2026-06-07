from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

VERIFY_PAGE = ROOT / "frontend" / "src" / "pages" / "VerifyDocumentPage.jsx"
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage79-learner-document-verification-ux.md"

REQUIRED_VERIFY_PAGE_MARKERS = [
    "LEARNER_DOCUMENT_VERIFICATION_UX_LABELS",
    "Stage 79.4 - Learner Document Verification UX Integration",
    "function getLearnerDocumentVerificationUXState",
    "function LearnerDocumentVerificationUXPanel",
    'data-testid="learner-document-verification-ux-panel"',
    'data-testid="learner-document-verification-ux-status"',
    'data-testid="learner-document-verification-ux-summary"',
    'data-testid="learner-document-verification-ux-next-step"',
    'data-testid="learner-document-verification-ux-actions"',
    'data-testid="learner-document-verification-documents-action"',
    'data-testid="learner-document-verification-contacts-action"',
    'data-testid="learner-document-verification-catalog-action"',
    "<LearnerDocumentVerificationUXPanel",
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 79.4 - Learner document verification UX integration",
    "learner_document_verification_ux_status=implementation_ready",
    "stage79_4_release_manifest_required=yes",
    "stage79_4_guard_required=yes",
    "stage79_4_frontend_only=yes",
    "stage79_4_backend_runtime_changes=no",
    "stage79_4_database_changes=no",
    "stage79_4_migrations_added=no",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "79.4"',
    '"id": "79.4"',
    '"name": "Learner document verification UX integration"',
    '"branch": "stage79-learner-document-verification-ux"',
    '"deployment_type": "frontend-only"',
    '"frontend_runtime_changed_expected": true',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 79.4 learner document verification UX guard failed: {message}")


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

    if manifest.get("current_stage") != "79.4":
        fail("current_stage must be 79.4")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "79.3":
        fail("production checkpoint stage must be 79.3")
    if checkpoint.get("last_confirmed_head") != "0b679f9":
        fail("production checkpoint head must be 0b679f9")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["79.1", "79.2", "79.3", "79.4"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_3 = stages["79.3"]
    if stage79_3.get("status") != "production_deployed":
        fail("stage 79.3 status must be production_deployed")
    if stage79_3.get("head") != "0b679f9":
        fail("stage 79.3 head must be 0b679f9")

    stage79_4 = stages["79.4"]
    if stage79_4.get("status") != "implementation_ready":
        fail("stage 79.4 status must be implementation_ready")
    if stage79_4.get("deployment_type") != "frontend-only":
        fail("stage 79.4 deployment_type must be frontend-only")
    if stage79_4.get("frontend_runtime_changed_expected") is not True:
        fail("stage 79.4 frontend_runtime_changed_expected must be true")
    if stage79_4.get("backend_runtime_changed_expected") is not False:
        fail("stage 79.4 backend_runtime_changed_expected must be false")
    if stage79_4.get("database_migration_expected") is not False:
        fail("stage 79.4 database_migration_expected must be false")


def main() -> None:
    require_markers(VERIFY_PAGE, REQUIRED_VERIFY_PAGE_MARKERS)
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_manifest()
    print("stage 79.4 learner document verification UX guard passed")


if __name__ == "__main__":
    main()
