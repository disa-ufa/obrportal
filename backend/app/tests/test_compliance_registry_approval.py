from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest

from app.services.compliance_registry_approval import (
    APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
    APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED,
    APPROVAL_STALE_CURRENT_DATA_MISMATCH,
    APPROVAL_STALE_MISSING_SNAPSHOT,
    APPROVAL_STALE_STORED_SNAPSHOT_MISMATCH,
    APPROVAL_VALID_CURRENT,
    apply_registry_approval,
    build_registry_approval_snapshot,
    canonical_registry_approval_json,
    evaluate_registry_approval,
    fingerprint_registry_approval_snapshot,
    invalidate_registry_approval,
    approval_registries_for_learner_profile_fields,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    OBLIGATION_STATUS_PENDING_DATA,
    OBLIGATION_STATUS_READY,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


APPROVED_AT = datetime(
    2026,
    9,
    9,
    8,
    0,
    tzinfo=timezone.utc,
)

INVALIDATED_AT = datetime(
    2026,
    9,
    9,
    9,
    0,
    tzinfo=timezone.utc,
)

REAPPROVED_AT = datetime(
    2026,
    9,
    9,
    10,
    0,
    tzinfo=timezone.utc,
)


def build_common():
    enrollment = SimpleNamespace(
        status="completed",
        completed_at=datetime(
            2026,
            9,
            8,
            12,
            30,
            tzinfo=timezone.utc,
        ),
    )

    course = SimpleNamespace(
        title="First aid",
    )

    return enrollment, course


def build_frdo_snapshot():
    enrollment, course = (
        build_common()
    )

    profile = SimpleNamespace(
        last_name="Tester",
        first_name="Learner",
        birth_date=date(
            2000,
            1,
            2,
        ),
        sex="male",
        citizenship_country_code="643",
    )

    document = SimpleNamespace(
        enrollment_id="enrollment-1",
        document_number="CERT-001",
        document_type="Certificate",
        revoked_at=None,
    )

    snapshot = (
        build_registry_approval_snapshot(
            registry=REGISTRY_FRDO,
            enrollment=enrollment,
            course=course,
            learner_profile=profile,
            document=document,
        )
    )

    return (
        snapshot,
        enrollment,
        course,
        profile,
        document,
    )


def build_mintrud_snapshot():
    enrollment, course = (
        build_common()
    )

    profile = SimpleNamespace(
        last_name="Tester",
        first_name="Worker",
        snils="000-000-000 00",
    )

    context = SimpleNamespace(
        reporting_scenario=(
            "external_training_provider"
        ),
        profession_or_position=(
            "Test worker"
        ),
        employer_name="Test employer",
        employer_inn="0000000000",
        knowledge_check_result=(
            "satisfactory"
        ),
        knowledge_check_date=date(
            2026,
            9,
            8,
        ),
        protocol_number=(
            "TEST-20260908-001"
        ),
    )

    snapshot = (
        build_registry_approval_snapshot(
            registry=REGISTRY_MINTRUD,
            enrollment=enrollment,
            course=course,
            learner_profile=profile,
            mintrud_context=context,
        )
    )

    return (
        snapshot,
        enrollment,
        course,
        profile,
        context,
    )


def build_obligation(
    *,
    status=OBLIGATION_STATUS_READY,
):
    return SimpleNamespace(
        status=status,
        approved_by_user_id=None,
        approved_at=None,
        approval_snapshot_json=None,
        approval_fingerprint=None,
        approval_invalidated_at=None,
        approval_invalidation_reason=None,
    )


def test_frdo_snapshot_contains_exact_approval_inputs():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    assert snapshot == {
        "schema_version": (
            "registry-approval-v1"
        ),
        "registry": "frdo",
        "enrollment": {
            "status": "completed",
            "completed_at": (
                "2026-09-08T12:30:00+00:00"
            ),
        },
        "course": {
            "title": "First aid",
        },
        "learner_profile": {
            "last_name": "Tester",
            "first_name": "Learner",
            "birth_date": "2000-01-02",
            "sex": "male",
            "citizenship_country_code": "643",
        },
        "document": {
            "enrollment_id": "enrollment-1",
            "document_number": "CERT-001",
            "document_type": "Certificate",
            "revoked_at": None,
        },
    }


def test_mintrud_snapshot_contains_exact_approval_inputs():
    snapshot, _, _, _, _ = (
        build_mintrud_snapshot()
    )

    assert snapshot[
        "registry"
    ] == REGISTRY_MINTRUD

    assert snapshot[
        "learner_profile"
    ] == {
        "last_name": "Tester",
        "first_name": "Worker",
        "snils": "000-000-000 00",
    }

    assert snapshot[
        "mintrud_context"
    ] == {
        "reporting_scenario": (
            "external_training_provider"
        ),
        "profession_or_position": (
            "Test worker"
        ),
        "employer_name": "Test employer",
        "employer_inn": "0000000000",
        "knowledge_check_result": (
            "satisfactory"
        ),
        "knowledge_check_date": (
            "2026-09-08"
        ),
        "protocol_number": (
            "TEST-20260908-001"
        ),
    }


def test_canonical_json_and_fingerprint_are_order_independent():
    left = {
        "b": 2,
        "a": {
            "z": "x",
            "a": 1,
        },
    }

    right = {
        "a": {
            "a": 1,
            "z": "x",
        },
        "b": 2,
    }

    assert (
        canonical_registry_approval_json(
            left
        )
        == canonical_registry_approval_json(
            right
        )
    )

    assert (
        fingerprint_registry_approval_snapshot(
            left
        )
        == fingerprint_registry_approval_snapshot(
            right
        )
    )


def test_relevant_change_produces_different_fingerprint():
    (
        before,
        enrollment,
        course,
        profile,
        document,
    ) = build_frdo_snapshot()

    profile.first_name = "Changed"

    after = (
        build_registry_approval_snapshot(
            registry=REGISTRY_FRDO,
            enrollment=enrollment,
            course=course,
            learner_profile=profile,
            document=document,
        )
    )

    assert (
        fingerprint_registry_approval_snapshot(
            before
        )
        != fingerprint_registry_approval_snapshot(
            after
        )
    )


def test_current_approval_validates_against_current_snapshot():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    obligation = build_obligation()

    capture = apply_registry_approval(
        obligation,
        current_snapshot=snapshot,
        approved_by_user_id="user-1",
        approved_at=APPROVED_AT,
    )

    validation = evaluate_registry_approval(
        obligation,
        current_snapshot=snapshot,
    )

    assert obligation.status == (
        OBLIGATION_STATUS_APPROVED
    )

    assert validation.is_current is True

    assert validation.reason == (
        APPROVAL_VALID_CURRENT
    )

    assert (
        validation.approved_fingerprint
        == capture.fingerprint
    )


def test_legacy_approved_without_snapshot_is_stale():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    obligation = build_obligation(
        status=OBLIGATION_STATUS_APPROVED,
    )

    validation = evaluate_registry_approval(
        obligation,
        current_snapshot=snapshot,
    )

    assert validation.is_current is False

    assert validation.reason == (
        APPROVAL_STALE_MISSING_SNAPSHOT
    )


def test_stored_snapshot_tampering_is_stale():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    obligation = build_obligation()

    apply_registry_approval(
        obligation,
        current_snapshot=snapshot,
        approved_by_user_id="user-1",
        approved_at=APPROVED_AT,
    )

    obligation.approval_snapshot_json[
        "course"
    ][
        "title"
    ] = "Tampered"

    validation = evaluate_registry_approval(
        obligation,
        current_snapshot=snapshot,
    )

    assert validation.is_current is False

    assert validation.reason == (
        APPROVAL_STALE_STORED_SNAPSHOT_MISMATCH
    )


def test_current_data_mismatch_is_stale():
    (
        snapshot,
        enrollment,
        course,
        profile,
        document,
    ) = build_frdo_snapshot()

    obligation = build_obligation()

    apply_registry_approval(
        obligation,
        current_snapshot=snapshot,
        approved_by_user_id="user-1",
        approved_at=APPROVED_AT,
    )

    course.title = "Changed title"

    current = (
        build_registry_approval_snapshot(
            registry=REGISTRY_FRDO,
            enrollment=enrollment,
            course=course,
            learner_profile=profile,
            document=document,
        )
    )

    validation = evaluate_registry_approval(
        obligation,
        current_snapshot=current,
    )

    assert validation.is_current is False

    assert validation.reason == (
        APPROVAL_STALE_CURRENT_DATA_MISMATCH
    )


def test_invalidation_is_sticky_and_preserves_approval_evidence():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    obligation = build_obligation()

    capture = apply_registry_approval(
        obligation,
        current_snapshot=snapshot,
        approved_by_user_id="user-1",
        approved_at=APPROVED_AT,
    )

    old_snapshot = (
        obligation.approval_snapshot_json
    )

    old_fingerprint = (
        obligation.approval_fingerprint
    )

    changed = invalidate_registry_approval(
        obligation,
        reason=(
            APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED
        ),
        invalidated_at=INVALIDATED_AT,
    )

    assert changed is True

    assert obligation.status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )

    assert (
        obligation.approved_by_user_id
        == "user-1"
    )

    assert (
        obligation.approved_at
        == APPROVED_AT
    )

    assert (
        obligation.approval_snapshot_json
        == old_snapshot
    )

    assert (
        obligation.approval_fingerprint
        == old_fingerprint
        == capture.fingerprint
    )

    assert (
        obligation.approval_invalidated_at
        == INVALIDATED_AT
    )

    changed_again = (
        invalidate_registry_approval(
            obligation,
            reason=(
                APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED
            ),
            invalidated_at=REAPPROVED_AT,
        )
    )

    assert changed_again is False

    assert (
        obligation.approval_invalidated_at
        == INVALIDATED_AT
    )


def test_explicit_reapproval_replaces_evidence_and_clears_invalidation():
    (
        snapshot,
        enrollment,
        course,
        profile,
        document,
    ) = build_frdo_snapshot()

    obligation = build_obligation()

    first = apply_registry_approval(
        obligation,
        current_snapshot=snapshot,
        approved_by_user_id="user-1",
        approved_at=APPROVED_AT,
    )

    invalidate_registry_approval(
        obligation,
        reason=(
            APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED
        ),
        invalidated_at=INVALIDATED_AT,
    )

    course.title = "Updated first aid"

    current = (
        build_registry_approval_snapshot(
            registry=REGISTRY_FRDO,
            enrollment=enrollment,
            course=course,
            learner_profile=profile,
            document=document,
        )
    )

    second = apply_registry_approval(
        obligation,
        current_snapshot=current,
        approved_by_user_id="user-2",
        approved_at=REAPPROVED_AT,
    )

    assert obligation.status == (
        OBLIGATION_STATUS_APPROVED
    )

    assert second.was_reapproval is True

    assert (
        second.fingerprint
        != first.fingerprint
    )

    assert (
        obligation.approved_by_user_id
        == "user-2"
    )

    assert (
        obligation.approved_at
        == REAPPROVED_AT
    )

    assert (
        obligation.approval_invalidated_at
        is None
    )

    assert (
        obligation.approval_invalidation_reason
        is None
    )

    assert evaluate_registry_approval(
        obligation,
        current_snapshot=current,
    ).is_current is True


def test_current_approved_obligation_cannot_be_reapproved():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    obligation = build_obligation()

    apply_registry_approval(
        obligation,
        current_snapshot=snapshot,
        approved_by_user_id="user-1",
        approved_at=APPROVED_AT,
    )

    with pytest.raises(
        ValueError,
        match=(
            "Current registry approval "
            "cannot be reapproved"
        ),
    ):
        apply_registry_approval(
            obligation,
            current_snapshot=snapshot,
            approved_by_user_id="user-2",
            approved_at=REAPPROVED_AT,
        )


def test_non_approvable_lifecycle_is_rejected():
    snapshot, _, _, _, _ = (
        build_frdo_snapshot()
    )

    obligation = build_obligation(
        status=OBLIGATION_STATUS_PENDING_DATA,
    )

    with pytest.raises(
        ValueError,
        match=(
            "lifecycle does not allow approval"
        ),
    ):
        apply_registry_approval(
            obligation,
            current_snapshot=snapshot,
            approved_by_user_id="user-1",
            approved_at=APPROVED_AT,
        )

def test_birth_date_change_affects_frdo_only():
    assert (
        approval_registries_for_learner_profile_fields(
            {"birth_date"}
        )
        == (REGISTRY_FRDO,)
    )


def test_snils_change_affects_mintrud_only():
    assert (
        approval_registries_for_learner_profile_fields(
            {"snils"}
        )
        == (REGISTRY_MINTRUD,)
    )


def test_shared_name_change_affects_both_registries():
    assert (
        approval_registries_for_learner_profile_fields(
            {"first_name"}
        )
        == (
            REGISTRY_FRDO,
            REGISTRY_MINTRUD,
        )
    )


def test_unrelated_profile_change_affects_no_registry():
    assert (
        approval_registries_for_learner_profile_fields(
            {
                "phone",
                "email",
                "middle_name",
            }
        )
        == ()
    )
