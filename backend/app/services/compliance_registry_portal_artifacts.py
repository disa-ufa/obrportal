from __future__ import annotations

from dataclasses import dataclass

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE = (
    "internal-export-package"
)

REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD = (
    "portal-upload-artifact"
)

PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED = (
    "unconfirmed"
)

PORTAL_ARTIFACT_CONTRACT_STATUS_CONFIRMED = (
    "confirmed"
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


_UNCONFIRMED_CONTRACTS = {
    REGISTRY_FRDO: RegistryPortalArtifactContract(
        registry=REGISTRY_FRDO,
        status=(
            PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED
        ),
    ),
    REGISTRY_MINTRUD: RegistryPortalArtifactContract(
        registry=REGISTRY_MINTRUD,
        status=(
            PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED
        ),
    ),
}


def get_registry_portal_artifact_contract(
    registry: str,
) -> RegistryPortalArtifactContract:
    try:
        return _UNCONFIRMED_CONTRACTS[
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

    return contract
