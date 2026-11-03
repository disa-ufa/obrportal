from dataclasses import replace
from uuid import uuid4

import pytest

from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation
from app.services.registry_applicability import (
    evaluate_course_registry_applicability,
)
from app.services.registry_applicability_db_inputs import (
    CurrentRegistryApplicabilityInputs,
)
from app.services.registry_applicability_export_guard import (
    RegistryApplicabilityGateError,
)
from app.services.registry_applicability_fingerprint import (
    RegistryApplicabilityInputs,
    fingerprint_applicability_inputs,
)
from app.services.registry_new_action_policy import (
    validate_registry_new_action_policy,
)


def build_case(
    registry="mintrud",
    frdo_mode="not_required",
    mintrud_mode="auto",
):
    enrollment_id = str(uuid4())

    evaluation = evaluate_course_registry_applicability(
        regulatory_program_type="occupational_safety_training",
        frdo_requirement_mode=frdo_mode,
        mintrud_requirement_mode=mintrud_mode,
    )[registry]

    inputs = RegistryApplicabilityInputs(
        registry=registry,
        enrollment_id=enrollment_id,
        course_id=str(uuid4()),
        regulatory_program_type="occupational_safety_training",
        requirement_mode=(
            frdo_mode if registry == "frdo" else mintrud_mode
        ),
        rule_code=evaluation.rule_code,
        rule_version=evaluation.rule_version,
        course_document_type=None,
        issued_document_type=None,
        organization_id=None,
        reporting_scenario=None,
        effective_date=None,
        mintrud_program_codes=(),
    )

    fingerprint = fingerprint_applicability_inputs(inputs)

    current = CurrentRegistryApplicabilityInputs(
        inputs=inputs,
        evaluation=evaluation,
        fingerprint=fingerprint,
    )

    obligation = RegistryObligation(
        registry=registry,
        enrollment_id=enrollment_id,
        status="needs_approval",
    )

    applicability = RegistryApplicabilityRecord(
        enrollment_id=enrollment_id,
        registry=registry,
        decision="required",
        source="auto",
        rule_code=evaluation.rule_code,
        rule_version=evaluation.rule_version,
        reason="Current rule evaluation",
        input_fingerprint=fingerprint,
        decision_version=1,
    )

    return obligation, applicability, current


def validate(case):
    obligation, applicability, current = case
    return validate_registry_new_action_policy(
        obligation=obligation,
        applicability=applicability,
        current=current,
    )


def expect_denial(case, code):
    with pytest.raises(RegistryApplicabilityGateError) as error:
        validate(case)
    assert error.value.code == code


def test_current_mintrud_required_passes_pure_precondition():
    case = build_case()
    grant = validate(case)
    assert grant.registry == "mintrud"
    assert grant.input_fingerprint == case[2].fingerprint


def test_frdo_not_required_blocks_even_forged_stored_required():
    expect_denial(
        build_case(registry="frdo", frdo_mode="not_required"),
        "registry.current_applicability_not_required",
    )


def test_frdo_needs_review_blocks_even_forged_stored_required():
    expect_denial(
        build_case(registry="frdo", frdo_mode="auto"),
        "registry.current_applicability_needs_review",
    )


def test_missing_persisted_decision_fails_closed():
    obligation, _, current = build_case()
    expect_denial(
        (obligation, None, current),
        "registry.applicability_missing",
    )


def test_stored_rule_code_change_blocks():
    obligation, applicability, current = build_case()
    applicability.rule_code = "mintrud.old.rule"

    expect_denial(
        (obligation, applicability, current),
        "registry.stored_rule_stale",
    )


def test_stored_rule_version_change_blocks():
    obligation, applicability, current = build_case()
    applicability.rule_version = "old-version"

    expect_denial(
        (obligation, applicability, current),
        "registry.stored_rule_stale",
    )


def test_stale_persisted_fingerprint_blocks():
    obligation, applicability, current = build_case()
    applicability.input_fingerprint = "0" * 64

    expect_denial(
        (obligation, applicability, current),
        "registry.applicability_stale",
    )


def test_inconsistent_current_snapshot_blocks():
    obligation, applicability, current = build_case()
    current = replace(current, fingerprint="0" * 64)

    expect_denial(
        (obligation, applicability, current),
        "registry.current_snapshot_mismatch",
    )


def test_inconsistent_current_rule_blocks():
    obligation, applicability, current = build_case()
    changed_inputs = replace(
        current.inputs,
        rule_code="different.current.rule",
    )
    changed_current = replace(
        current,
        inputs=changed_inputs,
        fingerprint=fingerprint_applicability_inputs(changed_inputs),
    )

    expect_denial(
        (obligation, applicability, changed_current),
        "registry.current_rule_mismatch",
    )


def test_mismatched_enrollment_blocks():
    obligation, applicability, current = build_case()
    current = replace(
        current,
        inputs=replace(
            current.inputs,
            enrollment_id=str(uuid4()),
        ),
    )

    expect_denial(
        (obligation, applicability, current),
        "registry.current_scope_mismatch",
    )


def test_legacy_decision_does_not_grant():
    obligation, applicability, current = build_case()
    applicability.source = "legacy"

    expect_denial(
        (obligation, applicability, current),
        "registry.legacy_decision_unverified",
    )


def test_manual_required_without_actor_blocks():
    obligation, applicability, current = build_case()
    applicability.source = "manual"
    applicability.decided_by_user_id = None

    expect_denial(
        (obligation, applicability, current),
        "registry.manual_decision_incomplete",
    )


def test_explicit_required_frdo_with_reviewed_manual_decision():
    obligation, applicability, current = build_case(
        registry="frdo",
        frdo_mode="required",
    )

    applicability.source = "manual"
    applicability.decided_by_user_id = str(uuid4())
    applicability.reason = "Reviewed authorized decision"

    grant = validate(
        (obligation, applicability, current)
    )

    assert grant.registry == "frdo"