from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-real-batch-001-preflight-runbook.md"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.14 preflight runbook guard failed: {message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

if EMAIL_RE.search(stage_doc):
    fail("stage doc contains raw email-like value")
if PHONE_RE.search(stage_doc):
    fail("stage doc contains raw phone-like value")

for marker in [
    "Stage 81.14 - real-batch-001 production preflight runbook",
    "stage81_14_status=real_batch_001_preflight_runbook_completed",
    "stage81_14_server_touched=no",
    "stage81_14_data_changed=no",
    "stage81_14_runtime_rebuild=no",
    "stage81_14_runtime_restart=no",
    "stage81_14_database_migration_run=no",
    "stage81_14_cleanup_performed=no",
    "stage81_14_batch_id=real-batch-001",
    "stage81_14_decision=prepare_preflight_backup_duplicate_check_runbook",
    "stage81_14_next_stage=81.15",
    "CURATOR_EMAIL",
    "LEARNER_EMAIL",
    "pg_dump",
    "duplicate-check SQL block",
    "UI entry order for Stage 81.15",
    "Rollback decision points",
    "znakomstvo-s-obrazovatelnym-portalom",
    "REAL-BATCH-001",
    "admin_ui_first",
    "direct_sql_mutation_planned: `no`",
]:
    require(stage_doc, marker, "stage81.14 doc")

if manifest.get("current_stage") != "81.14":
    fail("current_stage must be 81.14")

checkpoint = manifest.get("production_checkpoint") or {}
expected_checkpoint = {
    "last_confirmed_stage": "81.14",
    "last_confirmed_head": "6f82e93",
    "status": "real_batch_001_preflight_runbook_completed",
    "decision": "prepare_preflight_backup_duplicate_check_runbook",
}
for key, expected in expected_checkpoint.items():
    if checkpoint.get(key) != expected:
        fail(f"checkpoint {key} mismatch")
for key in ["production_data_changed", "backend_runtime_changed", "frontend_runtime_changed", "database_migration_run", "cleanup_performed"]:
    if checkpoint.get(key) is not False:
        fail(f"checkpoint {key} must be false")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["81.14"]
if stage.get("status") != "real_batch_001_preflight_runbook_completed":
    fail("stage 81.14 status mismatch")
if stage.get("branch") != "stage81-14-real-batch-001-preflight-runbook":
    fail("stage 81.14 branch mismatch")
if stage.get("deployment_type") != "docs-preflight-runbook-only":
    fail("stage 81.14 deployment_type mismatch")
if stage.get("decision") != "prepare_preflight_backup_duplicate_check_runbook":
    fail("stage 81.14 decision mismatch")
if stage.get("server_touched") is not False:
    fail("stage 81.14 server_touched must be false")
if stage.get("production_data_changed") is not False:
    fail("stage 81.14 production_data_changed must be false")
if stage.get("sensitive_values_policy") != "runtime_variables_only_no_raw_contacts":
    fail("stage 81.14 sensitive_values_policy mismatch")

required_checks = {
    r"python .\scripts\check_release_manifest.py",
    r"python .\scripts\check_stage81_real_batch_001_preflight_runbook.py",
    r"python .\scripts\check_source_bom.py",
    r"python .\scripts\check_text_encoding.py",
    r"python .\scripts\check_no_todo_markers.py",
    r"python .\scripts\frontend_guard.py",
    "git diff --check",
}
missing = required_checks - set(stage.get("required_checks", []))
if missing:
    fail(f"stage 81.14 missing required checks: {sorted(missing)}")

print("stage 81.14 preflight runbook guard passed")
