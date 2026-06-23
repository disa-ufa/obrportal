from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-production-inventory-next-block-plan.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.10 production inventory guard failed: {message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

for marker in [
    "Stage 81.10 - Production inventory and next block plan",
    "stage81_10_status=production_inventory_completed",
    "stage81_10_backup_created=yes",
    "stage81_10_data_changed=no",
    "stage81_10_migrations_run=no",
    "stage81_10_containers_restarted=no",
    "stage81_10_cleanup_performed=no",
    "stage81_10_decision=keep_demo_smoke_dataset",
    "stage81_10_next_stage=81.11",
    "stage12-smoke-learner@obrportal.local",
    "testov-programma",
    "test-prog",
    "AUTO-4AAA9C328B7C476D",
    "DOCV-36F38F4FABBB45A38EE0E918",
    "admin_regenerate",
    "auto_completion",
    "Blocked invalid admin seed attempt",
]:
    require(stage_doc, marker, "stage81.10 doc")

if manifest.get("current_stage") != "81.10":
    fail("current_stage must be 81.10")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.10":
    fail("production checkpoint must be Stage 81.10")
if checkpoint.get("last_confirmed_head") != "956c680":
    fail("production checkpoint head must be 956c680")
if checkpoint.get("status") != "production_inventory_completed":
    fail("production checkpoint status mismatch")
if checkpoint.get("backend_runtime_changed") is not False:
    fail("backend_runtime_changed must be false")
if checkpoint.get("frontend_runtime_changed") is not False:
    fail("frontend_runtime_changed must be false")
if checkpoint.get("database_migration_run") is not False:
    fail("database_migration_run must be false")
if checkpoint.get("production_data_changed") is not False:
    fail("production_data_changed must be false")
if checkpoint.get("cleanup_performed") is not False:
    fail("cleanup_performed must be false")
if checkpoint.get("decision") != "keep_demo_smoke_dataset":
    fail("decision must be keep_demo_smoke_dataset")

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

counts = stage8110.get("inventory_counts") or {}
expected_counts = {
    "users": 3,
    "roles": 9,
    "permissions": 43,
    "user_roles": 2,
    "organizations": 1,
    "courses": 2,
    "course_modules": 1,
    "course_lessons": 1,
    "learning_groups": 0,
    "enrollments": 1,
    "lesson_progress": 1,
    "document_records": 1,
    "document_generation_events": 2,
    "audit_events": 93,
}
for key, value in expected_counts.items():
    if counts.get(key) != value:
        fail(f"inventory_counts.{key} must be {value}")

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

print("stage 81.10 production inventory guard passed")
