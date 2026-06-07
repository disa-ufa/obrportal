from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage79-learner-documents-final-qa.md"
FINAL_QA_DOC = ROOT / "docs" / "learner-documents-final-qa.md"

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 79.6 - Learner Documents Final QA",
    "learner_documents_final_qa_status=implementation_ready",
    "stage79_6_release_manifest_required=yes",
    "stage79_6_guard_required=yes",
    "stage79_6_docs_only=yes",
    "stage79_6_runtime_changes=no",
    "stage79_6_frontend_runtime_changes=no",
    "stage79_6_backend_runtime_changes=no",
    "stage79_6_database_changes=no",
    "stage79_6_migrations_added=no",
    "stage79_6_chain_closed=yes",
    "stage79_6_next_stage=80.1",
]

REQUIRED_FINAL_QA_MARKERS = [
    "Learner Documents Final QA",
    "learner_documents_final_qa=closed",
    "Stage 79.1 - Learner Documents API Inventory",
    "Stage 79.5 - Learner Document Download UX Integration",
    "Last confirmed head: 89a9acf",
    "Recommended next stage: Stage 80.1",
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 79.6 learner documents final QA guard failed: {message}")


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

    if manifest.get("current_stage") not in {"79.6", "80.1"}:
        fail("current_stage must be 79.6 or a compatible later stage")

    checkpoint = manifest.get("production_checkpoint") or {}
    allowed_checkpoints = {
        ("79.5", "89a9acf"),
        ("79.6", "4c5efe7"),
    }
    if (checkpoint.get("last_confirmed_stage"), checkpoint.get("last_confirmed_head")) not in allowed_checkpoints:
        fail("production checkpoint must reference 79.5/89a9acf or compatible later stage 79.6/4c5efe7")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}

    for stage_id in ["79.1", "79.2", "79.3", "79.4", "79.5", "79.6"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage79_6 = stages["79.6"]
    if stage79_6.get("status") not in {"implementation_ready", "production_confirmed"}:
        fail("stage 79.6 status must be implementation_ready or production_confirmed")
    if stage79_6.get("deployment_type") != "docs-and-qa-only":
        fail("stage 79.6 deployment_type must be docs-and-qa-only")
    if stage79_6.get("frontend_runtime_changed_expected") is not False:
        fail("stage 79.6 frontend_runtime_changed_expected must be false")
    if stage79_6.get("backend_runtime_changed_expected") is not False:
        fail("stage 79.6 backend_runtime_changed_expected must be false")
    if stage79_6.get("database_migration_expected") is not False:
        fail("stage 79.6 database_migration_expected must be false")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(FINAL_QA_DOC, REQUIRED_FINAL_QA_MARKERS)
    require_manifest()
    print("stage 79.6 learner documents final QA guard passed")


if __name__ == "__main__":
    main()
