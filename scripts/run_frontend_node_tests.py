from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = ("browser", "integration", "ci_config")

def collect_unit_tests() -> list[Path]:
    files = sorted(
        p for p in (ROOT / "frontend/tests").glob("*.test.mjs")
        if not any(word in p.name.lower() for word in EXCLUDED)
    )
    if len(files) < 29:
        raise SystemExit(f"FRONTEND_UNIT_TEST_SET_INCOMPLETE={len(files)}")
    required = {
        "rebaseline_frontend_contract.test.mjs",
        "registry_batch_card.test.mjs",
        "frdo_submission_fence.test.mjs",
        "mintrud_signature.test.mjs",
        "own_permissions.test.mjs",
    }
    if not required.issubset({p.name for p in files}):
        raise SystemExit("REQUIRED_FRONTEND_UNIT_TESTS_MISSING")
    return files

def main() -> None:
    if len(sys.argv) > 2 or (
        len(sys.argv) == 2 and sys.argv[1] != "--local"
    ):
        raise SystemExit("USAGE: run_frontend_node_tests.py [--local]")

    files = collect_unit_tests()
    arguments = [
        "node", "--test", "--test-concurrency=1",
        *(f"tests/{p.name}" for p in files),
    ]
    if "--local" in sys.argv:
        command = arguments
        cwd = ROOT / "frontend"
    else:
        command = [
            "docker", "compose", "exec", "-T", "frontend",
            *arguments,
        ]
        cwd = ROOT

    print(f"FRONTEND_NODE_TEST_FILES={len(files)}", flush=True)
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)
    print("FRONTEND_NODE_REGRESSIONS=PASS", flush=True)

if __name__ == "__main__":
    main()
