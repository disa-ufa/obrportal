from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.mintrud_protocol_signing import (
    attest_signed_paper_protocol, require_signed_protocol, snapshot_digest,
)

BASE_TIME = datetime(2026, 11, 3, 10, tzinfo=timezone.utc)


def protocol(*, status="recorded", check_date="2026-11-02"):
    snapshot = {
        "protocol_id": "protocol-id", "course_id": "course-id", "protocol_number": "16",
        "protocol_date": "2026-11-02", "participants": [
            {"enrollment_id": "enrollment-id", "obligation_id": "obligation-id",
             "knowledge_check_result": "satisfactory", "knowledge_check_date": check_date},
        ],
    }
    digest = snapshot_digest(snapshot)
    return SimpleNamespace(
        id="protocol-id", course_id="course-id", protocol_number="16",
        protocol_date=date(2026, 11, 2), status=status,
        recorded_snapshot=snapshot, recorded_snapshot_sha256=digest,
        updated_at=BASE_TIME-timedelta(days=1),
        signed_at=None, signed_on=None, signed_by_user_id=None,
        signing_request_id=None, signed_source_sha256=None,
    )


def attest(p, **overrides):
    args = dict(
        expected_updated_at=p.updated_at, signed_on=date(2026, 11, 3),
        actor_user_id="admin-id", request_id="request-id", now=BASE_TIME,
    )
    args.update(overrides)
    return attest_signed_paper_protocol(p, **args)


def test_signed_once_and_valid_replay():
    p=protocol()
    original_updated=p.updated_at
    assert attest(p)
    assert p.updated_at == BASE_TIME
    assert p.signed_on == date(2026,11,3)
    assert p.signed_source_sha256 == p.recorded_snapshot_sha256
    assert require_signed_protocol(p) == p.recorded_snapshot_sha256
    assert not attest(p,expected_updated_at=original_updated)


def test_different_request_or_actor_cannot_reconfirm():
    p=protocol(); assert attest(p)
    for key, val in (("request_id","other"),("actor_user_id","other"),("signed_on",date(2026,11,2))):
        with pytest.raises(HTTPException) as e:
            attest(p, **{key:val})
        assert e.value.status_code == 409


def test_not_recorded_rejected_without_writes():
    p=protocol(status="draft")
    with pytest.raises(HTTPException) as e: attest(p)
    assert e.value.status_code == 409
    assert p.signed_at is None


def test_snapshot_mutation_cannot_be_signed():
    p=protocol(); p.recorded_snapshot["participants"][0]["knowledge_check_result"]="unsatisfactory"
    with pytest.raises(HTTPException) as e: attest(p)
    assert e.value.status_code == 409
    assert p.signed_at is None


def test_invalid_dates_rejected():
    for bad in (date(2026,11,1), date(2026,11,4)):
        p=protocol()
        with pytest.raises(HTTPException) as e: attest(p,signed_on=bad)
        assert e.value.status_code == 422
        assert p.signed_at is None


def test_stale_revision_rejected_without_writes():
    p=protocol()
    with pytest.raises(HTTPException) as e:
        attest(p,expected_updated_at=BASE_TIME-timedelta(days=3))
    assert e.value.status_code == 409
    assert p.signed_at is None


def test_no_incomplete_signing_state_allowed():
    p=protocol(); p.signing_request_id="stray"
    with pytest.raises(HTTPException) as e: attest(p)
    assert e.value.status_code == 409


def test_corrupted_signed_metadata_rejected():
    p=protocol(); attest(p)
    p.signed_source_sha256="0"*64
    with pytest.raises(HTTPException) as e: require_signed_protocol(p)
    assert e.value.status_code == 409


def test_missing_or_duplicate_participants_rejected():
    p=protocol()
    p.recorded_snapshot["participants"].append(dict(p.recorded_snapshot["participants"][0]))
    p.recorded_snapshot_sha256=snapshot_digest(p.recorded_snapshot)
    with pytest.raises(HTTPException) as e: attest(p)
    assert e.value.status_code == 409


def test_knowledge_check_after_signing_rejected():
    p=protocol(check_date="2026-11-04")
    with pytest.raises(HTTPException) as e: attest(p)
    assert e.value.status_code == 422
