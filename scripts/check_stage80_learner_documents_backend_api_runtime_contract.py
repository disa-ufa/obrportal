from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage80-learner-documents-backend-api-runtime-contract.md"
RUNTIME_DOC = ROOT / "docs" / "learner-documents-backend-api-runtime-contract.md"
ACCOUNT_API = ROOT / "backend" / "app" / "api" / "v1" / "account.py"
ACCOUNT_SCHEMA = ROOT / "backend" / "app" / "schemas" / "account.py"
PUBLIC_API = ROOT / "backend" / "app" / "api" / "v1" / "public.py"
PUBLIC_SCHEMA = ROOT / "backend" / "app" / "schemas" / "public.py"
TEST_FILE = ROOT / "backend" / "app" / "tests" / "test_learner_documents_backend_api_contract.py"

REQUIRED_STAGE_DOC_MARKERS = [
    "Stage 80.4 - Learner Documents Backend/API Runtime Contract Implementation",
    "learner_documents_backend_api_runtime_contract_status=implementation_ready",
    "stage80_4_release_manifest_required=yes",
    "stage80_4_guard_required=yes",
    "stage80_4_backend_runtime_changes=yes",
    "stage80_4_frontend_runtime_changes=no",
    "stage80_4_database_changes=no",
    "stage80_4_migrations_added=no",
    "stage80_4_next_stage=80.5",
]

REQUIRED_RUNTIME_DOC_MARKERS = [
    "Learner Documents Backend/API Runtime Contract Implementation",
    "learner_documents_backend_api_runtime_contract=ready",
    "stage80_4_next_stage=80.5",
    "Learner documents list",
    "Learner document download/open",
    "Public document verification",
    "foreign learner download rejection",
]

REQUIRED_ACCOUNT_API_MARKERS = [
    "Query(default=None, alias=\"status\", max_length=32)",
    "course_id: str | None = Query(default=None, max_length=64)",
    "enrollment_id: str | None = Query(default=None, max_length=64)",
    "def _build_account_document_download_url",
    "DocumentRecord.created_at.label(\"created_at\")",
    "DocumentRecord.generated_at.label(\"generated_at\")",
    "download_url=_build_account_document_download_url",
    "created_at=row.created_at",
    "issued_at=issued_at",
    "DocumentRecord.user_id == current_user.id",
]

REQUIRED_ACCOUNT_SCHEMA_MARKERS = [
    "download_url: str | None = None",
    "created_at: datetime | None = None",
    "issued_at: datetime | None = None",
]

REQUIRED_PUBLIC_API_MARKERS = [
    "number: str | None = Query(default=None, min_length=3, max_length=128)",
    "value: str | None = Query(default=None, min_length=3, max_length=128)",
    "normalized_number = (value or number or \"\").strip()",
    "status=row.registry_status",
    "organization_name=settings.document_org_name",
    "message=verification_status",
]

REQUIRED_PUBLIC_SCHEMA_MARKERS = [
    "status: str | None = None",
    "organization_name: str | None = None",
    "message: str | None = None",
]

REQUIRED_TEST_MARKERS = [
    "test_learner_documents_contract_fields_filters_and_public_verification",
    "test_learner_document_download_rejects_foreign_learner",
    "download_url",
    "verification_code",
    "value=",
    "number=",
]

REQUIRED_MANIFEST_MARKERS = [
    '"current_stage": "80.4"',
    '"id": "80.4"',
    '"name": "Learner documents backend/API runtime contract implementation"',
    '"branch": "stage80-learner-documents-backend-api-runtime-contract"',
    '"deployment_type": "backend-runtime-no-migration"',
    '"frontend_runtime_changed_expected": false',
    '"backend_runtime_changed_expected": true',
    '"database_migration_expected": false',
]


def fail(message: str) -> None:
    raise SystemExit(f"stage 80.4 learner documents backend/API runtime contract guard failed: {message}")


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

    if manifest.get("current_stage") != "80.4":
        fail("current_stage must be 80.4")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "80.3":
        fail("production checkpoint stage must be 80.3")
    if checkpoint.get("last_confirmed_head") != "383e6df":
        fail("production checkpoint head must be 383e6df")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false before this stage deploy")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.1", "80.2", "80.3", "80.4"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage80_3 = stages["80.3"]
    if stage80_3.get("status") != "production_confirmed":
        fail("stage 80.3 status must be production_confirmed")
    if stage80_3.get("head") != "383e6df":
        fail("stage 80.3 head must be 383e6df")

    stage80_4 = stages["80.4"]
    if stage80_4.get("status") != "implementation_ready":
        fail("stage 80.4 status must be implementation_ready")
    if stage80_4.get("deployment_type") != "backend-runtime-no-migration":
        fail("stage 80.4 deployment_type must be backend-runtime-no-migration")
    if stage80_4.get("frontend_runtime_changed_expected") is not False:
        fail("stage 80.4 frontend_runtime_changed_expected must be false")
    if stage80_4.get("backend_runtime_changed_expected") is not True:
        fail("stage 80.4 backend_runtime_changed_expected must be true")
    if stage80_4.get("database_migration_expected") is not False:
        fail("stage 80.4 database_migration_expected must be false")


def main() -> None:
    require_markers(STAGE_DOC, REQUIRED_STAGE_DOC_MARKERS)
    require_markers(RUNTIME_DOC, REQUIRED_RUNTIME_DOC_MARKERS)
    require_markers(ACCOUNT_API, REQUIRED_ACCOUNT_API_MARKERS)
    require_markers(ACCOUNT_SCHEMA, REQUIRED_ACCOUNT_SCHEMA_MARKERS)
    require_markers(PUBLIC_API, REQUIRED_PUBLIC_API_MARKERS)
    require_markers(PUBLIC_SCHEMA, REQUIRED_PUBLIC_SCHEMA_MARKERS)
    require_markers(TEST_FILE, REQUIRED_TEST_MARKERS)
    require_markers(MANIFEST, REQUIRED_MANIFEST_MARKERS)
    require_manifest()
    print("stage 80.4 learner documents backend/API runtime contract guard passed")


if __name__ == "__main__":
    main()
