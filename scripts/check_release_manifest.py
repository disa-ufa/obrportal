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
    if manifest.get("current_stage") != "81.14":
        fail("current_stage must be 81.14")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.14":
        fail("last_confirmed_stage must be 81.14")
    if checkpoint.get("last_confirmed_head") != "6f82e93":
        fail("last_confirmed_head must be 6f82e93")
    if checkpoint.get("status") != "real_batch_001_preflight_runbook_completed":
        fail("checkpoint status mismatch")
    if checkpoint.get("decision") != "prepare_preflight_backup_duplicate_check_runbook":
        fail("checkpoint decision mismatch")
    for key in ["production_data_changed", "backend_runtime_changed", "frontend_runtime_changed", "database_migration_run", "cleanup_performed"]:
        if checkpoint.get(key) is not False:
            fail(f"checkpoint {key} must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage13 = stages["81.13"]
    if stage13.get("raw_contacts_committed") is not False:
        fail("stage 81.13 raw_contacts_committed must be false")
    if stage13.get("password_committed") is not False:
        fail("stage 81.13 password_committed must be false")

    stage14 = stages["81.14"]
    if stage14.get("status") != "real_batch_001_preflight_runbook_completed":
        fail("stage 81.14 status mismatch")
    if stage14.get("branch") != "stage81-14-real-batch-001-preflight-runbook":
        fail("stage 81.14 branch mismatch")
    if stage14.get("deployment_type") != "docs-preflight-runbook-only":
        fail("stage 81.14 deployment_type mismatch")
    if stage14.get("decision") != "prepare_preflight_backup_duplicate_check_runbook":
        fail("stage 81.14 decision mismatch")
    if stage14.get("server_touched") is not False:
        fail("stage 81.14 server_touched must be false")
    if stage14.get("production_data_changed") is not False:
        fail("stage 81.14 production_data_changed must be false")
    if stage14.get("sensitive_values_policy") != "runtime_variables_only_no_raw_contacts":
        fail("stage 81.14 sensitive_values_policy mismatch")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
