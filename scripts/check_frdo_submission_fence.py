"""Bounded FRDO submission fence tests; no real API or database."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
SOURCES=('frontend/src/utils/frdoSubmissionFence.js','frontend/src/hooks/useFrdoSubmissionFence.js')
if __name__=='__main__':
    for source in SOURCES:
        assert (ROOT/source).is_file()
    raise SystemExit(subprocess.run(['node','--test','--test-timeout=20000','tests/frdo_submission_fence.test.mjs','tests/frdo_result_fence.test.mjs','tests/frdo_selected_results.test.mjs','tests/frdo_batch_download.test.mjs'],cwd=ROOT/'frontend',timeout=40).returncode)
