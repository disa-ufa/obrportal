from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.registry_historical_mintrud_api import require_local_clone
from app.core.config import settings
from app.services.mintrud_protocol_provenance import (
    SYNC_FIELDS,
    _event_for_obligation,
)
from app.services.mintrud_protocol_reconciliation import (
    compare_field,
    _verified_recorded_participants,
)
from app.services.mintrud_protocol_sync import (
    SOURCE_FIELDS,
    _eligible,
)
from app.services.registry_historical_mintrud_commit_outcome import (
    HistoricalCommitOutcome,
    classify_historical_commit_evidence,
)
from app.services.registry_historical_mintrud_reconciliation import (
    HistoricalMintrudReconciliationError,
    _hash,
    _uuid,
    reconcile_historical_mintrud,
)


CLONE_URL = "postgresql+asyncpg://test@postgres/obrportal_prodclone_20261101"
VALID_UUID = "00000000-0000-4000-8000-000000000001"


def test_historical_api_denies_production_environment(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "database_url", CLONE_URL)

    with pytest.raises(HTTPException) as exc:
        require_local_clone()

    assert exc.value.status_code == 404


@pytest.mark.parametrize(
    "source,existing,expected",
    [
        (None, "existing", "source_missing"),
        ("source", None, "target_empty"),
        (" value ", "value", "match"),
        ("source", "manual", "conflict"),
    ],
)
def test_mintrud_comparison_does_not_overwrite_unknown_values(
    source, existing, expected
):
    result = compare_field(source, existing)

    assert result["verdict"] == expected


def test_draft_is_not_recorded_evidence():
    protocol = SimpleNamespace(status="draft")

    assert _verified_recorded_participants(protocol) is None


def test_recorded_protocol_requires_snapshot():
    protocol = SimpleNamespace(
        status="recorded",
        recorded_snapshot=None,
        recorded_snapshot_sha256=None,
    )

    with pytest.raises(HTTPException) as exc:
        _verified_recorded_participants(protocol)

    assert exc.value.status_code == 409


def test_provenance_requires_exact_audit_evidence():
    payload = {
        "changed_obligation_ids": ["obligation-1"],
        "source_sha256": "synthetic-digest",
        "fields": sorted(SYNC_FIELDS),
    }
    event = SimpleNamespace(payload=payload)

    assert _event_for_obligation(event, "obligation-1")
    assert not _event_for_obligation(event, "obligation-2")

    missing_digest = SimpleNamespace(
        payload={**payload, "source_sha256": None}
    )
    assert not _event_for_obligation(missing_digest, "obligation-1")


def _member(verdict="missing_target_fields"):
    return {
        "structural_issues": [],
        "history_reasons": [],
        "conflict_fields": [],
        "fields": {
            name: {"source": "synthetic-value"}
            for name in SOURCE_FIELDS
        },
        "verdict": verdict,
    }


def test_mintrud_sync_rejects_unrecorded_results():
    allowed, reason = _eligible(
        _member(), "pending_data", signed=False
    )

    assert allowed is False
    assert reason == "protocol_not_signed"


def test_mintrud_sync_rejects_approved_obligation():
    allowed, reason = _eligible(
        _member(), "approved", signed=True
    )

    assert allowed is False
    assert reason == "registry_status_not_pending_data"


def test_mintrud_sync_preserves_protected_history():
    member = _member()
    member["history_reasons"] = ["approval"]

    allowed, reason = _eligible(
        member, "pending_data", signed=True
    )

    assert allowed is False
    assert reason == "protected_history"


def test_mintrud_sync_only_fills_eligible_empty_fields():
    allowed, reason = _eligible(
        _member(), "pending_data", signed=True
    )

    assert allowed is True
    assert reason == "can_fill_empty"


def _commit_inputs():
    return {
        "records": [],
        "events": [],
        "audits": [],
        "obligation_id": VALID_UUID,
        "enrollment_id": VALID_UUID,
        "actor_id": VALID_UUID,
        "approval_event_id": VALID_UUID,
        "approval_fingerprint": "a" * 64,
        "applicability_fingerprint": "b" * 64,
        "operation_id": VALID_UUID,
    }


def test_historical_commit_evidence_requires_consistency():
    inputs = _commit_inputs()

    # Classification only; caller must separately establish the
    # required transaction fence before interpreting NOT_COMMITTED.
    assert classify_historical_commit_evidence(
        **inputs
    ) == HistoricalCommitOutcome.NOT_COMMITTED

    inputs["records"] = [object()]

    assert classify_historical_commit_evidence(
        **inputs
    ) == HistoricalCommitOutcome.UNKNOWN


def test_historical_input_validation_is_strict():
    assert _uuid(VALID_UUID) == VALID_UUID
    assert _hash("a" * 64) == "a" * 64

    with pytest.raises(HistoricalMintrudReconciliationError):
        _uuid("not-a-uuid")

    with pytest.raises(HistoricalMintrudReconciliationError):
        _hash("A" * 64)


@pytest.mark.asyncio
async def test_historical_apply_denied_on_production_before_database_io(
    monkeypatch,
):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "database_url", CLONE_URL)
    monkeypatch.setenv(
        "P34D_LOCAL_HISTORICAL_APPLY",
        "I_ACKNOWLEDGE_P34D_LOCAL_COMMIT",
    )

    # No database session methods are provided: the safety boundary
    # must reject the request before any database interaction.
    with pytest.raises(
        HistoricalMintrudReconciliationError,
        match=r"^historical\.local_target_required$",
    ):
        await reconcile_historical_mintrud(
            session=object(),
            actor_id=VALID_UUID,
            obligation_id=VALID_UUID,
            expected_approval_event_id=VALID_UUID,
            expected_approval_fingerprint="a" * 64,
            expected_applicability_fingerprint="b" * 64,
            operator_reason="Synthetic production rejection regression",
            apply=True,
            operation_id=VALID_UUID,
        )
