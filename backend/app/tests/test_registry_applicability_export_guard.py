from types import SimpleNamespace

import pytest

from app.services.registry_applicability_export_guard import (
    RegistryApplicabilityGateError,
    validate_registry_applicability_gate,
)


def make_obligation():
    return SimpleNamespace(registry="frdo", enrollment_id="enrollment-1")


def make_decision(**changes):
    values = {
        "registry": "frdo",
        "enrollment_id": "enrollment-1",
        "decision": "required",
        "source": "auto",
        "rule_code": "frdo.dpo",
        "rule_version": "v1",
        "reason": "Required by verified rule",
        "decided_by_user_id": None,
        "decision_version": 1,
        "input_fingerprint": "a" * 64,
    }
    values.update(changes)
    return SimpleNamespace(**values)


def evaluate(decision, *, fingerprint="a" * 64):
    return validate_registry_applicability_gate(
        obligation=make_obligation(),
        applicability=decision,
        expected_input_fingerprint=fingerprint,
    )


def test_confirmed_and_current_decision_can_proceed_to_separate_checks():
    grant = evaluate(make_decision())
    assert grant.registry == "frdo"
    assert grant.enrollment_id == "enrollment-1"
    assert grant.decision_version == 1


@pytest.mark.parametrize(
    ("decision", "expected_code"),
    [
        (None, "registry.applicability_missing"),
        (
            make_decision(decision="needs_review"),
            "registry.applicability_needs_review",
        ),
        (
            make_decision(decision="not_required"),
            "registry.applicability_not_required",
        ),
        (
            make_decision(source="legacy"),
            "registry.legacy_decision_unverified",
        ),
        (
            make_decision(source="manual", decided_by_user_id=None),
            "registry.manual_decision_incomplete",
        ),
        (
            make_decision(registry="mintrud"),
            "registry.applicability_mismatch",
        ),
        (
            make_decision(rule_version=""),
            "registry.rule_provenance_missing",
        ),
        (
            make_decision(input_fingerprint=None),
            "registry.stored_snapshot_missing",
        ),
    ],
)
def test_not_authorized_for_export_without_current_confirmed_applicability(
    decision, expected_code
):
    with pytest.raises(RegistryApplicabilityGateError) as error:
        evaluate(decision)
    assert error.value.code == expected_code


@pytest.mark.parametrize("fingerprint", [None, "invalid", "b" * 64])
def test_missing_or_stale_current_snapshot_is_rejected(fingerprint):
    expected = (
        "registry.current_snapshot_missing"
        if fingerprint is None or fingerprint == "invalid"
        else "registry.applicability_stale"
    )
    with pytest.raises(RegistryApplicabilityGateError) as error:
        evaluate(make_decision(), fingerprint=fingerprint)
    assert error.value.code == expected


def test_complete_manual_decision_may_proceed_to_separate_checks():
    decision = make_decision(
        source="manual",
        decided_by_user_id="authorized-user",
        reason="Document type reviewed and decision recorded",
    )
    assert evaluate(decision).decision_version == 1


def test_guard_is_not_wired_into_legacy_mutation_or_export_paths():
    from pathlib import Path

    services = Path(__file__).resolve().parents[1] / "services"
    candidates = (
        Path(__file__).resolve().parents[1] / "api/v1/admin.py",
        services / "compliance_registry_attempts.py",
        services / "compliance_registry_batches.py",
        services / "compliance_registry_approval.py",
    )
    for path in candidates:
        assert "require_registry_applicability_for_submission" not in path.read_text(
            encoding="utf-8"
        )
