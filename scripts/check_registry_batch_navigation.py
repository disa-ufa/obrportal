"""Bounded synthetic batch navigation tests; browser suite is run separately."""
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1]
SOURCES = ('frontend/src/components/admin/registries/SelectedRegistryBatch.jsx',
           'frontend/src/utils/registryBatchNavigation.js')
if __name__ == '__main__':
    for source in SOURCES:
        if not (ROOT / source).is_file():
            raise SystemExit('Missing component: ' + source)
    try:
        raise SystemExit(subprocess.run(['node', '--test', '--test-timeout=20000',
            'tests/registry_batch_navigation.test.mjs', 'tests/registry_batch_card.test.mjs'],
            cwd=ROOT / 'frontend', timeout=40).returncode)
    except subprocess.TimeoutExpired:
        raise SystemExit('Navigation tests exceeded 40 seconds')
