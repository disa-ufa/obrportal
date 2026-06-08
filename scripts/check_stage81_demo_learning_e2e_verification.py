from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'docs' / 'release-manifest.json'
STAGE_DOC = ROOT / 'docs' / 'stage81-demo-learning-e2e-verification.md'

def fail(message: str) -> None:
    raise SystemExit(f'stage 81.1 demo learning e2e verification guard failed: {message}')

def read(path: Path) -> str:
    if not path.exists():
        fail(f'missing file: {path.relative_to(ROOT).as_posix()}')
    return path.read_text(encoding='utf-8')

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f'{where} misses marker: {marker}')

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

for marker in [
    'Stage 81.1 - Demo learning e2e recovery verification',
    'stage81_1_demo_learning_e2e_verification_status=implementation_ready',
    'stage81_1_release_manifest_required=yes',
    'stage81_1_guard_required=yes',
    'stage81_1_runtime_changes=no',
    'stage81_1_frontend_runtime_changes=no',
    'stage81_1_backend_runtime_changes=no',
    'stage81_1_database_changes=no',
    'stage81_1_migrations_added=no',
    'stage81_1_production_deploy_required=no',
    'stage81_1_local_bootstrap_with_demo_learning=yes',
    'stage81_1_next_stage=81.2',
    'local_bootstrap.ps1 -ResetVolumes -WithDemoLearning',
    'Demo Course and Demo Group',
    'public document verification by number and code passed',
]:
    require(stage_doc, marker, 'stage81 doc')

if manifest.get('current_stage') != '81.1':
    fail('current_stage must be 81.1')

checkpoint = manifest.get('production_checkpoint') or {}
if checkpoint.get('last_confirmed_stage') != '80.4':
    fail('production checkpoint must remain Stage 80.4 runtime')
if checkpoint.get('last_confirmed_head') != 'be38083':
    fail('production checkpoint head must remain be38083')
if checkpoint.get('recovery_status') != 'production_recovered_and_deployed':
    fail('production checkpoint recovery status must remain production_recovered_and_deployed')

stages = {stage.get('id'): stage for stage in manifest.get('stages', [])}
for stage_id in ['80.4', '80.5', '81.1']:
    if stage_id not in stages:
        fail(f'stage {stage_id} record is missing')

stage81 = stages['81.1']
if stage81.get('status') != 'implementation_ready':
    fail('stage 81.1 status must be implementation_ready')
if stage81.get('deployment_type') != 'docs-and-guard-only':
    fail('stage 81.1 deployment_type must be docs-and-guard-only')
if stage81.get('frontend_runtime_changed_expected') is not False:
    fail('stage 81.1 frontend_runtime_changed_expected must be false')
if stage81.get('backend_runtime_changed_expected') is not False:
    fail('stage 81.1 backend_runtime_changed_expected must be false')
if stage81.get('database_migration_expected') is not False:
    fail('stage 81.1 database_migration_expected must be false')
if stage81.get('production_deploy_required') is not False:
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
missing_checks = required_checks - set(stage81.get('required_checks', []))
if missing_checks:
    fail(f'stage 81.1 missing required checks: {sorted(missing_checks)}')

print('stage 81.1 demo learning e2e verification guard passed')
