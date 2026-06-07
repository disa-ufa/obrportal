from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_STAGE78_8_CHECKS = {
    "python .\\scripts\\check_release_manifest.py",
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
    "python .\\scripts\\smoke_public_pages.py",
    "python .\\scripts\\smoke_frontend_hooks_layout.py",
    "docker compose exec frontend npm run build",
    "git diff --check",
}

REQUIRED_STAGE78_8_CHANGED_FILES = {
    "frontend/src/pages/CourseDetailPage.jsx",
    "docs/release-manifest.json",
    "docs/stage78-learner-document-handoff-ux.md",
    "scripts/check_release_manifest.py",
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
    if manifest.get("current_stage") != "78.8":
        fail("current_stage must be 78.8")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "78.7":
        fail("last_confirmed_stage must be 78.7")
    if checkpoint.get("last_confirmed_head") != "44910ab":
        fail("last_confirmed_head must be 44910ab")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("database_migration_run must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["77.6", "77.7", "78.1", "78.2", "78.3", "78.4", "78.5", "78.6", "78.7", "78.8"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage78_7 = stages["78.7"]
    if stage78_7.get("status") != "production_deployed":
        fail("stage 78.7 status must be production_deployed")
    if stage78_7.get("head") != "44910ab":
        fail("stage 78.7 head must be 44910ab")

    stage78_8 = stages["78.8"]
    if stage78_8.get("status") != "implementation_ready":
        fail("stage 78.8 status must be implementation_ready")
    if stage78_8.get("branch") != "stage78-learner-document-handoff-ux":
        fail("stage 78.8 branch must be stage78-learner-document-handoff-ux")
    if stage78_8.get("deployment_type") != "frontend-only":
        fail("stage 78.8 deployment_type must be frontend-only")
    if stage78_8.get("frontend_runtime_changed_expected") is not True:
        fail("stage 78.8 frontend_runtime_changed_expected must be true")
    if stage78_8.get("backend_runtime_changed_expected") is not False:
        fail("stage 78.8 backend_runtime_changed_expected must be false")
    if stage78_8.get("database_migration_expected") is not False:
        fail("stage 78.8 database_migration_expected must be false")

    missing_checks = REQUIRED_STAGE78_8_CHECKS - set(stage78_8.get("required_checks", []))
    if missing_checks:
        fail(f"stage 78.8 missing required checks: {sorted(missing_checks)}")

    missing_files = REQUIRED_STAGE78_8_CHANGED_FILES - set(stage78_8.get("changed_files", []))
    if missing_files:
        fail(f"stage 78.8 missing changed files: {sorted(missing_files)}")

    for path in [
        "docs/stage78-learner-document-handoff-ux.md",
        "scripts/check_stage78_learner_document_handoff_ux.py",
    ]:
        if not (ROOT / path).exists():
            fail(f"required file missing: {path}")

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
