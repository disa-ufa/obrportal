from __future__ import annotations

"""Pure serializer for the official Mintrud/EISOT XML v1.0.9 shape.

This module intentionally performs no database, network, storage,
settings, submission, or lifecycle operations.

The only input is an immutable Mintrud approval snapshot.
"""

from collections.abc import Mapping, Sequence
from datetime import date, datetime
import xml.etree.ElementTree as ET

from app.mintrud_learn_program_catalog import (
    MINTRUD_EDUCATED_PERSON_XSD_SHA256_V109,
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
)
from app.models.mintrud_registry_context import (
    MINTRUD_KNOWLEDGE_CHECK_RESULT_SATISFACTORY,
    MINTRUD_KNOWLEDGE_CHECK_RESULT_UNSATISFACTORY,
)
from app.services.compliance_registry_contract import (
    REGISTRY_MINTRUD,
)
from app.services.mintrud_employer import (
    MintrudEmployerResolutionError,
    resolve_mintrud_employer_from_approval_snapshot,
)


MINTRUD_EISOT_XML_CONTRACT_VERSION = (
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
)

MINTRUD_EISOT_XML_EXTENSION = ".xml"
MINTRUD_EISOT_XML_MIME_TYPE = "application/xml"

MINTRUD_EISOT_XML_XSD_SHA256 = (
    MINTRUD_EDUCATED_PERSON_XSD_SHA256_V109
)

MINTRUD_EISOT_XML_MAX_RECORDS = 5000

MINTRUD_EISOT_LEARN_PROGRAM_IDS_V109 = frozenset(
    {
        1,
        2,
        3,
        4,
        *range(6, 30),
    }
)


class MintrudEisotXmlError(ValueError):
    """Raised when an approved snapshot cannot be serialized safely."""


def _require_mapping(
    value: object,
    *,
    field: str,
) -> Mapping:
    if not isinstance(value, Mapping):
        raise MintrudEisotXmlError(
            field + " must be a mapping"
        )

    return value


def _required_text(
    value: object,
    *,
    field: str,
) -> str:
    if value is None:
        text = ""
    else:
        text = str(value).strip()

    if not text:
        raise MintrudEisotXmlError(
            field + " is required"
        )

    return text


def _middle_name_text(
    value: object,
) -> str:
    if value is None:
        return ""

    return str(value).strip()


def _required_date_text(
    value: object,
    *,
    field: str,
) -> str:
    if isinstance(value, datetime):
        value = value.date()

    if isinstance(value, date):
        return value.isoformat()

    text = _required_text(
        value,
        field=field,
    )

    try:
        parsed = date.fromisoformat(
            text
        )
    except ValueError as exc:
        raise MintrudEisotXmlError(
            field
            + " must use YYYY-MM-DD format"
        ) from exc

    canonical = parsed.isoformat()

    if text != canonical:
        raise MintrudEisotXmlError(
            field
            + " must use canonical YYYY-MM-DD format"
        )

    return canonical


def _require_programs(
    value: object,
) -> list[Mapping]:
    if (
        not isinstance(value, Sequence)
        or isinstance(
            value,
            (
                str,
                bytes,
                bytearray,
            ),
        )
    ):
        raise MintrudEisotXmlError(
            "mintrud_learn_programs must be a sequence"
        )

    programs = list(value)

    if not programs:
        raise MintrudEisotXmlError(
            "At least one Mintrud learn program is required"
        )

    if len(programs) > MINTRUD_EISOT_XML_MAX_RECORDS:
        raise MintrudEisotXmlError(
            "Mintrud XML cannot contain more than "
            + str(
                MINTRUD_EISOT_XML_MAX_RECORDS
            )
            + " RegistryRecord elements"
        )

    normalized = []

    for index, program in enumerate(
        programs
    ):
        normalized.append(
            _require_mapping(
                program,
                field=(
                    "mintrud_learn_programs["
                    + str(index)
                    + "]"
                ),
            )
        )

    return normalized


def _learn_program_id(
    value: object,
    *,
    index: int,
) -> int:
    if isinstance(value, bool):
        raise MintrudEisotXmlError(
            "Mintrud learn program id is invalid"
        )

    try:
        learn_program_id = int(
            value
        )
    except (
        TypeError,
        ValueError,
    ) as exc:
        raise MintrudEisotXmlError(
            "Mintrud learn program id is invalid"
        ) from exc

    if (
        learn_program_id
        not in MINTRUD_EISOT_LEARN_PROGRAM_IDS_V109
    ):
        raise MintrudEisotXmlError(
            "Unsupported Mintrud v1.0.9 learnProgramId "
            + repr(
                learn_program_id
            )
            + " at index "
            + str(index)
        )

    return learn_program_id


def _is_passed_bit(
    value: object,
) -> str:
    result = _required_text(
        value,
        field=(
            "mintrud_context."
            "knowledge_check_result"
        ),
    )

    if (
        result
        == MINTRUD_KNOWLEDGE_CHECK_RESULT_SATISFACTORY
    ):
        return "1"

    if (
        result
        == MINTRUD_KNOWLEDGE_CHECK_RESULT_UNSATISFACTORY
    ):
        return "0"

    raise MintrudEisotXmlError(
        "Unsupported Mintrud knowledge check result: "
        + repr(
            result
        )
    )


def _append_text(
    parent: ET.Element,
    tag: str,
    text: str,
) -> ET.Element:
    element = ET.SubElement(
        parent,
        tag,
    )

    element.text = text

    return element


def serialize_mintrud_eisot_xml_v109(
    approval_snapshot: Mapping,
) -> bytes:
    """Serialize one approved Mintrud snapshot to EISOT XML v1.0.9."""

    snapshot = _require_mapping(
        approval_snapshot,
        field="approval_snapshot",
    )

    registry = _required_text(
        snapshot.get(
            "registry"
        ),
        field="registry",
    )

    if registry != REGISTRY_MINTRUD:
        raise MintrudEisotXmlError(
            "Approved snapshot is not a Mintrud snapshot"
        )

    learner = _require_mapping(
        snapshot.get(
            "learner_profile"
        ),
        field="learner_profile",
    )

    context = _require_mapping(
        snapshot.get(
            "mintrud_context"
        ),
        field="mintrud_context",
    )

    reporting_organization = _require_mapping(
        snapshot.get(
            "mintrud_reporting_organization"
        ),
        field="mintrud_reporting_organization",
    )

    programs = _require_programs(
        snapshot.get(
            "mintrud_learn_programs"
        )
    )

    last_name = _required_text(
        learner.get(
            "last_name"
        ),
        field="learner_profile.last_name",
    )

    first_name = _required_text(
        learner.get(
            "first_name"
        ),
        field="learner_profile.first_name",
    )

    middle_name = _middle_name_text(
        learner.get(
            "middle_name"
        )
    )

    snils = _required_text(
        learner.get(
            "snils"
        ),
        field="learner_profile.snils",
    )

    position = _required_text(
        context.get(
            "profession_or_position"
        ),
        field=(
            "mintrud_context."
            "profession_or_position"
        ),
    )

    knowledge_check_date = (
        _required_date_text(
            context.get(
                "knowledge_check_date"
            ),
            field=(
                "mintrud_context."
                "knowledge_check_date"
            ),
        )
    )

    protocol_number = _required_text(
        context.get(
            "protocol_number"
        ),
        field=(
            "mintrud_context."
            "protocol_number"
        ),
    )

    is_passed = _is_passed_bit(
        context.get(
            "knowledge_check_result"
        )
    )

    organization_title = _required_text(
        reporting_organization.get(
            "name"
        ),
        field=(
            "mintrud_reporting_organization."
            "name"
        ),
    )

    organization_inn = _required_text(
        reporting_organization.get(
            "inn"
        ),
        field=(
            "mintrud_reporting_organization."
            "inn"
        ),
    )

    try:
        employer = (
            resolve_mintrud_employer_from_approval_snapshot(
                snapshot
            )
        )
    except MintrudEmployerResolutionError as exc:
        raise MintrudEisotXmlError(
            str(exc)
        ) from exc

    normalized_programs = []
    seen_program_ids = set()

    for index, program in enumerate(
        programs
    ):
        schema_version = _required_text(
            program.get(
                "schema_version"
            ),
            field=(
                "mintrud_learn_programs["
                + str(index)
                + "].schema_version"
            ),
        )

        if (
            schema_version
            != MINTRUD_EISOT_XML_CONTRACT_VERSION
        ):
            raise MintrudEisotXmlError(
                "Mintrud learn program schema version "
                "must be "
                + MINTRUD_EISOT_XML_CONTRACT_VERSION
            )

        learn_program_id = (
            _learn_program_id(
                program.get(
                    "learn_program_id"
                ),
                index=index,
            )
        )

        if (
            learn_program_id
            in seen_program_ids
        ):
            raise MintrudEisotXmlError(
                "Duplicate Mintrud learnProgramId: "
                + str(
                    learn_program_id
                )
            )

        seen_program_ids.add(
            learn_program_id
        )

        title = _required_text(
            program.get(
                "title"
            ),
            field=(
                "mintrud_learn_programs["
                + str(index)
                + "].title"
            ),
        )

        normalized_programs.append(
            (
                learn_program_id,
                title,
            )
        )

    root = ET.Element(
        "RegistrySet"
    )

    for (
        learn_program_id,
        learn_program_title,
    ) in normalized_programs:
        record = ET.SubElement(
            root,
            "RegistryRecord",
        )

        worker = ET.SubElement(
            record,
            "Worker",
        )

        _append_text(
            worker,
            "LastName",
            last_name,
        )

        _append_text(
            worker,
            "FirstName",
            first_name,
        )

        _append_text(
            worker,
            "MiddleName",
            middle_name,
        )

        _append_text(
            worker,
            "Snils",
            snils,
        )

        _append_text(
            worker,
            "Position",
            position,
        )

        _append_text(
            worker,
            "EmployerInn",
            employer.inn,
        )

        _append_text(
            worker,
            "EmployerTitle",
            employer.title,
        )

        organization = ET.SubElement(
            record,
            "Organization",
        )

        _append_text(
            organization,
            "Inn",
            organization_inn,
        )

        _append_text(
            organization,
            "Title",
            organization_title,
        )

        test = ET.SubElement(
            record,
            "Test",
            {
                "isPassed": is_passed,
                "learnProgramId": str(
                    learn_program_id
                ),
            },
        )

        _append_text(
            test,
            "Date",
            knowledge_check_date,
        )

        _append_text(
            test,
            "ProtocolNumber",
            protocol_number,
        )

        _append_text(
            test,
            "LearnProgramTitle",
            learn_program_title,
        )

    return ET.tostring(
        root,
        encoding="utf-8",
        xml_declaration=True,
        short_empty_elements=True,
    )
