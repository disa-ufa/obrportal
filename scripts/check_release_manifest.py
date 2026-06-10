from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"

def fail(message: str) -> None:
    raise SystemExit(f"release manifest guard failed: {message}")

def main() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    if manifest.get("schema_version") != 1:
        fail("schema_version must be 1")
    if manifest.get("project") != "ObrPortal":
        fail("project must be ObrPortal")
    if manifest.get("process") != "development-process-v2":
        fail("process must be development-process-v2")
    if manifest.get("current_stage") != "82.1":
        fail("current_stage must be 82.1")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.15":
        fail("last_confirmed_stage must remain 81.15")
    if checkpoint.get("last_confirmed_head") != "299d428":
        fail("last_confirmed_head must be 299d428")
    if checkpoint.get("status") != "real_batch_001_production_result_completed":
        fail("checkpoint status mismatch")
    if checkpoint.get("decision") != "real_batch_001_e2e_completed_publish_document_verified":
        fail("checkpoint decision mismatch")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")
    if checkpoint.get("cleanup_performed") is not False:
        fail("checkpoint cleanup_performed must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14", "81.15", "82.1"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage15 = stages["81.15"]
    if stage15.get("status") != "production_completed":
        fail("stage 81.15 status mismatch")
    if stage15.get("production_data_changed") is not True:
        fail("stage 81.15 production_data_changed must be true")
    if stage15.get("document_result", {}).get("status") != "available":
        fail("stage 81.15 document must be available")
    if stage15.get("raw_contacts_committed") is not False:
        fail("stage 81.15 raw_contacts_committed must be false")
    if stage15.get("password_committed") is not False:
        fail("stage 81.15 password_committed must be false")

    stage = stages["82.1"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.1 status mismatch")
    if stage.get("branch") != "stage82-1-lesson-editor-foundation":
        fail("stage 82.1 branch mismatch")
    if stage.get("deployment_type") != "docs-and-guard-only":
        fail("stage 82.1 deployment_type mismatch")
    if stage.get("decision") != "prepare_block_based_lesson_editor_architecture":
        fail("stage 82.1 decision mismatch")
    if stage.get("next_stage") != "82.2":
        fail("stage 82.1 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": False,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "runtime_rebuild": False,
        "runtime_restart": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.1 {key} must be {expected}")

    expected_blocks = ["rich_text", "video", "file_link", "quiz", "assignment", "callout"]
    if stage.get("mvp_block_types") != expected_blocks:
        fail("stage 82.1 mvp_block_types mismatch")

    planned_model = stage.get("planned_model") or {}
    for key in ["keep_course_module_lesson_hierarchy", "lesson_becomes_container", "new_table_lesson_blocks", "legacy_fields_preserved", "legacy_adapter_required"]:
        if planned_model.get(key) is not True:
            fail(f"stage 82.1 planned_model {key} must be true")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
