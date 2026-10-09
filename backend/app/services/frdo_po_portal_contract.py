from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
)


FRDO_PO_TEMPLATE_KIND = "po"

FRDO_PO_PORTAL_CONTRACT_STATUS_UNCONFIRMED = (
    "unconfirmed"
)

FRDO_PO_PORTAL_CONTRACT_STATUS_WORKING_REFERENCE = (
    "working_reference"
)

FRDO_PO_PORTAL_CONTRACT_STATUS_CONFIRMED = (
    "confirmed"
)

FRDO_PO_TEMPLATE_CONTRACT_VERSION = (
    "frdo-po-working-reference-v1"
)

FRDO_PO_TEMPLATE_SOURCE_REFERENCE = (
    "frdo_po_working_reference_v1.xlsx"
)

FRDO_PO_TEMPLATE_SHA256 = (
    "205853ef3cfcf58626d6cdd9cf070d1b1b178792f09d1b222e5064c16371f82a"
)

FRDO_PO_XLSX_FORMAT = "xlsx"

FRDO_PO_XLSX_MIME_TYPE = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)

FRDO_PO_XLSX_EXTENSION = ".xlsx"

FRDO_PO_TEMPLATE_RESOURCE_PATH = (
    Path(__file__).resolve().parents[1]
    / "resources"
    / "frdo"
    / FRDO_PO_TEMPLATE_SOURCE_REFERENCE
)


class FrdoPoPortalContractError(ValueError):
    pass


class FrdoPoPortalContractUnavailable(
    FrdoPoPortalContractError
):
    pass


@dataclass(frozen=True)
class FrdoPoPortalContract:
    program_type: str
    template_kind: str
    status: str
    template_contract_version: str | None = None
    source_reference: str | None = None
    source_sha256: str | None = None
    file_format: str | None = None
    mime_type: str | None = None
    extension: str | None = None

    @property
    def is_confirmed(self) -> bool:
        return (
            self.status
            == FRDO_PO_PORTAL_CONTRACT_STATUS_CONFIRMED
        )

    @property
    def is_working_reference(self) -> bool:
        return (
            self.status
            == FRDO_PO_PORTAL_CONTRACT_STATUS_WORKING_REFERENCE
        )

    @property
    def is_available(self) -> bool:
        return (
            self.is_confirmed
            or self.is_working_reference
        )


FRDO_PO_PORTAL_CONTRACT = FrdoPoPortalContract(
    program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
    template_kind=FRDO_PO_TEMPLATE_KIND,
    status=(
        FRDO_PO_PORTAL_CONTRACT_STATUS_WORKING_REFERENCE
    ),
    template_contract_version=(
        FRDO_PO_TEMPLATE_CONTRACT_VERSION
    ),
    source_reference=(
        FRDO_PO_TEMPLATE_SOURCE_REFERENCE
    ),
    source_sha256=FRDO_PO_TEMPLATE_SHA256,
    file_format=FRDO_PO_XLSX_FORMAT,
    mime_type=FRDO_PO_XLSX_MIME_TYPE,
    extension=FRDO_PO_XLSX_EXTENSION,
)


def get_frdo_po_portal_contract(
    *,
    program_type: str,
) -> FrdoPoPortalContract:
    if program_type != PROGRAM_TYPE_VOCATIONAL_TRAINING:
        raise FrdoPoPortalContractError(
            "FRDO PO portal contract supports only "
            "vocational_training"
        )

    return FRDO_PO_PORTAL_CONTRACT


def require_frdo_po_portal_contract(
    *,
    program_type: str,
) -> FrdoPoPortalContract:
    contract = get_frdo_po_portal_contract(
        program_type=program_type,
    )

    if not contract.is_available:
        raise FrdoPoPortalContractUnavailable(
            "FRDO PO portal upload contract is unavailable"
        )

    required_metadata = (
        contract.template_contract_version,
        contract.source_reference,
        contract.source_sha256,
        contract.file_format,
        contract.mime_type,
        contract.extension,
    )

    if any(
        not isinstance(value, str)
        or not value.strip()
        for value in required_metadata
    ):
        raise FrdoPoPortalContractUnavailable(
            "FRDO PO portal upload contract "
            "metadata is incomplete"
        )

    return contract


def read_verified_frdo_po_template_bytes(
    *,
    program_type: str,
) -> bytes:
    contract = require_frdo_po_portal_contract(
        program_type=program_type,
    )

    if (
        FRDO_PO_TEMPLATE_RESOURCE_PATH.name
        != contract.source_reference
    ):
        raise FrdoPoPortalContractUnavailable(
            "FRDO PO template resource reference mismatch"
        )

    try:
        content = (
            FRDO_PO_TEMPLATE_RESOURCE_PATH
            .read_bytes()
        )
    except OSError as exc:
        raise FrdoPoPortalContractUnavailable(
            "FRDO PO template resource is unavailable"
        ) from exc

    actual_sha256 = hashlib.sha256(
        content
    ).hexdigest()

    if actual_sha256 != contract.source_sha256:
        raise FrdoPoPortalContractUnavailable(
            "FRDO PO template checksum mismatch"
        )

    return content
