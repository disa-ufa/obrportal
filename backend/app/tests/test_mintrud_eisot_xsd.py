from __future__ import annotations

import hashlib

import pytest

import app.services.mintrud_eisot_xsd as xsd_service
from app.services.mintrud_eisot_xml import (
    MINTRUD_EISOT_XML_XSD_SHA256,
    serialize_mintrud_eisot_xml_v109,
)
from app.services.mintrud_eisot_xsd import (
    MintrudEisotXsdValidationError,
    validate_mintrud_eisot_xml_v109,
)


def _snapshot(
    *,
    result: str = "satisfactory",
    middle_name: str = "Petrovich",
):
    return {
        "schema_version": "registry-approval-v1",
        "registry": "mintrud",
        "enrollment": {
            "status": "completed",
            "completed_at": "2026-09-23T10:00:00+00:00",
        },
        "course": {
            "title": "Probe course",
        },
        "learner_profile": {
            "last_name": "Ivanov",
            "first_name": "Ivan",
            "middle_name": middle_name,
            "snils": "123-456-789 01",
        },
        "mintrud_context": {
            "reporting_scenario": "external_training_provider",
            "profession_or_position": "Engineer",
            "employer_name": "Employer LLC",
            "employer_inn": "0274000001",
            "knowledge_check_result": result,
            "knowledge_check_date": "2026-09-23",
            "protocol_number": "77",
        },
        "mintrud_learn_programs": [
            {
                "id": "program-1",
                "learn_program_id": 1,
                "code": "program-1",
                "title": "Occupational safety program",
                "schema_version": "1.0.9",
            },
        ],
        "mintrud_reporting_organization": {
            "name": "Training Organization",
            "inn": "0274000002",
        },
    }


def _valid_xml(
    *,
    result: str = "satisfactory",
    middle_name: str = "Petrovich",
) -> bytes:
    return serialize_mintrud_eisot_xml_v109(
        _snapshot(
            result=result,
            middle_name=middle_name,
        )
    )


def _replace_once(
    content: bytes,
    old: bytes,
    new: bytes,
) -> bytes:
    assert content.count(old) == 1

    return content.replace(
        old,
        new,
        1,
    )


def test_official_xsd_resource_has_pinned_sha256():
    content = (
        xsd_service
        .MINTRUD_EISOT_XSD_PATH
        .read_bytes()
    )

    assert (
        hashlib.sha256(
            content
        ).hexdigest()
        == MINTRUD_EISOT_XML_XSD_SHA256
    )


def test_generated_xml_passes_official_xsd():
    assert (
        validate_mintrud_eisot_xml_v109(
            _valid_xml()
        )
        is None
    )


def test_generated_unsatisfactory_xml_passes_xsd():
    assert (
        validate_mintrud_eisot_xml_v109(
            _valid_xml(
                result="unsatisfactory"
            )
        )
        is None
    )


def test_required_empty_middle_name_passes_xsd():
    content = _valid_xml(
        middle_name=""
    )

    assert b"<MiddleName" in content

    assert (
        validate_mintrud_eisot_xml_v109(
            content
        )
        is None
    )


def test_str_input_is_supported():
    content = _valid_xml().decode(
        "utf-8"
    )

    assert (
        validate_mintrud_eisot_xml_v109(
            content
        )
        is None
    )


@pytest.mark.parametrize(
    "value",
    [
        b"",
        b"   ",
        bytearray(),
        memoryview(b""),
    ],
)
def test_empty_xml_is_rejected(value):
    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="must not be empty",
    ):
        validate_mintrud_eisot_xml_v109(
            value
        )


def test_non_text_input_is_rejected():
    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="must be bytes or str",
    ):
        validate_mintrud_eisot_xml_v109(
            123
        )


def test_malformed_xml_is_rejected():
    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="not well-formed",
    ):
        validate_mintrud_eisot_xml_v109(
            b"<RegistrySet>"
        )


def test_missing_required_worker_field_is_rejected():
    invalid = _replace_once(
        _valid_xml(),
        b"<LastName>Ivanov</LastName>",
        b"",
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="XSD validation failed",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_unknown_worker_element_is_rejected():
    invalid = _replace_once(
        _valid_xml(),
        b"</Worker>",
        (
            b"<Unexpected>x</Unexpected>"
            b"</Worker>"
        ),
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="XSD validation failed",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_learn_program_id_5_is_rejected_by_xsd():
    invalid = _replace_once(
        _valid_xml(),
        b'learnProgramId="1"',
        b'learnProgramId="5"',
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="XSD validation failed",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_invalid_date_is_rejected_by_xsd():
    invalid = _replace_once(
        _valid_xml(),
        b"<Date>2026-09-23</Date>",
        b"<Date>23.09.2026</Date>",
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="XSD validation failed",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_missing_is_passed_is_rejected_by_xsd():
    invalid = _replace_once(
        _valid_xml(),
        b' isPassed="1"',
        b"",
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="XSD validation failed",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_empty_registry_set_is_rejected_by_xsd():
    invalid = (
        b"<?xml version='1.0' encoding='utf-8'?>"
        b"<RegistrySet />"
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="XSD validation failed",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_doctype_is_rejected_before_xsd_validation():
    content = _valid_xml()

    marker = b"?>"

    assert content.count(
        marker
    ) == 1

    invalid = content.replace(
        marker,
        (
            marker
            + b"<!DOCTYPE RegistrySet "
            + b"[<!ENTITY probe 'x'>]>"
        ),
        1,
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="must not contain a DOCTYPE",
    ):
        validate_mintrud_eisot_xml_v109(
            invalid
        )


def test_tampered_xsd_is_rejected(
    tmp_path,
    monkeypatch,
):
    original = (
        xsd_service
        .MINTRUD_EISOT_XSD_PATH
        .read_bytes()
    )

    tampered_path = (
        tmp_path
        / "tampered.xsd"
    )

    tampered_path.write_bytes(
        original
        + b" "
    )

    monkeypatch.setattr(
        xsd_service,
        "MINTRUD_EISOT_XSD_PATH",
        tampered_path,
    )

    with pytest.raises(
        MintrudEisotXsdValidationError,
        match="checksum mismatch",
    ):
        validate_mintrud_eisot_xml_v109(
            _valid_xml()
        )
