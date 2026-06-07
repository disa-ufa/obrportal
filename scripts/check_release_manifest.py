from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
PROCESS_DOC = ROOT / "docs" / "development-process-v2.md"
STAGE75_DOC = ROOT / "docs" / "stage75-public-portal-content-polish.md"

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

REQUIRED_STAGE75_CHECKS = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage75_public_content_polish.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\smoke_public_pages.py",
    "docker compose exec frontend npm run build",
}

REQUIRED_STAGE75_ROUTES = {
    "/",
    "/catalog",
    "/contacts",
    "/organization-info",
    "/faq",
    "/privacy",
    "/offer",
    "/verify-document",
}

REQUIRED_STAGE75_CHANGED_FILES = {
    "frontend/src/pages/HomePage.jsx",
    "frontend/src/pages/ContactsPage.jsx",
    "frontend/src/pages/FaqPage.jsx",
    "frontend/src/pages/PrivacyPage.jsx",
    "frontend/src/pages/OfferPage.jsx",
    "frontend/src/pages/OrganizationInfoPage.jsx",
    "docs/stage75-public-portal-content-polish.md",
    "docs/release-manifest.json",
    "scripts/check_release_manifest.py",
    "scripts/check_stage75_public_content_polish.py",
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
    "Base production checkpoint: Stage 74 deployed on `develop` at `865aaa8`",
    "Stage 75 is frontend-only",
    "stage75_status=implementation_ready",
    "stage75_release_manifest_required=yes",
    "stage75_public_content_guard_required=yes",
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

    if manifest["current_stage"] != "75":
        fail("current_stage must be 75")

    branch_policy = manifest["current_branch_policy"]
    if branch_policy.get("development_base") != "develop":
        fail("development_base must be develop")
    if branch_policy.get("production_branch") != "develop":
        fail("production_branch must be develop for the current production flow")
    if branch_policy.get("main_release_requires_separate_decision") is not True:
        fail("main_release_requires_separate_decision must be true")

    checkpoint = manifest["production_checkpoint"]
    if checkpoint.get("last_confirmed_stage") != "74":
        fail("last_confirmed_stage must be 74")
    if checkpoint.get("last_confirmed_head") != "865aaa8":
        fail("last_confirmed_head must be 865aaa8")
    if checkpoint.get("last_confirmed_host") != "portal.rcdo02.ru":
        fail("last_confirmed_host must be portal.rcdo02.ru")
    if checkpoint.get("organization_info_http") != 200:
        fail("organization_info_http must be 200")
    if checkpoint.get("backend_runtime_changed") is not False:
        fail("backend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("database_migration_run must be false")

    safety_boundaries = set(manifest["global_safety_boundaries"])
    missing_boundaries = REQUIRED_SAFETY_BOUNDARIES - safety_boundaries
    if missing_boundaries:
        fail(f"missing safety boundaries: {sorted(missing_boundaries)}")

    stages = {stage.get("id"): stage for stage in manifest["stages"]}
    if "74" not in stages:
        fail("stage 74 record is missing")
    if "75" not in stages:
        fail("stage 75 record is missing")

    stage74 = stages["74"]
    if stage74.get("status") != "production_deployed":
        fail("stage 74 status must be production_deployed")
    if stage74.get("head") != "865aaa8":
        fail("stage 74 head must be 865aaa8")
    if stage74.get("deployment_type") != "frontend-only":
        fail("stage 74 deployment_type must be frontend-only")

    stage75 = stages["75"]
    if stage75.get("status") != "implementation_ready":
        fail("stage 75 status must be implementation_ready")
    if stage75.get("base") != "develop":
        fail("stage 75 base must be develop")
    if stage75.get("deployment_type") != "frontend-only":
        fail("stage 75 deployment_type must be frontend-only")
    if stage75.get("backend_runtime_changed_expected") is not False:
        fail("stage 75 backend_runtime_changed_expected must be false")
    if stage75.get("database_migration_expected") is not False:
        fail("stage 75 database_migration_expected must be false")

    missing_stage75_checks = REQUIRED_STAGE75_CHECKS - set(stage75.get("required_checks", []))
    if missing_stage75_checks:
        fail(f"stage 75 missing required checks: {sorted(missing_stage75_checks)}")

    missing_stage75_routes = REQUIRED_STAGE75_ROUTES - set(stage75.get("public_routes_to_smoke", []))
    if missing_stage75_routes:
        fail(f"stage 75 missing public routes: {sorted(missing_stage75_routes)}")

    missing_changed_files = REQUIRED_STAGE75_CHANGED_FILES - set(stage75.get("changed_files", []))
    if missing_changed_files:
        fail(f"stage 75 missing changed files: {sorted(missing_changed_files)}")

    for doc in stage75.get("required_documents", []):
        if not (ROOT / doc).exists():
            fail(f"stage 75 required document missing: {doc}")

    if not (ROOT / "scripts" / "check_stage75_public_content_polish.py").exists():
        fail("stage 75 public content guard is missing")

    require_markers(PROCESS_DOC, REQUIRED_PROCESS_MARKERS)
    require_markers(STAGE75_DOC, REQUIRED_STAGE75_MARKERS)

    print("release manifest guard passed")


if __name__ == "__main__":
    main()
