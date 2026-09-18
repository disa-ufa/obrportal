from pathlib import Path
from types import SimpleNamespace

from app.services.compliance_registry_approval import (
    build_registry_approval_snapshot,
)


def _build_snapshot(
    middle_name,
):
    return build_registry_approval_snapshot(
        registry="mintrud",
        enrollment=SimpleNamespace(
            status="completed",
            completed_at=None,
        ),
        course=SimpleNamespace(
            title="Mintrud test course",
        ),
        learner_profile=SimpleNamespace(
            last_name="Ivanov",
            first_name="Ivan",
            middle_name=middle_name,
            snils="123-456-789 00",
        ),
        mintrud_context=SimpleNamespace(
            reporting_scenario=(
                "external_training_provider"
            ),
            profession_or_position="Engineer",
            employer_name="Employer",
            employer_inn="0274000001",
            knowledge_check_result="passed",
            knowledge_check_date=None,
            protocol_number="1",
        ),
        mintrud_learn_programs=(),
        mintrud_reporting_organization=(
            SimpleNamespace(
                name="Reporting organization",
                inn="0274000000",
            )
        ),
    )


def test_mintrud_approval_snapshot_includes_middle_name():
    snapshot = _build_snapshot(
        "Ivanovich"
    )

    assert (
        snapshot[
            "learner_profile"
        ][
            "middle_name"
        ]
        == "Ivanovich"
    )


def test_mintrud_approval_snapshot_preserves_missing_middle_name():
    snapshot = _build_snapshot(
        None
    )

    assert (
        snapshot[
            "learner_profile"
        ][
            "middle_name"
        ]
        is None
    )


def test_mintrud_readiness_does_not_require_nonempty_middle_name():
    source = (
        Path(
            "app/services/"
            "compliance_registry_readiness.py"
        )
        .read_text(
            encoding="utf-8"
        )
    )

    assert (
        "learner_profile.middle_name_missing"
        not in source
    )


def test_candidate_middle_name_decision_is_snapshot_only():
    approval_source = (
        Path(
            "app/services/"
            "compliance_registry_approval.py"
        )
        .read_text(
            encoding="utf-8"
        )
    )

    readiness_source = (
        Path(
            "app/services/"
            "compliance_registry_readiness.py"
        )
        .read_text(
            encoding="utf-8"
        )
    )

    assert (
        '"middle_name"'
        in approval_source
    )

    assert (
        "learner_profile.middle_name_missing"
        not in readiness_source
    )
