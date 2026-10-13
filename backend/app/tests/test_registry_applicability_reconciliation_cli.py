import pytest

from app.registry_applicability_reconciliation_cli import (
    LEGACY_RECONCILIATION_SQL,
    recommend_handling,
    summarize_reconciliation_rows,
)


def decision(**changes):
    params = {
        "registry": "frdo",
        "status": "pending_data",
        "legacy_rule_code": "",
        "legacy_rule_version": "",
        "program_type": "occupational_safety_training",
        "frdo_mode": "auto",
        "mintrud_mode": "auto",
        "existing_decision": "",
        "existing_source": "",
        "protected_evidence": False,
    }
    params.update(changes)
    return recommend_handling(**params)


def test_unresolved_occupational_safety_frdo_is_manual_review():
    assert decision() == "unresolved_manual_review"


def test_conservatively_classifies_unprotected_candidates():
    assert decision(registry="mintrud") == "candidate_required_for_review"
    assert decision(
        registry="mintrud",
        program_type="dpo_advanced_training",
    ) == "candidate_exclusion_for_review"


@pytest.mark.parametrize(
    "status",
    ["approved", "exported", "submitted", "accepted", "rejected", "correction_required"],
)
def test_protected_lifecycle_never_proposed_for_automatic_mutation(status):
    assert decision(status=status) == "preserve_lifecycle_and_evidence"


def test_even_pending_data_with_submission_evidence_is_protected():
    assert decision(protected_evidence=True) == "preserve_lifecycle_and_evidence"


def test_existing_classification_and_changed_rules_need_review():
    assert decision(existing_decision="required") == "existing_decision_review"
    assert decision(
        legacy_rule_code="frdo.auto.professional_program",
    ) == "rule_change_review"


def test_unknown_program_or_status_fails_to_manual_review():
    assert decision(status="unexpected") == "manual_investigation"
    assert decision(frdo_mode="invalid") == "manual_investigation"


def test_sql_checks_approval_artifacts_and_prior_attempts():
    for required in (
        "o.approved_at IS NOT NULL",
        "o.approval_snapshot_json IS NOT NULL",
        "o.approval_fingerprint IS NOT NULL",
        "o.submitted_at IS NOT NULL",
        "o.accepted_at IS NOT NULL",
        "registry_submission_attempts",
        "registry_submission_batch_items",
        "registry_applicability a",
    ):
        assert required in LEGACY_RECONCILIATION_SQL


def test_report_contains_only_aggregate_counts():
    result = summarize_reconciliation_rows([
        (
            "frdo", "needs_approval", "", "",
            "occupational_safety_training", "auto", "auto",
            "", "", False, 1,
        ),
        (
            "mintrud", "approved", "", "",
            "occupational_safety_training", "auto", "auto",
            "", "", True, 1,
        ),
    ])
    assert result["record_count"] == 2
    assert result["handling_counts"]["unresolved_manual_review"] == 1
    assert result["handling_counts"]["preserve_lifecycle_and_evidence"] == 1
    assert result["database_writes"] == 0
    assert result["classification_applied"] is False
    assert result["review_only"] is True


def test_negative_count_fails_closed():
    with pytest.raises(ValueError):
        summarize_reconciliation_rows([
            ("frdo", "pending_data", "", "", "unspecified", "auto", "auto", "", "", False, -1)
        ])
