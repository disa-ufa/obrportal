"""Pure validation coverage for the opt-in action lockset."""
from uuid import uuid4
import pytest

from app.services.registry_action_lockset import (
    RegistryActionLockError, RegistrySourceFence, RegistryObligationTarget,
    normalize_registry_lockset,
)


def _id():
    return str(uuid4())


def test_sorted_unique_fences_and_targets():
    enrollments = [_id(), _id()]
    obligations = [_id(), _id()]
    fences = tuple(RegistrySourceFence("enrollment", i) for i in reversed(enrollments))
    targets = (
        RegistryObligationTarget(obligations[1], enrollments[1], "mintrud"),
        RegistryObligationTarget(obligations[0], enrollments[0], "frdo"),
    )
    source, decision, targets_sorted = normalize_registry_lockset(
        source_fences=fences, obligation_targets=targets,
    )
    assert source == tuple(sorted(source))
    assert decision == tuple(sorted(decision))
    assert [x.obligation_id for x in targets_sorted] == sorted(obligations)


@pytest.mark.parametrize("error", ["missing_fence", "duplicate", "wrong_registry", "noncanonical"])
def test_reject_unsafe_lockset_before_locking(error):
    enrollment = _id()
    target = RegistryObligationTarget(_id(), enrollment, "frdo")
    sources = (RegistrySourceFence("enrollment", enrollment),)
    targets = (target,)
    if error == "missing_fence":
        sources = (RegistrySourceFence("course", _id()),)
    if error == "duplicate":
        targets = (target, target)
    if error == "wrong_registry":
        targets = (RegistryObligationTarget(target.obligation_id, enrollment, "unknown"),)
    if error == "noncanonical":
        targets = (RegistryObligationTarget(target.obligation_id.upper(), enrollment, "frdo"),)
    with pytest.raises(RegistryActionLockError):
        normalize_registry_lockset(source_fences=sources, obligation_targets=targets)


def test_missing_targets_rejected():
    with pytest.raises(RegistryActionLockError):
        normalize_registry_lockset(
            source_fences=(RegistrySourceFence("enrollment", _id()),),
            obligation_targets=(),
        )


@pytest.mark.parametrize("entrypoint", ["source", "action"])
@pytest.mark.parametrize(
    "unsafe",
    ["no_transaction", "nested", "new", "dirty", "deleted"],
)
def test_direct_lockset_rejects_unsafe_state_before_sql(entrypoint, unsafe):
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, MagicMock

    from app.services.registry_action_lockset import (
        acquire_registry_new_action_lockset,
        acquire_registry_source_write_fences,
    )

    enrollment_id = _id()
    source = RegistrySourceFence("enrollment", enrollment_id)
    target = RegistryObligationTarget(
        _id(), enrollment_id, "frdo",
    )

    session = SimpleNamespace(
        in_transaction=MagicMock(
            return_value=unsafe != "no_transaction"
        ),
        in_nested_transaction=MagicMock(
            return_value=unsafe == "nested"
        ),
        new={"pending"} if unsafe == "new" else set(),
        dirty={"pending"} if unsafe == "dirty" else set(),
        deleted={"pending"} if unsafe == "deleted" else set(),
        execute=AsyncMock(),
    )

    async def scenario():
        if entrypoint == "source":
            await acquire_registry_source_write_fences(
                session=session,
                source_fences=(source,),
            )
        else:
            await acquire_registry_new_action_lockset(
                session=session,
                source_fences=(source,),
                obligation_targets=(target,),
            )

    expected = {
        "no_transaction": "registry.lockset_transaction_required",
        "nested": "registry.lockset_nested_transaction",
        "new": "registry.lockset_pending_changes",
        "dirty": "registry.lockset_pending_changes",
        "deleted": "registry.lockset_pending_changes",
    }[unsafe]

    with pytest.raises(RegistryActionLockError, match=expected):
        asyncio.run(scenario())

    session.execute.assert_not_awaited()