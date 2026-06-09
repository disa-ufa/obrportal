from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"

FORBIDDEN_RAW_VALUES = [
    "denisyxxx@mail.ru",
    "denisyxxx@gmail.com",
    "89871410776",
    "password=",
    "пароль=",
    "PASSWORD=",
    "Password=",
]

def fail(message: str) -> None:
    raise SystemExit(f"release manifest guard failed: {message}")

def main() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    text = MANIFEST.read_text(encoding="utf-8")
    for forbidden in FORBIDDEN_RAW_VALUES:
        if forbidden in text:
            fail(f"manifest contains forbidden raw value: {forbidden}")

    manifest = json.loads(text)

    if manifest.get("schema_version") != 1:
        fail("schema_version must be 1")
    if manifest.get("project") != "ObrPortal":
        fail("project must be ObrPortal")
    if manifest.get("process") != "development-process-v2":
        fail("process must be development-process-v2")
    if manifest.get("current_stage") != "81.13":
        fail("current_stage must be 81.13")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.13":
        fail("last_confirmed_stage must be 81.13")
    if checkpoint.get("last_confirmed_head") != "e17668a":
        fail("last_confirmed_head must be e17668a")
    if checkpoint.get("status") != "real_batch_001_filled_sanitized_completed":
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
    if checkpoint.get("decision") != "commit_sanitized_batch_card_only":
        fail("checkpoint decision mismatch")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage8113 = stages["81.13"]
    if stage8113.get("status") != "real_batch_001_filled_sanitized_completed":
        fail("stage 81.13 status mismatch")
    if stage8113.get("branch") != "stage81-13-fill-first-real-content-batch":
        fail("stage 81.13 branch mismatch")
    if stage8113.get("deployment_type") != "docs-sanitized-batch-card-only":
        fail("stage 81.13 deployment_type mismatch")
    if stage8113.get("decision") != "commit_sanitized_batch_card_only":
        fail("stage 81.13 decision mismatch")
    if stage8113.get("first_batch_id") != "real-batch-001":
        fail("stage 81.13 first_batch_id mismatch")
    if stage8113.get("server_touched") is not False:
        fail("stage 81.13 server_touched must be false")
    if stage8113.get("production_data_changed") is not False:
        fail("stage 81.13 production_data_changed must be false")
    if stage8113.get("raw_contacts_committed") is not False:
        fail("raw_contacts_committed must be false")
    if stage8113.get("password_committed") is not False:
        fail("password_committed must be false")

    required_checks = {
        r"python .\scripts\check_release_manifest.py",
        r"python .\scripts\check_stage81_real_batch_001_filled.py",
        r"python .\scripts\check_source_bom.py",
        r"python .\scripts\check_text_encoding.py",
        r"python .\scripts\check_no_todo_markers.py",
        r"python .\scripts\frontend_guard.py",
        "git diff --check",
    }
    missing_checks = required_checks - set(stage8113.get("required_checks", []))
    if missing_checks:
        fail(f"stage 81.13 missing required checks: {sorted(missing_checks)}")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
