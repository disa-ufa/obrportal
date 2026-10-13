import pytest

from app.registry_applicability_inventory_cli import (
    classify_legacy_status,
    summarize_counts,
)


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("accepted", "preserve_lifecycle"),
        ("submitted", "preserve_lifecycle"),
        ("exported", "preserve_lifecycle"),
        ("approved", "preserve_lifecycle"),
        ("correction_required", "preserve_lifecycle"),
        ("rejected", "preserve_lifecycle"),
        ("pending_data", "review_before_reclassification"),
        ("needs_approval", "review_before_reclassification"),
        ("not_required", "review_before_reclassification"),
        ("unexpected", "unknown_manual_investigation"),
    ],
)
def test_conservative_legacy_classification(status, expected):
    assert classify_legacy_status(status) == expected


def test_aggregates_only_counts_without_reclassification():
    result = summarize_counts([
        ("frdo", "needs_approval", "frdo.auto.manual_review", 72),
        ("mintrud", "approved", "mintrud.auto.occupational_safety_training", 1),
    ])
    assert result["total"] == 73
    assert result["groups"]["review_before_reclassification"] == 72
    assert result["groups"]["preserve_lifecycle"] == 1
    assert result["classification_applied"] is False
    assert result["database_writes"] == 0
    assert set(result["breakdown"][0]) == {
        "registry", "status", "rule_code", "count", "handling"
    }


def test_invalid_aggregate_rejected():
    with pytest.raises(ValueError):
        summarize_counts([("frdo", "pending_data", "", -1)])
