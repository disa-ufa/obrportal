"""Qualify P8 GET routes in an ALREADY provisioned, isolated P8.2Q project.

Never creates/stops/removes containers, pulls images or changes schema. The
compose project must have only postgres + runner, no published ports or binds,
and synthetic credentials. Backend source is copied with SHA verification.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import tarfile
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]


def command(args, **kwargs):
    return subprocess.check_output(args, timeout=kwargs.pop('timeout', 60), **kwargs)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--project',required=True)
    parser.add_argument('--compose-file',required=True)
    parser.add_argument('--evidence',required=True)
    args=parser.parse_args()
    if not re.fullmatch(r'obrportal-p82q-[0-9a-f]{10}',args.project):raise RuntimeError('Disposable project prefix required')
    out=Path(args.evidence).resolve()
    if out.exists() and any(out.iterdir()):raise RuntimeError('Use an empty evidence directory')
    compose=['docker','compose','-p',args.project,'-f',str(Path(args.compose_file).resolve())]
    config=json.loads(command(compose+['config','--format','json']))
    assert set(config['services'])=={'postgres','runner'}
    assert config['networks']['isolated']['internal'] is True
    pg=config['services']['postgres'];runner=config['services']['runner']
    assert pg['image']=='postgres:16-alpine' and pg['pull_policy']=='never'
    assert pg['environment']['POSTGRES_DB']=='p82q_synthetic'
    assert pg['environment']['POSTGRES_USER']=='p82q_fixture'
    assert pg['environment']['POSTGRES_PASSWORD'].startswith('synthetic-p82q-')
    for service in (pg,runner):
        assert not service.get('ports') and set(service['networks'])=={'isolated'}
        assert all(mount['type']=='volume' for mount in service['volumes'])
    assert runner['environment']['P82Q_PROJECT']==args.project
    assert runner['environment']['PRODUCTION_EXPORTS_ENABLED']=='false'
    assert runner['environment']['P82Q_OWNER_DATABASE_URL'].endswith('@postgres:5432/p82q_synthetic')
    assert runner['environment']['P82Q_READONLY_DATABASE_URL'].startswith('postgresql+asyncpg://p82q_readonly:synthetic-p82q-ro-')
    ids={name:command(compose+['ps','-q',name]).decode().strip() for name in ('postgres','runner')}
    assert all(ids.values())
    for name,cid in ids.items():
        info=json.loads(command(['docker','inspect',cid]))[0]
        assert info['State']['Running'] and info['Config']['Labels']['com.docker.compose.project']==args.project
        assert set(info['NetworkSettings']['Networks'])=={args.project+'_isolated'}
        assert all(not ports for ports in info['NetworkSettings']['Ports'].values())
        assert all(mount['Type']=='volume' and mount['Name'].startswith(args.project+'_') for mount in info['Mounts'])
    out.mkdir(parents=True,exist_ok=True)
    names=command(['git','--no-optional-locks','ls-files','--cached','--others','--exclude-standard','-z','--','backend'],cwd=ROOT).decode().strip('\0').split('\0')
    hashes={}
    with tarfile.open(out/'backend-source.tar','w') as archive:
        for name in names:
            source=ROOT/name;relative=Path(name).relative_to('backend').as_posix()
            assert source.is_file() and not source.is_symlink() and '..' not in Path(relative).parts and source.name!='.env'
            hashes[relative]=hashlib.sha256(source.read_bytes()).hexdigest()
            archive.add(source,arcname=relative,recursive=False)
    (out/'source-sha.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')
    for source,destination in ((out/'backend-source.tar','/tmp/p82q-source.tar'),(out/'source-sha.json','/tmp/p82q-source-sha.json')):
        subprocess.run(['docker','cp',str(source),ids['runner']+':'+destination],check=True,timeout=90)
    verify="import tarfile,json,hashlib,pathlib;tarfile.open('/tmp/p82q-source.tar').extractall('/app',filter='data');m=json.load(open('/tmp/p82q-source-sha.json'));assert all(hashlib.sha256((pathlib.Path('/app')/p).read_bytes()).hexdigest()==h for p,h in m.items());print('TESTED_SOURCE_SHA_PASS',len(m))"
    subprocess.run(compose+['exec','-T','runner','python','-c',verify],check=True,timeout=90)
    run_name='qualification-'+uuid4().hex[:12]
    with (out/'pytest.log').open('wb') as log:
        result=subprocess.run(compose+['exec','-T','-e','P82Q_EVIDENCE_DIR=/pg-evidence/'+run_name,'runner','python','-m','pytest','app/tests/test_mintrud_protocol_preview_p82q_pg.py','-vv','-p','no:cacheprovider','--tb=short'],stdout=log,stderr=subprocess.STDOUT,timeout=600)
    subprocess.run(['docker','cp',ids['runner']+':/pg-evidence/'+run_name,str(out/'real-pg')],check=True,timeout=90)
    proof=json.loads((out/'real-pg/execution-proof.json').read_text(encoding='utf-8'))
    passed=result.returncode==0 and len(proof['concurrency'])==6 and all(case['select_only'] for case in proof['cases']) and {m['sql_count'] for m in proof['measurements']}=={32}
    (out/'qualification.json').write_text(json.dumps({'passed':passed,'pytest_exit':result.returncode,'project':args.project,'containers':ids,'source_files':len(hashes),'backend_source_sha_verified':True,'dependency_overrides':False,'real_postgres':True,'published_ports':False,'read_only_role':proof['read_only_role'],'concurrency_cases':len(proof['concurrency'])},indent=2),encoding='utf-8')
    print('P8.2Q REAL POSTGRES '+('PASS' if passed else 'FAIL'))
    if not passed:raise SystemExit(1)


if __name__=='__main__':main()
