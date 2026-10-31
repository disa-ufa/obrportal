from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.registry_applicability_snapshot import (
    load_consistent_registry_applicability_inputs,
)


def session(isolation: str, *, active: bool = True):
    result = MagicMock()
    result.scalar_one.return_value = isolation
    db = MagicMock()
    db.in_transaction.return_value = active
    db.execute = AsyncMock(return_value=result)
    return db


@pytest.mark.asyncio
@pytest.mark.parametrize("isolation", ["repeatable read", "REPEATABLE READ", "serializable"])
async def test_stable_isolation_permits_reading_under_same_transaction(isolation):
    db = session(isolation)
    obligation = SimpleNamespace(registry="frdo")
    with patch(
        "app.services.registry_applicability_snapshot.load_current_registry_applicability_inputs",
        new_callable=AsyncMock,
    ) as reader:
        reader.return_value = object()
        result = await load_consistent_registry_applicability_inputs(
            session=db, obligation=obligation
        )
        assert result is reader.return_value
        reader.assert_awaited_once_with(session=db, obligation=obligation)


@pytest.mark.asyncio
@pytest.mark.parametrize("isolation", ["read committed", "READ COMMITTED", "read uncommitted"])
async def test_nonrepeatable_transaction_rejected(isolation):
    db = session(isolation)
    with pytest.raises(RuntimeError, match="REPEATABLE READ"):
        await load_consistent_registry_applicability_inputs(
            session=db, obligation=SimpleNamespace(registry="frdo")
        )


@pytest.mark.asyncio
async def test_caller_owned_transaction_is_required():
    db = session("repeatable read", active=False)
    with pytest.raises(RuntimeError, match="caller-owned"):
        await load_consistent_registry_applicability_inputs(
            session=db, obligation=SimpleNamespace(registry="frdo")
        )
    db.execute.assert_not_awaited()
