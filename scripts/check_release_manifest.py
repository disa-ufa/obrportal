from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs' / 'release-manifest.json'

REQUIRED_STAGE80_5_CHECKS = {
    'python .\\scripts\\check_release_manifest.py',
    'python .\\scripts\\check_stage80_post_deploy_hardening.py',
    'python .\\scripts\\check_source_bom.py',
    'python .\\scripts\\check_text_encoding.py',
    'python .\\scripts\\check_no_todo_markers.py',
    'python .\\scripts\\frontend_guard.py',
    'git diff --check',
}

REQUIRED_STAGE80_5_FILES = {
    'docs/release-manifest.json',
    'docs/stage80-post-deploy-hardening.md',
    'docs/production-safe-backend-deploy-runbook.md',
    'scripts/check_release_manifest.py',
    'scripts/check_stage80_post_deploy_hardening.py',
}

def fail(message: str) -> None:
    raise SystemExit(f'release manifest guard failed: {message}')

def main() -> None:
    if not MANIFEST.exists():
        fail('docs/release-manifest.json is missing')

    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))

    if manifest.get('schema_version') != 1:
        fail('schema_version must be 1')
    if manifest.get('project') != 'ObrPortal':
        fail('project must be ObrPortal')
    if manifest.get('process') != 'development-process-v2':
        fail('process must be development-process-v2')
    if manifest.get('current_stage') != '80.5':
        fail('current_stage must be 80.5')

    checkpoint = manifest.get('production_checkpoint') or {}
    if checkpoint.get('last_confirmed_stage') != '80.4':
        fail('last_confirmed_stage must be 80.4')
    if checkpoint.get('last_confirmed_head') != 'be38083':
        fail('last_confirmed_head must be be38083')
    if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
        fail('recovery_status must be production_recovered_and_deployed')
    if checkpoint.get('frontend_runtime_changed') is not False:
        fail('frontend_runtime_changed must be false')
    if checkpoint.get('backend_runtime_changed') is not True:
        fail('backend_runtime_changed must be true for Stage 80.4')
    if checkpoint.get('database_migration_run') is not False:
        fail('database_migration_run must be false')

    routes = checkpoint.get('public_routes_http') or {}
    for route in ['/', '/catalog', '/login', '/admin', '/documents/verify']:
        if routes.get(route) != 200:
            fail(f'public route {route} must be 200 in checkpoint')

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
        fail('stage 80.4 production evidence report path must be recorded')
    if evidence.get('secrets_printed') is not False:
        fail('stage 80.4 secrets_printed must be false')

    stage80_5 = stages['80.5']
    if stage80_5.get('status') != 'implementation_ready':
        fail('stage 80.5 status must be implementation_ready')
    if stage80_5.get('branch') != 'stage80-post-deploy-hardening':
        fail('stage 80.5 branch must be stage80-post-deploy-hardening')
    if stage80_5.get('deployment_type') != 'docs-and-guard-only':
        fail('stage 80.5 deployment_type must be docs-and-guard-only')
    if stage80_5.get('frontend_runtime_changed_expected') is not False:
        fail('stage 80.5 frontend_runtime_changed_expected must be false')
    if stage80_5.get('backend_runtime_changed_expected') is not False:
        fail('stage 80.5 backend_runtime_changed_expected must be false')
    if stage80_5.get('database_migration_expected') is not False:
        fail('stage 80.5 database_migration_expected must be false')

    missing_checks = REQUIRED_STAGE80_5_CHECKS - set(stage80_5.get('required_checks', []))
    if missing_checks:
        fail(f'stage 80.5 missing required checks: {sorted(missing_checks)}')

    missing_files = REQUIRED_STAGE80_5_FILES - set(stage80_5.get('changed_files', []))
    if missing_files:
        fail(f'stage 80.5 missing changed files: {sorted(missing_files)}')

    for path in REQUIRED_STAGE80_5_FILES:
        if not (ROOT / path).exists():
            fail(f'required file missing: {path}')

    print('release manifest guard passed')

if __name__ == '__main__':
    main()
