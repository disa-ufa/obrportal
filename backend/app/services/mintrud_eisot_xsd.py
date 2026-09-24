from __future__ import annotations

import hashlib
from pathlib import Path

from lxml import etree

from app.services.mintrud_eisot_xml import (
    MINTRUD_EISOT_XML_XSD_SHA256,
)


MINTRUD_EISOT_XSD_PATH = (
    Path(__file__).resolve().parents[1]
    / "resources"
    / "mintrud"
    / "educated_person_import_v1.0.9.xsd"
)


class MintrudEisotXsdValidationError(ValueError):
    """Raised when Mintrud/EISOT XML or its pinned XSD cannot be validated."""


def _read_verified_xsd_bytes() -> bytes:
    try:
        content = MINTRUD_EISOT_XSD_PATH.read_bytes()
    except OSError as exc:
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XSD resource is unavailable"
        ) from exc

    actual_sha256 = hashlib.sha256(
        content
    ).hexdigest()

    if (
        actual_sha256
        != MINTRUD_EISOT_XML_XSD_SHA256
    ):
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XSD checksum mismatch"
        )

    return content


def _new_safe_parser() -> etree.XMLParser:
    return etree.XMLParser(
        resolve_entities=False,
        load_dtd=False,
        no_network=True,
        dtd_validation=False,
        recover=False,
        huge_tree=False,
        remove_blank_text=False,
    )


def _reject_doctype(
    document: etree._Element,
    *,
    source_name: str,
) -> None:
    doctype = (
        document
        .getroottree()
        .docinfo
        .doctype
    )

    if doctype:
        raise MintrudEisotXsdValidationError(
            source_name
            + " must not contain a DOCTYPE"
        )


def _load_schema() -> etree.XMLSchema:
    xsd_bytes = (
        _read_verified_xsd_bytes()
    )

    try:
        xsd_document = etree.fromstring(
            xsd_bytes,
            parser=_new_safe_parser(),
        )
    except etree.XMLSyntaxError as exc:
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XSD is not well-formed XML"
        ) from exc

    _reject_doctype(
        xsd_document,
        source_name="Mintrud/EISOT XSD",
    )

    try:
        return etree.XMLSchema(
            xsd_document
        )
    except etree.XMLSchemaParseError as exc:
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XSD cannot be compiled"
        ) from exc


def _coerce_xml_bytes(
    xml_content: bytes | bytearray | memoryview | str,
) -> bytes:
    if isinstance(
        xml_content,
        str,
    ):
        content = xml_content.encode(
            "utf-8"
        )

    elif isinstance(
        xml_content,
        (
            bytes,
            bytearray,
            memoryview,
        ),
    ):
        content = bytes(
            xml_content
        )

    else:
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XML must be bytes or str"
        )

    if not content.strip():
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XML must not be empty"
        )

    return content


def validate_mintrud_eisot_xml_v109(
    xml_content: bytes | bytearray | memoryview | str,
) -> None:
    """Validate one generated Mintrud/EISOT XML document against XSD v1.0.9."""

    content = _coerce_xml_bytes(
        xml_content
    )

    try:
        document = etree.fromstring(
            content,
            parser=_new_safe_parser(),
        )
    except etree.XMLSyntaxError as exc:
        raise MintrudEisotXsdValidationError(
            "Mintrud/EISOT XML is not well-formed"
        ) from exc

    _reject_doctype(
        document,
        source_name="Mintrud/EISOT XML",
    )

    schema = _load_schema()

    if schema.validate(
        document
    ):
        return

    last_error = (
        schema.error_log.last_error
    )

    if last_error is None:
        detail = (
            "document does not conform to XSD v1.0.9"
        )
    else:
        detail = (
            "line "
            + str(last_error.line)
            + ": "
            + last_error.message
        )

    raise MintrudEisotXsdValidationError(
        "Mintrud/EISOT XML XSD validation failed: "
        + detail
    )
