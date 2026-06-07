from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "project",
    "process",
    "current_stage",
    "current_branch_policy",
    "production_checkpoint",
    "global_safety_boundaries",
    "common_local_checks",
    "stages",
}

REQUIRED_SAFETY_BOUNDARIES = {
    "no_secrets_in_git",
    "no_production_env_output",
    "no_docker_compose_down_v_in_normal_deploy",
    "no_database_migration_without_explicit_approval",
    "no_auth_or_rbac_weakening",
    "no_unverified_legal_document_numbers_on_public_pages",
    "preserve_server_only_untracked_paths",
}

REQUIRED_STAGE77_6_CHECKS = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage77_course_publication_ux.py",
    "python .\\scripts\\check_stage77_lesson_content_preview_ux.py",
    "python .\\scripts\\check_stage77_lesson_editor_ux.py",
    "python .\\scripts\\check_stage77_course_builder_module_lesson_ux.py",
    "python .\\scripts\\check_stage77_course_builder_card_ux.py",
    "python .\\scripts\\check_stage77_course_builder_readiness.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\smoke_frontend_admin_pages.py",
    "python .\\scripts\\smoke_frontend_hooks_layout.py",
    "docker compose exec frontend npm run build",
}

REQUIRED_STAGE77_6_CHANGED_FILES = {
    "frontend/src/pages/AdminCoursesPage.jsx",
    "docs/release-manifest.json",
    "docs/stage77-course-publication-ux.md",
    "scripts/check_release_manifest.py",
    "scripts/check_stage77_course_publication_ux.py",
    "scripts/check_stage77_lesson_content_preview_ux.py",
}


def fail(message: str) -> None:
    raise SystemExit(f"release manifest guard failed: {message}")


def load_manifest() -> dict:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")


def require_file_exists(relative_path: str) -> None:
    if not (ROOT / relative_path).exists():
        fail(f"required file missing: {relative_path}")


def main() -> None:
    manifest = load_manifest()

    missing_keys = REQUIRED_TOP_LEVEL_KEYS - set(manifest)
    if missing_keys:
        fail(f"manifest missing top-level keys: {sorted(missing_keys)}")

    if manifest["schema_version"] != 1:
        fail("schema_version must be 1")
    if manifest["project"] != "ObrPortal":
        fail("project must be ObrPortal")
    if manifest["process"] != "development-process-v2":
        fail("process must be development-process-v2")
    if manifest["current_stage"] != "77.6":
        fail("current_stage must be 77.6")

    branch_policy = manifest["current_branch_policy"]
    if branch_policy.get("development_base") != "develop":
        fail("development_base must be develop")
    if branch_policy.get("production_branch") != "develop":
        fail("production_branch must be develop")
    if branch_policy.get("main_release_requires_separate_decision") is not True:
        fail("main_release_requires_separate_decision must be true")

    checkpoint = manifest["production_checkpoint"]
    if checkpoint.get("last_confirmed_stage") != "77.5":
        fail("last_confirmed_stage must be 77.5")
    if checkpoint.get("last_confirmed_head") != "ee6983b":
        fail("last_confirmed_head must be ee6983b")
    if checkpoint.get("last_confirmed_host") != "portal.rcdo02.ru":
        fail("last_confirmed_host must be portal.rcdo02.ru")
    if checkpoint.get("frontend_health") != "healthy":
        fail("frontend_health must be healthy")
    if checkpoint.get("backend_health") != "ok":
        fail("backend_health must be ok")
    if checkpoint.get("ready_status") != "ok":
        fail("ready_status must be ok")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("database_migration_run must be false")

    missing_boundaries = REQUIRED_SAFETY_BOUNDARIES - set(manifest["global_safety_boundaries"])
    if missing_boundaries:
        fail(f"missing safety boundaries: {sorted(missing_boundaries)}")

    stages = {stage.get("id"): stage for stage in manifest["stages"]}
    for stage_id in ["74", "75", "75.1", "75.2", "76", "77.1", "77.2", "77.3", "77.4", "77.5", "77.6"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage77_5 = stages["77.5"]
    if stage77_5.get("status") != "production_deployed":
        fail("stage 77.5 status must be production_deployed")
    if stage77_5.get("head") != "ee6983b":
        fail("stage 77.5 head must be ee6983b")
    if stage77_5.get("deployment_type") != "frontend-only":
        fail("stage 77.5 deployment_type must be frontend-only")
    if stage77_5.get("backend_runtime_changed") is not False:
        fail("stage 77.5 backend_runtime_changed must be false")
    if stage77_5.get("database_migration_run") is not False:
        fail("stage 77.5 database_migration_run must be false")

    stage77_6 = stages["77.6"]
    if stage77_6.get("status") != "implementation_ready":
        fail("stage 77.6 status must be implementation_ready")
    if stage77_6.get("branch") != "stage77-course-publication-ux":
        fail("stage 77.6 branch must be stage77-course-publication-ux")
    if stage77_6.get("base") != "develop":
        fail("stage 77.6 base must be develop")
    if stage77_6.get("deployment_type") != "frontend-only":
        fail("stage 77.6 deployment_type must be frontend-only")
    if stage77_6.get("backend_runtime_changed_expected") is not False:
        fail("stage 77.6 backend_runtime_changed_expected must be false")
    if stage77_6.get("database_migration_expected") is not False:
        fail("stage 77.6 database_migration_expected must be false")

    missing_stage77_checks = REQUIRED_STAGE77_6_CHECKS - set(stage77_6.get("required_checks", []))
    if missing_stage77_checks:
        fail(f"stage 77.6 missing required checks: {sorted(missing_stage77_checks)}")

    missing_changed_files = REQUIRED_STAGE77_6_CHANGED_FILES - set(stage77_6.get("changed_files", []))
    if missing_changed_files:
        fail(f"stage 77.6 missing changed files: {sorted(missing_changed_files)}")

    for doc in stage77_6.get("required_documents", []):
        require_file_exists(doc)

    require_file_exists("scripts/check_stage77_course_publication_ux.py")
    require_file_exists("scripts/check_stage77_lesson_content_preview_ux.py")
    require_file_exists("scripts/check_stage77_lesson_editor_ux.py")
    require_file_exists("scripts/check_stage77_course_builder_module_lesson_ux.py")
    require_file_exists("scripts/check_stage77_course_builder_card_ux.py")
    require_file_exists("scripts/check_stage77_course_builder_readiness.py")

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
