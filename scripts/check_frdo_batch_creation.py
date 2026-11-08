"""P6.1 unit/UI and P1-P5.2 regression, synthetic only, bounded execution."""
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1]
SOURCES = ('frontend/src/components/admin/registries/FrdoBatchCreation.jsx',
           'frontend/src/components/admin/registries/RegistryWorkspace.jsx',
           'frontend/src/utils/registryWorkflowPresentation.js',
 'frontend/src/pages/FrdoRegistryWorkspace.jsx',
 'frontend/src/pages/MainMintrudRegistriesPage.jsx',
 'frontend/src/utils/registryPresentation.js',
 'frontend/src/utils/registrySession.js')
if __name__ == '__main__':
    assert all((ROOT / source).is_file() for source in SOURCES)
    raise SystemExit(subprocess.run([
        'node', '--test', '--test-concurrency=1', '--test-timeout=20000',
        'tests/frdo_browser_runtime.test.mjs', 'tests/frdo_batch_creation.test.mjs',
        'tests/frdo_selected_submission.test.mjs', 'tests/frdo_submission_fence.test.mjs',
        'tests/frdo_result_fence.test.mjs', 'tests/frdo_selected_results.test.mjs',
        'tests/frdo_batch_download.test.mjs', 'tests/registry_batch_card.test.mjs',
        'tests/registry_batch_navigation.test.mjs',
        'tests/registry_workflow.test.mjs', 'tests/frdo_main_integration.test.mjs',
    ], cwd=ROOT / 'frontend', timeout=60).returncode)
