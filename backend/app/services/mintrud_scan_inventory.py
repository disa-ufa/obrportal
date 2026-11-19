"""Bounded, read-only discovery. No database connection and no repair operations.

Run: python -m app.mintrud_scan_inventory_cli --root /private
Limits: --max-entries 5000 --max-depth 16 --max-seconds 10.
Moved outside root: outside the discovery guarantee; external relocation is BLOCKED.
Concurrent namespace changes require a new inventory under operator quiescence.
"""
import json
import os
import stat
import time
from app.core.config import settings
from app.services.mintrud_scan_namespace import Namespace, StorageFailure, classify_os
from app.services.mintrud_scan_resources import inspect_manifest


def inventory(max_entries=5000, max_depth=16, max_seconds=10):
    result = dict(state='READ_ONLY', complete=True, artifacts=[], errors=[],
                  destructive_action_allowed=False, external_relocation='BLOCKED')
    deadline = time.monotonic() + max_seconds
    groups = {}
    count = 0
    def incomplete(reason, path):
        result['complete'] = False
        result['errors'].append(dict(reason=reason, path=path))
    try:
        with Namespace() as ns:
            device = os.fstat(ns.fd).st_dev
            def walk(fd, prefix, depth):
                nonlocal count
                if depth > max_depth:
                    incomplete('DEPTH_LIMIT', prefix)
                    return
                with os.scandir(fd) as entries:
                    for entry in entries:
                        if time.monotonic() >= deadline or count >= max_entries:
                            incomplete('TIME_OR_ENTRY_LIMIT', prefix)
                            return
                        count += 1
                        path = prefix + entry.name
                        try:
                            info = os.stat(entry.name, dir_fd=fd, follow_symlinks=False)
                            if stat.S_ISLNK(info.st_mode):
                                incomplete('SYMLINK_NOT_FOLLOWED', path)
                                continue
                            if info.st_dev != device:
                                incomplete('DEVICE_BOUNDARY', path)
                                continue
                            if stat.S_ISDIR(info.st_mode):
                                child = os.open(entry.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                                try:
                                    ns.verify_directory(child, root=True)
                                    current = os.fstat(child)
                                    if (info.st_dev, info.st_ino) != (current.st_dev, current.st_ino):
                                        incomplete('DIRECTORY_CHANGED', path)
                                    else:
                                        walk(child, path+'/', depth+1)
                                finally:
                                    os.close(child)
                            elif stat.S_ISREG(info.st_mode) and ('.pending.json' in entry.name or entry.name.lower().endswith(('.pdf','.png','.jpg','.jpeg'))):
                                key = (info.st_dev, info.st_ino)
                                groups.setdefault(key, []).append(path)
                        except OSError as exc:
                            incomplete(classify_os(exc), path)
                        except StorageFailure as exc:
                            incomplete(exc.reason, path)
            walk(ns.fd, '', 0)
            for identity, paths in groups.items():
                if time.monotonic() >= deadline:
                    incomplete('TIME_LIMIT', '')
                    break
                item = dict(identity=list(identity), found_paths=paths,
                            state='UNREFERENCED_REVIEW', destructive_action_allowed=False)
                for path in sorted(paths, key=lambda p: '.writing-' not in p):
                    if '.pending.json' not in path:
                        continue
                    try:
                        data = json.loads(ns.read(path, 65536))
                        original = data.get('storage_path') if isinstance(data, dict) else None
                        item['manifest_storage_path'] = original
                        expected = str(original)+'.pending.json'
                        expected_temp = expected+'.writing-'+str(data.get('upload_attempt_id'))
                        if path not in (expected, expected_temp):
                            item['state'] = 'RELOCATION_REVIEW'
                        else:
                            observation = inspect_manifest(str(settings.document_storage_dir)+'/'+path)
                            item['state'] = observation['state']
                            item['observation'] = observation
                    except (ValueError, TypeError, AttributeError):
                        item['state'] = 'INVALID_MANIFEST'
                    except OSError as exc:
                        item['state'] = classify_os(exc)
                        incomplete(item['state'], path)
                    except StorageFailure as exc:
                        item['state'] = exc.reason
                        incomplete(exc.reason, path)
                result['artifacts'].append(item)
    except OSError as exc:
        incomplete(classify_os(exc), '')
    except StorageFailure as exc:
        incomplete(exc.reason, '')
    if not result['complete']:
        result['state'] = 'INCOMPLETE_INVENTORY'
    result['entries_examined'] = count
    return result
