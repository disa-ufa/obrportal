"""P8 synthetic unit/UI and browser qualification with bounded local commands."""
from pathlib import Path
import argparse
import json
import os
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
SOURCES=(
 'frontend/src/components/admin/MintrudProtocolWorkspace.jsx',
 'frontend/src/utils/mintrudProtocolPreview.js',
 'backend/app/api/v1/mintrud_protocol_preview.py',
 'backend/app/services/mintrud_protocol_export_preview.py',
)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--evidence',required=True);parser.add_argument('--backend-python');args=parser.parse_args()
    out=Path(args.evidence).resolve();out.mkdir(parents=True,exist_ok=True)
    if any(out.iterdir()):raise RuntimeError('Use an empty evidence directory')
    assert all((ROOT/p).is_file() for p in SOURCES)
    env={**os.environ,'PYTHONUTF8':'1','PYTHONDONTWRITEBYTECODE':'1','UI_BUILD_DIR':str(out/'build'),'UI_EVIDENCE_DIR':str(out/'browser')}
    # Backend suite has no database fixture, engine or socket calls.
    backend_python=args.backend_python or sys.executable
    commands=[('backend',[backend_python,'-m','pytest','app/tests/test_mintrud_protocol_preview_p8.py','-q'],ROOT/'backend',60),('unit',['node','--test','--test-timeout=20000','tests/mintrud_protocol_preview_p8.test.mjs'],ROOT/'frontend',45),('build',['node','node_modules/vite/bin/vite.js','build','--outDir',str(out/'build')],ROOT/'frontend',180),('browser',['node','tests/mintrud_protocol_preview_p8.browser.mjs'],ROOT/'frontend',180)]
    result={}
    try:
        for name,command,cwd,timeout in commands:
            with (out/(name+'.log')).open('wb') as stream:
                code=subprocess.run(command,cwd=cwd,env=env,stdout=stream,stderr=subprocess.STDOUT,timeout=timeout).returncode
            result[name]={'exit':code,'timeout_seconds':timeout}
            if code:raise RuntimeError(name+' failed: see '+str(out/(name+'.log')))
        proof=json.loads((out/'browser/browser-evidence.json').read_text(encoding='utf-8'))
        assert len(proof['checks'])>=20 and not any(proof['state'][key] for key in ('writes','external','errors'))
        result['browser_checks']=len(proof['checks']);result['passed']=True
        print('P8 synthetic qualification PASS: '+str(result['browser_checks'])+' browser checks')
    finally:(out/'execution-proof.json').write_text(json.dumps(result,indent=2),encoding='utf-8')

if __name__=='__main__':main()
