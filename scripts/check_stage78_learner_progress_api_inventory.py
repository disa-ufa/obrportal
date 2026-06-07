from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]

STAGE_DOC = ROOT / "docs" / "stage78-learner-progress-api-inventory.md"
INVENTORY_JSON = ROOT / "docs" / "learner-progress-api-inventory.json"
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_DOC_MARKERS = [
    "Stage 78.5 - Learner Progress API Inventory",
    "stage78_5_status=implementation_ready",
    "stage78_5_release_manifest_required=yes",
    "stage78_5_guard_required=yes",
    "stage78_5_repository_inventory_only=yes",
    "stage78_5_runtime_changed=no",
    "stage78_5_database_changed=no",
    "stage78_5_migrations_added=no",
    "stage78_5_credential_like_values=no",
    "Backend must be the source of truth for learner progress.",
    "Stage 78.6 - Learner lesson completion API integration",
]

REQUIRED_MANIFEST_MARKERS = [
    '"id": "78.5"',
    '"id": "78.5"',
    '"name": "Learner Progress API Inventory"',
    '"deployment_type": "repository-inventory"',
    '"deployment_type": "repository-inventory"',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]

REQUIRED_INVENTORY_KEYS = [
    "stage",
    "name",
    "generated_at_utc",
    "scanned_files_count",
    "keyword_groups",
    "backend_route_candidates",
    "model_class_candidates",
    "function_candidates",
    "high_value_files",
    "recommendation",
]

CREDENTIAL_PATTERNS = [
    r"SEED_[A-Z0-9_]*(PASS|TOKEN|KEY)",
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    r"Bearer\s+[A-Za-z0-9._-]{20,}",
    r"(Admin|Learner)\d+Local\d+",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 78.5 learner progress API inventory guard failed: {message}")


def require_text_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_no_credential_like_content() -> None:
    combined = ""
    for path in [STAGE_DOC, INVENTORY_JSON]:
        combined += "\n" + path.read_text(encoding="utf-8")

    for pattern in CREDENTIAL_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            fail(f"credential-like content found by pattern: {pattern}")

    if '"samples"' in INVENTORY_JSON.read_text(encoding="utf-8"):
        fail("inventory JSON must not include source line samples")


def main() -> None:
    require_text_markers(STAGE_DOC, REQUIRED_DOC_MARKERS)
    require_text_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    current_stage = manifest.get("current_stage")
    if current_stage not in {"78.5", "78.6", "78.7", "78.8"}:
        fail("current_stage must be 78.5 or a compatible later stage")

    if not INVENTORY_JSON.exists():
        fail("docs/learner-progress-api-inventory.json is missing")

    try:
        inventory = json.loads(INVENTORY_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in learner progress inventory: {exc}")

    missing_keys = [key for key in REQUIRED_INVENTORY_KEYS if key not in inventory]
    if missing_keys:
        fail(f"inventory JSON misses keys: {missing_keys}")

    if inventory.get("stage") != "78.5":
        fail("inventory stage must be 78.5")

    if inventory.get("name") != "Learner Progress API Inventory":
        fail("inventory name must be Learner Progress API Inventory")

    if int(inventory.get("scanned_files_count") or 0) <= 0:
        fail("inventory scanned_files_count must be positive")

    keyword_groups = inventory.get("keyword_groups") or {}
    for group in ["course", "lesson", "enrollment", "progress", "document"]:
        if group not in keyword_groups:
            fail(f"inventory keyword group is missing: {group}")

    recommendation = inventory.get("recommendation") or {}
    if recommendation.get("runtime_change_allowed_now") is not False:
        fail("runtime_change_allowed_now must be false")
    if recommendation.get("database_migration_allowed_now") is not False:
        fail("database_migration_allowed_now must be false")
    if recommendation.get("next_stage") != "78.6":
        fail("next_stage must be 78.6")

    require_no_credential_like_content()

    print("stage 78.5 learner progress API inventory guard passed")


if __name__ == "__main__":
    main()
