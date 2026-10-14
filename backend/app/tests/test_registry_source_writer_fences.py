"""Unit coverage for dormant source-writer fences and shared lock protocol."""
from uuid import uuid4

import pytest

from app.services.registry_action_lockset import (
    RegistryActionLockError,
    RegistryObligationTarget,
    RegistrySourceFence,
    normalize_registry_lockset,
    normalize_registry_source_fences,
)


def _id():
    return str(uuid4())


def test_source_writer_and_new_action_use_identical_advisory_namespace():
    enrollment, course, learner = _id(), _id(), _id()
    fences = (
        RegistrySourceFence("learner", learner),
        RegistrySourceFence("course", course),
        RegistrySourceFence("enrollment", enrollment),
        RegistrySourceFence("course", course),
    )
    expected = normalize_registry_source_fences(source_fences=fences)
    observed, _, _ = normalize_registry_lockset(
        source_fences=tuple(reversed(fences)),
        obligation_targets=(RegistryObligationTarget(_id(), enrollment, "frdo"),),
    )
    assert observed == expected
    assert len(expected) == 3
    assert expected == tuple(sorted(expected))
    assert expected[0].startswith("registry-source:v1:")


@pytest.mark.parametrize("kind,resource", [
    ("invalid", "uuid"), ("course", "bad"), ("learner", None),
])
def test_source_writer_fences_reject_unsupported_or_noncanonical_inputs(kind, resource):
    with pytest.raises(RegistryActionLockError):
        normalize_registry_source_fences(
            source_fences=(RegistrySourceFence(kind, resource),),
        )


def test_source_writer_fences_reject_empty_lock_scope():
    with pytest.raises(RegistryActionLockError, match="registry.lockset_empty"):
        normalize_registry_source_fences(source_fences=())
