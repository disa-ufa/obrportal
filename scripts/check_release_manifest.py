from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
PROCESS_DOC = ROOT / "docs" / "development-process-v2.md"
STAGE75_DOC = ROOT / "docs" / "stage75-public-portal-content-polish.md"
STAGE75_1_DOC = ROOT / "docs" / "stage75-public-ui-cleanup.md"
STAGE76_DOC = ROOT / "docs" / "stage76-public-organization-documents.md"

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

REQUIRED_STAGE76_CHECKS = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage76_public_organization_documents.py",
    "python .\\scripts\\check_stage75_public_ui_cleanup.py",
    "python .\\scripts\\check_stage75_public_content_polish.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\smoke_public_pages.py",
    "docker compose exec frontend npm run build",
}

REQUIRED_STAGE76_CHANGED_FILES = {
    "frontend/src/pages/OrganizationInfoPage.jsx",
    "docs/release-manifest.json",
    "docs/stage76-public-organization-documents.md",
    "scripts/check_release_manifest.py",
    "scripts/check_stage76_public_organization_documents.py",
}

REQUIRED_PROCESS_MARKERS = [
    "Development process v2",
    "one stage covers a meaningful product package",
    "Pull requests must target `develop` first",
    "No runtime deployment required",
    "Frontend-only",
    "production_head=865aaa8",
]

REQUIRED_STAGE75_MARKERS = [
    "Stage 75 - Public portal official content polish",
    "Stage 75 is frontend-only",
    "stage75_release_manifest_required=yes",
    "stage75_public_content_guard_required=yes",
]

REQUIRED_STAGE75_1_MARKERS = [
    "Stage 75.1 - Public UI technical labels cleanup",
    "stage75_1_status=implementation_ready",
    "stage75_1_release_manifest_required=yes",
    "stage75_1_public_ui_cleanup_guard_required=yes",
]

REQUIRED_STAGE76_MARKERS = [
    "Stage 76 - Public organization documents section",
    "stage76_status=implementation_ready",
    "stage76_release_manifest_required=yes",
    "stage76_guard_required=yes",
    "stage76_no_unverified_legal_document_numbers=yes",
]


def fail(message: str) -> None:
    raise SystemExit(f"release manifest guard failed: {message}")


def read_text(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def load_manifest() -> dict:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in docs/release-manifest.json: {exc}")


def require_markers(path: Path, markers: list[str]) -> None:
    text = read_text(path)
    missing = [marker for marker in markers if marker not in text]
    if missing:
        fail(f"missing markers in {path.relative_to(ROOT)}: {missing}")


def require_file_exists(relative_path: str) -> None:
    if not (ROOT / relative_path).exists():
        fail(f"required file missing: {relative_path}")


def require_route_checkpoint(checkpoint: dict) -> None:
    for route in ["/", "/contacts", "/faq", "/privacy", "/offer", "/organization-info"]:
        if checkpoint.get("public_routes_http", {}).get(route) != 200:
            fail(f"production checkpoint route {route} must be HTTP 200")


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
    if manifest["current_stage"] != "76":
        fail("current_stage must be 76")

    branch_policy = manifest["current_branch_policy"]
    if branch_policy.get("development_base") != "develop":
        fail("development_base must be develop")
    if branch_policy.get("production_branch") != "develop":
        fail("production_branch must be develop for the current production flow")
    if branch_policy.get("main_release_requires_separate_decision") is not True:
        fail("main_release_requires_separate_decision must be true")

    checkpoint = manifest["production_checkpoint"]
    if checkpoint.get("last_confirmed_stage") != "75.2":
        fail("last_confirmed_stage must be 75.2")
    if checkpoint.get("last_confirmed_head") != "04d2b7d":
        fail("last_confirmed_head must be 04d2b7d")
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
    require_route_checkpoint(checkpoint)

    missing_boundaries = REQUIRED_SAFETY_BOUNDARIES - set(manifest["global_safety_boundaries"])
    if missing_boundaries:
        fail(f"missing safety boundaries: {sorted(missing_boundaries)}")

    stages = {stage.get("id"): stage for stage in manifest["stages"]}
    for stage_id in ["74", "75", "75.1", "75.2", "76"]:
        if stage_id not in stages:
            fail(f"stage {stage_id} record is missing")

    stage74 = stages["74"]
    if stage74.get("status") != "production_deployed":
        fail("stage 74 status must be production_deployed")
    if stage74.get("head") != "865aaa8":
        fail("stage 74 head must be 865aaa8")
    if stage74.get("deployment_type") != "frontend-only":
        fail("stage 74 deployment_type must be frontend-only")

    stage75 = stages["75"]
    if stage75.get("status") != "production_deployed":
        fail("stage 75 status must be production_deployed")
    if stage75.get("head") != "e0049ab":
        fail("stage 75 head must be e0049ab")
    if stage75.get("deployment_type") != "frontend-only":
        fail("stage 75 deployment_type must be frontend-only")
    if stage75.get("backend_runtime_changed") is not False:
        fail("stage 75 backend_runtime_changed must be false")
    if stage75.get("database_migration_run") is not False:
        fail("stage 75 database_migration_run must be false")

    stage75_1 = stages["75.1"]
    if stage75_1.get("status") != "production_deployed":
        fail("stage 75.1 status must be production_deployed")
    if stage75_1.get("head") != "53ddc40":
        fail("stage 75.1 head must be 53ddc40")
    if stage75_1.get("deployment_type") != "frontend-only":
        fail("stage 75.1 deployment_type must be frontend-only")

    stage75_2 = stages["75.2"]
    if stage75_2.get("status") != "production_deployed":
        fail("stage 75.2 status must be production_deployed")
    if stage75_2.get("head") != "04d2b7d":
        fail("stage 75.2 head must be 04d2b7d")
    if stage75_2.get("deployment_type") != "frontend-only":
        fail("stage 75.2 deployment_type must be frontend-only")
    if stage75_2.get("backend_runtime_changed") is not False:
        fail("stage 75.2 backend_runtime_changed must be false")
    if stage75_2.get("database_migration_run") is not False:
        fail("stage 75.2 database_migration_run must be false")

    stage76 = stages["76"]
    if stage76.get("status") != "implementation_ready":
        fail("stage 76 status must be implementation_ready")
    if stage76.get("branch") != "stage76-public-organization-documents":
        fail("stage 76 branch must be stage76-public-organization-documents")
    if stage76.get("base") != "develop":
        fail("stage 76 base must be develop")
    if stage76.get("deployment_type") != "frontend-only":
        fail("stage 76 deployment_type must be frontend-only")
    if stage76.get("backend_runtime_changed_expected") is not False:
        fail("stage 76 backend_runtime_changed_expected must be false")
    if stage76.get("database_migration_expected") is not False:
        fail("stage 76 database_migration_expected must be false")

    missing_stage76_checks = REQUIRED_STAGE76_CHECKS - set(stage76.get("required_checks", []))
    if missing_stage76_checks:
        fail(f"stage 76 missing required checks: {sorted(missing_stage76_checks)}")

    missing_changed_files = REQUIRED_STAGE76_CHANGED_FILES - set(stage76.get("changed_files", []))
    if missing_changed_files:
        fail(f"stage 76 missing changed files: {sorted(missing_changed_files)}")

    for doc in stage76.get("required_documents", []):
        require_file_exists(doc)

    require_file_exists("scripts/check_stage75_public_ui_cleanup.py")
    require_file_exists("scripts/check_stage76_public_organization_documents.py")
    require_markers(PROCESS_DOC, REQUIRED_PROCESS_MARKERS)
    require_markers(STAGE75_DOC, REQUIRED_STAGE75_MARKERS)
    require_markers(STAGE75_1_DOC, REQUIRED_STAGE75_1_MARKERS)
    require_markers(STAGE76_DOC, REQUIRED_STAGE76_MARKERS)

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
