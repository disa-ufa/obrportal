from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage80-learner-documents-backend-api-plan.md"
PLAN_DOC = ROOT / "docs" / "learner-documents-backend-api-implementation-plan.md"
INVENTORY_JSON = ROOT / "docs" / "learner-documents-backend-api-inventory.json"

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 80.2 - Learner Documents Backend/API Implementation Plan",
    "learner_documents_backend_api_plan_status=implementation_ready",
    "stage80_2_release_manifest_required=yes",
    "stage80_2_guard_required=yes",
    "stage80_2_docs_only=yes",
    "stage80_2_runtime_changes=no",
    "stage80_2_frontend_runtime_changes=no",
    "stage80_2_backend_runtime_changes=no",
    "stage80_2_database_changes=no",
    "stage80_2_migrations_added=no",
    "stage80_2_next_stage=80.3",
]

REQUIRED_PLAN_DOC_MARKERS = [
    "Learner Documents Backend/API Implementation Plan",
    "learner_documents_backend_api_plan=ready",
    "stage80_2_next_stage=80.3",
    "Source of truth for learner-visible documents",
    "Learner documents endpoint",
    "Download/open action",
    "Public verification endpoint",
    "Completed course to document handoff",
    "Access control review",
    "Migration decision",
    "Stage 80.3 - Learner Documents Backend/API Contract",
]

REQUIRED_MANIFEST_MARKERS = [
    '"id": "80.2"',
    '"name": "Learner documents backend/API implementation plan"',
    '"status": "production_confirmed"',
    '"head": "10a3168"',
    '"deployment_type": "docs-and-qa-only"',
    '"frontend_runtime_changed_expected": false',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 80.2 learner documents backend/API plan guard failed: {message}")


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

    if manifest.get("current_stage") not in {"80.2", "80.3"}:
        fail("current_stage must be 80.2 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("80.1", "a6eeef7"),
        ("80.2", "10a3168"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 80.1/a6eeef7 or compatible later stage 80.2/10a3168")

    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["80.1", "80.2"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage80_2 = stages["80.2"]
    if stage80_2.get("status") not in {"implementation_ready", "production_confirmed"}:
        fail("stage 80.2 status must be implementation_ready or production_confirmed")
    if stage80_2.get("deployment_type") != "docs-and-qa-only":
        fail("stage 80.2 deployment_type must be docs-and-qa-only")
    if stage80_2.get("frontend_runtime_changed_expected") is not False:
        fail("stage 80.2 frontend_runtime_changed_expected must be false")
    if stage80_2.get("backend_runtime_changed_expected") is not False:
        fail("stage 80.2 backend_runtime_changed_expected must be false")
    if stage80_2.get("database_migration_expected") is not False:
        fail("stage 80.2 database_migration_expected must be false")


def require_inventory_baseline() -> None:
    if not INVENTORY_JSON.exists():
        fail("Stage 80.1 inventory JSON is missing")

    try:
        inventory = json.loads(INVENTORY_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid Stage 80.1 inventory JSON: {exc}")

    if inventory.get("stage") != "80.1":
        fail("inventory baseline must be Stage 80.1")
    if inventory.get("scope") != "docs-and-qa-only":
        fail("inventory scope must be docs-and-qa-only")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(PLAN_DOC, REQUIRED_PLAN_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_manifest()
    require_inventory_baseline()
    print("stage 80.2 learner documents backend/API plan guard passed")


if __name__ == "__main__":
    main()
