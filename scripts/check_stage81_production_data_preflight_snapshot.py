from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-production-data-preflight-snapshot.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.3 production data preflight snapshot guard failed: {message}")

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
    "Stage 81.3 - Production data preflight snapshot",
    "stage81_3_production_data_preflight_snapshot_status=implementation_ready",
    "stage81_3_release_manifest_required=yes",
    "stage81_3_guard_required=yes",
    "stage81_3_runtime_changes=no",
    "stage81_3_frontend_runtime_changes=no",
    "stage81_3_backend_runtime_changes=no",
    "stage81_3_database_changes=no",
    "stage81_3_migrations_added=no",
    "stage81_3_production_deploy_required=no",
    "stage81_3_production_data_changed=no",
    "stage81_3_backup_created=yes",
    "stage81_3_snapshot_report_recorded=yes",
    "stage81_3_next_stage=81.4",
    "/opt/obrportal/tmp/stage81_3_production_data_preflight_snapshot_20260608T123756Z.txt",
    "/opt/obrportal-backups/postgres/postgres-before-stage81-3-data-preflight-20260608T123756Z.sql",
    "postgres-before-stage81-3-data-preflight",
    "users: 3",
    "organizations: 0",
    "courses: 0",
    "document_records: 0",
    "6421_org_doc_profile",
    "production data was not changed",
    "containers were not restarted",
    "migrations were not run",
]:
    require(stage_doc, marker, "stage81.3 doc")

if manifest.get("current_stage") != "81.3":
    fail("current_stage must be 81.3")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "80.4":
    fail("production checkpoint must remain Stage 80.4 runtime")
if checkpoint.get("last_confirmed_head") != "be38083":
    fail("production checkpoint head must remain be38083")
if checkpoint.get("recovery_status") != "production_recovered_and_deployed":
    fail("production checkpoint recovery status must remain production_recovered_and_deployed")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage813 = stages["81.3"]
if stage813.get("status") != "implementation_ready":
    fail("stage 81.3 status must be implementation_ready")
if stage813.get("deployment_type") != "docs-and-guard-only":
    fail("stage 81.3 deployment_type must be docs-and-guard-only")
if stage813.get("frontend_runtime_changed_expected") is not False:
    fail("stage 81.3 frontend_runtime_changed_expected must be false")
if stage813.get("backend_runtime_changed_expected") is not False:
    fail("stage 81.3 backend_runtime_changed_expected must be false")
if stage813.get("database_migration_expected") is not False:
    fail("stage 81.3 database_migration_expected must be false")
if stage813.get("production_deploy_required") is not False:
    fail("stage 81.3 production_deploy_required must be false")
if stage813.get("production_data_changed") is not False:
    fail("stage 81.3 production_data_changed must be false")
if stage813.get("backup_created") is not True:
    fail("stage 81.3 backup_created must be true")

required_checks = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage81_production_data_preflight_snapshot.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\frontend_guard.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage813.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.3 missing required checks: {sorted(missing_checks)}")

print("stage 81.3 production data preflight snapshot guard passed")
