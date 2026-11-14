"""M4.3: guards for administrative attestation of a signed *paper* protocol.

Never assert a cryptographic signature or infer a commission decision from a quiz.
Neither this module nor the signing API approves, exports or synchronizes data.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from hashlib import sha256
import json

from fastapi import HTTPException


def _conflict(detail: str) -> None:
    raise HTTPException(status_code=409, detail=detail)


def snapshot_digest(snapshot: dict) -> str:
    canonical = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return sha256(canonical.encode("utf-8")).hexdigest()


def require_recorded_snapshot(protocol) -> str:
    if protocol.status != "recorded":
        _conflict("Commission results are not recorded")
    snapshot = protocol.recorded_snapshot
    digest = protocol.recorded_snapshot_sha256
    if not isinstance(snapshot, dict) or not isinstance(digest, str) or len(digest) != 64:
        _conflict("Recorded protocol snapshot missing")
    if snapshot_digest(snapshot) != digest:
        _conflict("Recorded protocol snapshot hash mismatch")
    if (str(snapshot.get("protocol_id")) != str(protocol.id)
        or str(snapshot.get("course_id")) != str(protocol.course_id)
        or snapshot.get("protocol_number") != protocol.protocol_number
        or snapshot.get("protocol_date") != protocol.protocol_date.isoformat()):
        _conflict("Recorded protocol metadata mismatch")
    people = snapshot.get("participants")
    if not isinstance(people, list) or not people or len(people) > 100:
        _conflict("Recorded protocol participants missing or invalid")
    ids = set()
    for person in people:
        if not isinstance(person, dict) or not person.get("enrollment_id") or not person.get("obligation_id"):
            _conflict("Recorded participant link missing")
        if person.get("knowledge_check_result") not in ("satisfactory", "unsatisfactory"):
            _conflict("Recorded knowledge-check result incomplete")
        raw_date = person.get("knowledge_check_date")
        try:
            check_date = date.fromisoformat(raw_date) if isinstance(raw_date, str) else None
        except ValueError:
            check_date = None
        if check_date is None:
            _conflict("Recorded knowledge-check date missing or invalid")
        if str(person["enrollment_id"]) in ids:
            _conflict("Duplicate recorded participant")
        ids.add(str(person["enrollment_id"]))
    return digest


def require_signed_protocol(protocol) -> str:
    digest = require_recorded_snapshot(protocol)
    if (protocol.signed_at is None or protocol.signed_on is None
        or not protocol.signed_by_user_id or not protocol.signing_request_id
        or protocol.signed_source_sha256 != digest):
        _conflict("Signed paper original is not attested or recorded source changed")
    return digest


def validate_signing_date(protocol, signed_on: date, *, today: date) -> None:
    if signed_on > today:
        raise HTTPException(status_code=422, detail="Signing date cannot be in the future")
    if signed_on < protocol.protocol_date:
        raise HTTPException(status_code=422, detail="Signing date cannot precede protocol date")
    for participant in protocol.recorded_snapshot["participants"]:
        check_date = date.fromisoformat(participant["knowledge_check_date"])
        if signed_on < check_date:
            raise HTTPException(status_code=422, detail="Signing date cannot precede recorded knowledge check")


def attest_signed_paper_protocol(
    protocol, *, expected_updated_at: datetime, signed_on: date,
    actor_user_id: str, request_id: str, now: datetime | None = None,
) -> bool:
    """Mutate a *locked* ORM record exactly once; return False for a valid replay.

    Caller MUST use SELECT FOR UPDATE and own transaction/commit.
    """
    digest = require_recorded_snapshot(protocol)
    if protocol.signed_at is not None:
        require_signed_protocol(protocol)
        if (str(protocol.signing_request_id) == str(request_id)
            and str(protocol.signed_by_user_id) == str(actor_user_id)
            and protocol.signed_on == signed_on):
            return False
        _conflict("Protocol signing was already attested; corrections need a separate workflow")
    if any(getattr(protocol, name, None) is not None for name in
           ("signed_on", "signed_by_user_id", "signing_request_id", "signed_source_sha256")):
        _conflict("Partial signing state; manual review required")
    if protocol.updated_at != expected_updated_at:
        _conflict("Protocol changed since last read; refresh before signing")
    effective_now = now or datetime.now(timezone.utc)
    validate_signing_date(protocol, signed_on, today=effective_now.astimezone(ZoneInfo("Asia/Yekaterinburg")).date())
    if not actor_user_id or not request_id:
        _conflict("Signing actor and request identity are required")
    protocol.signed_at = effective_now
    protocol.signed_on = signed_on
    protocol.signed_by_user_id = actor_user_id
    protocol.signing_request_id = request_id
    protocol.signed_source_sha256 = digest
    protocol.updated_at = effective_now
    return True
