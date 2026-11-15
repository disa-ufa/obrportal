from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services import mintrud_local_workflow as workflow
from app.services.compliance_registry_approval import fingerprint_registry_approval_snapshot


class Rows:
    def __init__(self, items):
        self.items = list(items)

    def all(self):
        return self.items

    def scalars(self):
        return self


class SyntheticSession:
    def __init__(self, obligation, decision, prior_items):
        self.scalar_values = [obligation, decision, None, None, None]
        self.collection_values = [prior_items, []]
        self.prior_items = prior_items
        self.replay_queries = 0

    async def scalar(self, statement):
        return self.scalar_values.pop(0)

    async def scalars(self, statement):
        return Rows(self.collection_values.pop(0))

    async def execute(self, statement):
        self.replay_queries += 1
        return Rows(self.prior_items)

    async def get(self, model, identity):
        if model.__name__ == "Enrollment":
            return SimpleNamespace(course_id="course", user_id="user")
        return SimpleNamespace(id=identity)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "case,expected_general,expected_local",
    [
        ("fresh", True, True),
        ("distinct", True, False),
        ("same", False, False),
        ("legacy", False, False),
        ("invalid_current", False, False),
        ("absent_current", False, False),
        ("stale_approval", False, False),
        ("stale_applicability", False, False),
    ],
)
async def test_reapproval_readiness_respects_actual_replay_guard(
    monkeypatch, case, expected_general, expected_local
):
    obligation_id = str(uuid4())
    current_event = str(uuid4())

    if case == "invalid_current":
        current_event = "invalid-uuid"
    elif case == "absent_current":
        current_event = None

    current_snapshot = {"synthetic": "current"}
    approved_snapshot = (
        {"synthetic": "previous"} if case == "stale_approval" else current_snapshot
    )
    obligation = SimpleNamespace(
        id=obligation_id,
        registry="mintrud",
        enrollment_id=str(uuid4()),
        approval_event_id=current_event,
        approval_snapshot_json=approved_snapshot,
        approval_fingerprint=fingerprint_registry_approval_snapshot(approved_snapshot),
        status="approved",
        submitted_at=None,
        accepted_at=None,
        external_id=None,
    )

    current = SimpleNamespace(
        fingerprint="a" * 64,
        evaluation=SimpleNamespace(
            status="required",
            rule_code="synthetic_rule",
            rule_version="v1",
            reason="synthetic",
        ),
    )

    decision = SimpleNamespace(
        registry="mintrud",
        enrollment_id=obligation.enrollment_id,
        source="auto",
        input_fingerprint="b" * 64 if case == "stale_applicability" else current.fingerprint,
        reason=current.evaluation.reason,
        rule_code="synthetic_rule",
        rule_version="v1",
        decision="required",
        decision_version=1,
    )

    previous = []

    if case in ("distinct", "same", "legacy"):
        previous_event = (
            current_event if case == "same"
            else None if case == "legacy"
            else str(uuid4())
        )
        previous = [
            SimpleNamespace(
                obligation_id=obligation_id,
                approval_event_id=previous_event,
                batch_id=str(uuid4()),
            )
        ]

    async def current_inputs(**kwargs):
        return current

    monkeypatch.setattr(
        workflow, "load_current_registry_applicability_inputs",
        current_inputs,
    )

    monkeypatch.setattr(
        workflow,
        "evaluate_registry_readiness",
        lambda **kwargs: SimpleNamespace(
            is_ready=True,
            as_error_payload=lambda: [],
        ),
    )

    monkeypatch.setattr(
        workflow,
        "build_registry_approval_snapshot",
        lambda **kwargs: current_snapshot,
    )

    monkeypatch.setattr(
        workflow, "_xml_input_issues", lambda *args: []
    )

    monkeypatch.setattr(
        workflow,
        "resolve_mintrud_reporting_organization",
        lambda: None,
    )

    # Exercise the real approval, P0 applicability, and replay checks.
    general_session = SyntheticSession(obligation, decision, previous)
    general, _, _ = await workflow.read_review(
        general_session,
        obligation_id,
        general_export=True,
    )

    local_session = SyntheticSession(obligation, decision, previous)
    local, _, _ = await workflow.read_review(
        local_session,
        obligation_id,
    )

    assert general["batch_eligible"] is expected_general
    assert local["batch_eligible"] is expected_local
    if case == "stale_approval":
        assert general["block_reason"] == "approval.current_data_fingerprint_mismatch"
    elif case == "stale_applicability":
        assert general["approval_current"] is True
        assert general["block_reason"] == "registry.applicability_stale"

    assert general["read_only"] is True
    assert general["not_authorization_for_export"] is True
    assert local["read_only"] is True

    assert general_session.replay_queries == (0 if case in ("invalid_current", "absent_current") else 1)
    assert local_session.replay_queries == (0 if previous or case in ("invalid_current", "absent_current") else 1)