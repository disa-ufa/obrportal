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

    if manifest.get("current_stage") not in {"79.4", "79.5", "79.6"}:
        fail("current_stage must be 79.4 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.5", "89a9acf"),
        ("79.3", "0b679f9"),
        ("79.4", "f1eacbe"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 79.3/0b679f9 or compatible later stage 79.4/f1eacbe")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["79.1", "79.2", "79.3", "79.4"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_4 = stages["79.4"]
    if stage79_4.get("status") not in {"implementation_ready", "production_deployed", "79.6"}:
        fail("stage 79.4 status must be implementation_ready or production_deployed")
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
    require_manifest()
    print("stage 79.4 learner document verification UX guard passed")


if __name__ == "__main__":
    main()
