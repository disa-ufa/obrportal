"""P6.3 production-build/unit/browser gate. No backend or database is started."""
from pathlib import Path
import argparse, json, os, re, signal, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
BROWSERS={'creation':81,'submission':65,'results':19,'download':17,'navigation':22,'pending':14,'operator':119,'auth':18,'main-workflow':33}
FILES={'creation':'frdo_batch_creation','submission':'frdo_submission_fence','results':'frdo_selected_results','download':'frdo_batch_download','navigation':'registry_batch_navigation','pending':'frdo_pending_storage','operator':'frdo_operator_workflow','auth':'frdo_auth_session','main-workflow':'frdo_main_workflow'}

def verify_unit(log):
    counts={key:int(value) for key,value in re.findall(r'(?:#|ℹ)\s+(tests|pass|fail|skipped|cancelled)\s+(\d+)',log)}
    if counts.get('pass',0)<120 or counts.get('tests')!=counts.get('pass') or any(counts.get(k,1)!=0 for k in ['fail','skipped','cancelled']):
        raise ValueError('Unit tests missing, failed, skipped or cancelled: '+str(counts))
    return counts

def verify_browser(folder,name,log):
    proof=json.loads((folder/'browser-evidence.json').read_text(encoding='utf-8'))
    checks=proof.get('checks',[])
    if len(checks)<BROWSERS[name] or not re.search(r'PASS\s+'+str(len(checks))+r'\s+(?:browser )?checks',log):
        raise ValueError('Missing browser execution proof: '+name)
    runs=proof.get('runs',[proof])
    if any(run.get('errors',[]) or run.get('unexpected',[]) for run in runs):raise ValueError('Browser errors or unexpected requests')
    if name=='operator' and (proof.get('completeOperatorCycle') is not True or len(runs)<23):raise ValueError('Operator cycle missing')
    if name=='main-workflow' and (proof.get('completeMainWorkflow') is not True or len(runs)!=1):raise ValueError('Main workflow proof missing')
    return len(checks)

def run(out,name,command,cwd,env,limit):
    log=out/(name+'.log')
    with log.open('wb') as stream:
        child=subprocess.Popen(command,cwd=cwd,env=env,stdout=stream,stderr=subprocess.STDOUT,start_new_session=os.name!='nt')
        try:code=child.wait(timeout=limit)
        except subprocess.TimeoutExpired:
            if os.name=='nt':subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],stdout=stream,stderr=subprocess.STDOUT)
            else:os.killpg(child.pid,signal.SIGKILL)
            child.wait();code=124
    (out/(name+'-exit.json')).write_text(json.dumps({'exit':code,'command':command,'timeout_seconds':limit}),encoding='utf-8')
    if code:raise RuntimeError(name+' failed: exit '+str(code)+'; see '+str(log))
    return log.read_text(encoding='utf-8',errors='replace')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--evidence',required=True);args=parser.parse_args()
    out=Path(args.evidence).resolve();out.mkdir(parents=True,exist_ok=True)
    # Refuse stale results: a prior successful run must never substitute for execution.
    if any(out.iterdir()):raise RuntimeError('Evidence directory must be empty: '+str(out))
    env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONUTF8':'1','UI_BUILD_DIR':str(out/'build')}
    result={'passed':False,'browser_counts':{}}
    try:
        run(out,'build',['node','node_modules/vite/bin/vite.js','build','--outDir',str(out/'build')],ROOT/'frontend',env,180)
        log=run(out,'unit',[sys.executable,'scripts/check_frdo_batch_creation.py'],ROOT,env,90)
        result['unit']=verify_unit(log)
        for name in BROWSERS:
            folder=out/name;folder.mkdir();env['UI_EVIDENCE_DIR']=str(folder)
            command=[sys.executable,'scripts/check_frdo_operator_workflow.py'] if name=='operator' else ['node','tests/'+FILES[name]+'.browser.mjs']
            cwd=ROOT if name=='operator' else ROOT/'frontend'
            log=run(out,name,command,cwd,env,270 if name=='operator' else 180)
            result['browser_counts'][name]=verify_browser(folder,name,log)
        result['passed']=True
        print('FRDO local gate PASS: unit='+str(result['unit']['pass'])+' browser='+str(sum(result['browser_counts'].values())))
    finally:(out/'execution-proof.json').write_text(json.dumps(result,indent=2),encoding='utf-8')

if __name__=='__main__':main()
