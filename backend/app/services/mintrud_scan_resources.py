"""Scan-specific ownership and recovery. Does not change shared document writers."""
from dataclasses import dataclass, asdict
from datetime import datetime
import json, re
@dataclass
class Resource:
    path: str
    created: bool = False
    complete: bool = False
    durable: bool = False
    cleanup_confirmed: bool = False
    recovery_required: bool = False
    collision: bool = False
    identity: tuple | None = None

from app.services.mintrud_scan_namespace import Namespace, StorageFailure, classify_os

# Compatibility predicate only. HTTP never attempts destructive cleanup.
def cleanup_owned(resource):
    return resource.cleanup_confirmed

class ScanAttempt:
    def __init__(self, relative, manifest):
        self.scan = Resource(relative)
        self.manifest = Resource(relative + '.pending.json')
        self.temporary = Resource(self.manifest.path + '.writing-' + manifest['upload_attempt_id'])
        self.data = manifest
        self.namespace = None

    def publish_manifest(self):
        self.namespace = Namespace(writable=True).__enter__()
        self.namespace.budget(self.data['size'])
        content = json.dumps(self.data, sort_keys=True).encode()
        self.namespace.write(self.temporary, content)
        self.namespace.publish(self.temporary, self.manifest, content)

    def retain(self):
        for resource in (self.scan,self.manifest,self.temporary):
            if resource.created:resource.recovery_required = True

    def rollback_files(self):
        self.retain()
        return False

    def confirmed(self):
        # Retain immutable final and temporary evidence even on success.
        return self.manifest.durable and self.scan.durable

    def close(self):
        if self.namespace:self.namespace.close()

    def states(self):
        return {name: asdict(getattr(self,name)) for name in ('scan','manifest','temporary')}

def write_resource(resource, content, namespace):
    namespace.write(resource,content)

def classify_commit(session, entered, returned, error):
    """Pinned SQLAlchemy 2.0 adapter. Unknown states always retain evidence."""
    tx = session.sync_session.get_transaction()
    state = getattr(getattr(tx, '_state', None), 'name', None)
    if returned or state == 'COMMITTED':
        return 'COMMITTED'
    if not entered:
        return 'BEFORE_COMMIT'
    # A server constraint rejection AND a DBAPI rollback/deactivated transaction
    # prove failure. An exception class alone never authorizes unlink.
    orig = getattr(error, 'orig', None)
    sqlstate = getattr(orig, 'sqlstate', None) or getattr(orig, 'pgcode', None)
    if state in {'DEACTIVE', 'PREPARED'} and sqlstate and sqlstate.startswith('23'):
        return 'ROLLED_BACK'
    return 'COMMIT_UNKNOWN'

def inspect_manifest(path, database_record=None, database_authoritative=False):
    """Structured dry-run only. Observations never authorize deletion."""
    from pathlib import PurePosixPath
    from app.core.config import settings
    from hashlib import sha256
    from app.services.mintrud_protocol_scans import require_scan_storage_path, sniff_signed_scan_media_type
    result = {'state':'COMMIT_UNKNOWN','observed_match':None,'manifest_kind':'unknown',
              'manifest_state':'unknown','file_state':'not_checked',
              'database_authoritative':bool(database_authoritative),
              'reason':None,'destructive_action_allowed':False}
    def outcome(state,reason=None):
        return {**result,'state':state,'reason':reason}
    try:
        raw = PurePosixPath(str(path))
        relative = raw.relative_to(PurePosixPath(str(settings.document_storage_dir))).as_posix()
        temporary = '.writing-' in raw.name
        result['manifest_kind'] = 'temporary' if temporary else 'final'
    except (ValueError,TypeError):return outcome('INVALID_PATH')
    try:
        with Namespace() as namespace:
            try:
                content = namespace.read(relative,65536)
            except OSError as error:
                reason=classify_os(error)
                return outcome('MANIFEST_MISSING' if reason=='FILE_MISSING' else reason)
            except StorageFailure as error:
                return outcome(error.reason if error.reason in {'INVALID_PATH','ACCESS_DENIED'} else 'STORAGE_UNAVAILABLE',error.reason)
            try:
                data=json.loads(content)
                if (data['schema_version']!=1 or not re.fullmatch(r'[0-9a-f]{32}',data['upload_attempt_id'])
                    or not re.fullmatch(r'[0-9a-f]{64}',data['sha256'])
                    or type(data['size']) is not int or not 0<data['size']<=10*1024*1024
                    or data['media_type'] not in {'application/pdf','image/png','image/jpeg'}
                    or data['state']!='PENDING_DATABASE_COMMIT'):
                    raise ValueError()
                created=datetime.fromisoformat(data['created_at'])
                if created.tzinfo is None:raise ValueError()
            except Exception:
                return outcome('INCOMPLETE_MANIFEST' if temporary else 'INVALID_MANIFEST','INVALID_JSON_OR_SCHEMA')
            try:
                target=require_scan_storage_path(data['protocol_id'],data['storage_path'])
                final=target+'.pending.json'
                if relative not in {final,final+'.writing-'+data['upload_attempt_id']}:raise ValueError()
                result['manifest_state'] = 'unpublished' if temporary else 'published'
            except Exception:
                return outcome('INVALID_PATH','MANIFEST_PATH_MISMATCH')
            try:
                scan=namespace.read(target,10*1024*1024)
            except OSError as error:
                reason=classify_os(error)
                result['file_state'] = reason
                if reason=='FILE_MISSING' and temporary:
                    return outcome('UNPUBLISHED_MANIFEST','FINAL_PUBLICATION_NOT_PROVEN')
                if reason=='FILE_MISSING':
                    return outcome('MISSING_REFERENCED_FILE' if database_record and database_authoritative else 'FILE_MISSING')
                return outcome(reason)
            except StorageFailure as error:
                return outcome('INTEGRITY_MISMATCH' if error.reason=='SIZE_LIMIT' else 'STORAGE_UNAVAILABLE',error.reason)
            if len(scan)!=data['size'] or sha256(scan).hexdigest()!=data['sha256'] or sniff_signed_scan_media_type(scan)!=data['media_type']:
                result['file_state'] = 'INTEGRITY_MISMATCH'
                return outcome('INTEGRITY_MISMATCH','FILE_METADATA_MISMATCH')
            result['file_state'] = 'MATCH'
            if database_record:
                result['observed_match'] = all(database_record.get(key)==value for key,value in {
                    'signed_scan_path':target,'signed_scan_sha256':data['sha256'],
                    'signed_scan_size':data['size'],'signed_scan_media_type':data['media_type']}.items())
            if temporary:return outcome('UNPUBLISHED_MANIFEST','FINAL_PUBLICATION_NOT_PROVEN')
            if not database_authoritative:return outcome('COMMIT_UNKNOWN','NON_AUTHORITATIVE_DATABASE')
            if database_record:return outcome('CONFIRMED_MATCH' if result['observed_match'] else 'INTEGRITY_MISMATCH')
            return outcome('UNREFERENCED_REVIEW')
    except OSError as error:
        return outcome(classify_os(error))
    except StorageFailure as error:
        return outcome(error.reason if error.reason in {'INVALID_PATH','ACCESS_DENIED'} else 'STORAGE_UNAVAILABLE',error.reason)
