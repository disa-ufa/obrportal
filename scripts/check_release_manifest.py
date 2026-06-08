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
    if manifest.get("current_stage") != "81.6":
        fail("current_stage must be 81.6")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.6":
        fail("last_confirmed_stage must be 81.6")
    if checkpoint.get("last_confirmed_head") != "9544704":
        fail("last_confirmed_head must be 9544704")
    if checkpoint.get("status") != "manual_production_content_fill_completed":
        fail("checkpoint status must be manual_production_content_fill_completed")
    if checkpoint.get("frontend_runtime_changed") is not True:
        fail("checkpoint frontend_runtime_changed must be true")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("checkpoint backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")
    if checkpoint.get("production_data_changed") is not True:
        fail("checkpoint production_data_changed must be true")

    routes = checkpoint.get("public_routes_http") or {}
    for route in ["/", "/catalog", "/courses/testov-programma", "/admin/courses", "/admin/enrollments", "/account"]:
        if routes.get(route) != 200:
            fail(f"checkpoint public route {route} must be 200")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage816 = stages["81.6"]
    if stage816.get("status") != "production_completed":
        fail("stage 81.6 status must be production_completed")
    if stage816.get("branch") != "stage81-6-finalize-manual-production-content-fill":
        fail("stage 81.6 branch mismatch")
    if stage816.get("deployment_type") != "manual-production-content-fill-with-frontend-hotfix":
        fail("stage 81.6 deployment_type mismatch")
    if stage816.get("frontend_runtime_changed") is not True:
        fail("stage 81.6 frontend_runtime_changed must be true")
    if stage816.get("backend_runtime_changed") is not False:
        fail("stage 81.6 backend_runtime_changed must be false")
    if stage816.get("database_migration_run") is not False:
        fail("stage 81.6 database_migration_run must be false")
    if stage816.get("production_data_changed") is not True:
        fail("stage 81.6 production_data_changed must be true")
    if stage816.get("manual_ui_content_fill") is not True:
        fail("stage 81.6 manual_ui_content_fill must be true")
    if stage816.get("sql_content_fill_allowed") is not False:
        fail("stage 81.6 sql_content_fill_allowed must be false")
    if stage816.get("seed_content_fill_allowed") is not False:
        fail("stage 81.6 seed_content_fill_allowed must be false")

    final_counts = stage816.get("final_counts") or {}
    expected_counts = {
        "courses": 2,
        "course_modules": 1,
        "course_lessons": 1,
        "organizations": 1,
        "learning_groups": 0,
        "enrollments": 1,
        "lesson_progress": 0,
        "document_records": 0,
    }
    for key, value in expected_counts.items():
        if final_counts.get(key) != value:
            fail(f"stage 81.6 final_counts.{key} must be {value}")

    required_checks = {
        r"python .\scripts\check_release_manifest.py",
        r"python .\scripts\check_stage81_manual_production_content_fill.py",
        r"python .\scripts\check_source_bom.py",
        r"python .\scripts\check_text_encoding.py",
        r"python .\scripts\check_no_todo_markers.py",
        r"python .\scripts\frontend_guard.py",
        "git diff --check",
    }
    missing_checks = required_checks - set(stage816.get("required_checks", []))
    if missing_checks:
        fail(f"stage 81.6 missing required checks: {sorted(missing_checks)}")

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
