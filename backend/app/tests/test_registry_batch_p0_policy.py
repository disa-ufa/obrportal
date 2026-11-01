"""Unit contracts for the dormant Release 1.0 batch P0 policy."""

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.registry_applicability_export_guard import (
    RegistryApplicabilityGateError,
)
from app.services.registry_batch_p0_policy import (
    BatchApplicabilityInput,
    require_current_registry_batch_applicability,
)


def evidence(
    *,
    registry="frdo",
    decision_status="required",
    current_status="required",
    stored_fingerprint=None,
    current_fingerprint=None,
    source="auto",
):
    fingerprint = "a" * 64

    obligation = SimpleNamespace(
        id=str(uuid4()),
        registry=registry,
        enrollment_id=str(uuid4()),
    )

    decision = SimpleNamespace(
        registry=registry,
        enrollment_id=obligation.enrollment_id,
        decision=decision_status,
        source=source,
        decided_by_user_id=None,
        reason="Synthetic automatic rule",
        rule_code="TEST_RULE",
        rule_version="1",
        decision_version=1,
        input_fingerprint=(
            stored_fingerprint
            if stored_fingerprint is not None
            else fingerprint
        ),
    )

    current = SimpleNamespace(
        evaluation=SimpleNamespace(status=current_status, rule_code="TEST_RULE", rule_version="1"),
        fingerprint=(
            current_fingerprint
            if current_fingerprint is not None
            else fingerprint
        ),
    )

    return BatchApplicabilityInput(
        obligation=obligation,
        decision=decision,
        current=current,
    )


def check_error(entry, code, registry="frdo"):
    with pytest.raises(
        RegistryApplicabilityGateError
    ) as caught:
        require_current_registry_batch_applicability(
            registry=registry,
            entries=[entry],
        )

    assert str(caught.value) == code


def test_required_current_decision_passes():
    item = evidence()

    result = require_current_registry_batch_applicability(
        registry="frdo",
        entries=[item],
    )

    assert len(result) == 1
    assert result[0].registry == "frdo"
    assert result[0].decision_version == 1


def test_missing_decision_rejected():
    item = evidence()

    item = BatchApplicabilityInput(
        obligation=item.obligation,
        decision=None,
        current=item.current,
    )

    check_error(
        item,
        "registry.applicability_missing",
    )


def test_not_required_decision_rejected():
    check_error(
        evidence(decision_status="not_required"),
        "registry.applicability_not_required",
    )


def test_stale_fingerprint_rejected():
    check_error(
        evidence(current_fingerprint="b" * 64),
        "registry.applicability_stale",
    )


def test_current_rule_change_rejected():
    check_error(
        evidence(current_status="not_required"),
        "registry.current_rule_not_required",
    )


def test_manual_authority_requires_review():
    check_error(
        evidence(source="manual"),
        "registry.manual_authority_not_reviewed",
    )


def test_duplicate_obligation_rejected():
    item = evidence()

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.batch_duplicate_obligation",
    ):
        require_current_registry_batch_applicability(
            registry="frdo",
            entries=[item, item],
        )


def test_mixed_registries_rejected():
    check_error(
        evidence(registry="mintrud"),
        "registry.batch_mixed_registry",
    )


def test_empty_batch_rejected():
    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.batch_empty",
    ):
        require_current_registry_batch_applicability(
            registry="frdo",
            entries=[],
        )


def test_second_invalid_obligation_denies_complete_batch():
    first = evidence()
    second = evidence(current_fingerprint="b" * 64)

    with pytest.raises(
        RegistryApplicabilityGateError,
        match="registry.applicability_stale",
    ):
        require_current_registry_batch_applicability(
            registry="frdo",
            entries=[first, second],
        )

@pytest.mark.parametrize('field',['rule_code','rule_version'])
def test_matching_digest_cannot_hide_rule_provenance_mismatch(field):
    item=evidence()
    setattr(item.decision,field,'stale-rule')
    check_error(item,'registry.applicability_rule_mismatch')
