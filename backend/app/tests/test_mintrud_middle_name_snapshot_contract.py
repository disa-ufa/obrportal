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

def test_account_middle_name_approval_invalidation_is_not_readiness_gated():
    source = (
        Path(
            "app/api/v1/account.py"
        )
        .read_text(
            encoding="utf-8"
        )
    )

    function_start = source.index(
        "async def update_account_learner_profile"
    )

    function_source = source[
        function_start:
    ]

    no_change_pos = function_source.index(
        "if not changed_fields:"
    )

    profile_create_pos = function_source.index(
        "if profile is None:",
        no_change_pos,
    )

    pre_mutation = function_source[
        no_change_pos:
        profile_create_pos
    ]

    assert (
        "await lock_registry_approvals_for_learner_profile("
        in pre_mutation
    )

    assert (
        "LEARNER_PROFILE_READINESS_FIELDS"
        not in pre_mutation
    )

    mutation_pos = function_source.index(
        "for field_name in changed_fields:",
        profile_create_pos,
    )

    flush_pos = function_source.index(
        "await session.flush()",
        mutation_pos,
    )

    invalidation_pos = function_source.index(
        "await invalidate_registry_approvals_for_learner_profile(",
        flush_pos,
    )

    readiness_gate_pos = function_source.index(
        "if set(changed_fields).intersection(",
        invalidation_pos,
    )

    refresh_pos = function_source.index(
        "await refresh_registry_readiness_for_user(",
        readiness_gate_pos,
    )

    assert (
        flush_pos
        < invalidation_pos
        < readiness_gate_pos
        < refresh_pos
    )
