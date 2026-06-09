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
    if manifest.get("current_stage") != "81.12":
        fail("current_stage must be 81.12")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.12":
        fail("last_confirmed_stage must be 81.12")
    if checkpoint.get("last_confirmed_head") != "5a5cf0b":
        fail("last_confirmed_head must be 5a5cf0b")
    if checkpoint.get("status") != "first_real_content_batch_template_completed":
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
    if checkpoint.get("decision") != "prepare_fillable_template_before_production_data_entry":
        fail("checkpoint decision mismatch")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage8112 = stages["81.12"]
    if stage8112.get("status") != "first_real_content_batch_template_completed":
        fail("stage 81.12 status mismatch")
    if stage8112.get("branch") != "stage81-12-first-real-content-batch-template":
        fail("stage 81.12 branch mismatch")
    if stage8112.get("deployment_type") != "docs-batch-template-only":
        fail("stage 81.12 deployment_type mismatch")
    if stage8112.get("decision") != "prepare_fillable_template_before_production_data_entry":
        fail("stage 81.12 decision mismatch")
    if stage8112.get("first_batch_id") != "real-batch-001":
        fail("stage 81.12 first_batch_id mismatch")
    if stage8112.get("server_touched") is not False:
        fail("stage 81.12 server_touched must be false")
    if stage8112.get("backend_runtime_changed") is not False:
        fail("stage 81.12 backend_runtime_changed must be false")
    if stage8112.get("frontend_runtime_changed") is not False:
        fail("stage 81.12 frontend_runtime_changed must be false")
    if stage8112.get("database_migration_run") is not False:
        fail("stage 81.12 database_migration_run must be false")
    if stage8112.get("production_data_changed") is not False:
        fail("stage 81.12 production_data_changed must be false")

    required_checks = {
        r"python .\scripts\check_release_manifest.py",
        r"python .\scripts\check_stage81_first_real_content_batch_template.py",
        r"python .\scripts\check_source_bom.py",
        r"python .\scripts\check_text_encoding.py",
        r"python .\scripts\check_no_todo_markers.py",
        r"python .\scripts\frontend_guard.py",
        "git diff --check",
    }
    missing_checks = required_checks - set(stage8112.get("required_checks", []))
    if missing_checks:
        fail(f"stage 81.12 missing required checks: {sorted(missing_checks)}")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
