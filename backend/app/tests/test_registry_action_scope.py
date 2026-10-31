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


def test_dependent_child_ids_and_mapping_membership_are_comparison_inputs():
    actor, obligation, row = _fixture("mintrud")
    document_id, context_id, program_id = _id(), _id(), _id()
    populated = RegistrySourceScopeRow(
        row.obligation_id, row.enrollment_id, row.registry,
        row.course_id, row.learner_id, None, None, document_id, context_id,
    )
    before = build_registry_action_scope(
        actor_id=actor, registry="mintrud",
        obligation_ids=(obligation,), rows=(row,),
    )
    after = build_registry_action_scope(
        actor_id=actor, registry="mintrud",
        obligation_ids=(obligation,), rows=(populated,),
        mintrud_mapping_memberships=((row.course_id, program_id),),
    )
    assert before != after
    assert after.rows[0].enrollment_document_id == document_id
    assert after.rows[0].registry_context_id == context_id
    assert after.mintrud_mapping_memberships == ((row.course_id, program_id),)


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
def test_new_linked_document_changes_discovered_scope(registry):
    actor, obligation, row = _fixture(registry)
    original = build_registry_action_scope(
        actor_id=actor, registry=registry,
        obligation_ids=(obligation,), rows=(row,),
    )
    revised = RegistrySourceScopeRow(
        row.obligation_id, row.enrollment_id, row.registry,
        row.course_id, row.learner_id, None, None, _id(), None,
    )
    after = build_registry_action_scope(
        actor_id=actor, registry=registry,
        obligation_ids=(obligation,), rows=(revised,),
    )
    assert original != after


def test_reject_mapping_from_different_course_or_registry():
    actor, obligation, row = _fixture("mintrud")
    with pytest.raises(RegistryActionLockError, match="registry.scope_invalid_mapping"):
        build_registry_action_scope(
            actor_id=actor, registry="mintrud",
            obligation_ids=(obligation,), rows=(row,),
            mintrud_mapping_memberships=((_id(), _id()),),
        )
    other = RegistrySourceScopeRow(
        row.obligation_id, row.enrollment_id, "frdo",
        row.course_id, row.learner_id, None, None,
    )
    with pytest.raises(RegistryActionLockError, match="registry.scope_unexpected_mapping"):
        build_registry_action_scope(
            actor_id=actor, registry="frdo",
            obligation_ids=(obligation,), rows=(other,),
            mintrud_mapping_memberships=((row.course_id, _id()),),
        )


@pytest.mark.parametrize("kind", ["absent", "nested", "new", "dirty", "deleted"])
@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.asyncio
async def test_action_scope_preflight_refuses_unsafe_session_before_sql(kind, registry):
    """Reject unflushed writes and savepoints without executing any SQL."""
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, MagicMock

    from app.services.registry_action_scope import (
        acquire_discovered_registry_action_scope,
        discover_registry_action_scope,
    )

    session = SimpleNamespace(
        in_transaction=MagicMock(return_value=kind != "absent"),
        in_nested_transaction=MagicMock(return_value=kind == "nested"),
        new={"new"} if kind == "new" else set(),
        dirty={"dirty"} if kind == "dirty" else set(),
        deleted={"deleted"} if kind == "deleted" else set(),
        execute=AsyncMock(),
    )
    actor, obligation, _ = _fixture(registry)
    for func in (discover_registry_action_scope, acquire_discovered_registry_action_scope):
        with pytest.raises(RegistryActionLockError, match=(
            "registry.scope_pending_changes"
            if kind in {"new", "dirty", "deleted"} else
            "registry.scope_fresh_transaction_required"
        )):
            await func(
                session=session, actor_id=actor, registry=registry,
                obligation_ids=(obligation,),
            )
    session.execute.assert_not_awaited()
