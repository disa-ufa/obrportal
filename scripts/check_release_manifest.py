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
    if manifest.get("current_stage") != "81.7":
        fail("current_stage must be 81.7")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.7":
        fail("last_confirmed_stage must be 81.7")
    if checkpoint.get("last_confirmed_head") != "3999e6b":
        fail("last_confirmed_head must be 3999e6b")
    if checkpoint.get("status") != "learner_course_access_progress_completed":
        fail("checkpoint status must be learner_course_access_progress_completed")
    if checkpoint.get("frontend_runtime_changed") is not True:
        fail("checkpoint frontend_runtime_changed must be true")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")
    if checkpoint.get("production_data_changed") is not True:
        fail("checkpoint production_data_changed must be true")

    routes = checkpoint.get("public_routes_http") or {}
    for route in ["/", "/login", "/account", "/catalog", "/courses/testov-programma"]:
        if routes.get(route) != 200:
            fail(f"checkpoint public route {route} must be 200")

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
            fail(f"stage 81.7 final_counts.{key} must be {value}")

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

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
