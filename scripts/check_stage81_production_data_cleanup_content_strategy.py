from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-production-data-cleanup-content-strategy.md"
RUNBOOK = ROOT / "docs" / "production-cleanup-content-strategy-runbook.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.4 production data cleanup content strategy guard failed: {message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
runbook = read(RUNBOOK)

for marker in [
    "Stage 81.4 - Production data cleanup decision and content strategy",
    "stage81_4_production_data_cleanup_content_strategy_status=implementation_ready",
    "stage81_4_release_manifest_required=yes",
    "stage81_4_guard_required=yes",
    "stage81_4_runtime_changes=no",
    "stage81_4_frontend_runtime_changes=no",
    "stage81_4_backend_runtime_changes=no",
    "stage81_4_database_changes=no",
    "stage81_4_migrations_added=no",
    "stage81_4_production_deploy_required=no",
    "stage81_4_production_data_changed=no",
    "stage81_4_manual_cleanup_allowed=no",
    "stage81_4_additive_content_strategy_required=yes",
    "stage81_4_next_stage=81.5",
    "do not delete this record manually",
    "defer cleanup to a separate backup-backed cleanup stage",
    "Production content initialization must be additive-only.",
    "Stage 81.5 should decide the first production content source",
]:
    require(stage_doc, marker, "stage81.4 doc")

for marker in [
    "Production Cleanup and Content Strategy Runbook",
    "production_cleanup_content_strategy_runbook=ready",
    "manual_cleanup_allowed=no",
    "production_data_changed=no",
    "additive_content_strategy=yes",
    "cleanup_deferred_to_dedicated_stage=yes",
    "stage81_4_next_stage=81.5",
    "Cleanup requires a separate stage",
    "Production content must be initialized additively.",
    "Do not use on production:",
    "docker compose down -v",
    "TRUNCATE",
    "DROP SCHEMA",
]:
    require(runbook, marker, "strategy runbook")

if manifest.get("current_stage") != "81.4":
    fail("current_stage must be 81.4")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "80.4":
    fail("production checkpoint must remain Stage 80.4 runtime")
if checkpoint.get("last_confirmed_head") != "be38083":
    fail("production checkpoint head must remain be38083")
if checkpoint.get("recovery_status") != "production_recovered_and_deployed":
    fail("production checkpoint recovery status must remain production_recovered_and_deployed")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage814 = stages["81.4"]
if stage814.get("status") != "implementation_ready":
    fail("stage 81.4 status must be implementation_ready")
if stage814.get("deployment_type") != "docs-and-guard-only":
    fail("stage 81.4 deployment_type must be docs-and-guard-only")
if stage814.get("frontend_runtime_changed_expected") is not False:
    fail("stage 81.4 frontend_runtime_changed_expected must be false")
if stage814.get("backend_runtime_changed_expected") is not False:
    fail("stage 81.4 backend_runtime_changed_expected must be false")
if stage814.get("database_migration_expected") is not False:
    fail("stage 81.4 database_migration_expected must be false")
if stage814.get("production_deploy_required") is not False:
    fail("stage 81.4 production_deploy_required must be false")
if stage814.get("production_data_changed") is not False:
    fail("stage 81.4 production_data_changed must be false")
if stage814.get("manual_cleanup_allowed") is not False:
    fail("stage 81.4 manual_cleanup_allowed must be false")

required_checks = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage81_production_data_cleanup_content_strategy.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\frontend_guard.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage814.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.4 missing required checks: {sorted(missing_checks)}")

print("stage 81.4 production data cleanup content strategy guard passed")
