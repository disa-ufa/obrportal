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
    if manifest.get("current_stage") != "81.10":
        fail("current_stage must be 81.10")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.10":
        fail("last_confirmed_stage must be 81.10")
    if checkpoint.get("last_confirmed_head") != "956c680":
        fail("last_confirmed_head must be 956c680")
    if checkpoint.get("status") != "production_inventory_completed":
        fail("checkpoint status mismatch")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")
    if checkpoint.get("production_data_changed") is not False:
        fail("checkpoint production_data_changed must be false")
    if checkpoint.get("cleanup_performed") is not False:
        fail("checkpoint cleanup_performed must be false")
    if checkpoint.get("decision") != "keep_demo_smoke_dataset":
        fail("checkpoint decision must be keep_demo_smoke_dataset")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage8110 = stages["81.10"]
    if stage8110.get("status") != "production_inventory_completed":
        fail("stage 81.10 status must be production_inventory_completed")
    if stage8110.get("branch") != "stage81-10-production-inventory-next-block-plan":
        fail("stage 81.10 branch mismatch")
    if stage8110.get("deployment_type") != "docs-inventory-only":
        fail("stage 81.10 deployment_type mismatch")
    if stage8110.get("decision") != "keep_demo_smoke_dataset":
        fail("stage 81.10 decision mismatch")
    if stage8110.get("cleanup_performed") is not False:
        fail("stage 81.10 cleanup_performed must be false")
    if stage8110.get("backend_runtime_changed") is not False:
        fail("stage 81.10 backend_runtime_changed must be false")
    if stage8110.get("frontend_runtime_changed") is not False:
        fail("stage 81.10 frontend_runtime_changed must be false")
    if stage8110.get("database_migration_run") is not False:
        fail("stage 81.10 database_migration_run must be false")
    if stage8110.get("production_data_changed") is not False:
        fail("stage 81.10 production_data_changed must be false")

    required_checks = {
        r"python .\scripts\check_release_manifest.py",
        r"python .\scripts\check_stage81_production_inventory_next_block_plan.py",
        r"python .\scripts\check_source_bom.py",
        r"python .\scripts\check_text_encoding.py",
        r"python .\scripts\check_no_todo_markers.py",
        r"python .\scripts\frontend_guard.py",
        "git diff --check",
    }
    missing_checks = required_checks - set(stage8110.get("required_checks", []))
    if missing_checks:
        fail(f"stage 81.10 missing required checks: {sorted(missing_checks)}")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
