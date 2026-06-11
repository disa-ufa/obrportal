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
    if manifest.get("current_stage") != "82.18":
        fail("current_stage must be 82.18")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "82.17":
        fail("last_confirmed_stage must be 82.17")
    if checkpoint.get("last_confirmed_head") != "808b0a0":
        fail("last_confirmed_head must be 808b0a0")
    if checkpoint.get("last_confirmed_tag") != "v0.1.0-stage82-17-learner-document-publication-lifecycle":
        fail("last_confirmed_tag mismatch")
    if checkpoint.get("last_migration") != "6422_lesson_blocks_schema":
        fail("checkpoint last_migration mismatch")
    if checkpoint.get("status") != "learner_document_publication_lifecycle_deployed":
        fail("checkpoint status mismatch")
    if checkpoint.get("decision") != "continue_with_admin_generated_document_publication_workflow":
        fail("checkpoint decision mismatch")
    if checkpoint.get("cleanup_performed") is not False:
        fail("checkpoint cleanup_performed must be false")

    stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
    for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13", "81.14", "81.15", "82.1", "82.2", "82.3", "82.4", "82.5", "82.6", "82.7", "82.8", "82.9", "82.10", "82.11", "82.12", "82.13", "82.14", "82.15", "82.16", "82.17", "82.18"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage22 = stages["82.2"]
    if stage22.get("migration") != "6422_lesson_blocks_schema":
        fail("stage 82.2 migration record mismatch")
    if stage22.get("database_migration_required") is not True:
        fail("stage 82.2 database_migration_required must remain true")
    if stage22.get("raw_contacts_committed") is not False:
        fail("stage 82.2 raw_contacts_committed must be false")
    if stage22.get("password_committed") is not False:
        fail("stage 82.2 password_committed must be false")

    stage = stages["82.3"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.3 status mismatch")
    if stage.get("branch") != "stage82-3-lesson-blocks-api":
        fail("stage 82.3 branch mismatch")
    if stage.get("deployment_type") != "backend-api":
        fail("stage 82.3 deployment_type mismatch")
    if stage.get("decision") != "implement_admin_lesson_blocks_api":
        fail("stage 82.3 decision mismatch")
    if stage.get("next_stage") != "82.4":
        fail("stage 82.3 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": False,
        "backend_runtime_changed": True,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.3 {key} must be {expected}")

    expected_endpoints = [
        "GET /admin/course-lessons/{lesson_id}/blocks",
        "POST /admin/course-lessons/{lesson_id}/blocks",
        "PATCH /admin/lesson-blocks/{block_id}",
        "DELETE /admin/lesson-blocks/{block_id}",
        "POST /admin/course-lessons/{lesson_id}/blocks/reorder",
    ]
    if stage.get("endpoints") != expected_endpoints:
        fail("stage 82.3 endpoints mismatch")


    stage = stages["82.4"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.4 status mismatch")
    if stage.get("branch") != "stage82-4-lesson-editor-shell":
        fail("stage 82.4 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.4 deployment_type mismatch")
    if stage.get("decision") != "add_safe_frontend_shell_for_lesson_blocks":
        fail("stage 82.4 decision mismatch")
    if stage.get("next_stage") != "82.5":
        fail("stage 82.4 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "legacy_editor_preserved": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.4 {key} must be {expected}")


    stage = stages["82.5"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.5 status mismatch")
    if stage.get("branch") != "stage82-5-lesson-block-editor-actions":
        fail("stage 82.5 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.5 deployment_type mismatch")
    if stage.get("decision") != "enable_lesson_block_editor_actions":
        fail("stage 82.5 decision mismatch")
    if stage.get("next_stage") != "82.6":
        fail("stage 82.5 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "legacy_editor_preserved": True,
        "legacy_blocks_read_only": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.5 {key} must be {expected}")


    stage = stages["82.6"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.6 status mismatch")
    if stage.get("branch") != "stage82-6-lesson-block-editor-ux":
        fail("stage 82.6 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.6 deployment_type mismatch")
    if stage.get("decision") != "add_type_specific_block_fields_and_preview":
        fail("stage 82.6 decision mismatch")
    if stage.get("next_stage") != "82.7":
        fail("stage 82.6 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "legacy_editor_preserved": True,
        "legacy_blocks_read_only": True,
        "preview_panel": True,
        "type_specific_fields": True,
        "structured_content_json": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.6 {key} must be {expected}")


    stage = stages["82.7"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.7 status mismatch")
    if stage.get("branch") != "stage82-7-lesson-block-viewer":
        fail("stage 82.7 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.7 deployment_type mismatch")
    if stage.get("decision") != "show_lesson_blocks_to_learners":
        fail("stage 82.7 decision mismatch")
    if stage.get("next_stage") != "82.8":
        fail("stage 82.7 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "learner_viewer": True,
        "legacy_adapter": True,
        "locked_lesson_protection": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.7 {key} must be {expected}")


    stage = stages["82.8"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.8 status mismatch")
    if stage.get("branch") != "stage82-8-lesson-blocks-api-payload":
        fail("stage 82.8 branch mismatch")
    if stage.get("deployment_type") != "backend-only":
        fail("stage 82.8 deployment_type mismatch")
    if stage.get("decision") != "include_lesson_blocks_in_public_and_account_payloads":
        fail("stage 82.8 decision mismatch")
    if stage.get("next_stage") != "82.9":
        fail("stage 82.8 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": False,
        "backend_runtime_changed": True,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": False,
        "backend_restart_required": True,
        "production_data_changed": False,
        "cleanup_performed": False,
        "public_payload_blocks": True,
        "account_payload_blocks": True,
        "inactive_blocks_hidden": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.8 {key} must be {expected}")


    stage = stages["82.10"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.10 status mismatch")
    if stage.get("branch") != "stage82-10-learner-lesson-blocks-navigation":
        fail("stage 82.10 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.10 deployment_type mismatch")
    if stage.get("decision") != "add_selected_lesson_navigation":
        fail("stage 82.10 decision mismatch")
    if stage.get("next_stage") != "82.11":
        fail("stage 82.10 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "viewer_navigation_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.10 {key} must be {expected}")


    stage = stages["82.11"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.11 status mismatch")
    if stage.get("branch") != "stage82-11-learner-block-type-rendering":
        fail("stage 82.11 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.11 deployment_type mismatch")
    if stage.get("decision") != "render_lesson_blocks_by_type":
        fail("stage 82.11 decision mismatch")
    if stage.get("next_stage") != "82.12":
        fail("stage 82.11 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "viewer_type_rendering_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.11 {key} must be {expected}")


    stage = stages["82.12"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.12 status mismatch")
    if stage.get("branch") != "stage82-12-learner-lesson-progress-states":
        fail("stage 82.12 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.12 deployment_type mismatch")
    if stage.get("decision") != "show_lesson_progress_states":
        fail("stage 82.12 decision mismatch")
    if stage.get("next_stage") != "82.13":
        fail("stage 82.12 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "lesson_progress_states_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.12 {key} must be {expected}")


    stage = stages["82.13"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.13 status mismatch")
    if stage.get("branch") != "stage82-13-learner-next-lesson-after-completion":
        fail("stage 82.13 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.13 deployment_type mismatch")
    if stage.get("decision") != "select_next_available_lesson_after_completion":
        fail("stage 82.13 decision mismatch")
    if stage.get("next_stage") != "82.14":
        fail("stage 82.13 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "next_lesson_after_completion_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.13 {key} must be {expected}")


    stage = stages["82.14"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.14 status mismatch")
    if stage.get("branch") != "stage82-14-learner-course-completion-readiness":
        fail("stage 82.14 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.14 deployment_type mismatch")
    if stage.get("decision") != "show_course_completion_readiness":
        fail("stage 82.14 decision mismatch")
    if stage.get("next_stage") != "82.15":
        fail("stage 82.14 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "course_completion_readiness_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.14 {key} must be {expected}")


    stage = stages["82.15"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.15 status mismatch")
    if stage.get("branch") != "stage82-15-learner-document-availability-handoff":
        fail("stage 82.15 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.15 deployment_type mismatch")
    if stage.get("decision") != "show_document_availability_after_course_completion":
        fail("stage 82.15 decision mismatch")
    if stage.get("next_stage") != "82.16":
        fail("stage 82.15 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "document_availability_handoff_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.15 {key} must be {expected}")


    stage = stages["82.16"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.16 status mismatch")
    if stage.get("branch") != "stage82-16-learner-completion-document-focus":
        fail("stage 82.16 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.16 deployment_type mismatch")
    if stage.get("decision") != "focus_document_handoff_after_course_completion":
        fail("stage 82.16 decision mismatch")
    if stage.get("next_stage") != "82.17":
        fail("stage 82.16 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "completion_document_focus_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.16 {key} must be {expected}")


    stage = stages["82.17"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.17 status mismatch")
    if stage.get("branch") != "stage82-17-learner-document-publication-lifecycle":
        fail("stage 82.17 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.17 deployment_type mismatch")
    if stage.get("decision") != "explain_document_publication_lifecycle_to_learner":
        fail("stage 82.17 decision mismatch")
    if stage.get("next_stage") != "82.18":
        fail("stage 82.17 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "document_publication_lifecycle_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.17 {key} must be {expected}")


    stage = stages["82.18"]
    if stage.get("status") != "implementation_ready":
        fail("stage 82.18 status mismatch")
    if stage.get("branch") != "stage82-18-admin-generated-document-publication-workflow":
        fail("stage 82.18 branch mismatch")
    if stage.get("deployment_type") != "frontend-only":
        fail("stage 82.18 deployment_type mismatch")
    if stage.get("decision") != "add_admin_generated_document_publication_queue":
        fail("stage 82.18 decision mismatch")
    if stage.get("next_stage") != "82.19":
        fail("stage 82.18 next_stage mismatch")

    expected_booleans = {
        "server_touched": False,
        "frontend_runtime_changed": True,
        "backend_runtime_changed": False,
        "database_migration_run": False,
        "database_migration_required": False,
        "runtime_rebuild_required": True,
        "runtime_restart_required": True,
        "frontend_restart_required": True,
        "backend_restart_required": False,
        "production_data_changed": False,
        "cleanup_performed": False,
        "admin_generated_document_publication_workflow_guard": True,
        "raw_contacts_committed": False,
        "password_committed": False,
    }
    for key, expected in expected_booleans.items():
        if stage.get(key) is not expected:
            fail(f"stage 82.18 {key} must be {expected}")

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
