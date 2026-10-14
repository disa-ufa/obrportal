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
