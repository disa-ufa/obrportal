from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.models.mintrud_registry_context import (
    MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING,
    MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER,
)
from app.services.compliance_registry_approval import (
    build_registry_approval_snapshot,
)
from app.services.compliance_registry_contract import (
    REGISTRY_MINTRUD,
)
from app.services.mintrud_employer import (
    MINTRUD_EMPLOYER_SOURCE_CONTEXT,
    MINTRUD_EMPLOYER_SOURCE_REPORTING_ORGANIZATION,
    MintrudEmployer,
    MintrudEmployerResolutionError,
    resolve_mintrud_employer_from_approval_snapshot,
)


def external_snapshot():
    return {
        "registry": REGISTRY_MINTRUD,
        "mintrud_context": {
            "reporting_scenario": (
                MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER
            ),
            "employer_name": "  External Employer  ",
            "employer_inn": "  0274000001  ",
        },
        "mintrud_reporting_organization": {
            "name": "Training Provider",
            "inn": "0274000002",
        },
    }


def self_training_snapshot():
    return {
        "registry": REGISTRY_MINTRUD,
        "mintrud_context": {
            "reporting_scenario": (
                MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING
            ),
            "employer_name": "Must Be Ignored",
            "employer_inn": "9999999999",
        },
        "mintrud_reporting_organization": {
            "name": "  Self Training Employer  ",
            "inn": "  0274000003  ",
        },
    }


def test_external_training_uses_approved_context_employer():
    assert (
        resolve_mintrud_employer_from_approval_snapshot(
            external_snapshot()
        )
        == MintrudEmployer(
            title="External Employer",
            inn="0274000001",
            source=MINTRUD_EMPLOYER_SOURCE_CONTEXT,
        )
    )


def test_self_training_uses_approved_reporting_organization():
    assert (
        resolve_mintrud_employer_from_approval_snapshot(
            self_training_snapshot()
        )
        == MintrudEmployer(
            title="Self Training Employer",
            inn="0274000003",
            source=(
                MINTRUD_EMPLOYER_SOURCE_REPORTING_ORGANIZATION
            ),
        )
    )


@pytest.mark.parametrize(
    ("field", "message"),
    (
        (
            "employer_name",
            "employer title is required",
        ),
        (
            "employer_inn",
            "employer INN is required",
        ),
    ),
)
def test_external_training_fails_closed_without_employer_field(
    field,
    message,
):
    snapshot = external_snapshot()
    snapshot[
        "mintrud_context"
    ][field] = ""

    with pytest.raises(
        MintrudEmployerResolutionError,
        match=message,
    ):
        resolve_mintrud_employer_from_approval_snapshot(
            snapshot
        )


@pytest.mark.parametrize(
    ("field", "message"),
    (
        (
            "name",
            "employer title is required",
        ),
        (
            "inn",
            "employer INN is required",
        ),
    ),
)
def test_self_training_fails_closed_without_reporting_org_field(
    field,
    message,
):
    snapshot = self_training_snapshot()

    snapshot[
        "mintrud_reporting_organization"
    ][field] = ""

    with pytest.raises(
        MintrudEmployerResolutionError,
        match=message,
    ):
        resolve_mintrud_employer_from_approval_snapshot(
            snapshot
        )


def test_missing_or_unknown_scenario_fails_closed():
    for scenario in (
        "",
        "unknown",
    ):
        snapshot = external_snapshot()

        snapshot[
            "mintrud_context"
        ][
            "reporting_scenario"
        ] = scenario

        with pytest.raises(
            MintrudEmployerResolutionError,
            match="unsupported reporting scenario",
        ):
            resolve_mintrud_employer_from_approval_snapshot(
                snapshot
            )


def test_non_mintrud_snapshot_is_rejected():
    with pytest.raises(
        MintrudEmployerResolutionError,
        match="not a Mintrud snapshot",
    ):
        resolve_mintrud_employer_from_approval_snapshot(
            {
                "registry": "frdo",
                "mintrud_context": {},
            }
        )


def test_exact_approval_snapshot_shape_is_supported_for_self_training():
    snapshot = build_registry_approval_snapshot(
        registry=REGISTRY_MINTRUD,
        enrollment=SimpleNamespace(
            status="completed",
            completed_at=datetime(
                2026,
                9,
                23,
                tzinfo=timezone.utc,
            ),
        ),
        course=SimpleNamespace(
            title="Occupational safety",
        ),
        learner_profile=SimpleNamespace(
            last_name="Ivanov",
            first_name="Ivan",
            middle_name="Ivanovich",
            snils="000-000-000 00",
        ),
        mintrud_context=SimpleNamespace(
            reporting_scenario=(
                MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING
            ),
            profession_or_position="Engineer",
            employer_name=None,
            employer_inn=None,
            knowledge_check_result="satisfactory",
            knowledge_check_date=None,
            protocol_number="OT-001",
        ),
        mintrud_learn_programs=(),
        mintrud_reporting_organization=SimpleNamespace(
            name="Approved Reporting Org",
            inn="0274000004",
        ),
    )

    resolved = (
        resolve_mintrud_employer_from_approval_snapshot(
            snapshot
        )
    )

    assert resolved == MintrudEmployer(
        title="Approved Reporting Org",
        inn="0274000004",
        source=(
            MINTRUD_EMPLOYER_SOURCE_REPORTING_ORGANIZATION
        ),
    )