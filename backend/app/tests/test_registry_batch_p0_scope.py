"""Isolation tests for dormant P0 C -> S -> D -> O batch scope."""

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services import registry_batch_p0_scope as target
from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_applicability_export_guard import (
    RegistryApplicabilityGateError,
)


def build_case(monkeypatch, count=1, changed=False):
    events = []
    obligations = []
    decisions = []
    current_by_id = {}

    for _ in range(count):
        oid = str(uuid4())
        enrollment = str(uuid4())

        obligation = SimpleNamespace(
            id=oid,
            enrollment_id=enrollment,
            registry="frdo",
        )

        obligations.append(obligation)

        decisions.append(SimpleNamespace(
            enrollment_id=enrollment,
            registry="frdo",
            decision="required",
            source="auto",
            decided_by_user_id=None,
            reason="Synthetic policy",
            rule_code="TEST",
            rule_version="1",
            decision_version=1,
            input_fingerprint="a" * 64,
        ))

        current_by_id[oid] = SimpleNamespace(
            evaluation=SimpleNamespace(status="required", rule_code="TEST", rule_version="1"),
            fingerprint="a" * 64,
        )

    # Tests use IDs sorted in the same order as the preflight.
    obligations.sort(key=lambda o: o.id)
    decisions = [
        next(d for d in decisions if d.enrollment_id == o.enrollment_id)
        for o in obligations
    ]

    class Session:
        def __init__(self):
            self.decision_index = 0
            self.commits = 0

        async def scalar(self, statement):
            events.append("decision_read")
            idx = self.decision_index
            self.decision_index += 1
            return decisions[idx]

        async def commit(self):
            self.commits += 1

    session = Session()

    class Fence:
        def require_session(self, provided, mode):
            assert provided is session
            assert mode == "shared"

        async def action_lockset(self, **kwargs):
            events.append("lockset")
            return tuple(obligations)

    async def begin(*, session, mode):
        events.append("catalog")
        assert mode == "shared"
        return Fence()

    scope = SimpleNamespace(
        source_fences=(),
        targets=(),
        revision=1,
    )
    changed_scope = SimpleNamespace(
        source_fences=(),
        targets=(),
        revision=2,
    )

    async def discover(**kwargs):
        events.append("discover")
        discover_count = events.count("discover")
        if changed and discover_count == 2:
            return changed_scope
        return scope

    async def load(*, session, obligation):
        events.append("current_inputs")
        return current_by_id[str(obligation.id)]

    monkeypatch.setattr(
        target, "begin_registry_catalog_policy_fence", begin
    )
    monkeypatch.setattr(
        target, "discover_registry_action_scope", discover
    )
    monkeypatch.setattr(
        target, "load_current_registry_applicability_inputs", load
    )

    async def run(ids=None, registry="frdo", actor=None):
        return await target.inspect_registry_batch_p0_scope(
            session=session,
            registry=registry,
            actor_id=actor or str(uuid4()),
            obligation_ids=(
                ids if ids is not None
                else [o.id for o in obligations]
            ),
        )

    return SimpleNamespace(
        run=run,
        session=session,
        events=events,
        obligations=obligations,
        decisions=decisions,
        current=current_by_id,
    )


def test_two_obligations_complete_in_one_scope(monkeypatch):
    case = build_case(monkeypatch, count=2)

    assert asyncio.run(case.run()) == 2
    assert case.events[0] == "catalog"
    assert case.events.count("lockset") == 1
    assert case.events.count("discover") == 2
    assert case.session.commits == 0


def test_missing_decision_fails_closed(monkeypatch):
    case = build_case(monkeypatch)
    case.decisions[0] = None

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.applicability_missing",
    ):
        asyncio.run(case.run())

    assert case.session.commits == 0


def test_stale_fingerprint_fails_closed(monkeypatch):
    case = build_case(monkeypatch)
    key = case.obligations[0].id
    case.current[key].fingerprint = "b" * 64

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.applicability_stale",
    ):
        asyncio.run(case.run())


def test_scope_change_rejected_before_policy(monkeypatch):
    case = build_case(monkeypatch, changed=True)

    with pytest.raises(
        RegistryActionLockError,
        match="registry.batch_scope_changed_during_lock",
    ):
        asyncio.run(case.run())

    assert "current_inputs" not in case.events


def test_manual_decision_requires_review(monkeypatch):
    case = build_case(monkeypatch)
    case.decisions[0].source = "manual"

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.manual_authority_not_reviewed",
    ):
        asyncio.run(case.run())


def test_duplicate_target_rejected_before_lock(monkeypatch):
    case = build_case(monkeypatch)
    oid = case.obligations[0].id

    with pytest.raises(
        RegistryActionLockError,
        match="registry.batch_duplicate_target",
    ):
        asyncio.run(case.run(ids=[oid, oid]))

    assert not case.events


def test_invalid_actor_rejected_before_lock(monkeypatch):
    case = build_case(monkeypatch)

    with pytest.raises(
        RegistryActionLockError,
        match="registry.batch_invalid_uuid",
    ):
        asyncio.run(case.run(actor="invalid-actor"))

    assert not case.events


def test_changed_current_rule_rejected(monkeypatch):
    case = build_case(monkeypatch)
    key = case.obligations[0].id
    case.current[key].evaluation.status = "not_required"

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.current_rule_not_required",
    ):
        asyncio.run(case.run())


def test_wrong_registry_rejected_before_lock(monkeypatch):
    case = build_case(monkeypatch)

    with pytest.raises(
        RegistryActionLockError,
        match="registry.batch_invalid_registry",
    ):
        asyncio.run(case.run(registry="invalid"))

    assert not case.events


def test_second_invalid_member_denies_whole_batch(monkeypatch):
    case = build_case(monkeypatch, count=2)
    case.decisions[1] = None

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.applicability_missing",
    ):
        asyncio.run(case.run())

    assert case.events.count("lockset") == 1
    assert case.session.commits == 0