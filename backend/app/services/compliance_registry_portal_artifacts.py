from __future__ import annotations

from dataclasses import dataclass

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.mintrud_eisot_xml import (
    MINTRUD_EISOT_XML_CONTRACT_VERSION,
    MINTRUD_EISOT_XML_EXTENSION,
    MINTRUD_EISOT_XML_MIME_TYPE,
    MINTRUD_EISOT_XML_XSD_SHA256,
)


PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED = (
    "unconfirmed"
)

PORTAL_ARTIFACT_CONTRACT_STATUS_CONFIRMED = (
    "confirmed"
)

MINTRUD_EISOT_XSD_SOURCE_REFERENCE = (
    "educated_person_import_v1.0.9.xsd"
)


class RegistryPortalArtifactContractError(
    ValueError
):
    pass


class RegistryPortalArtifactContractUnavailable(
    RegistryPortalArtifactContractError
):
    pass


@dataclass(frozen=True)
class RegistryPortalArtifactContract:
    registry: str
    status: str
    source_reference: str | None = None
    source_sha256: str | None = None
    contract_version: str | None = None
    file_format: str | None = None
    mime_type: str | None = None
    extension: str | None = None

    @property
    def is_confirmed(self) -> bool:
        return (
            self.status
            == PORTAL_ARTIFACT_CONTRACT_STATUS_CONFIRMED
        )


_PORTAL_ARTIFACT_CONTRACTS = {
    REGISTRY_FRDO: RegistryPortalArtifactContract(
        registry=REGISTRY_FRDO,
        status=(
            PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED
        ),
    ),
    REGISTRY_MINTRUD: RegistryPortalArtifactContract(
        registry=REGISTRY_MINTRUD,
        status=(
            PORTAL_ARTIFACT_CONTRACT_STATUS_CONFIRMED
        ),
        source_reference=(
            MINTRUD_EISOT_XSD_SOURCE_REFERENCE
        ),
        source_sha256=(
            MINTRUD_EISOT_XML_XSD_SHA256
        ),
        contract_version=(
            MINTRUD_EISOT_XML_CONTRACT_VERSION
        ),
        file_format="xml",
        mime_type=(
            MINTRUD_EISOT_XML_MIME_TYPE
        ),
        extension=(
            MINTRUD_EISOT_XML_EXTENSION
        ),
    ),
}


def get_registry_portal_artifact_contract(
    registry: str,
) -> RegistryPortalArtifactContract:
    try:
        return _PORTAL_ARTIFACT_CONTRACTS[
            registry
        ]
    except KeyError as exc:
        raise RegistryPortalArtifactContractError(
            "Unsupported registry: "
            + str(registry)
        ) from exc


def require_registry_portal_artifact_contract(
    registry: str,
) -> RegistryPortalArtifactContract:
    contract = (
        get_registry_portal_artifact_contract(
            registry
        )
    )

    if not contract.is_confirmed:
        raise (
            RegistryPortalArtifactContractUnavailable(
                "Official portal upload artifact "
                "contract is not confirmed for "
                + registry
            )
        )

    required_metadata = (
        contract.source_reference,
        contract.source_sha256,
        contract.contract_version,
        contract.file_format,
        contract.mime_type,
        contract.extension,
    )

    if any(
        not isinstance(
            value,
            str,
        )
        or not value.strip()
        for value in required_metadata
    ):
        raise (
            RegistryPortalArtifactContractUnavailable(
                "Official portal upload artifact "
                "contract metadata is incomplete for "
                + registry
            )
        )

    return contract
