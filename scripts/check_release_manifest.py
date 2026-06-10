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
    if manifest.get("current_stage") != "81.15":
        fail("current_stage must be 81.15")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.15":
        fail("last_confirmed_stage must be 81.15")
    if checkpoint.get("last_confirmed_head") != "ae00b75":
        fail("last_confirmed_head must be ae00b75")
    if checkpoint.get("status") != "real_batch_001_production_result_completed":
        fail("checkpoint status mismatch")
    if checkpoint.get("decision") != "real_batch_001_e2e_completed_publish_document_verified":
        fail("checkpoint decision mismatch")

    expected_booleans = {
        "production_data_changed": True,
        "backend_runtime_changed": False,
        "frontend_runtime_changed": False,
        "database_migration_run": False,
        "cleanup_performed": False,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if checkpoint.get(key) is not expected:
            fail(f"checkpoint {key} must be {expected}")

    document_result = checkpoint.get("document_result") or {}
    expected_document = {
        "document_number": "AUTO-F161AA1FB1C2400B",
        "verification_code": "DOCV-6DC5C651C5ED4B28957B1ECE",
        "status": "available",
        "document_type": "Сертификат",
        "has_pdf": True,
        "generation_source": "auto_completion",
        "generation_template_version": "completion_pdf_v1",
    }
    for key, expected in expected_document.items():
        if document_result.get(key) != expected:
            fail(f"document_result {key} mismatch")

    enrollment_result = checkpoint.get("enrollment_result") or {}
    if enrollment_result.get("course_slug") != "znakomstvo-s-obrazovatelnym-portalom":
        fail("enrollment_result course_slug mismatch")
    if enrollment_result.get("status") != "completed":
        fail("enrollment_result status mismatch")
    if enrollment_result.get("progress_rows") != 1:
        fail("enrollment_result progress_rows mismatch")
    if enrollment_result.get("completed_lessons") != 1:
        fail("enrollment_result completed_lessons mismatch")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14", "81.15"]:
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

    stage15 = stages["81.15"]
    if stage15.get("status") != "production_completed":
        fail("stage 81.15 status mismatch")
    if stage15.get("branch") != "stage81-15-real-batch-001-production-result":
        fail("stage 81.15 branch mismatch")
    if stage15.get("deployment_type") != "manual-production-content-fill-e2e-result-docs":
        fail("stage 81.15 deployment_type mismatch")
    if stage15.get("server_touched") is not True:
        fail("stage 81.15 server_touched must be true")
    if stage15.get("production_data_changed") is not True:
        fail("stage 81.15 production_data_changed must be true")
    for key in ["frontend_runtime_changed", "backend_runtime_changed", "database_migration_run", "runtime_rebuild", "runtime_restart", "cleanup_performed", "raw_contacts_committed", "password_committed"]:
        if stage15.get(key) is not False:
            fail(f"stage 81.15 {key} must be false")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
