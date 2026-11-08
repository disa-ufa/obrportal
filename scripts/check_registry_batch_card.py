"""Bounded synthetic unit/SSR suite for the registry batch viewing components."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCES = (
    'frontend/src/components/admin/registries/RegistryBatchCard.jsx',
    'frontend/src/components/admin/registries/RegistryBatchDetail.jsx',
    'frontend/src/utils/registryBatchPresentation.js',
)
if __name__ == '__main__':
    for source in SOURCES:
        if not (ROOT / source).is_file():
            raise SystemExit('Missing tested component: ' + source)
    try:
        result = subprocess.run(['node', '--test', '--test-timeout=20000',
            'tests/registry_batch_card.test.mjs'], cwd=ROOT / 'frontend', timeout=35)
        sys.exit(result.returncode)
    except subprocess.TimeoutExpired:
        raise SystemExit('Batch card tests exceeded 35 seconds')
