from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs' / 'release-manifest.json'
STAGE_DOC = ROOT / 'docs' / 'stage81-production-data-initialization-plan.md'
RUNBOOK = ROOT / 'docs' / 'production-data-initialization-runbook.md'

def fail(message: str) -> None:
    raise SystemExit(f'stage 81.2 production data initialization plan guard failed: {message}')

def read(path: Path) -> str:
    if not path.exists():
        fail(f'missing file: {path.relative_to(ROOT).as_posix()}')
    return path.read_text(encoding='utf-8')

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f'{where} misses marker: {marker}')

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
runbook = read(RUNBOOK)

for marker in [
    'Stage 81.2 - Production-safe data initialization plan',
    'stage81_2_production_data_initialization_plan_status=implementation_ready',
    'stage81_2_release_manifest_required=yes',
    'stage81_2_guard_required=yes',
    'stage81_2_runtime_changes=no',
    'stage81_2_frontend_runtime_changes=no',
    'stage81_2_backend_runtime_changes=no',
    'stage81_2_database_changes=no',
    'stage81_2_migrations_added=no',
    'stage81_2_production_deploy_required=no',
    'stage81_2_production_data_reset_allowed=no',
    'stage81_2_safe_additive_seed_required=yes',
    'stage81_2_next_stage=81.3',
    'Production data initialization must be additive.',
    'Forbidden on production:',
    'docker compose down -v',
    'local_bootstrap.ps1 -ResetVolumes',
]:
    require(stage_doc, marker, 'stage81.2 doc')

for marker in [
    'Production Data Initialization Runbook',
    'production_data_initialization_runbook=ready',
    'production_data_initialization_mode=additive_only',
    'production_data_reset_allowed=no',
    'postgres_backup_required=yes',
    'reset_volumes_forbidden=yes',
    'stage81_2_safe_additive_seed_required=yes',
    'insert only missing records',
    'skip existing records',
    'avoid deleting records',
    'docker compose down -v',
    'Stage 81.2 does not execute production data changes.',
]:
    require(runbook, marker, 'production data runbook')

if manifest.get('current_stage') != '81.2':
    fail('current_stage must be 81.2')

checkpoint = manifest.get('production_checkpoint') or {}
if checkpoint.get('last_confirmed_stage') != '80.4':
    fail('production checkpoint must remain Stage 80.4 runtime')
if checkpoint.get('last_confirmed_head') != 'be38083':
    fail('production checkpoint head must remain be38083')
if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
    fail('production checkpoint recovery status must remain production_recovered_and_deployed')

stages = {stage.get('id'): stage for stage in manifest.get('stages', [])}
for stage_id in ['80.4', '80.5', '81.1', '81.2']:
    if stage_id not in stages:
        fail(f'stage {stage_id} record is missing')

stage812 = stages['81.2']
if stage812.get('status') != 'implementation_ready':
    fail('stage 81.2 status must be implementation_ready')
if stage812.get('deployment_type') != 'docs-and-guard-only':
    fail('stage 81.2 deployment_type must be docs-and-guard-only')
if stage812.get('frontend_runtime_changed_expected') is not False:
    fail('stage 81.2 frontend_runtime_changed_expected must be false')
if stage812.get('backend_runtime_changed_expected') is not False:
    fail('stage 81.2 backend_runtime_changed_expected must be false')
if stage812.get('database_migration_expected') is not False:
    fail('stage 81.2 database_migration_expected must be false')
if stage812.get('production_deploy_required') is not False:
    fail('stage 81.2 production_deploy_required must be false')
if stage812.get('production_data_reset_allowed') is not False:
    fail('stage 81.2 production_data_reset_allowed must be false')

required_checks = {
    'python .\\scripts\\check_release_manifest.py',
    'python .\\scripts\\check_stage81_production_data_initialization_plan.py',
    'python .\\scripts\\check_source_bom.py',
    'python .\\scripts\\check_text_encoding.py',
    'python .\\scripts\\check_no_todo_markers.py',
    'python .\\scripts\\frontend_guard.py',
    'git diff --check',
}
missing_checks = required_checks - set(stage812.get('required_checks', []))
if missing_checks:
    fail(f'stage 81.2 missing required checks: {sorted(missing_checks)}')

print('stage 81.2 production data initialization plan guard passed')
