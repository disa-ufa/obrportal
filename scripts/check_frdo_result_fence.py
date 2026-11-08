"""Run bounded synthetic safety tests for the FRDO results fence."""
from pathlib import Path
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[1]
SOURCES = ('frontend/src/utils/frdoResultFence.js', 'frontend/src/components/admin/FrdoPoBatchesPanel.jsx')
if __name__ == '__main__':
    for source in SOURCES:
        if not (ROOT / source).is_file():
            raise SystemExit('Missing tested source: ' + source)
    sys.exit(subprocess.run(['node', '--test', '--test-timeout=20000', 'tests/frdo_result_fence.test.mjs'], cwd=ROOT / 'frontend', timeout=35).returncode)
