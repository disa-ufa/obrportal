from __future__ import annotations

from copy import deepcopy
from datetime import date
import xml.etree.ElementTree as ET

import pytest

from app.services.mintrud_eisot_xml import (
    MINTRUD_EISOT_XML_CONTRACT_VERSION,
    MINTRUD_EISOT_XML_EXTENSION,
    MINTRUD_EISOT_XML_MAX_RECORDS,
    MINTRUD_EISOT_XML_MIME_TYPE,
    MINTRUD_EISOT_XML_XSD_SHA256,
    MintrudEisotXmlError,
    serialize_mintrud_eisot_xml_v109,
)


def make_snapshot(
    *,
    scenario: str = "external_training_provider",
    result: str = "satisfactory",
    middle_name: str | None = "Petrovich",
):
    return {
        "schema_version": "registry-approval-v1",
        "registry": "mintrud",
        "enrollment": {
            "status": "completed",
            "completed_at": "2026-09-22T10:00:00+00:00",
        },
        "course": {
            "title": "Course title",
        },
        "learner_profile": {
            "last_name": "Ivanov",
            "first_name": "Ivan",
            "middle_name": middle_name,
            "snils": "123-456-789 01",
        },
        "mintrud_context": {
            "reporting_scenario": scenario,
            "profession_or_position": "Engineer",
            "employer_name": "External Employer",
            "employer_inn": "0274000001",
            "knowledge_check_result": result,
            "knowledge_check_date": "2026-09-22",
            "protocol_number": "PR-2026-77",
        },
        "mintrud_learn_programs": [
            {
                "id": "program-1",
                "learn_program_id": 1,
                "code": "A",
                "title": "Program A",
                "schema_version": "1.0.9",
            },
            {
                "id": "program-2",
                "learn_program_id": 2,
                "code": "B",
                "title": "Program B",
                "schema_version": "1.0.9",
            },
        ],
        "mintrud_reporting_organization": {
            "name": "Training Organization",
            "inn": "0274000002",
        },
    }


def parse_records(content: bytes):
    root = ET.fromstring(
        content
    )

    assert root.tag == "RegistrySet"

    return (
        root,
        root.findall(
            "RegistryRecord"
        ),
    )


def test_serializer_metadata_contract():
    assert (
        MINTRUD_EISOT_XML_CONTRACT_VERSION
        == "1.0.9"
    )

    assert (
        MINTRUD_EISOT_XML_EXTENSION
        == ".xml"
    )

    assert (
        MINTRUD_EISOT_XML_MIME_TYPE
        == "application/xml"
    )

    assert (
        len(
            MINTRUD_EISOT_XML_XSD_SHA256
        )
        == 64
    )

    assert (
        MINTRUD_EISOT_XML_MAX_RECORDS
        == 5000
    )


def test_external_training_provider_serializes_one_record_per_program():
    content = (
        serialize_mintrud_eisot_xml_v109(
            make_snapshot()
        )
    )

    assert content.startswith(
        b"<?xml"
    )

    root, records = parse_records(
        content
    )

    assert root.attrib == {}
    assert len(records) == 2

    assert [
        child.tag
        for child in records[0]
    ] == [
        "Worker",
        "Organization",
        "Test",
    ]

    worker = records[0].find(
        "Worker"
    )

    assert worker is not None

    assert worker.findtext(
        "LastName"
    ) == "Ivanov"

    assert worker.findtext(
        "FirstName"
    ) == "Ivan"

    assert worker.findtext(
        "MiddleName"
    ) == "Petrovich"

    assert worker.findtext(
        "Snils"
    ) == "123-456-789 01"

    assert worker.findtext(
        "Position"
    ) == "Engineer"

    assert worker.findtext(
        "EmployerInn"
    ) == "0274000001"

    assert worker.findtext(
        "EmployerTitle"
    ) == "External Employer"

    organization = records[0].find(
        "Organization"
    )

    assert organization is not None

    assert organization.findtext(
        "Inn"
    ) == "0274000002"

    assert organization.findtext(
        "Title"
    ) == "Training Organization"

    first_test = records[0].find(
        "Test"
    )

    second_test = records[1].find(
        "Test"
    )

    assert first_test is not None
    assert second_test is not None

    assert first_test.attrib == {
        "isPassed": "1",
        "learnProgramId": "1",
    }

    assert second_test.attrib == {
        "isPassed": "1",
        "learnProgramId": "2",
    }

    assert first_test.findtext(
        "Date"
    ) == "2026-09-22"

    assert first_test.findtext(
        "ProtocolNumber"
    ) == "PR-2026-77"

    assert first_test.findtext(
        "LearnProgramTitle"
    ) == "Program A"

    assert second_test.findtext(
        "LearnProgramTitle"
    ) == "Program B"


def test_employer_self_training_uses_reporting_organization_as_employer():
    snapshot = make_snapshot(
        scenario="employer_self_training"
    )

    _root, records = parse_records(
        serialize_mintrud_eisot_xml_v109(
            snapshot
        )
    )

    worker = records[0].find(
        "Worker"
    )

    assert worker is not None

    assert worker.findtext(
        "EmployerInn"
    ) == "0274000002"

    assert worker.findtext(
        "EmployerTitle"
    ) == "Training Organization"


def test_unsatisfactory_maps_to_zero_and_middle_name_element_is_present():
    content = (
        serialize_mintrud_eisot_xml_v109(
            make_snapshot(
                result="unsatisfactory",
                middle_name=None,
            )
        )
    )

    _root, records = parse_records(
        content
    )

    worker = records[0].find(
        "Worker"
    )

    test = records[0].find(
        "Test"
    )

    assert worker is not None
    assert test is not None

    middle_name = worker.find(
        "MiddleName"
    )

    assert middle_name is not None
    assert middle_name.text in (
        None,
        "",
    )

    assert (
        test.attrib[
            "isPassed"
        ]
        == "0"
    )


def test_serializer_accepts_date_object_and_emits_canonical_date():
    snapshot = make_snapshot()

    snapshot[
        "mintrud_context"
    ][
        "knowledge_check_date"
    ] = date(
        2026,
        9,
        22,
    )

    _root, records = parse_records(
        serialize_mintrud_eisot_xml_v109(
            snapshot
        )
    )

    test = records[0].find(
        "Test"
    )

    assert test is not None

    assert test.findtext(
        "Date"
    ) == "2026-09-22"


def test_serializer_is_deterministic_and_escapes_xml_text():
    snapshot = make_snapshot()

    snapshot[
        "mintrud_learn_programs"
    ][0][
        "title"
    ] = "Safety & Work <A>"

    first = serialize_mintrud_eisot_xml_v109(
        snapshot
    )

    second = serialize_mintrud_eisot_xml_v109(
        deepcopy(
            snapshot
        )
    )

    assert first == second

    assert (
        b"Safety &amp; Work &lt;A&gt;"
        in first
    )

    _root, records = parse_records(
        first
    )

    test = records[0].find(
        "Test"
    )

    assert test is not None

    assert test.findtext(
        "LearnProgramTitle"
    ) == "Safety & Work <A>"


def test_first_release_omits_optional_outer_and_foreign_fields():
    content = (
        serialize_mintrud_eisot_xml_v109(
            make_snapshot()
        )
    )

    assert b"outerId" not in content
    assert b"OrganizationUnitId" not in content
    assert b"IsForeignSnils" not in content
    assert b"ForeignSnils" not in content
    assert b"Citizenship" not in content


@pytest.mark.parametrize(
    (
        "mutator",
        "message",
    ),
    [
        (
            lambda value: value.update(
                {
                    "registry": "frdo",
                }
            ),
            "not a Mintrud snapshot",
        ),
        (
            lambda value: value[
                "learner_profile"
            ].update(
                {
                    "snils": "",
                }
            ),
            "snils is required",
        ),
        (
            lambda value: value[
                "mintrud_context"
            ].update(
                {
                    "profession_or_position": "",
                }
            ),
            "profession_or_position is required",
        ),
        (
            lambda value: value[
                "mintrud_context"
            ].update(
                {
                    "knowledge_check_result": "unknown",
                }
            ),
            "Unsupported Mintrud knowledge check result",
        ),
        (
            lambda value: value.update(
                {
                    "mintrud_learn_programs": [],
                }
            ),
            "At least one Mintrud learn program",
        ),
        (
            lambda value: value[
                "mintrud_learn_programs"
            ][0].update(
                {
                    "learn_program_id": 5,
                }
            ),
            "Unsupported Mintrud v1.0.9 learnProgramId",
        ),
        (
            lambda value: value[
                "mintrud_learn_programs"
            ][0].update(
                {
                    "schema_version": "1.0.8",
                }
            ),
            "schema version must be 1.0.9",
        ),
        (
            lambda value: value[
                "mintrud_learn_programs"
            ][1].update(
                {
                    "learn_program_id": 1,
                }
            ),
            "Duplicate Mintrud learnProgramId",
        ),
        (
            lambda value: value[
                "mintrud_context"
            ].update(
                {
                    "knowledge_check_date": "22.09.2026",
                }
            ),
            "YYYY-MM-DD",
        ),
        (
            lambda value: value[
                "mintrud_reporting_organization"
            ].update(
                {
                    "inn": "",
                }
            ),
            "mintrud_reporting_organization.inn is required",
        ),
    ],
)
def test_serializer_fails_closed_for_invalid_snapshot(
    mutator,
    message,
):
    snapshot = make_snapshot()

    mutator(
        snapshot
    )

    with pytest.raises(
        MintrudEisotXmlError,
        match=message,
    ):
        serialize_mintrud_eisot_xml_v109(
            snapshot
        )


def test_serializer_rejects_more_than_5000_records():
    snapshot = make_snapshot()

    template = snapshot[
        "mintrud_learn_programs"
    ][0]

    snapshot[
        "mintrud_learn_programs"
    ] = [
        dict(
            template,
            id="program-" + str(index),
        )
        for index in range(
            MINTRUD_EISOT_XML_MAX_RECORDS
            + 1
        )
    ]

    with pytest.raises(
        MintrudEisotXmlError,
        match="more than 5000",
    ):
        serialize_mintrud_eisot_xml_v109(
            snapshot
        )
