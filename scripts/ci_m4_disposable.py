"""Own labelled PostgreSQL/private volumes and restartable, fail-closed cleanup."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import secrets
import subprocess
import time
import uuid
import xml.etree.ElementTree as ET
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parents[1]

def verify_results(out):
    cases=ET.parse(out/'m4.xml').getroot().findall('.//testcase')
    frdo_cases=ET.parse(out/'frdo-http.xml').getroot().findall('.//testcase')
    for label, results in [('M4', cases), ('FRDO', frdo_cases)]:
        identities=[(c.get('classname'),c.get('name')) for c in results]
        if len(identities)!=len(set(identities)): raise RuntimeError(label+' duplicate test identifiers')
    if len(frdo_cases)<13 or any(c.find('skipped') is not None or c.find('failure') is not None or c.find('error') is not None for c in frdo_cases):
        raise RuntimeError('FRDO HTTP cases missing, skipped or failed')
    skipped=[c.attrib for c in cases if c.find('skipped') is not None]
    if skipped: raise RuntimeError('Unexpected M4 skips')
    if any(c.find('failure') is not None or c.find('error') is not None for c in cases): raise RuntimeError('M4 failures')
    required=['test_enospc['+m+']' for m in ('enospc_manifest_write','enospc_manifest_fsync','enospc_publish','enospc_scan_write','enospc_scan_fsync','enospc_scan_directory')]
    required += ['test_os_denied_root','test_restart_discovery','test_restart_real_scan_attempt','test_limits','test_real_permission_denied_in_nonroot_process','test_effective_parity[both-True-True]']
    names={c.get('name') for c in cases}
    if not set(required).issubset(names): raise RuntimeError('Mandatory M4 cases missing: '+str(set(required)-names))
    mandatory=json.loads((ROOT/'scripts/m4_required_cases.json').read_text())
    mandatory_ids=[(c['classname'],c['name']) for c in mandatory]
    if len(mandatory_ids)!=72 or len(set(mandatory_ids))!=72: raise RuntimeError('Mandatory contract must contain 72 unique exact IDs')
    observed={(c.get('classname'),c.get('name')) for c in cases}
    if not all((c['classname'],c['name']) in observed for c in mandatory): raise RuntimeError('Mandatory integration contract cases missing')
    (out/'execution-proof.json').write_text(json.dumps(dict(tests=len(cases),frdo_http_tests=len(frdo_cases),skips=0,mandatory_cases=mandatory,passed=True),indent=2))


RESOURCE_SPEC = {
    'runner': ('container', '-runner'), 'pg': ('container', '-pg'),
    'volume': ('volume', '-private'), 'pgdata': ('volume', '-pgdata'),
    'network': ('network', '-net'),
}
CLEANUP_ORDER = ('runner', 'pg', 'volume', 'pgdata', 'network')


class LifecycleError(RuntimeError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def atomic_json(path, value):
    """Same-directory atomic replace; fsync file and POSIX directory metadata."""
    path = Path(path)
    temporary = path.with_name(path.name + '.writing-' + uuid.uuid4().hex)
    try:
        with temporary.open('xb') as handle:
            handle.write(canonical(value)); handle.flush(); os.fsync(handle.fileno())
        if os.name == 'nt':
            # WRITE_THROUGH also persists replacement metadata on Windows hosts.
            import ctypes
            move = ctypes.WinDLL('kernel32', use_last_error=True).MoveFileExW
            move.argtypes = [ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_ulong]
            move.restype = ctypes.c_int
            if not move(str(temporary), str(path), 0x1 | 0x8):
                raise ctypes.WinError(ctypes.get_last_error())
        else:
            os.replace(temporary, path)
            directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try: os.fsync(directory)
            finally: os.close(directory)
    finally:
        if temporary.exists(): temporary.unlink()


@contextmanager
def inventory_lock(out):
    """OS lock survives process death by release, never by deleting lock files."""
    handle = (Path(out) / '.resource-inventory.lock').open('a+b')
    try:
        handle.seek(0, 2)
        if not handle.tell(): handle.write(b'0'); handle.flush()
        handle.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise LifecycleError('Inventory is in use; no resource action allowed') from error
        yield
    finally:
        handle.close()


class Inventory:
    def __init__(self, out):
        self.out = Path(out)
        self.path = self.out / 'resources.json'

    def create(self):
        if self.path.exists():
            raise LifecycleError('Evidence already contains inventory; use cleanup-only or a fresh directory')
        owner = 'm45-' + uuid.uuid4().hex[:10]
        state = dict(inventory_version=2, owner=owner, generation=0, resources={})
        for key, (kind, suffix) in RESOURCE_SPEC.items():
            name = owner + suffix
            state[key] = name
            state['resources'][key] = dict(
                name=name, kind=kind, owner=owner, resource_token=uuid.uuid4().hex,
                creation='PLANNED', identity=None, links={}, observed_labels=None,
                cleanup=dict(status='PENDING', reason=None))
            state['resources'][key]['labels'] = required_labels(state['resources'][key])
        self.save(state)
        return state

    def validate(self, state):
        if (state.get('inventory_version') != 2 or not isinstance(state.get('generation'), int)
                or not re.fullmatch(r'm45-[0-9a-f]{10}', state.get('owner', ''))
                or set(state.get('resources', {})) != set(RESOURCE_SPEC)):
            raise LifecycleError('Invalid or unsupported resource inventory')
        for key, (kind, suffix) in RESOURCE_SPEC.items():
            resource = state['resources'][key]
            if (resource.get('kind') != kind or resource.get('owner') != state['owner']
                    or resource.get('name') != state['owner'] + suffix
                    or state.get(key) != resource['name']
                    or not re.fullmatch(r'[0-9a-f]{32}', resource.get('resource_token', ''))
                    or resource.get('labels') != required_labels(resource)
                    or resource.get('creation') not in {'PLANNED', 'CREATE_INTENT', 'CONFIRMED', 'RECOVERED'}
                    or not isinstance(resource.get('links'), dict)
                    or not isinstance(resource.get('cleanup'), dict)):
                raise LifecycleError('Inconsistent resource identity in inventory: ' + key)
            identity = resource.get('identity')
            if (resource['creation'] in {'CONFIRMED', 'RECOVERED'}) != (identity is not None):
                raise LifecycleError('Creation status contradicts recorded identity: ' + key)
            if identity is not None:
                if (not isinstance(identity, dict) or not identity.get('created')
                        or (kind == 'volume' and identity.get('id') != resource['name'])
                        or (kind != 'volume' and not re.fullmatch(r'[0-9a-f]{64}', identity.get('id', '')))):
                    raise LifecycleError('Untrusted recorded Docker identity: ' + key)
                labels = resource.get('observed_labels')
                if not isinstance(labels, dict) or any(labels.get(k) != v for k, v in required_labels(resource).items()):
                    raise LifecycleError('Missing confirmed owner labels: ' + key)

    def save(self, state):
        self.validate(state)
        state['generation'] += 1
        payload = {k: v for k, v in state.items() if k != 'integrity_sha256'}
        state['integrity_sha256'] = hashlib.sha256(canonical(payload)).hexdigest()
        atomic_json(self.path, state)

    def load(self):
        try:
            def unique(pairs):
                result = {}
                for key, value in pairs:
                    if key in result: raise ValueError('duplicate JSON key')
                    result[key] = value
                return result
            state = json.loads(self.path.read_text(encoding='utf-8'), object_pairs_hook=unique)
            digest = state.get('integrity_sha256')
            payload = {k: v for k, v in state.items() if k != 'integrity_sha256'}
            if digest != hashlib.sha256(canonical(payload)).hexdigest():
                raise ValueError('checksum mismatch')
            self.validate(state)
            return state
        except (OSError, ValueError, TypeError, KeyError, AttributeError) as error:
            raise LifecycleError('Trustworthy resource inventory unavailable: ' + type(error).__name__) from error


class Docker:
    def __init__(self, prefix, env=None):
        self.prefix = list(prefix)
        self.env = env

    def command(self, *args):
        result = subprocess.run(self.prefix + list(args), env=self.env, capture_output=True, text=True)
        if result.returncode:
            # Do not print environment values or secret-bearing run arguments.
            raise LifecycleError('Docker operation failed: ' + args[0])
        return result.stdout.strip()

    def inspect(self, kind, name):
        result = subprocess.run(self.prefix + [kind, 'inspect', name], capture_output=True, text=True)
        if result.returncode:
            error = result.stderr.lower()
            missing = ('no such container', 'no such object') if kind == 'container' else (
                ('no such volume',) if kind == 'volume' else ('not found', 'no such network'))
            if name.lower() in error and any(marker in error for marker in missing): return None
            raise LifecycleError('Docker inspect could not establish presence or absence: ' + kind)
        try:
            values = json.loads(result.stdout)
            if not isinstance(values, list) or len(values) != 1: raise ValueError()
            return values[0]
        except (ValueError, TypeError) as error:
            raise LifecycleError('Invalid Docker inspect response') from error

    def volume_refs(self, name):
        ids = self.command('ps', '-aq', '--filter', 'volume=' + name).split()
        result = []
        for identity in ids:
            value = self.inspect('container', identity)
            if value is None: raise LifecycleError('Volume reference changed during inspection')
            if not any(m.get('Type') == 'volume' and m.get('Name') == name for m in value.get('Mounts', [])):
                raise LifecycleError('Volume reference metadata contradicts Docker filter')
            result.append(value)
        return result

    def remove(self, kind, identity):
        self.command(*(['rm', '-f', identity] if kind == 'container' else [kind, 'rm', identity]))


def required_labels(resource):
    return {'m45.owner': resource['owner'], 'm45.resource': resource['resource_token']}


def docker_labels(resource):
    return [arg for k, v in required_labels(resource).items() for arg in ['--label', k + '=' + v]]


def actual_identity(resource, value):
    kind = resource['kind']
    name = value.get('Name', '').lstrip('/') if kind == 'container' else value.get('Name')
    labels = value.get('Config', {}).get('Labels') if kind == 'container' else value.get('Labels')
    if name != resource['name'] or not labels or any(labels.get(k) != v for k, v in required_labels(resource).items()):
        raise LifecycleError('Owner/name/resource token mismatch: ' + resource['name'])
    identity = dict(id=value.get('Name') if kind == 'volume' else value.get('Id'),
                    created=value.get('CreatedAt') if kind == 'volume' else value.get('Created'))
    if kind == 'volume':
        # Docker volumes expose no separate immutable ID: use name, creation,
        # driver/scope and an independently random, pre-recorded resource label.
        identity.update(driver=value.get('Driver'), scope=value.get('Scope'))
        if identity['driver'] != 'local' or identity['scope'] != 'local':
            raise LifecycleError('Unexpected volume driver/scope')
    if not identity['created'] or (kind != 'volume' and not re.fullmatch(r'[0-9a-f]{64}', identity['id'] or '')):
        raise LifecycleError('Docker identity missing')
    return identity


def container_links(value):
    return dict(image_id=value.get('Image'), network_mode=value.get('HostConfig', {}).get('NetworkMode'),
                mounts=sorted([{k: m.get(k) for k in ('Type', 'Name', 'Source', 'Destination', 'RW', 'Driver')}
                               for m in value.get('Mounts', [])], key=lambda m: m['Destination']))


class ResourceLifecycle:
    def __init__(self, out, docker):
        self.store = Inventory(out)
        self.docker = docker
        self.state = None

    def initialize(self):
        self.state = self.store.create()
        return self.state

    def observe(self, key):
        resource = self.state['resources'][key]
        value = self.docker.inspect(resource['kind'], resource['name'])
        if value is None: return None
        identity = actual_identity(resource, value)
        labels = value.get('Config', {}).get('Labels') if resource['kind'] == 'container' else value.get('Labels')
        if resource['identity'] is None:
            if resource['creation'] != 'CREATE_INTENT':
                raise LifecycleError('Resource exists without durable create intent: ' + key)
            resource['identity'] = identity
            resource['observed_labels'] = labels
            resource['creation'] = 'RECOVERED'
            if resource['kind'] == 'container': resource['links'] = container_links(value)
            self.store.save(self.state)
        elif resource['identity'] != identity:
            raise LifecycleError('Same name but different Docker identity: ' + key)
        if resource['observed_labels'] != labels:
            raise LifecycleError('Confirmed labels contradict inventory: ' + key)
        if resource['kind'] == 'container' and resource['links'] != container_links(value):
            raise LifecycleError('Container mounts/image/network contradict inventory: ' + key)
        return value

    def create(self, key, args):
        resource = self.state['resources'][key]
        if self.docker.inspect(resource['kind'], resource['name']) is not None:
            raise LifecycleError('Expected resource name already exists; never reuse it')
        resource['creation'] = 'CREATE_INTENT'; self.store.save(self.state)
        self.docker.command(*args)
        if self.observe(key) is None: raise LifecycleError('Created resource cannot be verified: ' + key)
        resource['creation'] = 'CONFIRMED'; self.store.save(self.state)

    def validate_mounts(self):
        data = {key: self.observe(key) for key in RESOURCE_SPEC}
        if any(value is None for value in data.values()): raise LifecycleError('Provisioning resource missing')
        if not data['network'].get('Internal'): raise LifecycleError('Network is not internal')
        for key, volume_key, destination in [('pg', 'pgdata', '/var/lib/postgresql/data'), ('runner', 'volume', '/private')]:
            mounts = [m for m in data[key].get('Mounts', []) if m.get('Type') == 'volume']
            volume = data[volume_key]
            if (len(mounts) != 1 or mounts[0].get('Name') != volume['Name']
                    or mounts[0].get('Source') != volume.get('Mountpoint')
                    or mounts[0].get('Destination') != destination or not mounts[0].get('RW')):
                raise LifecycleError('Unexpected or anonymous volume mount: ' + key)
            self.state['resources'][volume_key]['links'] = dict(container_id=data[key]['Id'],
                destination=destination, source=volume['Mountpoint'], name=volume['Name'], verified=True)
        self.state['resources']['network']['links'] = dict(internal=True,
            container_ids=sorted(data[k]['Id'] for k in ['runner', 'pg']))
        self.state['mounts_verified'] = True
        self.store.save(self.state)

    def _validate_refs(self, values):
        owned_ids = {v['Id']: self.state['resources'][k] for k, v in values.items()
                     if v is not None and self.state['resources'][k]['kind'] == 'container'}
        for key in ['volume', 'pgdata']:
            if values[key] is None: continue
            links = self.state['resources'][key]['links']
            if links:
                container_key, destination = ('pg', '/var/lib/postgresql/data') if key == 'pgdata' else ('runner', '/private')
                container_identity = self.state['resources'][container_key]['identity']
                if (not container_identity or links.get('container_id') != container_identity['id']
                        or links.get('name') != self.state[key] or links.get('destination') != destination
                        or links.get('source') != values[key].get('Mountpoint') or links.get('verified') is not True):
                    raise LifecycleError('Confirmed volume mount contradicts inventory: ' + key)
            for container in self.docker.volume_refs(self.state[key]):
                resource = owned_ids.get(container.get('Id'))
                if resource is None: raise LifecycleError('Foreign container reference to volume: ' + key)
                actual_identity(resource, container)
                if resource['links'] != container_links(container): raise LifecycleError('Referenced container identity drift')
        if values['network'] is not None:
            if set(values['network'].get('Containers', {})) - set(owned_ids):
                raise LifecycleError('Foreign container connected to owned network')

    def cleanup(self):
        try:
            self.state = self.store.load()  # No deletion without a valid checkpoint.
        except Exception as error:
            rows = [dict(key=key, resource=None, status='BLOCKED', absent=False,
                         reason='Trustworthy inventory unavailable') for key in CLEANUP_ORDER]
            atomic_json(self.store.out / 'cleanup.json', rows)
            atomic_json(self.store.out / 'cleanup-summary.json', dict(passed=False,
                        expected_resources=5, absent=0, resources=rows))
            raise LifecycleError('Cleanup BLOCKED: trustworthy inventory unavailable') from error
        journal = [dict(key=key, resource=self.state[key], kind=RESOURCE_SPEC[key][0],
                        status='PENDING', owner_verified=False, absent=False, reason=None) for key in CLEANUP_ORDER]
        def flush():
            atomic_json(self.store.out / 'cleanup.json', journal)
        flush()
        try:
            # Trust preflight is global: any foreign identity/reference refuses
            # ALL destructive operations, even against other owned resources.
            values = {key: self.observe(key) for key in CLEANUP_ORDER}
            self._validate_refs(values)
        except Exception as error:
            for row in journal:
                row.update(status='BLOCKED', reason=str(error))
                self.state['resources'][row['key']]['cleanup'] = dict(status='BLOCKED', reason=str(error))
            self.store.save(self.state); flush()
            atomic_json(self.store.out / 'cleanup-summary.json', dict(passed=False,
                        expected_resources=5, absent=0, resources=journal))
            raise LifecycleError('Cleanup preflight BLOCKED: ' + str(error)) from error
        failed = False
        for row in journal:
            key = row['key']; resource = self.state['resources'][key]
            if failed:
                row.update(status='BLOCKED', reason='Stopped after cleanup failure; retry from durable inventory')
                resource['cleanup'] = dict(status='BLOCKED', reason=row['reason'])
                self.store.save(self.state); flush(); continue
            try:
                value = self.observe(key)
                if value is not None:
                    if resource['kind'] == 'volume' and self.docker.volume_refs(resource['name']):
                        raise LifecycleError('Volume still referenced; preserve it: ' + key)
                    if resource['kind'] == 'network' and value.get('Containers'):
                        raise LifecycleError('Network still referenced; preserve it')
                    resource['cleanup'] = dict(status='DELETE_INTENT', reason=None)
                    self.store.save(self.state)
                    # Recheck immediately before deletion. Containers/networks
                    # are removed by full immutable ID, never by name alone.
                    value = self.observe(key)
                    if value is not None:
                        if resource['kind'] == 'volume' and self.docker.volume_refs(resource['name']):
                            raise LifecycleError('Volume reference appeared; deletion refused')
                        if resource['kind'] == 'network' and value.get('Containers'):
                            raise LifecycleError('Network reference appeared; deletion refused')
                        row['owner_verified'] = True
                        row['identity'] = resource['identity']
                        self.docker.remove(resource['kind'], resource['identity']['id'])
                    if self.docker.inspect(resource['kind'], resource['name']) is not None:
                        raise LifecycleError('Resource remains or was replaced; no cleanup PASS: ' + key)
                    row['status'] = 'REMOVED'
                else:
                    row['status'] = 'ABSENT'
                row['absent'] = True
                resource['cleanup'] = dict(status=row['status'], reason=None, absent=True)
                self.store.save(self.state); flush()
            except Exception as error:
                failed = True; row.update(status='BLOCKED', reason=str(error))
                resource['cleanup'] = dict(status='BLOCKED', reason=str(error))
                self.store.save(self.state); flush()
        atomic_json(self.store.out / 'cleanup-summary.json', dict(passed=not failed,
                    expected_resources=5, absent=sum(r['absent'] for r in journal), resources=journal))
        if failed: raise LifecycleError('Cleanup BLOCKED; owned resources may remain; see cleanup journal')
        return journal


def provision(lifecycle, backend_image):
    state = lifecycle.state
    lifecycle.create('network', ['network', 'create', '--internal', *docker_labels(state['resources']['network']), state['network']])
    for key in ['volume', 'pgdata']:
        lifecycle.create(key, ['volume', 'create', *docker_labels(state['resources'][key]), state[key]])
    lifecycle.create('pg', ['run', '-d', '--name', state['pg'], *docker_labels(state['resources']['pg']),
        '--network', state['network'], '--mount', f'type=volume,source={state["pgdata"]},target=/var/lib/postgresql/data',
        '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=m45', '-e', 'POSTGRES_DB=m45', 'postgres:16.14-bookworm'])
    lifecycle.create('runner', ['run', '-d', '--name', state['runner'], *docker_labels(state['resources']['runner']),
        '--network', state['network'], '--mount', f'type=bind,source={ROOT/"backend"},target=/app,readonly',
        '--mount', f'type=bind,source={lifecycle.store.out},target=/harness',
        '--mount', f'type=volume,source={state["volume"]},target=/private', '-w', '/app',
        '-e', 'DATABASE_URL', '-e', 'SECRET_KEY', '-e', 'ENVIRONMENT=test',
        '-e', 'DOCUMENT_STORAGE_DIR=/private', '-e', 'PYTHONDONTWRITEBYTECODE=1',
        '--entrypoint', 'sleep', backend_image, 'infinity'])
    lifecycle.validate_mounts()


def execute_tests(prefix, state, out):
    def run(argv, filename, extra=()):
        with (out / filename).open('w') as log:
            result = subprocess.run(prefix + ['exec', *extra, state['runner'], *argv], stdout=log, stderr=subprocess.STDOUT)
        if result.returncode: raise LifecycleError('M4 command failed; see ' + filename)
    for _ in range(60):
        ready = subprocess.run(prefix + ['exec', state['pg'], 'pg_isready', '-U', 'm45'], capture_output=True)
        if ready.returncode == 0: break
        time.sleep(1)
    else: raise LifecycleError('Own PostgreSQL readiness failed')
    run(['python', '-c', "import os;os.chmod('/private',0o700);print('private permissions ready')"], 'private-root.log')
    run(['alembic', 'upgrade', 'head'], 'migration.log')
    run(['alembic', 'heads'], 'alembic-heads.log')
    ignored = ['test_registry_catalog_policy_fence_pg.py', 'test_catalog_writers_pg.py', 'test_document_writers_pg.py',
               'test_import_writers_pg.py', 'test_learner_import_apply_service.py',
               'test_admin_learner_import_course_notifications_api.py', 'test_mintrud_recovery_flow_api.py']
    run(['python', '-m', 'pytest', '-p', 'no:cacheprovider', '--collect-only', 'app/tests', '-q',
         *['--ignore=app/tests/' + n for n in ignored]], 'ordinary-collection.log', ('-e', 'M45_INTEGRATION=0'))
    selection = json.loads((ROOT / 'scripts/m4_backend_tests.json').read_text())
    run(['python', '-m', 'pytest', '-p', 'no:cacheprovider', *selection, '--junitxml=/harness/m4.xml', '-q', '--tb=short'],
        'm4-tests.log', ('-e', 'M45_INTEGRATION=1'))
    run(['python', '-m', 'app.tests.m4_frdo_http'], 'frdo-http.log', ('-e', 'M45_INTEGRATION=1'))
    verify_results(out)


def run_job(out, prefix, backend_image, no_build, docker=None, tests=None):
    env = os.environ.copy()
    credential = secrets.token_urlsafe(24)
    lifecycle = ResourceLifecycle(out, docker or Docker(prefix, env))
    state = lifecycle.initialize()  # Durable owner/name/token intents before any Docker create/build.
    env.update(POSTGRES_PASSWORD=credential, DATABASE_URL=f'postgresql+asyncpg://m45:{credential}@{state["pg"]}:5432/m45',
               SECRET_KEY=secrets.token_urlsafe(32))
    run_error = None
    try:
        if not no_build:
            with (out / 'image-build.log').open('w') as log:
                subprocess.run(prefix + ['build', '-t', backend_image, '-f', str(ROOT / 'backend/Dockerfile.m4-tests'),
                                       str(ROOT / 'backend')], stdout=log, stderr=subprocess.STDOUT, check=True)
        provision(lifecycle, backend_image)
        (tests or execute_tests)(prefix, lifecycle.state, out)
    except BaseException as error:
        run_error = error
    finally:
        try:
            value = lifecycle.observe('runner')
            if value is not None:
                with (out / 'memory-diagnostics.log').open('w') as log:
                    subprocess.run(prefix + ['exec', value['Id'], 'sh', '-c',
                        'cat /proc/meminfo; cat /sys/fs/cgroup/memory.events; cat /sys/fs/cgroup/memory.peak'],
                        stdout=log, stderr=subprocess.STDOUT)
        except Exception:
            pass  # Diagnostics never authorize deletion or override lifecycle errors.
        cleanup_error = None
        try:
            lifecycle.cleanup()
        except BaseException as error:
            cleanup_error = error
        atomic_json(out / 'job-result.json', dict(tests_passed=run_error is None,
                    cleanup_passed=cleanup_error is None, passed=run_error is None and cleanup_error is None,
                    run_error_type=type(run_error).__name__ if run_error else None,
                    cleanup_error_type=type(cleanup_error).__name__ if cleanup_error else None))
        if cleanup_error is not None:
            raise cleanup_error from run_error  # Successful pytest never masks failed cleanup.
    if run_error is not None: raise run_error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--backend-image', default='obrportal-m4-tests:local')
    parser.add_argument('--no-build', action='store_true')
    parser.add_argument('--context')
    parser.add_argument('--cleanup-only', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    out = args.evidence.resolve(); out.mkdir(parents=True, exist_ok=True)
    if args.verify_only:
        verify_results(out); return
    prefix = ['docker'] + (['--context', args.context] if args.context else [])
    with inventory_lock(out):
        if args.cleanup_only:
            ResourceLifecycle(out, Docker(prefix)).cleanup()
        else:
            run_job(out, prefix, args.backend_image, args.no_build)


if __name__ == '__main__': main()
