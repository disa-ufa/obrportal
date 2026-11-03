from collections import Counter

import pytest

from app.services.registry_queue_triage import (
    classify_legacy_registry_queue,
)


def classify(registry="frdo", **changes):
    data = dict(
        registry=registry,
        status="needs_approval",
        legacy_rule_code="frdo.auto.manual_review",
        legacy_rule_version="2026-09-04-v1",
        program_type="occupational_safety_training",
        frdo_mode="not_required",
        mintrud_mode="auto",
        existing_decision="",
        existing_source="",
        protected_evidence=False,
    )
    data.update(changes)
    return classify_legacy_registry_queue(**data)


def test_frdo_changed_setting_goes_to_review():
    item = classify()
    assert item.scope == "review"
    assert item.reason == "rule_change_review"
    assert item.current_decision == "not_required"
    assert item.preview_only is True


def test_mintrud_required_without_confirmed_decision_is_not_work():
    item = classify(
        "mintrud",
        status="pending_data",
        legacy_rule_code="mintrud.auto.occupational_safety_training",
    )
    assert item.scope == "review"
    assert item.reason == "candidate_required_for_review"
    assert item.current_decision == "required"


def test_protected_pending_mintrud_stays_in_review():
    item = classify(
        "mintrud",
        protected_evidence=True,
        legacy_rule_code="mintrud.auto.occupational_safety_training",
    )
    assert item.scope == "review"
    assert item.reason == "preserve_lifecycle_and_evidence"


@pytest.mark.parametrize(
    "status",
    ["submitted", "accepted", "rejected", "correction_required"],
)
def test_protected_completed_history_remains_visible(status):
    item = classify(status=status, protected_evidence=True)
    assert item.scope == "history"
    assert item.reason == "preserve_lifecycle_and_evidence"


def test_protected_approved_is_not_silently_finalized():
    item = classify(status="approved", protected_evidence=True)
    assert item.scope == "review"


def test_invalid_classification_fails_to_review():
    item = classify(frdo_mode="unexpected")
    assert item.scope == "review"
    assert item.reason == "manual_investigation"
    assert item.current_decision is None


def test_unverified_persisted_decision_is_not_export_permission():
    item = classify(
        existing_decision="required",
        existing_source="manual",
    )
    assert item.scope == "review"
    assert item.reason == "existing_decision_review"


def test_known_local_baseline_distribution():
    cases = (
        (classify(), 74),
        (
            classify(
                "mintrud",
                status="pending_data",
                legacy_rule_code="mintrud.auto.occupational_safety_training",
            ),
            73,
        ),
        (
            classify(
                "mintrud",
                protected_evidence=True,
                legacy_rule_code="mintrud.auto.occupational_safety_training",
            ),
            1,
        ),
    )

    counts = Counter()
    for result, count in cases:
        counts[(result.current_decision, result.reason)] += count
        assert result.scope == "review"
        assert result.preview_only is True

    assert sum(counts.values()) == 148
    assert counts[("not_required", "rule_change_review")] == 74
    assert counts[("required", "candidate_required_for_review")] == 73
    assert counts[("required", "preserve_lifecycle_and_evidence")] == 1


def test_unsupported_registry_rejected():
    with pytest.raises(ValueError, match="Unsupported registry"):
        classify("unknown")