from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs' / 'release-manifest.json'
STAGE_DOC = ROOT / 'docs' / 'stage80-post-deploy-hardening.md'
SAFE_RUNBOOK = ROOT / 'docs' / 'production-safe-backend-deploy-runbook.md'

def fail(message: str) -> None:
    raise SystemExit(f'stage 80.5 post deploy hardening guard failed: {message}')

def read(path: Path) -> str:
    if not path.exists():
        fail(f'missing file: {path.relative_to(ROOT).as_posix()}')
    return path.read_text(encoding='utf-8')

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f'{where} misses marker: {marker}')

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
runbook = read(SAFE_RUNBOOK)

for marker in [
    'Stage 80.5 - Post deploy hardening after Stage 80.4 recovery',
    'stage80_5_post_deploy_hardening_status=implementation_ready',
    'stage80_5_release_manifest_required=yes',
    'stage80_5_guard_required=yes',
    'stage80_5_runtime_changes=no',
    'stage80_5_frontend_runtime_changes=no',
    'stage80_5_backend_runtime_changes=no',
    'stage80_5_database_changes=no',
    'stage80_5_migrations_added=no',
    'stage80_5_safe_backend_deploy_runbook=yes',
    'stage80_5_destructive_volume_command_guard=yes',
    'stage80_5_next_stage=81.1',
    'production_recovered_and_deployed',
    'be38083',
]:
    require(stage_doc, marker, 'stage80 doc')

for marker in [
    'Production Safe Backend Deploy Runbook',
    'production_safe_backend_deploy_runbook=ready',
    'safe_backend_only_deploy=yes',
    'volume_removal_command_blocked=yes',
    'postgres_backup_required=yes',
    'stage80_5_destructive_volume_command_guard=yes',
    'docker compose build backend',
    'docker compose up -d backend',
    'docker compose down -v',
    'It removes named volumes and can erase PostgreSQL and MinIO data.',
]:
    require(runbook, marker, 'safe backend runbook')

if manifest.get('current_stage') != '80.5':
    fail('current_stage must be 80.5')

checkpoint = manifest.get('production_checkpoint') or {}
if checkpoint.get('last_confirmed_stage') != '80.4':
    fail('production checkpoint stage must be 80.4')
if checkpoint.get('last_confirmed_head') != 'be38083':
    fail('production checkpoint head must be be38083')
if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
    fail('production checkpoint recovery_status must be production_recovered_and_deployed')
if checkpoint.get('frontend_runtime_changed') is not False:
    fail('checkpoint frontend_runtime_changed must be false')
if checkpoint.get('backend_runtime_changed') is not True:
    fail('checkpoint backend_runtime_changed must be true for Stage 80.4')
if checkpoint.get('database_migration_run') is not False:
    fail('checkpoint database_migration_run must be false')

routes = checkpoint.get('public_routes_http') or {}
for route in ['/', '/catalog', '/login', '/admin', '/documents/verify']:
    if routes.get(route) != 200:
        fail(f'production checkpoint route {route} must be 200')

stages = {stage.get('id'): stage for stage in manifest.get('stages', [])}
for stage_id in ['80.3', '80.4', '80.5']:
    if stage_id not in stages:
        fail(f'stage {stage_id} record is missing')

stage80_4 = stages['80.4']
if stage80_4.get('status') != 'production_recovered_and_deployed':
    fail('stage 80.4 status must be production_recovered_and_deployed')
if stage80_4.get('head') != 'be38083':
    fail('stage 80.4 head must be be38083')
if stage80_4.get('frontend_runtime_changed') is not False:
    fail('stage 80.4 frontend_runtime_changed must be false')
if stage80_4.get('backend_runtime_changed') is not True:
    fail('stage 80.4 backend_runtime_changed must be true')
if stage80_4.get('database_migration_run') is not False:
    fail('stage 80.4 database_migration_run must be false')

evidence = stage80_4.get('production_evidence') or {}
if evidence.get('report_path') != '/opt/obrportal/tmp/stage80_4_recovery_and_deploy_20260608T111810Z.txt':
    fail('stage 80.4 production evidence report path is missing')
if evidence.get('secrets_printed') is not False:
    fail('stage 80.4 production evidence must record secrets_printed=false')

stage80_5 = stages['80.5']
if stage80_5.get('status') != 'implementation_ready':
    fail('stage 80.5 status must be implementation_ready')
if stage80_5.get('deployment_type') != 'docs-and-guard-only':
    fail('stage 80.5 deployment_type must be docs-and-guard-only')
if stage80_5.get('frontend_runtime_changed_expected') is not False:
    fail('stage 80.5 frontend_runtime_changed_expected must be false')
if stage80_5.get('backend_runtime_changed_expected') is not False:
    fail('stage 80.5 backend_runtime_changed_expected must be false')
if stage80_5.get('database_migration_expected') is not False:
    fail('stage 80.5 database_migration_expected must be false')

print('stage 80.5 post deploy hardening guard passed')
