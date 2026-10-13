from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.compliance_registry_contract import (
    APPLICABILITY_NEEDS_REVIEW,
    APPLICABILITY_REQUIRED,
)
from app.services.registry_applicability import RegistryApplicability
from app.services.registry_applicability_writer import (
    ApplicabilityWriteConflict,
    PROTECTED_LIFECYCLE_STATUSES,
    _validate_request,
)


def evaluation(status=APPLICABILITY_NEEDS_REVIEW):
    return RegistryApplicability(
        registry="frdo",
        status=status,
        rule_code="frdo.auto.manual_review",
        rule_version="2026-09-04-v1",
        reason="Classification needs review",
    )


def test_auto_evaluation_requires_rule_and_provenance():
    reason = _validate_request(
        enrollment_id=str(uuid4()),
        evaluation=evaluation(),
        source="auto",
        actor_user_id=None,
        manual_reason=None,
        input_fingerprint="a" * 64,
    )
    assert reason == "Classification needs review"


@pytest.mark.parametrize("fingerprint", ["z" * 64, "A" * 64, "a" * 63])
def test_invalid_fingerprint_is_rejected(fingerprint):
    with pytest.raises(ValueError, match="fingerprint"):
        _validate_request(
            enrollment_id=str(uuid4()),
            evaluation=evaluation(),
            source="auto",
            actor_user_id=None,
            manual_reason=None,
            input_fingerprint=fingerprint,
        )


def test_manual_decision_requires_actor_and_reason():
    with pytest.raises(ValueError, match="actor"):
        _validate_request(
            enrollment_id=str(uuid4()),
            evaluation=evaluation(APPLICABILITY_REQUIRED),
            source="manual",
            actor_user_id=None,
            manual_reason="Reviewed documents",
            input_fingerprint=None,
        )
    with pytest.raises(ValueError, match="reason"):
        _validate_request(
            enrollment_id=str(uuid4()),
            evaluation=evaluation(APPLICABILITY_REQUIRED),
            source="manual",
            actor_user_id=str(uuid4()),
            manual_reason=" ",
            input_fingerprint=None,
        )


def test_legacy_source_requires_separate_reconciliation():
    with pytest.raises(ValueError, match="Only auto and manual"):
        _validate_request(
            enrollment_id=str(uuid4()),
            evaluation=evaluation(),
            source="legacy",
            actor_user_id=None,
            manual_reason=None,
            input_fingerprint=None,
        )


def test_protected_statuses_cannot_be_rewritten_by_generic_writer():
    assert {"approved", "exported", "submitted", "accepted"} <= PROTECTED_LIFECYCLE_STATUSES


def test_writer_is_not_hooked_into_api_or_completion():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    for path in (
        root / "api/v1/admin.py",
        root / "services/compliance_registry_obligations.py",
    ):
        assert "persist_registry_applicability" not in path.read_text(encoding="utf-8")
