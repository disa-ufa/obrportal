from dataclasses import replace
from datetime import date

import pytest

from app.services.registry_applicability_fingerprint import (
    RegistryApplicabilityInputs,
    canonical_applicability_inputs,
    fingerprint_applicability_inputs,
)


def input_data():
    return RegistryApplicabilityInputs(
        registry="mintrud",
        enrollment_id="e-1",
        course_id="c-1",
        regulatory_program_type="occupational_safety_training",
        requirement_mode="auto",
        rule_code="mintrud.auto.occupational_safety_training",
        rule_version="2026-09-04-v1",
        course_document_type="certificate",
        issued_document_type="certificate",
        organization_id="org-1",
        reporting_scenario="training_organization",
        effective_date=date(2026, 10, 13),
        mintrud_program_codes=("ИД34", "А"),
    )


def test_deterministic_fingerprint_with_canonical_program_order():
    base = input_data()
    second = replace(base, mintrud_program_codes=("А", "ИД34"))
    assert fingerprint_applicability_inputs(base) == fingerprint_applicability_inputs(second)
    assert fingerprint_applicability_inputs(base) == fingerprint_applicability_inputs(base)
    assert len(fingerprint_applicability_inputs(base)) == 64


@pytest.mark.parametrize(
    ("field", "changed"),
    [
        ("registry", "frdo"),
        ("course_id", "c-2"),
        ("regulatory_program_type", "dpo_advanced_training"),
        ("requirement_mode", "required"),
        ("rule_code", "mintrud.override.required"),
        ("rule_version", "v2"),
        ("course_document_type", "diploma"),
        ("issued_document_type", "diploma"),
        ("organization_id", "org-2"),
        ("reporting_scenario", "employer"),
        ("effective_date", date(2026, 10, 14)),
        ("mintrud_program_codes", ("ИД34",)),
    ],
)
def test_significant_input_changes_invalidate_fingerprint(field, changed):
    base = input_data()
    assert fingerprint_applicability_inputs(base) != fingerprint_applicability_inputs(
        replace(base, **{field: changed})
    )


def test_unknown_optional_fields_remain_explicit_null():
    payload = canonical_applicability_inputs(
        replace(input_data(), issued_document_type=None, reporting_scenario=None)
    )
    assert '"issued_type":null' in payload
    assert '"reporting_scenario":null' in payload


@pytest.mark.parametrize(
    ("field", "invalid"),
    [
        ("rule_version", ""),
        ("course_id", " c-1"),
        ("mintrud_program_codes", ("ИД34", "ИД34")),
        ("mintrud_program_codes", ("ИД34", "")),
    ],
)
def test_invalid_inputs_rejected(field, invalid):
    with pytest.raises(ValueError):
        fingerprint_applicability_inputs(replace(input_data(), **{field: invalid}))
