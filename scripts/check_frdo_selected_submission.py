"""Bounded P5.2 form and P5.1/results/download regression; no real API or DB."""
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'frontend/src/components/admin/registries/FrdoBatchSubmission.jsx'
if __name__ == '__main__':
    assert (ROOT / SOURCE).is_file()
    raise SystemExit(subprocess.run([
        'node', '--test', '--test-timeout=20000',
        'tests/frdo_selected_submission.test.mjs', 'tests/frdo_submission_fence.test.mjs',
        'tests/frdo_result_fence.test.mjs', 'tests/frdo_selected_results.test.mjs',
        'tests/frdo_batch_download.test.mjs', 'tests/registry_batch_card.test.mjs',
        'tests/registry_batch_navigation.test.mjs',
    ], cwd=ROOT / 'frontend', timeout=60).returncode)
