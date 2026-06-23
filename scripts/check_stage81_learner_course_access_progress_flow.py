from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-learner-course-access-progress-flow.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.7 learner course access progress guard failed: {message}")

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
    "Stage 81.7 - Learner course access and progress flow completed",
    "stage81_7_status=production_completed",
    "stage81_7_runtime_frontend_hotfix_deployed=yes",
    "stage81_7_backend_runtime_changes=no",
    "stage81_7_database_migration_run=no",
    "stage81_7_production_data_changed=yes",
    "stage81_7_learner_login_verified=yes",
    "stage81_7_account_ui_verified=yes",
    "stage81_7_course_start_verified=yes",
    "stage81_7_course_outline_verified=yes",
    "stage81_7_lesson_completion_verified=yes",
    "stage81_7_progress_100_verified=yes",
    "stage81_7_document_records_created=no",
    "stage81_7_course_completion_deferred=yes",
    "stage81_7_next_stage=81.8",
    "commit `3999e6b`",
    "fix: define account count helper",
    "stage12-smoke-learner@obrportal.local",
    "testov-programma",
    "Основной модуль",
    "Знакомство с порталом",
    "lesson_progress = 1",
    "document_records = 0",
    "722a300b-3923-4d22-b7dc-1dec3a80c69a",
]:
    require(stage_doc, marker, "stage81.7 doc")

if manifest.get("current_stage") != "81.7":
    fail("current_stage must be 81.7")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.7":
    fail("production checkpoint must be Stage 81.7")
if checkpoint.get("last_confirmed_head") != "3999e6b":
    fail("production checkpoint head must be 3999e6b")
if checkpoint.get("status") != "learner_course_access_progress_completed":
    fail("production checkpoint status must be learner_course_access_progress_completed")
if checkpoint.get("database_migration_run") is not False:
    fail("database_migration_run must be false")
if checkpoint.get("backend_runtime_changed") is not False:
    fail("backend_runtime_changed must be false")
if checkpoint.get("frontend_runtime_changed") is not True:
    fail("frontend_runtime_changed must be true")
if checkpoint.get("production_data_changed") is not True:
    fail("production_data_changed must be true")

routes = checkpoint.get("public_routes_http") or {}
for route in ["/", "/login", "/account", "/catalog", "/courses/testov-programma"]:
    if routes.get(route) != 200:
        fail(f"public route {route} must be 200 in checkpoint")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage817 = stages["81.7"]
if stage817.get("status") != "production_completed":
    fail("stage 81.7 status must be production_completed")
if stage817.get("branch") != "stage81-7-finalize-learner-course-access-progress-flow":
    fail("stage 81.7 branch mismatch")
if stage817.get("deployment_type") != "learner-course-access-progress-with-frontend-hotfix":
    fail("stage 81.7 deployment_type mismatch")
if stage817.get("frontend_runtime_changed") is not True:
    fail("stage 81.7 frontend_runtime_changed must be true")
if stage817.get("backend_runtime_changed") is not False:
    fail("stage 81.7 backend_runtime_changed must be false")
if stage817.get("database_migration_run") is not False:
    fail("stage 81.7 database_migration_run must be false")
if stage817.get("production_data_changed") is not True:
    fail("stage 81.7 production_data_changed must be true")
if stage817.get("course_completion_deferred") is not True:
    fail("stage 81.7 course_completion_deferred must be true")
if stage817.get("document_generation_deferred") is not True:
    fail("stage 81.7 document_generation_deferred must be true")

final_counts = stage817.get("final_counts") or {}
expected_counts = {
    "courses": 2,
    "course_modules": 1,
    "course_lessons": 1,
    "organizations": 1,
    "learning_groups": 0,
    "enrollments": 1,
    "lesson_progress": 1,
    "document_records": 0,
}
for key, value in expected_counts.items():
    if final_counts.get(key) != value:
        fail(f"final_counts.{key} must be {value}")

target_enrollment = stage817.get("target_enrollment") or {}
if target_enrollment.get("status") != "active":
    fail("target enrollment status must be active")
if target_enrollment.get("completed_at") is not None:
    fail("target enrollment completed_at must stay null")

target_progress = stage817.get("target_lesson_progress") or {}
if target_progress.get("status") != "completed":
    fail("target lesson progress status must be completed")

required_checks = {
    r"python .\scripts\check_release_manifest.py",
    r"python .\scripts\check_stage81_learner_course_access_progress_flow.py",
    r"python .\scripts\check_source_bom.py",
    r"python .\scripts\check_text_encoding.py",
    r"python .\scripts\check_no_todo_markers.py",
    r"python .\scripts\frontend_guard.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage817.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.7 missing required checks: {sorted(missing_checks)}")

print("stage 81.7 learner course access progress guard passed")
