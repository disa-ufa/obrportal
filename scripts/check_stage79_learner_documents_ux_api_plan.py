from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage79-learner-documents-ux-api-plan.md"
PLAN_DOC = ROOT / "docs" / "learner-documents-ux-api-plan.md"
INVENTORY_JSON = ROOT / "docs" / "learner-documents-api-inventory.json"

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 79.2 - Learner documents UX/API connection plan",
    "learner_documents_ux_api_plan_status=implementation_ready",
    "stage79_2_release_manifest_required=yes",
    "stage79_2_guard_required=yes",
    "stage79_2_docs_only=yes",
    "stage79_2_runtime_changes=no",
    "stage79_2_database_changes=no",
    "stage79_2_migrations_added=no",
    "stage79_2_next_stage=79.3",
]

REQUIRED_PLAN_DOC_MARKERS = [
    "Learner documents UX/API connection plan",
    "learner_documents_ux_api_plan=ready",
    "stage79_2_next_stage=79.3",
    "frontend documents page",
    "frontend document verification page",
    "backend document PDF service",
    "Stage 79.3 should first use existing frontend API functions",
]

REQUIRED_INVENTORY_MARKERS = [
    '"stage": "79.1"',
    '"name": "Learner documents API inventory"',
    '"status": "implementation_ready"',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 79.2 learner documents UX/API connection plan guard failed: {message}")


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

    if manifest.get("current_stage") not in {"79.2", "79.3"}:
        fail("current_stage must be 79.2 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.1", "378d054"),
        ("79.2", "9efd5d2"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 79.1/378d054 or compatible later stage 79.2/9efd5d2")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["78.9", "79.1", "79.2"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_2 = stages["79.2"]
    if stage79_2.get("status") not in {"implementation_ready", "production_confirmed"}:
        fail("stage 79.2 status must be implementation_ready or production_confirmed")
    if stage79_2.get("deployment_type") != "docs-and-qa-only":
        fail("stage 79.2 deployment_type must be docs-and-qa-only")
    if stage79_2.get("frontend_runtime_changed_expected") is not False:
        fail("stage 79.2 frontend_runtime_changed_expected must be false")
    if stage79_2.get("backend_runtime_changed_expected") is not False:
        fail("stage 79.2 backend_runtime_changed_expected must be false")
    if stage79_2.get("database_migration_expected") is not False:
        fail("stage 79.2 database_migration_expected must be false")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(PLAN_DOC, REQUIRED_PLAN_DOC_MARKERS)
    require_markers(INVENTORY_JSON, REQUIRED_INVENTORY_MARKERS)
    require_manifest()
    print("stage 79.2 learner documents UX/API connection plan guard passed")


if __name__ == "__main__":
    main()
