"""Bounded synthetic selected FRDO result form and persistent fence suite."""
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'frontend/src/components/admin/registries/FrdoBatchResults.jsx'
if __name__ == '__main__':
    assert (ROOT / SOURCE).is_file()
    raise SystemExit(subprocess.run(['node', '--test', '--test-timeout=20000', 'tests/frdo_selected_results.test.mjs', 'tests/frdo_result_fence.test.mjs'],cwd=ROOT / 'frontend',timeout=40).returncode)
