"""Pure classification of historical Mintrud commit evidence.

No database access, writes, locks, retries, or side effects.

NOT_COMMITTED is valid as a transaction outcome only when the caller
has first established that the original writer transaction ended,
using its coordinated PostgreSQL transaction fence.

An absent or contradictory evidence set must never authorize
an automatic retry.
"""
from __future__ import annotations

from enum import Enum
from uuid import UUID


class HistoricalCommitOutcome(str, Enum):
    COMMITTED = "committed"
    NOT_COMMITTED = "not_committed"
    UNKNOWN = "unknown"


def _valid_uuid(value):
    if not isinstance(value, str):
        return False
    try:
        return str(UUID(value)) == value
    except (ValueError, TypeError, AttributeError):
        return False


def classify_historical_commit_evidence(
    *,
    records,
    events,
    audits,
    obligation_id,
    enrollment_id,
    actor_id,
    approval_event_id,
    approval_fingerprint,
    applicability_fingerprint,
    operation_id,
):
    """Classify a complete, fenced evidence set.

    records: all Mintrud applicability rows for the enrollment.
    events: all Mintrud applicability events for the enrollment.
    audits: all historical-reconciliation audits for the obligation.

    Do not prefilter the audit collection to just the operation_id:
    additional or conflicting evidence must remain visible.
    """
    unknown = HistoricalCommitOutcome.UNKNOWN

    if not all(
        _valid_uuid(value)
        for value in (
            obligation_id,
            enrollment_id,
            actor_id,
            approval_event_id,
            operation_id,
        )
    ):
        return unknown

    if not all(
        isinstance(value, str)
        and len(value) == 64
        and all(c in "0123456789abcdef" for c in value)
        for value in (
            approval_fingerprint,
            applicability_fingerprint,
        )
    ):
        return unknown

    if not all(
        isinstance(items, (tuple, list))
        for items in (records, events, audits)
    ):
        return unknown

    if not records and not events and not audits:
        return HistoricalCommitOutcome.NOT_COMMITTED

    if (
        len(records) != 1
        or len(events) != 1
        or len(audits) != 1
    ):
        return unknown

    record = records[0]
    event = events[0]
    audit = audits[0]

    try:
        payload = audit.payload

        if not isinstance(payload, dict):
            return unknown

        consistent = all((
            _valid_uuid(str(record.id)),
            str(record.enrollment_id) == enrollment_id,
            record.registry == "mintrud",
            record.decision == "required",
            record.source == "auto",
            record.input_fingerprint == applicability_fingerprint,
            record.decision_version == 1,
            record.decided_by_user_id is None,

            str(event.applicability_id) == str(record.id),
            str(event.enrollment_id) == enrollment_id,
            event.registry == "mintrud",
            event.decision == "required",
            event.source == "auto",
            event.input_fingerprint == applicability_fingerprint,
            event.decision_version == 1,
            event.rule_code == record.rule_code,
            event.rule_version == record.rule_version,

            audit.action ==
                "admin.mintrud_historical_applicability_reconciled",
            audit.entity_type == "registry_obligation",
            str(audit.entity_id) == obligation_id,
            str(audit.actor_user_id) == actor_id,

            payload.get("operation_id") == operation_id,
            payload.get("applicability_id") == str(record.id),
            payload.get("approval_event_id") == approval_event_id,
            payload.get("approval_fingerprint") ==
                approval_fingerprint,
            payload.get("applicability_fingerprint") ==
                applicability_fingerprint,
            payload.get("decision") == "required",
            payload.get("decision_source") == "auto",
            payload.get("rule_code") == record.rule_code,
            payload.get("rule_version") == record.rule_version,
            payload.get("historical_review") is True,
        ))

        if consistent:
            return HistoricalCommitOutcome.COMMITTED

    except (AttributeError, TypeError, ValueError):
        return unknown

    return unknown