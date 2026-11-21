from types import SimpleNamespace

import pytest

from app import mintrud_missing_applicability_inventory as inventory


def test_aggregate_classification_never_grants_apply_or_export():
    row = SimpleNamespace(
        approved_without_decision=12,
        with_batch_items=3,
        with_attempts=2,
        with_applicability_events=1,
        preliminary_no_history=7,
    )
    result = inventory.summarize(row)
    assert result["approved_without_decision"] == 12
    assert result["preliminary_no_history"] == 7
    assert result["individual_readiness_verified"] is False
    assert result["approval_fingerprints_verified"] is False
    assert result["eligible_for_automatic_reconciliation"] is False
    assert result["database_writes"] == 0


@pytest.mark.parametrize(
    "value",
    [-1, 11],
)
def test_invalid_counts_fail_closed(value):
    row = SimpleNamespace(
        approved_without_decision=10,
        with_batch_items=value,
        with_attempts=0,
        with_applicability_events=0,
        preliminary_no_history=0,
    )
    with pytest.raises(ValueError):
        inventory.summarize(row)


def test_inventory_sql_contains_protection_against_export_and_event_history():
    sql = str(inventory.INVENTORY_SQL)
    assert "registry = 'mintrud'" in sql
    assert "status = 'approved'" in sql
    for table in (
        "registry_submission_batch_items",
        "registry_submission_attempts",
        "registry_applicability_events",
        "registry_applicability",
    ):
        assert table in sql
    assert "NOT has_batch AND NOT has_attempt AND NOT has_events" in sql


@pytest.mark.asyncio
async def test_inventory_rejects_wrong_environment_before_opening_db(monkeypatch):
    monkeypatch.setattr(inventory.settings, "environment", "production")
    class ForbiddenSession:
        def __call__(self):
            raise AssertionError("Database must not be contacted")
    monkeypatch.setattr(inventory, "AsyncSessionLocal", ForbiddenSession())
    with pytest.raises(RuntimeError, match="existing M4P9 local workspace"):
        await inventory.inventory()
