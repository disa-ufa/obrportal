#!/usr/bin/env python3
"""CI-only, disposable PostgreSQL and API regression for registry exports.

No production connections, published ports, host mounts or persistent volumes.
"""
from __future__ import annotations

import os
from pathlib import Path
import secrets
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / '.github' / 'workflows' / 'ci.yml'
FULL_FILES = (
    'test_registry_catalog_policy_fence_pg.py',
    'test_catalog_writers_pg.py',
    'test_document_writers_pg.py',
    'test_import_writers_pg.py',
    'test_learner_import_apply_service.py',
    'test_admin_learner_import_course_notifications_api.py',
    'test_mintrud_recovery_flow_api.py',
)
NODES = (
    'test_m231d2c3_storage_failure.py::test_m231d2c3_real_pg_commit_ack_loss',
    'test_auth_rbac_admin_api.py::test_admin_can_delete_unused_organization',
    'test_auth_rbac_admin_api.py::test_admin_delete_organization_not_found_returns_404',
    'test_auth_rbac_admin_api.py::test_admin_apply_learner_import_returns_password_setup_invitation_for_new_user',
)


def validate_contract() -> None:
    text = WORKFLOW.read_text(encoding='utf-8')
    assert 'docker compose exec -T backend pytest app/tests -q' in text
    assert 'python scripts/ci_registry_synthetic.py' in text
    for file in FULL_FILES:
        marker = f'--ignore=app/tests/{file}'
        if text.count(marker) != 1:
            raise RuntimeError(f'CI test partition invalid: {marker}')
        if not (ROOT / 'backend' / 'app' / 'tests' / file).is_file():
            raise RuntimeError(f'Test file missing: {file}')
    for node in NODES:
        marker = f'--deselect=app/tests/{node}'
        if text.count(marker) != 1:
            raise RuntimeError(f'CI test partition invalid: {marker}')
    print('R24M8_PARTITION_CONTRACT=PASS', flush=True)


def command(args: list[str], *, env: dict[str, str] | None = None,
            capture: bool = False, allow_failure: bool = False) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(args, env=env, text=True, timeout=600,
                                stdout=subprocess.PIPE if capture else None,
                                stderr=subprocess.PIPE if capture else None,
                                check=False)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError('Synthetic CI command exceeded 600 seconds') from exc
    if result.returncode != 0 and not allow_failure:
        # Do not print subprocess arguments, which may contain ephemeral passwords.
        if capture and result.stderr:
            print(result.stderr[-1200:], file=sys.stderr)
        raise RuntimeError(f'Command failed (exit={result.returncode}, executable={args[0]})')
    return result


def output(args: list[str], *, allow_failure: bool = False) -> str:
    r = command(args, capture=True, allow_failure=allow_failure)
    return (r.stdout or '').strip()



def validate_collection() -> None:
    """Prove every original pytest node is in exactly one CI partition."""
    def collect(selection: list[str]) -> set[str]:
        args = ['docker', 'compose', 'exec', '-T', 'backend', 'python', '-m', 'pytest',
                '--collect-only', '-q', '-p', 'no:cacheprovider', *selection]
        completed = command(args, capture=True)
        nodes = {line.strip() for line in completed.stdout.splitlines()
                 if line.startswith('app/tests/') and '::' in line}
        if not nodes:
            raise RuntimeError('Pytest collection produced no node IDs')
        return nodes

    full = collect(['app/tests'])
    main_flags = [f'--ignore=app/tests/{file}' for file in FULL_FILES]
    main_flags += [f'--deselect=app/tests/{node}' for node in NODES]
    main = collect(['app/tests', *main_flags])
    extra_selection = [f'app/tests/{file}' for file in FULL_FILES]
    extra_selection += [f'app/tests/{node}' for node in NODES]
    extra = collect(extra_selection)
    lost = full - main - extra
    unexpected = (main | extra) - full
    repeated = main & extra
    if lost or unexpected or repeated:
        raise RuntimeError(
            f'Pytest partition mismatch: lost={len(lost)}, '
            f'unexpected={len(unexpected)}, duplicate={len(repeated)}'
        )
    print(f'R24M8_TEST_COLLECTION=PASS total={len(full)} '
          f'main={len(main)} isolated={len(extra)}', flush=True)


def ensure_ci() -> str:
    if not (os.environ.get('GITHUB_ACTIONS') == 'true'
            and os.environ.get('GITHUB_REPOSITORY') == 'disa-ufa/obrportal'
            and os.environ.get('CI') == 'true'
            and os.environ.get('RUNNER_TEMP')):
        raise RuntimeError('This executable is restricted to GitHub Actions in disa-ufa/obrportal')
    if os.environ.get('DOCKER_HOST') not in (None, '', 'unix:///var/run/docker.sock'):
        raise RuntimeError('Unsafe Docker host override')
    if output(['docker', 'info', '--format', '{{.OSType}}']) != 'linux':
        raise RuntimeError('Linux Docker is required')
    image_lines = output(['docker', 'compose', 'images', '-q', 'backend']).splitlines()
    if len(image_lines) != 1 or not image_lines[0]:
        raise RuntimeError('Expected exactly one built CI backend image')
    command(['docker', 'image', 'inspect', image_lines[0]], capture=True)
    command(['docker', 'image', 'inspect', 'postgres:16-alpine'], capture=True)
    print('R24M8_GITHUB_CI_PREFLIGHT=PASS', flush=True)
    return image_lines[0]


def verify_owned(container: str, token: str) -> None:
    actual = output(['docker', 'inspect', '--format',
                     '{{index .Config.Labels "obrportal.ci.synthetic"}}', container])
    if actual != token:
        raise RuntimeError('Container ownership mismatch: ' + container)


def remove_owned(container: str | None, token: str) -> None:
    if container:
        verify_owned(container, token)
        command(['docker', 'rm', '-f', container])


def remove_network(network: str | None, token: str) -> None:
    if network:
        actual = output(['docker', 'network', 'inspect', '--format',
                         '{{index .Labels "obrportal.ci.synthetic"}}', network])
        if actual != token:
            raise RuntimeError('Network ownership mismatch')
        command(['docker', 'network', 'rm', network])


def wait_pg(name: str, user: str, database: str) -> None:
    for _ in range(50):
        p = command(['docker', 'exec', name, 'pg_isready', '-h', '127.0.0.1',
                     '-U', user, '-d', database], capture=True, allow_failure=True)
        if p.returncode == 0:
            return
        time.sleep(1)
    raise RuntimeError('Synthetic PostgreSQL did not become ready')


def psql(pg: str, db: str, user: str, sql: str, *, query: bool = False) -> str:
    args = ['docker', 'exec', pg, 'psql', '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1']
    args += ['-Atq' if query else '-q', '-c', sql]
    return output(args)


def app_args(image: str, network: str, url: str, extra: dict[str, str] | None = None,
             *, share_pg: bool = False) -> list[str]:
    entries = {
        'DATABASE_URL': url,
        'PRODUCTION_EXPORTS_ENABLED': 'false',
        'REDIS_URL': 'redis://127.0.0.1:1/0',
        'S3_ENDPOINT_URL': 'http://127.0.0.1:1',
    }
    entries.update(extra or {})
    args = ['docker', 'run', '--rm', '--pull', 'never', '--network', network,
            '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
            '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m']
    if share_pg:
        args += ['--tmpfs', '/app/storage/private:rw,nosuid,nodev,size=128m']
    for key, value in entries.items():
        args += ['-e', f'{key}={value}']
    return args + ['--workdir', '/app', image]


def postgres_groups(image: str) -> None:
    token = secrets.token_hex(6)
    net = f'obrportal-ci-reg-net-{token}'
    pg = f'obrportal-ci-reg-pg-{token}'
    password = secrets.token_hex(24)
    made_network = made_pg = False
    groups = [
        ('r24m7a', 'OBRPORTAL_R24M7A_SYNTHETIC_ONLY', 'R24M7A_TEST_URL',
         ['app/tests/test_registry_catalog_policy_fence_pg.py'], {'R24M7A_SYNTHETIC_ONLY': 'YES'}, False),
        ('r24m7b', 'OBRPORTAL_R24M7B_SYNTHETIC_ONLY', 'R24M7B_TEST_URL',
         ['app/tests/test_catalog_writers_pg.py'], {'R24M7B_SYNTHETIC_ONLY': 'YES'}, True),
        ('r24m7c', 'OBRPORTAL_R24M7C_SYNTHETIC_ONLY', 'R24M7C_TEST_URL',
         ['app/tests/test_document_writers_pg.py'], {}, True),
        ('r24m7d1', 'OBRPORTAL_R24M7D1_SYNTHETIC_ONLY', 'R24M7D1_TEST_URL',
         ['app/tests/test_import_writers_pg.py',
          'app/tests/test_learner_import_apply_service.py',
          'app/tests/test_admin_learner_import_course_notifications_api.py'], {}, True),
        ('m231d2c3_ack', 'OBRPORTAL_M231D2C3_SYNTHETIC_ONLY', 'M231D2C3_TEST_DB',
         ['app/tests/test_m231d2c3_storage_failure.py::test_m231d2c3_real_pg_commit_ack_loss'], {}, False),
    ]
    try:
        command(['docker', 'network', 'create', '--internal', '--driver', 'bridge',
                 '--label', f'obrportal.ci.synthetic={token}', net], capture=True)
        made_network = True
        if output(['docker', 'network', 'inspect', '--format', '{{.Internal}}', net]) != 'true':
            raise RuntimeError('CI network not internal')
        command(['docker', 'run', '-d', '--pull', 'never', '--name', pg,
                 '--label', f'obrportal.ci.synthetic={token}',
                 '--network', net, '--network-alias', 'postgres', '--restart', 'no',
                 '--memory', '1024m', '--pids-limit', '256',
                 '--tmpfs', '/var/lib/postgresql/data:rw,size=768m',
                 '-e', 'POSTGRES_USER=obrtest', '-e', f'POSTGRES_PASSWORD={password}',
                 '-e', 'POSTGRES_DB=obrbootstrap', 'postgres:16-alpine'], capture=True)
        made_pg = True
        if output(['docker', 'port', pg], allow_failure=True):
            raise RuntimeError('Unexpected PostgreSQL published ports')
        wait_pg(pg, 'obrtest', 'obrbootstrap')
        print('R24M8_SYNTHETIC_PG_READY=PASS', flush=True)
        for prefix, marker, env_key, tests, extra, migrate in groups:
            database = f'{prefix}_{token}'
            psql(pg, 'postgres', 'obrtest', f'CREATE DATABASE {database}')
            psql(pg, 'postgres', 'obrtest',
                 f"COMMENT ON DATABASE {database} IS '{marker}'")
            actual = psql(pg, database, 'obrtest',
                          "SELECT shobj_description(oid,'pg_database') "
                          "FROM pg_database WHERE datname=current_database()", query=True)
            if actual != marker:
                raise RuntimeError('Synthetic database marker verification failed')
            url = f'postgresql+asyncpg://obrtest:{password}@postgres:5432/{database}'
            env = dict(extra)
            if env_key.endswith('_DB'):
                env[env_key] = database
            else:
                env[env_key] = url
            if migrate:
                command(app_args(image, net, url) + ['python', '-m', 'alembic', 'upgrade', 'head'])
            if prefix == 'r24m7a':
                psql(pg, database, 'obrtest',
                     'CREATE TABLE m7a_probe (id integer PRIMARY KEY, value integer); '
                     'INSERT INTO m7a_probe (id,value) VALUES (1,0)')
            print(f'R24M8_GROUP_{prefix.upper()}=START', flush=True)
            command(app_args(image, net, url, env) +
                    ['python', '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=short', *tests])
            print(f'R24M8_GROUP_{prefix.upper()}=PASS', flush=True)
    finally:
        if made_pg:
            remove_owned(pg, token)
        if made_network:
            remove_network(net, token)
        print('R24M8_PG_RESOURCE_CLEANUP=PASS', flush=True)


def http_group(image: str) -> None:
    token = secrets.token_hex(6)
    pg = f'obrportal-ci-http-pg-{token}'
    api = f'obrportal-ci-http-api-{token}'
    password = secrets.token_hex(24)
    secret = secrets.token_hex(24)
    marker = f'OBRPORTAL_STEP36F_SYNTHETIC_ONLY_{token}'
    url = f'postgresql+asyncpg://regression_test:{password}@127.0.0.1:5432/regression_test'
    made_pg = made_api = False
    try:
        command(['docker', 'run', '-d', '--pull', 'never', '--name', pg,
                 '--label', f'obrportal.ci.synthetic={token}',
                 '--network', 'none', '--restart', 'no', '--memory', '1024m',
                 '--pids-limit', '256', '--tmpfs', '/var/lib/postgresql/data:rw,size=768m',
                 '-e', 'POSTGRES_USER=regression_test',
                 '-e', f'POSTGRES_PASSWORD={password}', '-e', 'POSTGRES_DB=regression_test',
                 'postgres:16-alpine'], capture=True)
        made_pg = True
        if output(['docker', 'inspect', '--format', '{{.HostConfig.NetworkMode}}', pg]) != 'none':
            raise RuntimeError('HTTP PostgreSQL network not isolated')
        if output(['docker', 'port', pg], allow_failure=True):
            raise RuntimeError('Unexpected HTTP PostgreSQL ports')
        wait_pg(pg, 'regression_test', 'regression_test')
        psql(pg, 'postgres', 'regression_test',
             f"COMMENT ON DATABASE regression_test IS '{marker}'")
        actual = psql(pg, 'regression_test', 'regression_test',
                      "SELECT shobj_description(oid,'pg_database') "
                      "FROM pg_database WHERE datname=current_database()", query=True)
        if actual != marker:
            raise RuntimeError('HTTP synthetic database marker mismatch')
        network = f'container:{pg}'
        base = {
            'SECRET_KEY': secret,
            'DOCUMENT_ORG_NAME': 'GBOU RCDO TEST',
            'DOCUMENT_ORG_INN': '0278000001',
        }
        command(app_args(image, network, url, base) + ['python', '-m', 'alembic', 'upgrade', 'head'])
        command(app_args(image, network, url, base) + ['python', '-m', 'app.db.seed'])
        command(app_args(image, network, url, base | {
            'SEED_ADMIN_EMAIL': 'admin@obrportal.local',
            'SEED_ADMIN_PASSWORD': 'Admin123Local2026!',
        }) + ['python', '-m', 'app.db.seed_admin'])
        command(app_args(image, network, url, base | {
            'SEED_DEMO_EMAIL': 'learner@obrportal.local',
            'SEED_DEMO_PASSWORD': 'Learner123Local2026!',
            'SEED_DEMO_ROLE': 'learner_fl',
        }) + ['python', '-m', 'app.db.seed_demo_user'])
        command(app_args(image, network, url, base) + ['python', '-m', 'app.db.seed_demo_organization'])
        api_cmd = app_args(image, network, url,
                           base | {'PRODUCTION_EXPORTS_ENABLED': 'true'}, share_pg=True)
        api_cmd[2:2] = ['-d', '--name', api, '--label', f'obrportal.ci.synthetic={token}']
        api_cmd.remove('--rm')
        command(api_cmd + ['uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
                capture=True)
        made_api = True
        ready = False
        for _ in range(50):
            state = output(['docker', 'inspect', '--format', '{{.State.Running}}', api])
            if state != 'true':
                break
            response = command(['docker', 'exec', api, 'curl', '--silent',
                                '--output', '/dev/null', '--write-out', '%{http_code}',
                                '--connect-timeout', '1', '--max-time', '3',
                                'http://127.0.0.1:8000/health'], capture=True,
                               allow_failure=True)
            if response.returncode == 0 and response.stdout.strip() == '200':
                ready = True
                break
            time.sleep(1)
        if not ready:
            command(['docker', 'logs', '--tail', '100', api], allow_failure=True)
            raise RuntimeError('Synthetic backend health check failed')
        print('R24M8_HTTP_HEALTH=PASS', flush=True)
        test_env = base | {
            'PRODUCTION_EXPORTS_ENABLED': 'true',
            'TEST_BASE_URL': 'http://127.0.0.1:8000',
            'TEST_ADMIN_EMAIL': 'admin@obrportal.local',
            'TEST_ADMIN_PASSWORD': 'Admin123Local2026!',
            'TEST_LEARNER_EMAIL': 'learner@obrportal.local',
            'TEST_LEARNER_PASSWORD': 'Learner123Local2026!',
            'OBRPORTAL_RECOVERY_DISPOSABLE_MARKER': marker,
        }
        tests = [
            'app/tests/test_auth_rbac_admin_api.py::test_admin_can_delete_unused_organization',
            'app/tests/test_auth_rbac_admin_api.py::test_admin_delete_organization_not_found_returns_404',
            'app/tests/test_auth_rbac_admin_api.py::test_admin_apply_learner_import_returns_password_setup_invitation_for_new_user',
            'app/tests/test_mintrud_recovery_flow_api.py::test_legacy_reapproval_batch_download_repeat_history_and_no_external_transition',
        ]
        try:
            command(app_args(image, network, url, test_env) +
                    ['python', '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=short', *tests])
        except RuntimeError:
            command(['docker', 'logs', '--tail', '100', api], allow_failure=True)
            raise
        print('R24M8_HTTP_GROUP=PASS', flush=True)
    finally:
        if made_api:
            remove_owned(api, token)
        if made_pg:
            remove_owned(pg, token)
        print('R24M8_HTTP_RESOURCE_CLEANUP=PASS', flush=True)


def main() -> None:
    validate_contract()
    if sys.argv[1:] == ['--check-contract']:
        return
    if sys.argv[1:]:
        raise RuntimeError('Unrecognized arguments')
    image = ensure_ci()
    validate_collection()
    postgres_groups(image)
    http_group(image)
    print('R24M8_REGISTRY_CI_REGRESSION=PASS', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, AssertionError) as exc:
        print(f'R24M8_REGISTRY_CI_REGRESSION=FAIL: {exc}', file=sys.stderr, flush=True)
        sys.exit(1)
