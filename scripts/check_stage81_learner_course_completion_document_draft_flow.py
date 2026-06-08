from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-learner-course-completion-document-draft-flow.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.8 learner completion document draft guard failed: {message}")

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
    "Stage 81.8 - Learner course completion and document draft flow completed",
    "stage81_8_status=production_completed",
    "stage81_8_backend_runtime_changed=no",
    "stage81_8_frontend_runtime_changed=no",
    "stage81_8_database_migration_run=no",
    "stage81_8_production_data_changed=yes",
    "stage81_8_course_completion_verified=yes",
    "stage81_8_auto_document_draft_created=yes",
    "stage81_8_document_generation_event_created=yes",
    "stage81_8_document_status=draft",
    "stage81_8_document_publication_deferred=yes",
    "stage81_8_next_stage=81.9",
    "stage81_8_retry_course_completion_required=yes",
    "stage12-smoke-learner@obrportal.local",
    "testov-programma",
    "AUTO-4AAA9C328B7C476D",
    "DOCV-36F38F4FABBB45A38EE0E918",
    "85025ef8-2f44-40a9-8e9c-fb96899d6c72",
    "387543fa-81f0-4110-9047-f314b10a8204",
    "auto_completion",
    "completion_pdf_v1",
    "awaiting publication",
]:
    require(stage_doc, marker, "stage81.8 doc")

if manifest.get("current_stage") != "81.8":
    fail("current_stage must be 81.8")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.8":
    fail("production checkpoint must be Stage 81.8")
if checkpoint.get("last_confirmed_head") != "3cc71bc":
    fail("production checkpoint head must be 3cc71bc")
if checkpoint.get("status") != "learner_course_completion_document_draft_completed":
    fail("production checkpoint status mismatch")
if checkpoint.get("database_migration_run") is not False:
    fail("database_migration_run must be false")
if checkpoint.get("backend_runtime_changed") is not False:
    fail("backend_runtime_changed must be false")
if checkpoint.get("frontend_runtime_changed") is not False:
    fail("frontend_runtime_changed must be false")
if checkpoint.get("production_data_changed") is not True:
    fail("production_data_changed must be true")

routes = checkpoint.get("public_routes_http") or {}
for route in ["/", "/login", "/account", "/catalog", "/courses/testov-programma"]:
    if routes.get(route) != 200:
        fail(f"public route {route} must be 200 in checkpoint")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage818 = stages["81.8"]
if stage818.get("status") != "production_completed":
    fail("stage 81.8 status must be production_completed")
if stage818.get("branch") != "stage81-8-learner-course-completion-document-draft-flow":
    fail("stage 81.8 branch mismatch")
if stage818.get("deployment_type") != "learner-course-completion-document-draft":
    fail("stage 81.8 deployment_type mismatch")
if stage818.get("frontend_runtime_changed") is not False:
    fail("stage 81.8 frontend_runtime_changed must be false")
if stage818.get("backend_runtime_changed") is not False:
    fail("stage 81.8 backend_runtime_changed must be false")
if stage818.get("database_migration_run") is not False:
    fail("stage 81.8 database_migration_run must be false")
if stage818.get("production_data_changed") is not True:
    fail("stage 81.8 production_data_changed must be true")
if stage818.get("document_publication_deferred") is not True:
    fail("stage 81.8 document_publication_deferred must be true")

final_counts = stage818.get("final_counts") or {}
expected_counts = {
    "courses": 2,
    "course_modules": 1,
    "course_lessons": 1,
    "organizations": 1,
    "learning_groups": 0,
    "enrollments": 1,
    "lesson_progress": 1,
    "document_records": 1,
    "document_generation_events": 1,
}
for key, value in expected_counts.items():
    if final_counts.get(key) != value:
        fail(f"final_counts.{key} must be {value}")

target_enrollment = stage818.get("target_enrollment") or {}
if target_enrollment.get("status") != "completed":
    fail("target enrollment status must be completed")
if not target_enrollment.get("completed_at"):
    fail("target enrollment completed_at must be set")

target_document = stage818.get("target_document") or {}
if target_document.get("status") != "draft":
    fail("target document status must be draft")
if target_document.get("generation_source") != "auto_completion":
    fail("target document generation_source must be auto_completion")
if target_document.get("generation_template_version") != "completion_pdf_v1":
    fail("target document template version must be completion_pdf_v1")

event = stage818.get("target_document_generation_event") or {}
if event.get("source") != "auto_completion":
    fail("generation event source must be auto_completion")

required_checks = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage81_learner_course_completion_document_draft_flow.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\frontend_guard.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage818.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.8 missing required checks: {sorted(missing_checks)}")

print("stage 81.8 learner completion document draft guard passed")
