from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage80-learner-documents-backend-api-contract.md"
CONTRACT_MD = ROOT / "docs" / "learner-documents-backend-api-contract.md"
CONTRACT_JSON = ROOT / "docs" / "learner-documents-backend-api-contract.json"
PLAN_DOC = ROOT / "docs" / "learner-documents-backend-api-implementation-plan.md"
INVENTORY_JSON = ROOT / "docs" / "learner-documents-backend-api-inventory.json"

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 80.3 - Learner Documents Backend/API Contract",
    "learner_documents_backend_api_contract_status=implementation_ready",
    "stage80_3_release_manifest_required=yes",
    "stage80_3_guard_required=yes",
    "stage80_3_docs_contract_only=yes",
    "stage80_3_runtime_changes=no",
    "stage80_3_frontend_runtime_changes=no",
    "stage80_3_backend_runtime_changes=no",
    "stage80_3_database_changes=no",
    "stage80_3_migrations_added=no",
    "stage80_3_next_stage=80.4",
]

REQUIRED_CONTRACT_MD_MARKERS = [
    "Learner Documents Backend/API Contract",
    "learner_documents_backend_api_contract=ready",
    "stage80_3_next_stage=80.4",
    "Contract 1 - Learner documents list",
    "Contract 2 - Learner document download/open action",
    "Contract 3 - Public document verification",
    "Stable statuses",
    "Stable errors",
    "Access control rules",
    "Migration decision",
    "Stage 80.4 - Learner Documents Backend/API Runtime Contract Implementation",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "80.3"',
    '"id": "80.3"',
    '"name": "Learner documents backend/API contract"',
    '"branch": "stage80-learner-documents-backend-api-contract"',
    '"deployment_type": "docs-and-contract-only"',
    '"frontend_runtime_changed_expected": false',
    '"backend_runtime_changed_expected": false',
    '"database_migration_expected": false',
]

REQUIRED_CONTRACT_KEYS = [
    "stage",
    "name",
    "status",
    "scope",
    "production_checkpoint",
    "inventory_baseline",
    "contracts",
    "learner_document_fields",
    "public_verification_fields",
    "stable_statuses",
    "stable_errors",
    "access_control_requirements",
    "migration_decision",
    "recommendation",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 80.3 learner documents backend/API contract guard failed: {message}")


def require_markers(path: Path, markers: list[str]) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")

    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]

    if missing:
        fail(f"{path.relative_to(ROOT)} misses markers: {missing}")

    return text


def require_contract_json() -> None:
    if not CONTRACT_JSON.exists():
        fail("contract JSON is missing")

    try:
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid contract JSON: {exc}")

    missing = [key for key in REQUIRED_CONTRACT_KEYS if key not in contract]
    if missing:
        fail(f"contract JSON misses keys: {missing}")

    if contract.get("stage") != "80.3":
        fail("contract stage must be 80.3")
    if contract.get("status") != "implementation_ready":
        fail("contract status must be implementation_ready")
    if contract.get("scope") != "docs-and-contract-only":
        fail("contract scope must be docs-and-contract-only")

    checkpoint = contract.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "80.2":
        fail("contract checkpoint stage must be 80.2")
    if checkpoint.get("last_confirmed_head") != "10a3168":
        fail("contract checkpoint head must be 10a3168")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("contract backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("contract database_migration_run must be false")

    contracts = {item.get("id"): item for item in contract.get("contracts", [])}
    for contract_id in [
        "learner_documents_list",
        "learner_document_download",
        "public_document_verification",
    ]:
        if contract_id not in contracts:
            fail(f"contract {contract_id} is missing")

    recommendation = contract.get("recommendation") or {}
    if recommendation.get("next_stage") != "80.4":
        fail("recommendation next_stage must be 80.4")
    if recommendation.get("runtime_change_allowed_now") is not False:
        fail("runtime_change_allowed_now must be false")
    if recommendation.get("database_migration_allowed_now") is not False:
        fail("database_migration_allowed_now must be false")


def require_manifest() -> None:
    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("current_stage") != "80.3":
        fail("current_stage must be 80.3")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "80.2":
        fail("production checkpoint stage must be 80.2")
    if checkpoint.get("last_confirmed_head") != "10a3168":
        fail("production checkpoint head must be 10a3168")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["80.1", "80.2", "80.3"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage80_2 = stages["80.2"]
    if stage80_2.get("status") != "production_confirmed":
        fail("stage 80.2 status must be production_confirmed")
    if stage80_2.get("head") != "10a3168":
        fail("stage 80.2 head must be 10a3168")

    stage80_3 = stages["80.3"]
    if stage80_3.get("status") != "implementation_ready":
        fail("stage 80.3 status must be implementation_ready")
    if stage80_3.get("deployment_type") != "docs-and-contract-only":
        fail("stage 80.3 deployment_type must be docs-and-contract-only")
    if stage80_3.get("frontend_runtime_changed_expected") is not False:
        fail("stage 80.3 frontend_runtime_changed_expected must be false")
    if stage80_3.get("backend_runtime_changed_expected") is not False:
        fail("stage 80.3 backend_runtime_changed_expected must be false")
    if stage80_3.get("database_migration_expected") is not False:
        fail("stage 80.3 database_migration_expected must be false")


def require_baseline_documents() -> None:
    for path in [PLAN_DOC, INVENTORY_JSON]:
        if not path.exists():
            fail(f"baseline document is missing: {path.relative_to(ROOT)}")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(CONTRACT_MD, REQUIRED_CONTRACT_MD_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_contract_json()
    require_manifest()
    require_baseline_documents()
    print("stage 80.3 learner documents backend/API contract guard passed")


if __name__ == "__main__":
    main()
