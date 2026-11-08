"""Bounded P6.2 Edge/Playwright workflow against a local production build only."""
from pathlib import Path
import os, subprocess, json
ROOT=Path(__file__).resolve().parents[1]
SOURCE='frontend/tests/frdo_operator_workflow.browser.mjs'
if __name__=='__main__':
    output=os.environ.get('UI_EVIDENCE_DIR')
    if not output:raise SystemExit('UI_EVIDENCE_DIR must point to a dedicated evidence directory')
    out=Path(output).resolve();out.mkdir(parents=True,exist_ok=True)
    command=['node',SOURCE.removeprefix('frontend/')]
    try:
        result=subprocess.run(command,cwd=ROOT/'frontend',env=os.environ.copy(),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=240)
        (out/'runner.log').write_bytes(result.stdout)
        (out/'runner-exit.json').write_text(json.dumps({'exit':result.returncode,'timeout_seconds':240,'command':command}),encoding='utf-8')
        print(result.stdout.decode('utf-8',errors='replace'))
        raise SystemExit(result.returncode)
    except subprocess.TimeoutExpired as err:
        (out/'runner.log').write_bytes((err.stdout or b'')+b'\nTIMEOUT\n')
        (out/'runner-exit.json').write_text(json.dumps({'exit':124,'timeout_seconds':240}),encoding='utf-8')
        raise SystemExit(124)
