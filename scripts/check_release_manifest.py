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
    if manifest.get("current_stage") != "82.2":
        fail("current_stage must be 82.2")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "82.1":
        fail("last_confirmed_stage must remain 82.1")
    if checkpoint.get("last_confirmed_head") != "316e565":
        fail("last_confirmed_head must be 316e565")
    if checkpoint.get("status") != "lesson_editor_foundation_ready":
        fail("checkpoint status mismatch")
    if checkpoint.get("decision") != "prepare_block_based_lesson_editor_architecture":
        fail("checkpoint decision mismatch")
    for key in ["backend_runtime_changed", "frontend_runtime_changed", "database_migration_run", "cleanup_performed"]:
        if checkpoint.get(key) is not False:
            fail(f"checkpoint {key} must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14", "81.15", "82.1", "82.2"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage21 = stages["82.1"]
    if stage21.get("status") != "implementation_ready":
        fail("stage 82.1 status mismatch")
    if stage21.get("production_data_changed") is not False:
        fail("stage 82.1 production_data_changed must be false")
    if stage21.get("raw_contacts_committed") is not False:
        fail("stage 82.1 raw_contacts_committed must be false")
    if stage21.get("password_committed") is not False:
        fail("stage 82.1 password_committed must be false")

    stage = stages["82.2"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.2 status mismatch")
    if stage.get("branch") != "stage82-2-lesson-blocks-schema-foundation":
        fail("stage 82.2 branch mismatch")
    if stage.get("deployment_type") != "backend-schema-foundation":
        fail("stage 82.2 deployment_type mismatch")
    if stage.get("decision") != "implement_backend_safe_lesson_blocks_schema_foundation":
        fail("stage 82.2 decision mismatch")
    if stage.get("next_stage") != "82.3":
        fail("stage 82.2 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": False,
        "backend_runtime_changed": True,
        "database_migration_run": False,
        "database_migration_required": True,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.2 {key} must be {expected}")

    if stage.get("migration") != "6422_lesson_blocks_schema":
        fail("stage 82.2 migration mismatch")
    if stage.get("new_tables") != ["lesson_blocks"]:
        fail("stage 82.2 new_tables mismatch")
    if stage.get("mvp_block_types") != ["rich_text", "video", "file_link", "quiz", "assignment", "callout"]:
        fail("stage 82.2 mvp_block_types mismatch")

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
