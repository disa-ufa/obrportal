"""No database access: collection modes must fail closed before app imports."""
import pytest
from app.tests.m4_disposable import require_disposable

def test_ordinary_mode_skips_before_parsing_or_connecting():
    with pytest.raises(pytest.skip.Exception):
        require_disposable({'DATABASE_URL':'not a database URL'}, platform='win32', uid=-1)

@pytest.mark.parametrize('url', ['', 'postgresql+asyncpg://m45:synthetic@postgres:5432/m45',
    'postgresql+asyncpg://m45:synthetic@m45-0123456789-pg:5432/production',
    'postgresql+asyncpg://other:synthetic@m45-0123456789-pg:5432/m45',
    'postgresql+asyncpg://m45:synthetic@m45-0123456789-pg:5432/m45?host=production'])
def test_opt_in_rejects_unsafe_configuration(url):
    with pytest.raises((RuntimeError,ValueError)):
        require_disposable({'M45_INTEGRATION':'1','DATABASE_URL':url}, platform='linux',uid=0)

def test_opt_in_accepts_only_dedicated_linux_root_runner():
    env={'M45_INTEGRATION':'1','DATABASE_URL':'postgresql+asyncpg://m45:synthetic@m45-0123456789-pg:5432/m45'}
    require_disposable(env,platform='linux',uid=0)
    for platform,uid in [('win32',0),('linux',10001)]:
        with pytest.raises(RuntimeError):require_disposable(env,platform=platform,uid=uid)
