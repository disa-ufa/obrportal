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
    if manifest.get("current_stage") != "82.3":
        fail("current_stage must be 82.3")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "82.2":
        fail("last_confirmed_stage must be 82.2")
    if checkpoint.get("last_confirmed_head") != "e7ace74":
        fail("last_confirmed_head must be e7ace74")
    if checkpoint.get("last_confirmed_tag") != "v0.1.0-stage82-2-lesson-blocks-schema-foundation":
        fail("last_confirmed_tag mismatch")
    if checkpoint.get("last_migration") != "6422_lesson_blocks_schema":
        fail("checkpoint last_migration mismatch")
    if checkpoint.get("status") != "lesson_blocks_schema_foundation_deployed":
        fail("checkpoint status mismatch")
    if checkpoint.get("decision") != "continue_with_lesson_blocks_backend_api":
        fail("checkpoint decision mismatch")
    if checkpoint.get("cleanup_performed") is not False:
        fail("checkpoint cleanup_performed must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14", "81.15", "82.1", "82.2", "82.3"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage22 = stages["82.2"]
    if stage22.get("migration") != "6422_lesson_blocks_schema":
        fail("stage 82.2 migration record mismatch")
    if stage22.get("database_migration_required") is not True:
        fail("stage 82.2 database_migration_required must remain true")
    if stage22.get("raw_contacts_committed") is not False:
        fail("stage 82.2 raw_contacts_committed must be false")
    if stage22.get("password_committed") is not False:
        fail("stage 82.2 password_committed must be false")

    stage = stages["82.3"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.3 status mismatch")
    if stage.get("branch") != "stage82-3-lesson-blocks-api":
        fail("stage 82.3 branch mismatch")
    if stage.get("deployment_type") != "backend-api":
        fail("stage 82.3 deployment_type mismatch")
    if stage.get("decision") != "implement_admin_lesson_blocks_api":
        fail("stage 82.3 decision mismatch")
    if stage.get("next_stage") != "82.4":
        fail("stage 82.3 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": False,
        "backend_runtime_changed": True,
        "database_migration_run": False,
        "database_migration_required": False,
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
            fail(f"stage 82.3 {key} must be {expected}")

    expected_endpoints = [
        "GET /admin/course-lessons/{lesson_id}/blocks",
        "POST /admin/course-lessons/{lesson_id}/blocks",
        "PATCH /admin/lesson-blocks/{block_id}",
        "DELETE /admin/lesson-blocks/{block_id}",
        "POST /admin/course-lessons/{lesson_id}/blocks/reorder",
    ]
    if stage.get("endpoints") != expected_endpoints:
        fail("stage 82.3 endpoints mismatch")

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
