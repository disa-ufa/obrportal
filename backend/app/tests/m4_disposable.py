"""Explicit test-only opt-in; never contacts a database during collection."""
import os
import re
import sys
from urllib.parse import urlsplit
import pytest

def require_disposable(environ=None, *, platform=None, uid=None):
    env = os.environ if environ is None else environ
    if env.get('M45_INTEGRATION') != '1':
        pytest.skip('M4 dedicated disposable integration opt-in required', allow_module_level=True)
    url = urlsplit(env.get('DATABASE_URL', ''))
    if not (url.scheme == 'postgresql+asyncpg' and url.username == 'm45'
            and re.fullmatch(r'm45-[0-9a-f]{10}-pg', url.hostname or '')
            and url.port == 5432 and url.path == '/m45' and not url.query and not url.fragment):
        raise RuntimeError('Unsafe M4 disposable database configuration')
    effective_platform = sys.platform if platform is None else platform
    effective_uid = getattr(os, 'geteuid', lambda: -1)() if uid is None else uid
    if effective_platform != 'linux' or effective_uid != 0:
        raise RuntimeError('Dedicated M4 tests require Linux root runner with a private UID subprocess')
