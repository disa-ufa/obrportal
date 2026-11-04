import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from ci_m4_disposable import verify_results, ROOT

class ResultContractTests(unittest.TestCase):
    def fixture(self,root):
        suite=ET.Element('testsuite')
        for c in json.loads((ROOT/'scripts/m4_required_cases.json').read_text()):ET.SubElement(suite,'testcase',c)
        ET.ElementTree(suite).write(root/'m4.xml')
        frdo=ET.Element('testsuite')
        for i in range(13):ET.SubElement(frdo,'testcase',name='synthetic-'+str(i))
        ET.ElementTree(frdo).write(root/'frdo-http.xml')
        return suite,frdo
    def test_all_mandatory_cases_pass(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);self.fixture(root);verify_results(root)
            self.assertTrue(json.loads((root/'execution-proof.json').read_text())['passed'])
    def test_removed_fault_case_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);suite.remove(suite[0]);ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_unexpected_m4_skip_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);ET.SubElement(suite[0],'skipped');ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_frdo_skip_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);_,suite=self.fixture(root);ET.SubElement(suite[0],'skipped');ET.ElementTree(suite).write(root/'frdo-http.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_m4_failure_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);ET.SubElement(suite[0],'failure');ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_m4_error_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);ET.SubElement(suite[0],'error');ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_similar_name_is_not_exact_identity(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);suite[0].set('name',suite[0].get('name')+'-similar');ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_unrelated_substitution_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);suite[0].set('name','test_unrelated_synthetic_replacement');ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_duplicate_observed_mandatory_id_fails(self):
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);suite,_=self.fixture(root);ET.SubElement(suite,'testcase',dict(suite[0].attrib));ET.ElementTree(suite).write(root/'m4.xml')
            with self.assertRaises(RuntimeError):verify_results(root)
    def test_duplicate_manifest_identity_fails(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as name:
            root=Path(name);self.fixture(root);(root/'scripts').mkdir()
            contract=json.loads((ROOT/'scripts/m4_required_cases.json').read_text());contract[-1]=contract[0]
            (root/'scripts/m4_required_cases.json').write_text(json.dumps(contract))
            with patch('ci_m4_disposable.ROOT',root), self.assertRaises(RuntimeError):verify_results(root)


# Synthetic Docker adapter only: never touch host containers/volumes in unit tests.
import copy
import hashlib
import subprocess
from unittest.mock import patch
import ci_m4_disposable as ci


class SyntheticDocker:
    def __init__(self):
        self.objects = {}
        self.removals = []
        self.calls = []
        self.serial = 0
        self.inspect_error = None
        self.swap_on_inspect = None

    def command(self, *args):
        self.calls.append(args)
        if args[:2] == ('network', 'create'): kind, name = 'network', args[-1]
        elif args[:2] == ('volume', 'create'): kind, name = 'volume', args[-1]
        elif args[0] == 'run': kind, name = 'container', args[args.index('--name') + 1]
        else: raise AssertionError('Unexpected synthetic command: ' + str(args))
        labels = {}
        for i, value in enumerate(args):
            if value == '--label':
                key, val = args[i + 1].split('=', 1); labels[key] = val
        self.serial += 1
        identity = hashlib.sha256((name + str(self.serial)).encode()).hexdigest()
        stamp = '2026-11-04T00:00:%02dZ' % self.serial
        if kind == 'volume':
            value = dict(Name=name, CreatedAt=stamp, Labels=labels, Driver='local', Scope='local',
                         Mountpoint='/var/lib/docker/volumes/' + name + '/_data')
        elif kind == 'network':
            value = dict(Name=name, Id=identity, Created=stamp, Labels=labels, Internal=True, Containers={})
        else:
            mounts = []
            for i, arg in enumerate(args):
                if arg != '--mount': continue
                spec = dict((part.split('=', 1) if '=' in part else (part, True)) for part in args[i + 1].split(','))
                volume = spec['type'] == 'volume'
                mounts.append(dict(Type=spec['type'], Name=spec['source'] if volume else None,
                    Source='/var/lib/docker/volumes/' + spec['source'] + '/_data' if volume else spec['source'],
                    Destination=spec['target'], RW=not spec.get('readonly', False), Driver='local' if volume else None))
            value = dict(Name='/' + name, Id=identity, Created=stamp, Config=dict(Labels=labels),
                Image='sha256:synthetic-image', Mounts=mounts,
                HostConfig=dict(NetworkMode=args[args.index('--network') + 1] if '--network' in args else 'none'))
        self.objects[(kind, name)] = value
        return name if kind == 'volume' else identity

    def inspect(self, kind, name):
        self.calls.append(('inspect', kind, name))
        if self.inspect_error == (kind, name): raise ci.LifecycleError('Synthetic daemon inspect failure')
        if self.swap_on_inspect:
            self.swap_on_inspect(kind, name)
        value = self.objects.get((kind, name))
        if value is None:
            value = next((v for (k, _), v in self.objects.items() if k == kind and v.get('Id') == name), None)
        if value is None: return None
        value = copy.deepcopy(value)
        if kind == 'network':
            value['Containers'] = {v['Id']: {'Name': v['Name']} for (k, _), v in self.objects.items()
                                   if k == 'container' and v['HostConfig']['NetworkMode'] == value['Name']}
        return value

    def volume_refs(self, name):
        self.calls.append(('volume_refs', name))
        return [copy.deepcopy(v) for (kind, _), v in self.objects.items() if kind == 'container'
                and any(m.get('Name') == name for m in v['Mounts'])]

    def remove(self, kind, identity):
        key = next((k for k, v in self.objects.items() if k[0] == kind and (v.get('Id') or v['Name']) == identity), None)
        if key is None: raise ci.LifecycleError('Synthetic resource missing at remove')
        self.removals.append((kind, identity)); del self.objects[key]


class ResourceLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.out = Path(self.folder.name)
        self.docker = SyntheticDocker()
        self.lifecycle = ci.ResourceLifecycle(self.out, self.docker)
        self.state = self.lifecycle.initialize()

    def complete(self):
        ci.provision(self.lifecycle, 'synthetic-backend')

    def object(self, key):
        return self.docker.objects[(ci.RESOURCE_SPEC[key][0], self.state[key])]

    def block_without_deletions(self):
        with self.assertRaises(ci.LifecycleError): self.lifecycle.cleanup()
        self.assertEqual(self.docker.removals, [])

    def test_named_pgdata_labels_mount_and_all_five_inventory(self):
        self.complete(); state = self.lifecycle.store.load()
        self.assertTrue(state['mounts_verified']); self.assertEqual(set(state['resources']), set(ci.RESOURCE_SPEC))
        for key, resource in state['resources'].items():
            self.assertEqual(resource['creation'], 'CONFIRMED')
            self.assertTrue(resource['identity']['id'])
            self.assertEqual(resource['labels'], ci.required_labels(resource))
            for name, value in resource['labels'].items(): self.assertEqual(resource['observed_labels'][name], value)
        mount = next(m for m in self.object('pg')['Mounts'] if m['Destination'] == '/var/lib/postgresql/data')
        self.assertEqual(mount['Name'], state['pgdata'])
        self.assertEqual(len([m for m in self.object('pg')['Mounts'] if m['Type'] == 'volume']), 1)

    def test_normal_cleanup_and_repeated_cleanup_only_are_idempotent(self):
        self.complete(); first = self.lifecycle.cleanup()
        self.assertEqual(len(first), 5); self.assertTrue(all(x['absent'] for x in first))
        self.assertEqual(len(self.docker.removals), 5)
        again = ci.ResourceLifecycle(self.out, self.docker).cleanup()
        self.assertEqual(len(self.docker.removals), 5)
        self.assertTrue(all(x['status'] == 'ABSENT' for x in again))
        self.assertFalse(self.docker.objects)

    def test_wrong_owner_label_refuses_every_deletion(self):
        self.complete(); self.object('pgdata')['Labels']['m45.owner'] = 'm45-fffffffffe'
        self.block_without_deletions()

    def test_matching_name_but_foreign_container_id_refused(self):
        self.complete(); self.object('pg')['Id'] = 'f' * 64
        self.block_without_deletions()

    def test_matching_name_but_recreated_volume_identity_refused(self):
        self.complete(); self.object('pgdata')['CreatedAt'] = '2026-11-04T10:00:00Z'
        self.block_without_deletions()

    def test_resource_token_cannot_be_replaced_with_same_owner(self):
        self.complete(); self.object('pgdata')['Labels']['m45.resource'] = 'f' * 32
        self.block_without_deletions()

    def test_foreign_active_reference_preserves_all_resources(self):
        self.complete(); foreign = dict(Name='/synthetic-foreign', Id='e' * 64,
            Config=dict(Labels={'m45.owner': 'm45-fffffffffe'}), Image='synthetic', Created='synthetic',
            HostConfig=dict(NetworkMode='none'), Mounts=[dict(Type='volume', Name=self.state['pgdata'])])
        self.docker.objects[('container', 'synthetic-foreign')] = foreign
        self.block_without_deletions()
        self.assertEqual(self.docker.objects[('container', 'synthetic-foreign')], foreign)

    def test_foreign_network_reference_refused(self):
        self.complete()
        self.docker.objects[('container', 'synthetic-foreign')] = dict(Name='/synthetic-foreign', Id='e'*64,
            Config=dict(Labels={}), HostConfig=dict(NetworkMode=self.state['network']), Mounts=[])
        self.block_without_deletions()

    def test_missing_inventory_causes_no_docker_actions(self):
        self.lifecycle.store.path.unlink(); before = list(self.docker.calls)
        self.block_without_deletions(); self.assertEqual(self.docker.calls, before)

    def test_corrupt_inventory_checksum_causes_no_docker_actions(self):
        data = json.loads(self.lifecycle.store.path.read_text()); data['owner'] = 'm45-fffffffffe'
        self.lifecycle.store.path.write_text(json.dumps(data)); before = list(self.docker.calls)
        self.block_without_deletions(); self.assertEqual(self.docker.calls, before)

    def test_valid_checksum_cannot_authorize_arbitrary_anonymous_name(self):
        data = self.lifecycle.store.load(); data['pgdata'] = 'e' * 64
        with self.assertRaises(ci.LifecycleError): self.lifecycle.store.save(data)
        self.assertFalse(self.docker.removals)

    def test_recorded_container_mount_contradiction_refused(self):
        self.complete(); self.object('pg')['Mounts'][0]['Name'] = 'synthetic-unowned-volume'
        self.block_without_deletions()

    def test_recorded_volume_source_contradiction_refused(self):
        self.complete(); self.object('pgdata')['Mountpoint'] = '/synthetic-different-source'
        self.block_without_deletions()

    def test_unexpected_anonymous_mount_stops_testing(self):
        self.complete(); self.object('pg')['Mounts'].append(dict(Type='volume', Name='e'*64,
            Source='/synthetic', Destination='/unexpected', RW=True, Driver='local'))
        with self.assertRaises(ci.LifecycleError): self.lifecycle.validate_mounts()
        self.assertFalse(self.docker.removals)

    def test_unrelated_anonymous_volume_is_never_inspected_or_removed(self):
        self.complete(); foreign_name = 'e' * 64
        foreign = dict(Name=foreign_name, Labels={}, CreatedAt='synthetic', Driver='local', Scope='local')
        self.docker.objects[('volume', foreign_name)] = foreign
        self.lifecycle.cleanup()
        self.assertEqual(self.docker.objects[('volume', foreign_name)], foreign)
        self.assertFalse(any(foreign_name in call for call in self.docker.calls))

    def test_interruption_after_create_before_checkpoint_is_recovered(self):
        resource = self.state['resources']['pgdata']; resource['creation'] = 'CREATE_INTENT'
        self.lifecycle.store.save(self.state)
        self.docker.command('volume', 'create', *ci.docker_labels(resource), resource['name'])
        self.assertIsNone(self.lifecycle.store.load()['resources']['pgdata']['identity'])
        restarted = ci.ResourceLifecycle(self.out, self.docker)
        result = restarted.cleanup(); recorded = restarted.store.load()['resources']['pgdata']
        self.assertEqual(recorded['creation'], 'RECOVERED')
        self.assertEqual(recorded['observed_labels'], ci.required_labels(recorded))
        self.assertTrue(all(x['absent'] for x in result)); self.assertEqual(len(self.docker.removals), 1)

    def test_restart_retains_owner_tokens_identity_and_links(self):
        self.complete(); saved = self.lifecycle.store.load()
        restarted = ci.ResourceLifecycle(self.out, self.docker); restarted.cleanup()
        for key, resource in restarted.store.load()['resources'].items():
            for name in ['owner', 'resource_token', 'identity', 'links', 'observed_labels']:
                self.assertEqual(resource[name], saved['resources'][key][name])

    def test_existing_resource_without_durable_intent_is_not_adopted(self):
        resource = self.state['resources']['pgdata']
        self.docker.command('volume', 'create', *ci.docker_labels(resource), resource['name'])
        self.block_without_deletions()

    def test_inspect_error_is_not_treated_as_absence(self):
        self.complete(); self.docker.inspect_error = ('volume', self.state['pgdata'])
        self.block_without_deletions()

    def test_atomic_write_failure_keeps_previous_valid_inventory(self):
        old = self.lifecycle.store.path.read_bytes()
        with patch.object(ci, 'atomic_json', side_effect=OSError('synthetic disk error')):
            with self.assertRaises(OSError): self.lifecycle.store.save(self.state)
        self.assertEqual(self.lifecycle.store.path.read_bytes(), old)
        self.assertEqual(self.lifecycle.store.load()['owner'], self.state['owner'])

    def test_duplicate_json_keys_refused(self):
        self.lifecycle.store.path.write_text('{"owner":"one","owner":"two"}')
        self.block_without_deletions(); self.assertFalse(self.docker.calls)

    def test_matching_name_replacement_before_delete_is_refused(self):
        self.complete(); counts = {}
        def replace(kind, name):
            counts[(kind, name)] = counts.get((kind, name), 0) + 1
            if kind == 'container' and name == self.state['runner'] and counts[(kind, name)] == 3:
                self.object('runner')['Id'] = 'f' * 64
        self.docker.swap_on_inspect = replace
        with self.assertRaises(ci.LifecycleError): self.lifecycle.cleanup()
        self.assertFalse(self.docker.removals)
        self.assertFalse(json.loads((self.out/'cleanup-summary.json').read_text())['passed'])

    def test_failed_removal_never_claims_cleanup_pass(self):
        self.complete()
        with patch.object(self.docker, 'remove', side_effect=ci.LifecycleError('synthetic removal failure')):
            with self.assertRaises(ci.LifecycleError): self.lifecycle.cleanup()
        summary = json.loads((self.out/'cleanup-summary.json').read_text())
        self.assertFalse(summary['passed']); self.assertEqual(summary['absent'], 0)
        self.assertEqual(len(summary['resources']), 5)

    def test_pytest_failure_still_cleans_owned_resources(self):
        # Use a new directory because run_job must reject reuse of evidence.
        folder = self.out/'job'; folder.mkdir()
        def fail_tests(*args): raise ci.LifecycleError('synthetic pytest failure')
        with patch.object(ci.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            with self.assertRaisesRegex(ci.LifecycleError, 'pytest failure'):
                ci.run_job(folder, ['synthetic-docker'], 'synthetic-image', True, self.docker, fail_tests)
        self.assertFalse(self.docker.objects)
        self.assertTrue(json.loads((folder/'cleanup-summary.json').read_text())['passed'])

    def test_postgres_startup_failure_still_cleans_owned_resources(self):
        folder = self.out/'job'; folder.mkdir()
        def startup_failed(*args): raise ci.LifecycleError('synthetic PostgreSQL readiness failed')
        with patch.object(ci.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            with self.assertRaisesRegex(ci.LifecycleError, 'readiness failed'):
                ci.run_job(folder, ['synthetic-docker'], 'synthetic-image', True, self.docker, startup_failed)
        self.assertFalse(self.docker.objects)

    def test_interrupted_partial_setup_still_cleans_created_resources(self):
        folder = self.out/'job'; folder.mkdir()
        def partial(lifecycle, image):
            resource = lifecycle.state['resources']['pgdata']
            lifecycle.create('pgdata', ['volume', 'create', *ci.docker_labels(resource), resource['name']])
            raise ci.LifecycleError('synthetic partial setup failure')
        with patch.object(ci, 'provision', side_effect=partial):
            with self.assertRaisesRegex(ci.LifecycleError, 'partial setup failure'):
                ci.run_job(folder, ['synthetic-docker'], 'synthetic-image', True, self.docker)
        self.assertFalse(self.docker.objects)

    def test_cleanup_refusal_overrides_successful_tests(self):
        folder = self.out/'job'; folder.mkdir()
        def successful_tests(prefix, state, out):
            self.docker.objects[('volume', state['pgdata'])]['Labels']['m45.owner'] = 'm45-fffffffffe'
        with patch.object(ci.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)):
            with self.assertRaisesRegex(ci.LifecycleError, 'Cleanup preflight BLOCKED'):
                ci.run_job(folder, ['synthetic-docker'], 'synthetic-image', True, self.docker, successful_tests)
        self.assertFalse(self.docker.removals)

    def test_docker_inspect_auth_error_is_not_absent(self):
        docker = ci.Docker(['synthetic-docker'])
        result = subprocess.CompletedProcess([], 1, '', 'daemon access denied')
        with patch.object(ci.subprocess, 'run', return_value=result):
            with self.assertRaises(ci.LifecycleError): docker.inspect('volume', self.state['pgdata'])

    def test_docker_inspect_exact_not_found_is_absent(self):
        docker = ci.Docker(['synthetic-docker']); name=self.state['pgdata']
        result = subprocess.CompletedProcess([], 1, '', 'Error: get '+name+': no such volume')
        with patch.object(ci.subprocess, 'run', return_value=result): self.assertIsNone(docker.inspect('volume', name))

    def test_inventory_lock_refuses_concurrent_cleanup(self):
        with ci.inventory_lock(self.out):
            with self.assertRaises(ci.LifecycleError):
                with ci.inventory_lock(self.out): self.fail('Concurrent lock was acquired')


if __name__ == '__main__': unittest.main()
