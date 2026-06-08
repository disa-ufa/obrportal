from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs' / 'release-manifest.json'

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
    if manifest.get('current_stage') != '81.5':
        fail('current_stage must be 81.5')

    checkpoint = manifest.get('production_checkpoint') or {}
    if checkpoint.get('last_confirmed_stage') != '80.4':
        fail('last_confirmed_stage must be 80.4')
    if checkpoint.get('last_confirmed_head') != 'be38083':
        fail('last_confirmed_head must be be38083')
    if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
        fail('recovery_status must be production_recovered_and_deployed')

    stages = {stage.get('id'): stage for stage in manifest.get('stages', [])}
    for stage_id in ['80.4', '80.5', '81.1', '81.2', '81.3', '81.4', '81.5']:
        if stage_id not in stages:
            fail(f'stage {stage_id} record is missing')

    stage815 = stages['81.5']
    if stage815.get('status') != 'implementation_ready':
        fail('stage 81.5 status must be implementation_ready')
    if stage815.get('branch') != 'stage81-5-manual-admin-content-fill-runbook':
        fail('stage 81.5 branch must be stage81-5-manual-admin-content-fill-runbook')
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

    print('release manifest guard passed')

if __name__ == '__main__':
    main()
