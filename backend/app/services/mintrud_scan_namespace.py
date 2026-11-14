"""Linux private scan namespace. No destructive filesystem operations."""
import errno
try:
    import fcntl
except ImportError:
    fcntl = None
import hashlib
import os
import stat
from pathlib import PurePosixPath
from app.core.config import settings

MAX_ARTIFACTS = 5000
MIN_FREE_BYTES = 50 * 1024 * 1024

class StorageFailure(Exception):
    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)

def write_chunk(fd, content):
    return os.write(fd, content)

def sync_fd(fd):
    os.fsync(fd)

def classify_os(error):
    if error.errno in (errno.EACCES, errno.EPERM):
        return 'ACCESS_DENIED'
    if error.errno == errno.ENOENT:
        return 'FILE_MISSING'
    if error.errno in (errno.ELOOP, errno.ENOTDIR):
        return 'INVALID_PATH'
    return 'STORAGE_UNAVAILABLE'

class Namespace:
    def __init__(self, writable=False):
        self.fd = None
        self.lock = None
        self.writable = writable
        self.fds = []

    def own_fd(self, fd):
        self.fds.append(fd)
        return fd

    def verify_directory(self, fd, root=False):
        info = os.fstat(fd)
        trusted = {os.geteuid()} if root else {0, os.geteuid()}
        if not stat.S_ISDIR(info.st_mode) or info.st_uid not in trusted or info.st_mode & 0o022:
            raise StorageFailure('UNSAFE_NAMESPACE_PERMISSIONS')

    def __enter__(self):
        if (not hasattr(os, 'O_NOFOLLOW') or not hasattr(os, 'O_DIRECTORY')
                or os.open not in os.supports_dir_fd
                or (self.writable and (fcntl is None or os.link not in os.supports_dir_fd))):
            raise StorageFailure('PINNING_UNSUPPORTED')
        try:
            raw = str(settings.document_storage_dir)
            parts = PurePosixPath(raw).parts
            if not raw.startswith('/') or '..' in parts:
                raise StorageFailure('INVALID_PATH')
            fd = self.own_fd(os.open('/', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW))
            self.verify_directory(fd)
            for component in parts[1:]:
                fd = self.own_fd(os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd))
                self.verify_directory(fd)
            self.fd = fd
            self.verify_directory(fd, root=True)
            if self.writable:
                flags = os.O_RDWR | os.O_NOFOLLOW
                try:
                    lock = self.own_fd(os.open('.mintrud-scans.lock', flags | os.O_CREAT | os.O_EXCL, 0o600, dir_fd=fd))
                    sync_fd(lock);sync_fd(fd)
                except FileExistsError:
                    lock = self.own_fd(os.open('.mintrud-scans.lock', flags, dir_fd=fd))
                info = os.fstat(lock)
                if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid() or info.st_mode & 0o077:
                    raise StorageFailure('UNSAFE_NAMESPACE_PERMISSIONS')
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                self.lock = lock
            return self
        except StorageFailure:
            self.close();raise
        except OSError as error:
            self.close();raise StorageFailure(classify_os(error)) from None

    def close(self):
        for fd in reversed(self.fds):
            try:os.close(fd)
            except OSError:pass
        self.fds.clear();self.fd=None;self.lock=None

    def __exit__(self, *args):
        self.close()

    def parent(self, relative, create=False):
        parts = PurePosixPath(relative).parts
        if not parts or relative.startswith('/') or any(p in ('..','.') for p in parts):
            raise StorageFailure('INVALID_PATH')
        fd = self.fd
        for component in parts[:-1]:
            if create:
                try:
                    os.mkdir(component, 0o700, dir_fd=fd)
                    sync_fd(fd)
                except FileExistsError:pass
            fd = self.own_fd(os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd))
            self.verify_directory(fd, root=True)
        return fd, parts[-1]

    def budget(self, byte_count):
        def count(fd, ceiling):
            total = 0
            with os.scandir(fd) as entries:
                for entry in entries:
                    total += 1
                    if total > ceiling:return total
                    if entry.is_dir(follow_symlinks=False):
                        child = os.open(entry.name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                        try:
                            self.verify_directory(child, root=True)
                            total += count(child, ceiling-total)
                        finally:os.close(child)
            return total
        # Three artifacts plus all possibly new namespace directories and slack.
        if count(self.fd, MAX_ARTIFACTS) + 8 > MAX_ARTIFACTS:
            raise StorageFailure('ARTIFACT_LIMIT')
        space = os.fstatvfs(self.fd)
        if space.f_bavail * space.f_frsize < byte_count + MIN_FREE_BYTES + 131072:
            raise StorageFailure('INSUFFICIENT_SPACE')

    def write(self, resource, content):
        parent, name = self.parent(resource.path, create=True)
        try:
            fd = self.own_fd(os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent))
        except FileExistsError:
            resource.collision = True;raise
        resource.created = True
        info = os.fstat(fd);resource.identity = (info.st_dev,info.st_ino)
        resource.fd = fd;resource.parent_fd = parent
        offset = 0
        try:
            while offset < len(content):
                n = write_chunk(fd, content[offset:])
                if n <= 0:raise StorageFailure('INCOMPLETE_WRITE')
                offset += n
            resource.complete = True
            sync_fd(fd);sync_fd(parent)
            resource.durable = True
        finally:
            resource.recovery_required = not resource.durable

    def publish(self, temporary, final, content):
        parent, name = self.parent(final.path)
        source_parent, source_name = self.parent(temporary.path)
        try:
            os.link(source_name, name, src_dir_fd=source_parent, dst_dir_fd=parent, follow_symlinks=False)
        except FileExistsError:
            final.collision = True;raise
        final.created = True
        fd = self.own_fd(os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent))
        info=os.fstat(fd);final.identity=(info.st_dev,info.st_ino)
        if final.identity != temporary.identity or not stat.S_ISREG(info.st_mode):
            raise StorageFailure('PUBLICATION_IDENTITY_CHANGED')
        observed = os.read(fd,len(content)+1)
        if observed != content:raise StorageFailure('PUBLICATION_CONTENT_CHANGED')
        final.complete=True
        sync_fd(parent);final.durable=True

    def read(self, relative, limit):
        parent,name = self.parent(relative)
        fd = self.own_fd(os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=parent))
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode):raise StorageFailure('INVALID_PATH')
        if info.st_uid != os.geteuid() or info.st_mode & 0o022:
            raise StorageFailure('UNSAFE_FILE_PERMISSIONS')
        if info.st_size > limit:raise StorageFailure('SIZE_LIMIT')
        chunks=[];size=0
        while True:
            chunk=os.read(fd,min(65536,limit+1-size))
            if not chunk:break
            chunks.append(chunk);size+=len(chunk)
            if size>limit:raise StorageFailure('SIZE_LIMIT')
        after=os.fstat(fd)
        if (info.st_size,info.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):
            raise StorageFailure('FILE_CHANGED_DURING_READ')
        return b''.join(chunks)
