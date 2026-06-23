from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-production-content-preparation-plan.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.11 production content preparation guard failed: {message}")

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
    "Stage 81.11 - Production content preparation plan",
    "stage81_11_status=production_content_preparation_plan_completed",
    "stage81_11_server_touched=no",
    "stage81_11_data_changed=no",
    "stage81_11_runtime_rebuild=no",
    "stage81_11_runtime_restart=no",
    "stage81_11_database_migration_run=no",
    "stage81_11_cleanup_performed=no",
    "stage81_11_decision=prepare_real_content_without_touching_smoke_dataset",
    "stage81_11_next_stage=81.12",
    "Organizations",
    "Users",
    "Courses",
    "Course modules",
    "Course lessons",
    "Learning groups",
    "Enrollments",
    "Documents",
    "Minimal first real content batch",
    "Data collection checklist",
    "Deferred cleanup",
    "testov-programma",
    "test-prog",
    "AUTO-4AAA9C328B7C476D",
    "DOCV-36F38F4FABBB45A38EE0E918",
]:
    require(stage_doc, marker, "stage81.11 doc")

if manifest.get("current_stage") != "81.11":
    fail("current_stage must be 81.11")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.11":
    fail("production checkpoint must be Stage 81.11")
if checkpoint.get("last_confirmed_head") != "276e3e5":
    fail("production checkpoint head must be 276e3e5")
if checkpoint.get("status") != "production_content_preparation_plan_completed":
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
if checkpoint.get("decision") != "prepare_real_content_without_touching_smoke_dataset":
    fail("decision mismatch")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage8111 = stages["81.11"]
if stage8111.get("status") != "production_content_preparation_plan_completed":
    fail("stage 81.11 status mismatch")
if stage8111.get("branch") != "stage81-11-production-content-preparation-plan":
    fail("stage 81.11 branch mismatch")
if stage8111.get("deployment_type") != "docs-content-plan-only":
    fail("stage 81.11 deployment_type mismatch")
if stage8111.get("decision") != "prepare_real_content_without_touching_smoke_dataset":
    fail("stage 81.11 decision mismatch")
if stage8111.get("server_touched") is not False:
    fail("stage 81.11 server_touched must be false")
if stage8111.get("backend_runtime_changed") is not False:
    fail("stage 81.11 backend_runtime_changed must be false")
if stage8111.get("frontend_runtime_changed") is not False:
    fail("stage 81.11 frontend_runtime_changed must be false")
if stage8111.get("database_migration_run") is not False:
    fail("stage 81.11 database_migration_run must be false")
if stage8111.get("production_data_changed") is not False:
    fail("stage 81.11 production_data_changed must be false")

required_groups = {"organizations", "users", "courses", "modules", "lessons", "groups", "enrollments", "documents"}
if required_groups - set(stage8111.get("content_object_groups", [])):
    fail("content_object_groups must include all required groups")

required_checks = {
    r"python .\scripts\check_release_manifest.py",
    r"python .\scripts\check_stage81_production_content_preparation_plan.py",
    r"python .\scripts\check_source_bom.py",
    r"python .\scripts\check_text_encoding.py",
    r"python .\scripts\check_no_todo_markers.py",
    r"python .\scripts\frontend_guard.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage8111.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.11 missing required checks: {sorted(missing_checks)}")

print("stage 81.11 production content preparation guard passed")
