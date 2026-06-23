from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-first-real-content-batch-template.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.12 first real content batch template guard failed: {message}")

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
    "Stage 81.12 - First real content batch template",
    "stage81_12_status=first_real_content_batch_template_completed",
    "stage81_12_server_touched=no",
    "stage81_12_data_changed=no",
    "stage81_12_runtime_rebuild=no",
    "stage81_12_runtime_restart=no",
    "stage81_12_database_migration_run=no",
    "stage81_12_cleanup_performed=no",
    "stage81_12_decision=prepare_fillable_template_before_production_data_entry",
    "stage81_12_first_batch_id=real-batch-001",
    "stage81_12_next_stage=81.13",
    "Organization card",
    "Administrator or curator user card",
    "Learner user card",
    "Course card",
    "Module card",
    "Lesson card 1",
    "Learning group card",
    "Enrollment card",
    "Document policy card",
    "Entry order for Stage 81.13",
    "Acceptance checklist before real entry",
    "testov-programma",
    "AUTO-4AAA9C328B7C476D",
    "DOCV-36F38F4FABBB45A38EE0E918",
]:
    require(stage_doc, marker, "stage81.12 doc")

if manifest.get("current_stage") != "81.12":
    fail("current_stage must be 81.12")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.12":
    fail("production checkpoint must be Stage 81.12")
if checkpoint.get("last_confirmed_head") != "5a5cf0b":
    fail("production checkpoint head must be 5a5cf0b")
if checkpoint.get("status") != "first_real_content_batch_template_completed":
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
if checkpoint.get("decision") != "prepare_fillable_template_before_production_data_entry":
    fail("decision mismatch")

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

required_cards = {"organization", "curator_user", "learner_user", "course", "module", "lesson", "group", "enrollment", "document_policy"}
if required_cards - set(stage8112.get("batch_cards", [])):
    fail("batch_cards must include all required cards")

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

print("stage 81.12 first real content batch template guard passed")
