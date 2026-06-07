from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage79-learner-documents-api-inventory.md"
INVENTORY_JSON = ROOT / "docs" / "learner-documents-api-inventory.json"

REQUIRED_INVENTORY_KEYS = [
    "stage",
    "name",
    "status",
    "source_head",
    "production_checkpoint",
    "inventory_scope",
    "keyword_groups",
    "scan_summary",
    "keyword_index",
    "high_value_files",
    "recommendation",
    "safety",
]

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 79.1 - Learner documents API inventory",
    "learner_documents_api_inventory_status=implementation_ready",
    "stage79_1_release_manifest_required=yes",
    "stage79_1_guard_required=yes",
    "stage79_1_docs_only=yes",
    "stage79_1_runtime_changes=no",
    "stage79_1_database_changes=no",
    "stage79_1_migrations_added=no",
]

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


def fail(message: str) -> None:
    raise SystemExit(f"stage 79.1 learner documents API inventory guard failed: {message}")


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
    try:
        inventory = json.loads(INVENTORY_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/learner-documents-api-inventory.json: {exc}")

    missing = [key for key in REQUIRED_INVENTORY_KEYS if key not in inventory]
    if missing:
        fail(f"inventory JSON misses keys: {missing}")

    if inventory.get("stage") != "79.1":
        fail("inventory stage must be 79.1")
    if inventory.get("status") != "implementation_ready":
        fail("inventory status must be implementation_ready")

    recommendation = inventory.get("recommendation") or {}
    if recommendation.get("runtime_change_allowed_now") is not False:
        fail("runtime_change_allowed_now must be false")
    if recommendation.get("database_migration_allowed_now") is not False:
        fail("database_migration_allowed_now must be false")
    if recommendation.get("next_stage") != "79.2":
        fail("next_stage must be 79.2")

    safety = inventory.get("safety") or {}
    for key in [
        "frontend_runtime_changed",
        "backend_runtime_changed",
        "database_changed",
        "migrations_added",
        "auth_rbac_changed",
        "production_config_changed",
    ]:
        if safety.get(key) is not False:
            fail(f"safety.{key} must be false")


def require_manifest() -> None:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("current_stage") not in {"79.1", "79.2", "79.3", "79.4", "79.5", "79.6", "80.1", "80.2", "80.3"}:
        fail("current_stage must be 79.1 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("80.2", "10a3168"),
        ("80.1", "a6eeef7"),
        ("79.6", "4c5efe7"),
        ("79.5", "89a9acf"),
        ("79.4", "f1eacbe"),
        ("79.3", "0b679f9"),
        ("79.2", "9efd5d2"),
        ("78.9", "689ada5"),
        ("79.1", "378d054"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 78.9/689ada5 or compatible later stage 79.1/378d054")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    if "79.1" not in stages:
        fail("release manifest misses stage 79.1")

    stage79_1 = stages["79.1"]
    if stage79_1.get("status") not in {"implementation_ready", "production_confirmed", "79.3", "79.4", "79.5", "79.6", "80.1", "80.2", "80.3"}:
        fail("stage 79.1 status must be implementation_ready or production_confirmed")
    if stage79_1.get("deployment_type") != "docs-and-qa-only":
        fail("stage 79.1 deployment_type must be docs-and-qa-only")
    if stage79_1.get("frontend_runtime_changed_expected") is not False:
        fail("stage 79.1 frontend_runtime_changed_expected must be false")
    if stage79_1.get("backend_runtime_changed_expected") is not False:
        fail("stage 79.1 backend_runtime_changed_expected must be false")
    if stage79_1.get("database_migration_expected") is not False:
        fail("stage 79.1 database_migration_expected must be false")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_inventory()
    require_manifest()
    require_no_secret_like_inventory_content()
    print("stage 79.1 learner documents API inventory guard passed")


if __name__ == "__main__":
    main()
