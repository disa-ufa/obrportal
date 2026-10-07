from __future__ import annotations

from dataclasses import dataclass

from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
)


FRDO_PO_TEMPLATE_KIND = "po"

FRDO_PO_PORTAL_CONTRACT_STATUS_UNCONFIRMED = (
    "unconfirmed"
)

FRDO_PO_PORTAL_CONTRACT_STATUS_CONFIRMED = (
    "confirmed"
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


FRDO_PO_PORTAL_CONTRACT = FrdoPoPortalContract(
    program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
    template_kind=FRDO_PO_TEMPLATE_KIND,
    status=FRDO_PO_PORTAL_CONTRACT_STATUS_UNCONFIRMED,
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

    if not contract.is_confirmed:
        raise FrdoPoPortalContractUnavailable(
            "Official FRDO PO portal upload contract "
            "is not confirmed"
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
            "Official FRDO PO portal upload contract "
            "metadata is incomplete"
        )

    return contract
