from types import SimpleNamespace

import pytest

from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    OBLIGATION_STATUS_PENDING_DATA,
    OBLIGATION_STATUS_READY,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_readiness import (
    RegistryReadinessIssue,
    RegistryReadinessResult,
)
from app.services.compliance_registry_readiness_propagation import (
    LEARNER_PROFILE_READINESS_FIELDS,
    apply_registry_readiness_result,
)


def build_readiness(
    *,
    is_ready: bool,
) -> RegistryReadinessResult:
    issues = ()

    if not is_ready:
        issues = (
            RegistryReadinessIssue(
                code="learner_profile.snils_missing",
                field="learner_profile.snils",
                message="SNILS is required.",
            ),
        )

    return RegistryReadinessResult(
        registry=REGISTRY_MINTRUD,
        is_ready=is_ready,
        issues=issues,
    )


def build_obligation(
    *,
    status: str,
    readiness_errors=None,
):
    return SimpleNamespace(
        id="obligation-1",
        registry=REGISTRY_MINTRUD,
        status=status,
        readiness_errors=(
            readiness_errors
            if readiness_errors is not None
            else []
        ),
    )


def test_profile_readiness_fields_cover_registry_dependencies():
    assert LEARNER_PROFILE_READINESS_FIELDS == frozenset(
        {
            "last_name",
            "first_name",
            "birth_date",
            "sex",
            "citizenship_country_code",
            "snils",
        }
    )

    assert "phone" not in LEARNER_PROFILE_READINESS_FIELDS
    assert "notes" not in LEARNER_PROFILE_READINESS_FIELDS


def test_pending_data_moves_to_ready_when_readiness_passes():
    obligation = build_obligation(
        status=OBLIGATION_STATUS_PENDING_DATA,
        readiness_errors=[
            {
                "code": "old.error",
                "field": "old.field",
                "message": "Old error.",
            }
        ],
    )

    refresh = apply_registry_readiness_result(
        obligation,
        build_readiness(
            is_ready=True,
        ),
    )

    assert obligation.status == OBLIGATION_STATUS_READY
    assert obligation.readiness_errors == []

    assert refresh.before_status == (
        OBLIGATION_STATUS_PENDING_DATA
    )
    assert refresh.after_status == OBLIGATION_STATUS_READY
    assert refresh.is_ready is True
    assert len(refresh.before_errors) == 1
    assert refresh.after_errors == ()


def test_ready_moves_to_pending_data_when_dependency_breaks():
    obligation = build_obligation(
        status=OBLIGATION_STATUS_READY,
    )

    refresh = apply_registry_readiness_result(
        obligation,
        build_readiness(
            is_ready=False,
        ),
    )

    assert obligation.status == (
        OBLIGATION_STATUS_PENDING_DATA
    )

    assert obligation.readiness_errors == [
        {
            "code": "learner_profile.snils_missing",
            "field": "learner_profile.snils",
            "message": "SNILS is required.",
        }
    ]

    assert refresh.before_status == OBLIGATION_STATUS_READY
    assert refresh.after_status == (
        OBLIGATION_STATUS_PENDING_DATA
    )
    assert refresh.is_ready is False


def test_needs_approval_keeps_status_but_refreshes_errors():
    obligation = build_obligation(
        status=OBLIGATION_STATUS_NEEDS_APPROVAL,
        readiness_errors=[],
    )

    refresh = apply_registry_readiness_result(
        obligation,
        build_readiness(
            is_ready=False,
        ),
    )

    assert obligation.status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )

    assert obligation.readiness_errors == [
        {
            "code": "learner_profile.snils_missing",
            "field": "learner_profile.snils",
            "message": "SNILS is required.",
        }
    ]

    assert refresh.before_status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )
    assert refresh.after_status == (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )


def test_non_refreshable_lifecycle_is_rejected():
    obligation = build_obligation(
        status="approved",
    )

    with pytest.raises(
        ValueError,
        match=(
            "lifecycle does not allow "
            "automatic readiness refresh"
        ),
    ):
        apply_registry_readiness_result(
            obligation,
            build_readiness(
                is_ready=True,
            ),
        )

    assert obligation.status == "approved"
    assert obligation.readiness_errors == []
