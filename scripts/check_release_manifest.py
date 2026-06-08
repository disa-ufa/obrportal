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
    if manifest.get('current_stage') != '81.1':
        fail('current_stage must be 81.1')

    checkpoint = manifest.get('production_checkpoint') or {}
    if checkpoint.get('last_confirmed_stage') != '80.4':
        fail('last_confirmed_stage must be 80.4')
    if checkpoint.get('last_confirmed_head') != 'be38083':
        fail('last_confirmed_head must be be38083')
    if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
        fail('recovery_status must be production_recovered_and_deployed')

    stages = {stage.get('id'): stage for stage in manifest.get('stages', [])}
    for stage_id in ['80.4', '80.5', '81.1']:
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

    stage81_1 = stages['81.1']
    if stage81_1.get('status') != 'implementation_ready':
        fail('stage 81.1 status must be implementation_ready')
    if stage81_1.get('branch') != 'stage81-next-functional-block':
        fail('stage 81.1 branch must be stage81-next-functional-block')
    if stage81_1.get('deployment_type') != 'docs-and-guard-only':
        fail('stage 81.1 deployment_type must be docs-and-guard-only')
    if stage81_1.get('frontend_runtime_changed_expected') is not False:
        fail('stage 81.1 frontend_runtime_changed_expected must be false')
    if stage81_1.get('backend_runtime_changed_expected') is not False:
        fail('stage 81.1 backend_runtime_changed_expected must be false')
    if stage81_1.get('database_migration_expected') is not False:
        fail('stage 81.1 database_migration_expected must be false')
    if stage81_1.get('production_deploy_required') is not False:
        fail('stage 81.1 production_deploy_required must be false')

    required_checks = {
        'python .\\scripts\\check_release_manifest.py',
        'python .\\scripts\\check_stage81_demo_learning_e2e_verification.py',
        'python .\\scripts\\check_source_bom.py',
        'python .\\scripts\\check_text_encoding.py',
        'python .\\scripts\\check_no_todo_markers.py',
        'python .\\scripts\\frontend_guard.py',
        'git diff --check',
    }
    missing_checks = required_checks - set(stage81_1.get('required_checks', []))
    if missing_checks:
        fail(f'stage 81.1 missing required checks: {sorted(missing_checks)}')

    print('release manifest guard passed')

if __name__ == '__main__':
    main()
