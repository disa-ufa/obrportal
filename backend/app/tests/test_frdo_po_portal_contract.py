from __future__ import annotations

import pytest

from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_DPO_ADVANCED_TRAINING,
    PROGRAM_TYPE_DPO_PROFESSIONAL_RETRAINING,
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
)
from app.services.frdo_po_portal_contract import (
    FRDO_PO_PORTAL_CONTRACT_STATUS_UNCONFIRMED,
    FRDO_PO_TEMPLATE_KIND,
    FrdoPoPortalContractError,
    FrdoPoPortalContractUnavailable,
    get_frdo_po_portal_contract,
    require_frdo_po_portal_contract,
)


def test_frdo_po_contract_is_explicitly_unconfirmed() -> None:
    contract = get_frdo_po_portal_contract(
        program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
    )

    assert (
        contract.program_type
        == PROGRAM_TYPE_VOCATIONAL_TRAINING
    )
    assert contract.template_kind == FRDO_PO_TEMPLATE_KIND
    assert contract.template_kind == "po"
    assert (
        contract.status
        == FRDO_PO_PORTAL_CONTRACT_STATUS_UNCONFIRMED
    )
    assert contract.is_confirmed is False


def test_frdo_po_contract_has_no_fabricated_provenance() -> None:
    contract = get_frdo_po_portal_contract(
        program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
    )

    assert contract.template_contract_version is None
    assert contract.source_reference is None
    assert contract.source_sha256 is None
    assert contract.file_format is None
    assert contract.mime_type is None
    assert contract.extension is None


def test_frdo_po_contract_requirement_fails_closed() -> None:
    with pytest.raises(
        FrdoPoPortalContractUnavailable,
        match=(
            "Official FRDO PO portal upload contract "
            "is not confirmed"
        ),
    ):
        require_frdo_po_portal_contract(
            program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
        )


@pytest.mark.parametrize(
    "program_type",
    [
        PROGRAM_TYPE_DPO_ADVANCED_TRAINING,
        PROGRAM_TYPE_DPO_PROFESSIONAL_RETRAINING,
    ],
)
def test_frdo_po_contract_rejects_dpo_programs(
    program_type: str,
) -> None:
    with pytest.raises(
        FrdoPoPortalContractError,
        match="supports only vocational_training",
    ):
        get_frdo_po_portal_contract(
            program_type=program_type,
        )
