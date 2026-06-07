from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage80-learner-documents-backend-api-inventory.md"
INVENTORY_JSON = ROOT / "docs" / "learner-documents-backend-api-inventory.json"

FORBIDDEN_SECRET_MARKERS = [
    "password",
    "passwd",
    "token",
    "secret",
    "api_key",
    "apikey",
    "private_key",
    "authorization",
    "bearer",
    "SEED_ADMIN_PASSWORD",
    "SEED_DEMO_PASSWORD",
    "Admin123Local2026",
    "Learner123Local2026",
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 80.1 - Learner Documents Backend/API Inventory",
    "learner_documents_backend_api_inventory_status=implementation_ready",
    "stage80_1_release_manifest_required=yes",
    "stage80_1_guard_required=yes",
    "stage80_1_docs_only=yes",
    "stage80_1_runtime_changes=no",
    "stage80_1_frontend_runtime_changes=no",
    "stage80_1_backend_runtime_changes=no",
    "stage80_1_database_changes=no",
    "stage80_1_migrations_added=no",
    "stage80_1_next_stage=80.2",
]

REQUIRED_MANIFEST_MARKERS = [
    '"id": "80.1"',
    '"name": "Learner documents backend/API inventory"',
    '"status": "production_confirmed"',
    '"head": "a6eeef7"',
    '"deployment_type": "docs-and-qa-only"',
    '"frontend_runtime_changed_expected": false',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]

REQUIRED_INVENTORY_KEYS = [
    "stage",
    "name",
    "status",
    "generated_from",
    "scope",
    "production_checkpoint",
    "backend",
    "frontend",
    "safety_notes",
    "recommendation",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 80.1 learner documents backend/API inventory guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_no_secret_like_inventory_content() -> None:
    combined = ""
    for path in [STAGE_DOC, INVENTORY_JSON]:
        if path.exists():
            combined += "\n" + path.read_text(encoding="utf-8")

    low = combined.lower()
    found = [marker for marker in FORBIDDEN_SECRET_MARKERS if marker.lower() in low]

    if found:
        fail(f"inventory contains secret-like markers: {found}")


def require_inventory() -> None:
    if not INVENTORY_JSON.exists():
        fail("missing inventory JSON")

    try:
        inventory = json.loads(INVENTORY_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid inventory JSON: {exc}")

    missing = [key for key in REQUIRED_INVENTORY_KEYS if key not in inventory]
    if missing:
        fail(f"inventory JSON misses keys: {missing}")

    if inventory.get("stage") != "80.1":
        fail("inventory stage must be 80.1")
    if inventory.get("status") != "implementation_ready":
        fail("inventory status must be implementation_ready")
    if inventory.get("scope") != "docs-and-qa-only":
        fail("inventory scope must be docs-and-qa-only")

    checkpoint = inventory.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "79.6":
        fail("inventory checkpoint stage must be 79.6")
    if checkpoint.get("last_confirmed_head") != "4c5efe7":
        fail("inventory checkpoint head must be 4c5efe7")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("inventory backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("inventory database_migration_run must be false")

    backend = inventory.get("backend") or {}
    for key in ["keyword_files", "document_routes", "course_or_enrollment_routes", "document_related_defs"]:
        if key not in backend:
            fail(f"backend inventory misses key: {key}")

    frontend = inventory.get("frontend") or {}
    for key in ["keyword_files", "document_api_usage"]:
        if key not in frontend:
            fail(f"frontend inventory misses key: {key}")

    recommendation = inventory.get("recommendation") or {}
    if recommendation.get("next_stage") != "80.2":
        fail("recommendation next_stage must be 80.2")
    if recommendation.get("runtime_change_allowed_now") is not False:
        fail("runtime_change_allowed_now must be false")
    if recommendation.get("database_migration_allowed_now") is not False:
        fail("database_migration_allowed_now must be false")


def require_manifest() -> None:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("current_stage") not in {"80.1", "80.2", "80.3", "80.4"}:
        fail("current_stage must be 80.1 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("80.3", "383e6df"),
        ("80.2", "10a3168"),
        ("79.6", "4c5efe7"),
        ("80.1", "a6eeef7"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 79.6/4c5efe7 or compatible later stage 80.1/a6eeef7")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["79.6", "80.1"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_6 = stages["79.6"]
    if stage79_6.get("status") != "production_confirmed":
        fail("stage 79.6 status must be production_confirmed")
    if stage79_6.get("head") != "4c5efe7":
        fail("stage 79.6 head must be 4c5efe7")

    stage80_1 = stages["80.1"]
    if stage80_1.get("status") not in {"implementation_ready", "production_confirmed", "80.3", "80.4"}:
        fail("stage 80.1 status must be implementation_ready or production_confirmed")
    if stage80_1.get("deployment_type") != "docs-and-qa-only":
        fail("stage 80.1 deployment_type must be docs-and-qa-only")
    if stage80_1.get("frontend_runtime_changed_expected") is not False:
        fail("stage 80.1 frontend_runtime_changed_expected must be false")
    if stage80_1.get("backend_runtime_changed_expected") is not False:
        fail("stage 80.1 backend_runtime_changed_expected must be false")
    if stage80_1.get("database_migration_expected") is not False:
        fail("stage 80.1 database_migration_expected must be false")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_inventory()
    require_no_secret_like_inventory_content()
    require_manifest()
    print("stage 80.1 learner documents backend/API inventory guard passed")


if __name__ == "__main__":
    main()
