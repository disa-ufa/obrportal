import asyncio
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine
from app.services.registry_action_lockset import RegistrySourceFence, RegistryObligationTarget
from app.services.registry_catalog_policy_fence import (
    begin_registry_catalog_policy_fence as begin,
    RegistryCatalogFenceError,
)

E = '00000000-0000-0000-0000-000000000001'
O = '00000000-0000-0000-0000-000000000002'
SOURCES = (RegistrySourceFence('enrollment', E), RegistrySourceFence('course', O))
TARGETS = (RegistryObligationTarget(O, E, 'frdo'),)


class FakeSession:
    def __init__(self):
        self.bind = Mock(spec=AsyncEngine)
        self.bind.dialect = SimpleNamespace(name='postgresql')
        self.new, self.dirty, self.deleted = set(), set(), set()
        self.tx = None
        self.nested = False
        self.sql = []
        self.no_flush = 0
        self.rollbacks = 0
        self.level = 'read committed'
        self.fail_lock = None

    def in_transaction(self): return self.tx is not None
    def in_nested_transaction(self): return self.nested
    def get_transaction(self): return self.tx

    @property
    @contextmanager
    def no_autoflush(self):
        self.no_flush += 1
        try: yield
        finally: self.no_flush -= 1

    async def begin(self):
        self.tx = SimpleNamespace(is_active=True)
        return self.tx

    async def rollback(self):
        self.rollbacks += 1
        self.tx.is_active = False
        self.tx = None

    async def execute(self, statement, params=None):
        assert self.no_flush, 'SQL without no_autoflush'
        sql = str(statement)
        self.sql.append((sql, params))
        if self.fail_lock and 'pg_advisory' in sql:
            raise self.fail_lock
        return SimpleNamespace(scalar_one=lambda: self.level)

    async def scalar(self, statement):
        assert self.no_flush
        self.sql.append((str(statement), None))
        return SimpleNamespace(id=O, enrollment_id=E, registry='frdo')


@pytest.mark.asyncio
@pytest.mark.parametrize('mode', ['shared', 'exclusive'])
async def test_fresh_rc_no_autoflush_no_commit(mode):
    s = FakeSession()
    lease = await begin(session=s, mode=mode)
    assert s.tx.is_active and s.rollbacks == 0
    assert s.sql[0][0] == 'SHOW transaction_isolation'
    assert ('_shared' in s.sql[1][0]) == (mode == 'shared')
    assert 'hashtextextended' not in s.sql[1][0]
    assert len(s.sql[1][1]) == 2
    lease.require_mode(mode)


@pytest.mark.asyncio
@pytest.mark.parametrize('state', ['active', 'nested', 'new', 'dirty', 'deleted', 'connection', 'sqlite'])
async def test_reject_unsafe_before_sql(state):
    s = FakeSession()
    if state == 'active': await s.begin()
    elif state == 'nested': s.nested = True
    elif state == 'connection': s.bind = object()
    elif state == 'sqlite': s.bind.dialect.name = 'sqlite'
    else: getattr(s, state).add(object())
    with pytest.raises(RegistryCatalogFenceError): await begin(session=s, mode='shared')
    assert s.sql == [] and s.rollbacks == 0


@pytest.mark.asyncio
@pytest.mark.parametrize('level', ['repeatable read', 'serializable', 'read uncommitted'])
async def test_non_rc_rolls_back_own_transaction(level):
    s = FakeSession(); s.level = level
    with pytest.raises(ValueError, match='requires_read_committed'):
        await begin(session=s, mode='shared')
    assert len(s.sql) == 1 and s.rollbacks == 1 and s.tx is None


@pytest.mark.asyncio
@pytest.mark.parametrize('failure', [RuntimeError('lock failed'), asyncio.CancelledError()])
async def test_failed_or_cancelled_acquisition_rolls_back(failure):
    s = FakeSession(); s.fail_lock = failure
    with pytest.raises(type(failure)): await begin(session=s, mode='exclusive')
    assert s.tx is None and s.rollbacks == 1


@pytest.mark.asyncio
async def test_no_upgrade_or_late_catalog_reacquisition():
    s = FakeSession(); lease = await begin(session=s, mode='shared')
    await lease.source_fences(source_fences=SOURCES)
    count = len(s.sql)
    lease.require_mode('shared')
    with pytest.raises(RegistryCatalogFenceError, match='upgrade'):
        lease.require_mode('exclusive')
    with pytest.raises(RegistryCatalogFenceError, match='fresh_session'):
        await begin(session=s, mode='exclusive')
    assert len(s.sql) == count


@pytest.mark.asyncio
async def test_exact_repeat_is_noop_and_new_scope_forbidden():
    s = FakeSession(); lease = await begin(session=s, mode='exclusive')
    lease.require_mode('shared')
    result = await lease.source_fences(source_fences=SOURCES)
    count = len(s.sql)
    assert await lease.source_fences(source_fences=tuple(reversed(SOURCES))) == result
    with pytest.raises(RegistryCatalogFenceError, match='expansion'):
        await lease.source_fences(source_fences=SOURCES[:1])
    with pytest.raises(RegistryCatalogFenceError, match='expansion'):
        await lease.action_lockset(source_fences=SOURCES, obligation_targets=TARGETS)
    assert len(s.sql) == count


@pytest.mark.asyncio
async def test_canonical_c_s_d_o_and_no_reverse_after_rows():
    s = FakeSession(); lease = await begin(session=s, mode='shared')
    result = await lease.action_lockset(source_fences=SOURCES, obligation_targets=TARGETS)
    statements = [x[0] for x in s.sql]
    keys = [params['key'] for _, params in s.sql if params and 'key' in params]
    assert keys == ['registry-source:v1:course:'+O, 'registry-source:v1:enrollment:'+E,
                    'registry-applicability:'+E+':frdo']
    assert 'pg_advisory_xact_lock_shared' in statements[1]
    assert 'FOR UPDATE' in statements[-1]
    count = len(s.sql)
    assert await lease.action_lockset(source_fences=SOURCES, obligation_targets=TARGETS) is result
    with pytest.raises(RegistryCatalogFenceError, match='expansion'):
        await lease.source_fences(source_fences=SOURCES)
    assert len(s.sql) == count


@pytest.mark.asyncio
async def test_evidence_does_not_survive_transaction():
    s = FakeSession(); lease = await begin(session=s, mode='shared')
    await s.rollback(); await s.begin()
    with pytest.raises(RegistryCatalogFenceError, match='inactive'):
        lease.require_mode('shared')


@pytest.mark.asyncio
async def test_failed_downstream_cannot_be_reused():
    s = FakeSession(); lease = await begin(session=s, mode='shared')
    s.fail_lock = asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError): await lease.source_fences(source_fences=SOURCES)
    with pytest.raises(RegistryCatalogFenceError, match='inactive'): lease.require_mode('shared')
    await s.rollback()


@pytest.mark.asyncio
async def test_invalid_mode_does_not_begin():
    s = FakeSession()
    with pytest.raises(RegistryCatalogFenceError): await begin(session=s, mode='upgrade')
    assert s.tx is None and s.sql == []
