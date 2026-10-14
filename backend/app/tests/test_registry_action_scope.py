"""Pure tests for the dormant DB-derived registry scope preflight."""
from uuid import uuid4

import pytest

from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_action_scope import (
    RegistrySourceScopeRow,
    build_registry_action_scope,
)


def _id():
    return str(uuid4())


def _fixture(registry="frdo"):
    actor = _id()
    obligation = _id()
    enrollment = _id()
    row = RegistrySourceScopeRow(
        obligation, enrollment, registry, _id(), _id(), None, None,
    )
    return actor, obligation, row


def test_source_scope_derives_sorted_fences_and_targets():
    actor, obligation, row = _fixture()
    scope = build_registry_action_scope(
        actor_id=actor, registry="frdo", obligation_ids=(obligation,),
        rows=(row,),
    )
    assert scope.targets[0].obligation_id == obligation
    assert {f.kind for f in scope.source_fences} == {
        "actor", "course", "enrollment", "learner",
    }
    assert list(scope.source_fences) == sorted(
        scope.source_fences, key=lambda fence: (fence.kind, fence.resource_id),
    )


@pytest.mark.parametrize("problem", [
    "missing", "extra", "wrong_registry", "duplicate", "bad_actor",
    "bad_document", "duplicate_ids",
])
def test_scope_fail_closed_before_locking(problem):
    actor, obligation, row = _fixture()
    ids = (obligation,)
    rows = (row,)
    registry = "frdo"
    if problem == "missing":
        rows = ()
    elif problem == "extra":
        rows = (row, RegistrySourceScopeRow(
            _id(), _id(), registry, _id(), _id(), None, None,
        ))
    elif problem == "wrong_registry":
        registry = "mintrud"
    elif problem == "duplicate":
        rows = (row, row)
        ids = (obligation, _id())
    elif problem == "bad_actor":
        actor = actor.upper()
    elif problem == "bad_document":
        rows = (RegistrySourceScopeRow(
            row.obligation_id, row.enrollment_id, row.registry,
            row.course_id, row.learner_id, None, "not-a-uuid",
        ),)
    elif problem == "duplicate_ids":
        ids = (obligation, obligation)
    with pytest.raises(RegistryActionLockError):
        build_registry_action_scope(
            actor_id=actor, registry=registry, obligation_ids=ids, rows=rows,
        )


def test_optional_organization_fence():
    actor, obligation, row = _fixture("mintrud")
    organization = _id()
    updated = RegistrySourceScopeRow(
        row.obligation_id, row.enrollment_id, row.registry,
        row.course_id, row.learner_id, organization, None,
    )
    scope = build_registry_action_scope(
        actor_id=actor, registry="mintrud",
        obligation_ids=(obligation,), rows=(updated,),
    )
    assert any(
        fence.kind == "organization" and fence.resource_id == organization
        for fence in scope.source_fences
    )
