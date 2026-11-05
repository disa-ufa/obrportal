"""CI-only real nginx + synthetic ASGI checks. No Docker, DB or production I/O."""
import argparse
from contextlib import ExitStack
import hashlib
import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
PREFIX = '/api/v1/admin/mintrud/protocol-drafts'


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def request(port, method, path, body=None, headers=None, chunked=False):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=20)
    try:
        connection.request(method, path, body=body, headers=headers or {}, encode_chunked=chunked)
        response = connection.getresponse()
        return response.status, dict(response.getheaders()), response.read()
    finally:
        connection.close()


def wait_ready(process, port, path):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('Own harness process exited during startup')
        try:
            request(port, 'GET', path)
            return
        except OSError:
            time.sleep(.1)
    raise RuntimeError('Own harness did not start')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path, required=True)
    args = parser.parse_args()
    if not (sys.platform == 'linux' and os.environ.get('GITHUB_ACTIONS') == 'true'
            and os.environ.get('CI') == 'true' and os.environ.get('GITHUB_REPOSITORY') == 'disa-ufa/obrportal'):
        raise RuntimeError('This harness requires isolated GitHub Actions in disa-ufa/obrportal')
    nginx = shutil.which('nginx')
    if not nginx:
        raise RuntimeError('Real nginx executable is required')
    out = args.evidence.resolve()
    if not out.is_relative_to(ROOT/'runner-evidence') or out.exists():
        raise RuntimeError('Use a fresh evidence directory within runner-evidence')
    out.mkdir(parents=True)
    sys.path.insert(0, str(ROOT/'backend'))
    from app.api.signed_scan_upload_limit import MAX_SIGNED_SCAN_REQUEST_BYTES as budget
    from app.services.mintrud_protocol_scans import MAX_SIGNED_SCAN_BYTES as file_limit
    from app.tests.test_mintrud_signed_scan_body_limit import PREFIX as start, SUFFIX as end, pdf
    proxy_port, api_port = free_port(), free_port()
    while api_port == proxy_port:
        api_port = free_port()
    journal = out/'backend-calls.jsonl'
    server = (ROOT/'frontend/nginx.conf').read_text(encoding='utf-8')
    server = server.replace('listen 5173;', f'listen 127.0.0.1:{proxy_port};')
    server = server.replace('http://backend:8000', f'http://127.0.0.1:{api_port}')
    for name in ['body-temp', 'proxy-temp']:
        (out/name).mkdir()
    config = out/'nginx.conf'
    config.write_text(
        f'worker_processes 1; master_process off; daemon off; pid "{out}/nginx.pid";\n'
        f'error_log "{out}/nginx-error.log"; events {{ worker_connections 64; }}\n'
        f'http {{ access_log "{out}/nginx-access.log"; client_body_temp_path "{out}/body-temp"; '
        f'proxy_temp_path "{out}/proxy-temp";\n{server}\n}}\n', encoding='utf-8')
    children = []; checks = {}; cleanup = False
    def check(name, predicate):
        if not predicate:
            raise AssertionError(name)
        checks[name] = 'PASS'
    try:
        with ExitStack() as stack:
            log = stack.enter_context((out/'nginx-test.log').open('w'))
            subprocess.run([nginx, '-t', '-p', str(out)+'/', '-c', str(config)], stdout=log, stderr=subprocess.STDOUT, check=True, timeout=20)
            check('nginx_config_test', True)
            env = {'PATH': os.environ['PATH'], 'PYTHONPATH': str(ROOT/'backend'),
                   'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONUNBUFFERED': '1',
                   'M411A_PROXY_SYNTHETIC_ONLY': '1', 'M411A_PROXY_JOURNAL': str(journal)}
            api_log = stack.enter_context((out/'api.log').open('w'))
            api = subprocess.Popen([sys.executable, '-B', '-m', 'uvicorn', 'app.tests.m411a_proxy_app:app',
                '--host', '127.0.0.1', '--port', str(api_port)], env=env, stdout=api_log, stderr=subprocess.STDOUT)
            children.append(api)
            wait_ready(api, api_port, '/health')
            proxy_log = stack.enter_context((out/'nginx.log').open('w'))
            proxy = subprocess.Popen([nginx, '-p', str(out)+'/', '-c', str(config)], stdout=proxy_log, stderr=subprocess.STDOUT)
            children.append(proxy)
            wait_ready(proxy, proxy_port, '/healthz')
            headers = {'Content-Type': 'multipart/form-data; boundary=boundary', 'Authorization': 'Bearer synthetic', 'Host': 'synthetic.test'}
            data = pdf(file_limit); body = start+data+end
            status, _, content = request(proxy_port, 'POST', PREFIX+'/ten/signed-scan', body, headers)
            check('ten_mib_multipart_accepted', status==200 and json.loads(content)['size']==file_limit)
            status, response_headers, content = request(proxy_port, 'GET', PREFIX+'/ten/signed-scan', headers={'Authorization':'Bearer synthetic'})
            check('download_exact_private_bytes', status==200 and hashlib.sha256(content).digest()==hashlib.sha256(data).digest()
                  and response_headers.get('Cache-Control')=='private, no-store'
                  and response_headers.get('Content-Disposition','').startswith('attachment;'))
            recorded = [json.loads(line) for line in journal.read_text().splitlines()]
            check('proxy_uri_and_headers_preserved', recorded[0]==dict(path=PREFIX+'/ten/signed-scan',host='synthetic.test',proto='http',forwarded_for='127.0.0.1'))
            status, _, _ = request(proxy_port, 'POST', PREFIX+'/ten/signed-scan', start+pdf(1024)+end, headers)
            check('existing_scan_not_overwritten', status==409)
            status, _, content = request(proxy_port, 'POST', PREFIX+'/file-too-large/signed-scan', start+pdf(file_limit+1)+end, headers)
            check('file_limit_still_ten_mib', status==413 and b'10 MiB' in content)
            count = len(journal.read_text().splitlines())
            # Oversized Content-Length: no body allocation or transfer is needed.
            status, _, _ = request(proxy_port, 'POST', PREFIX+'/declared/signed-scan', headers={**headers,'Content-Length':str(budget+1)})
            check('nginx_declared_oversize_413', status==413 and len(journal.read_text().splitlines())==count)
            def chunks():
                yield start
                remaining = budget+1-len(start)
                while remaining:
                    chunk = min(65536, remaining); remaining -= chunk; yield b'x'*chunk
            status, _, _ = request(proxy_port, 'POST', PREFIX+'/chunked/signed-scan', chunks(), {'Content-Type':headers['Content-Type']}, True)
            check('nginx_unknown_length_unauthorized_413', status==413 and len(journal.read_text().splitlines())==count)
            status, _, _ = request(api_port, 'POST', PREFIX+'/direct/signed-scan', chunks(), {'Content-Type':headers['Content-Type']}, True)
            check('direct_asgi_unknown_length_unauthorized_413', status==413 and len(journal.read_text().splitlines())==count)
            status, _, _ = request(proxy_port, 'POST', PREFIX+'/unauthorized/signed-scan', start+pdf(1024)+end, {'Content-Type':headers['Content-Type']})
            check('small_upload_still_requires_auth', status==401)
            status, _, content = request(proxy_port, 'POST', PREFIX+'/other', b'hello')
            check('other_api_route_preserved', status==200 and json.loads(content)==dict(size=5,path=PREFIX+'/other'))
            status, _, _ = request(proxy_port, 'POST', PREFIX+'/other', headers={'Content-Length':str(1024*1024+1)})
            check('other_api_body_limit_not_raised', status==413)
    finally:
        for child in reversed(children):
            if child.poll() is None:
                child.terminate()
                try: child.wait(timeout=10)
                except subprocess.TimeoutExpired: child.kill(); child.wait(timeout=10)
        cleanup = all(child.poll() is not None for child in children)
        (out/'result.json').write_text(json.dumps(dict(checks=checks, passed=len(checks)==12 and cleanup,
            cleanup=cleanup, children=len(children), request_limit_bytes=budget,
            docker=False, database=False, production_contacted=False), indent=2))
    if len(checks)!=12 or not cleanup:
        raise RuntimeError('Proxy checks or own-process cleanup incomplete')
    print('M411A_REAL_NGINX=PASS checks=12 own_process_cleanup=PASS')


if __name__ == '__main__': main()
