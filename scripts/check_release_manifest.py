from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_STAGE80_4_CHECKS = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage80_learner_documents_backend_api_runtime_contract.py",
    "python .\\scripts\\check_stage80_learner_documents_backend_api_contract.py",
    "python .\\scripts\\check_stage80_learner_documents_backend_api_plan.py",
    "python .\\scripts\\check_stage80_learner_documents_backend_api_inventory.py",
    "python .\\scripts\\check_stage79_learner_documents_final_qa.py",
    "python .\\scripts\\check_stage79_learner_document_download_ux.py",
    "python .\\scripts\\check_stage79_learner_document_verification_ux.py",
    "python .\\scripts\\check_stage79_learner_documents_ux_foundation.py",
    "python .\\scripts\\check_stage79_learner_documents_ux_api_plan.py",
    "python .\\scripts\\check_stage79_learner_documents_api_inventory.py",
    "python .\\scripts\\check_stage78_learner_progress_final_qa.py",
    "python .\\scripts\\check_stage78_learner_document_handoff_ux.py",
    "python .\\scripts\\check_stage78_learner_course_completion_api_integration.py",
    "python .\\scripts\\check_stage78_learner_lesson_completion_api_integration.py",
    "python .\\scripts\\check_stage78_learner_progress_api_inventory.py",
    "python .\\scripts\\check_stage78_learner_completion_action_ux.py",
    "python .\\scripts\\check_stage78_learner_lesson_content_preview_ux.py",
    "python .\\scripts\\check_stage78_learner_lesson_access_ux.py",
    "python .\\scripts\\check_stage78_learner_course_progress_foundation.py",
    "python .\\scripts\\check_stage77_course_builder_final_qa.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\frontend_guard.py",
    "python .\\scripts\\smoke_public_pages.py",
    "python .\\scripts\\smoke_frontend_hooks_layout.py",
    "docker compose exec backend pytest app/tests/test_learner_documents_backend_api_contract.py",
    "docker compose exec frontend npm run build",
    "git diff --check",
}

REQUIRED_STAGE80_4_CHANGED_FILES = {
    "backend/app/api/v1/account.py",
    "backend/app/api/v1/public.py",
    "backend/app/schemas/account.py",
    "backend/app/schemas/public.py",
    "backend/app/tests/test_learner_documents_backend_api_contract.py",
    "docs/release-manifest.json",
    "docs/stage80-learner-documents-backend-api-runtime-contract.md",
    "docs/learner-documents-backend-api-runtime-contract.md",
    "scripts/check_release_manifest.py",
    "scripts/check_stage80_learner_documents_backend_api_runtime_contract.py",
    "scripts/check_stage80_learner_documents_backend_api_contract.py",
    "scripts/check_stage80_learner_documents_backend_api_plan.py",
    "scripts/check_stage80_learner_documents_backend_api_inventory.py",
    "scripts/check_stage79_learner_documents_final_qa.py",
    "scripts/check_stage79_learner_document_download_ux.py",
    "scripts/check_stage79_learner_document_verification_ux.py",
    "scripts/check_stage79_learner_documents_ux_foundation.py",
    "scripts/check_stage79_learner_documents_ux_api_plan.py",
    "scripts/check_stage79_learner_documents_api_inventory.py",
    "scripts/check_stage78_learner_progress_final_qa.py",
    "scripts/check_stage78_learner_document_handoff_ux.py",
    "scripts/check_stage78_learner_course_completion_api_integration.py",
    "scripts/check_stage78_learner_lesson_completion_api_integration.py",
    "scripts/check_stage78_learner_progress_api_inventory.py",
    "scripts/check_stage78_learner_completion_action_ux.py",
    "scripts/check_stage78_learner_lesson_content_preview_ux.py",
    "scripts/check_stage78_learner_lesson_access_ux.py",
    "scripts/check_stage78_learner_course_progress_foundation.py",
    "scripts/check_stage77_course_builder_final_qa.py",
}


def fail(message: str) -> None:
    raise SystemExit(f"release manifest guard failed: {message}")


def main() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    try:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")

    if manifest.get("schema_version") != 1:
        fail("schema_version must be 1")
    if manifest.get("project") != "ObrPortal":
        fail("project must be ObrPortal")
    if manifest.get("process") != "development-process-v2":
        fail("process must be development-process-v2")
    if manifest.get("current_stage") != "80.4":
        fail("current_stage must be 80.4")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "80.3":
        fail("last_confirmed_stage must be 80.3")
    if checkpoint.get("last_confirmed_head") != "383e6df":
        fail("last_confirmed_head must be 383e6df")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("frontend_runtime_changed must be false")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("backend_runtime_changed must be false before this stage deploy")
    if checkpoint.get("database_migration_run") is not False:
        fail("database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["77.7", "78.9", "79.6", "80.1", "80.2", "80.3", "80.4"]:
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
    if stage80_4.get("branch") != "stage80-learner-documents-backend-api-runtime-contract":
        fail("stage 80.4 branch must be stage80-learner-documents-backend-api-runtime-contract")
    if stage80_4.get("deployment_type") != "backend-runtime-no-migration":
        fail("stage 80.4 deployment_type must be backend-runtime-no-migration")
    if stage80_4.get("frontend_runtime_changed_expected") is not False:
        fail("stage 80.4 frontend_runtime_changed_expected must be false")
    if stage80_4.get("backend_runtime_changed_expected") is not True:
        fail("stage 80.4 backend_runtime_changed_expected must be true")
    if stage80_4.get("database_migration_expected") is not False:
        fail("stage 80.4 database_migration_expected must be false")

    missing_checks = REQUIRED_STAGE80_4_CHECKS - set(stage80_4.get("required_checks", []))
    if missing_checks:
        fail(f"stage 80.4 missing required checks: {sorted(missing_checks)}")

    missing_files = REQUIRED_STAGE80_4_CHANGED_FILES - set(stage80_4.get("changed_files", []))
    if missing_files:
        fail(f"stage 80.4 missing changed files: {sorted(missing_files)}")

    for path in REQUIRED_STAGE80_4_CHANGED_FILES:
        if not (ROOT / path).exists():
            fail(f"required file missing: {path}")

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
