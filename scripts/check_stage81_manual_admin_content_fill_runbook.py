from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs' / 'release-manifest.json'
STAGE_DOC = ROOT / 'docs' / 'stage81-manual-admin-content-fill-runbook.md'
RUNBOOK = ROOT / 'docs' / 'production-manual-admin-content-fill-runbook.md'

def fail(message: str) -> None:
    raise SystemExit(f'stage 81.5 manual admin content fill runbook guard failed: {message}')

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
    'Stage 81.5 - Manual admin UI content fill runbook',
    'stage81_5_manual_admin_content_fill_runbook_status=implementation_ready',
    'stage81_5_release_manifest_required=yes',
    'stage81_5_guard_required=yes',
    'stage81_5_runtime_changes=no',
    'stage81_5_frontend_runtime_changes=no',
    'stage81_5_backend_runtime_changes=no',
    'stage81_5_database_changes=no',
    'stage81_5_migrations_added=no',
    'stage81_5_production_deploy_required=no',
    'stage81_5_production_data_changed=no',
    'stage81_5_manual_admin_ui_content_fill=yes',
    'stage81_5_sql_content_fill_allowed=no',
    'stage81_5_seed_content_fill_allowed=no',
    'stage81_5_next_stage=81.6',
    'The first production content filling will be performed manually through the admin UI.',
    'direct SQL inserts for content',
    'seed command for production content',
]:
    require(stage_doc, marker, 'stage81.5 doc')

for marker in [
    'Production Manual Admin UI Content Fill Runbook',
    'production_manual_admin_content_fill_runbook=ready',
    'manual_admin_ui_content_fill=yes',
    'sql_content_fill_allowed=no',
    'seed_content_fill_allowed=no',
    'production_data_changed_by_runbook=no',
    'stage81_5_next_stage=81.6',
    'Pre-change counts',
    'Manual UI filling order',
    'Forbidden commands',
    'The actual data changes belong to Stage 81.6.',
]:
    require(runbook, marker, 'manual content runbook')

if manifest.get('current_stage') != '81.5':
    fail('current_stage must be 81.5')

checkpoint = manifest.get('production_checkpoint') or {}
if checkpoint.get('last_confirmed_stage') != '80.4':
    fail('production checkpoint must remain Stage 80.4 runtime')
if checkpoint.get('last_confirmed_head') != 'be38083':
    fail('production checkpoint head must remain be38083')
if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
    fail('production checkpoint recovery status must remain production_recovered_and_deployed')

stages = {stage.get('id'): stage for stage in manifest.get('stages', [])}
for stage_id in ['80.4', '80.5', '81.1', '81.2', '81.3', '81.4', '81.5']:
    if stage_id not in stages:
        fail(f'stage {stage_id} record is missing')

stage815 = stages['81.5']
if stage815.get('status') != 'implementation_ready':
    fail('stage 81.5 status must be implementation_ready')
if stage815.get('deployment_type') != 'docs-and-guard-only':
    fail('stage 81.5 deployment_type must be docs-and-guard-only')
if stage815.get('frontend_runtime_changed_expected') is not False:
    fail('stage 81.5 frontend_runtime_changed_expected must be false')
if stage815.get('backend_runtime_changed_expected') is not False:
    fail('stage 81.5 backend_runtime_changed_expected must be false')
if stage815.get('database_migration_expected') is not False:
    fail('stage 81.5 database_migration_expected must be false')
if stage815.get('production_deploy_required') is not False:
    fail('stage 81.5 production_deploy_required must be false')
if stage815.get('production_data_changed') is not False:
    fail('stage 81.5 production_data_changed must be false')
if stage815.get('sql_content_fill_allowed') is not False:
    fail('stage 81.5 sql_content_fill_allowed must be false')
if stage815.get('seed_content_fill_allowed') is not False:
    fail('stage 81.5 seed_content_fill_allowed must be false')

required_checks = {
    'python .\\scripts\\check_release_manifest.py',
    'python .\\scripts\\check_stage81_manual_admin_content_fill_runbook.py',
    'python .\\scripts\\check_source_bom.py',
    'python .\\scripts\\check_text_encoding.py',
    'python .\\scripts\\check_no_todo_markers.py',
    'python .\\scripts\\frontend_guard.py',
    'git diff --check',
}
missing_checks = required_checks - set(stage815.get('required_checks', []))
if missing_checks:
    fail(f'stage 81.5 missing required checks: {sorted(missing_checks)}')

print('stage 81.5 manual admin content fill runbook guard passed')
