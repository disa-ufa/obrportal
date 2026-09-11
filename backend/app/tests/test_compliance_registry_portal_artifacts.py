from __future__ import annotations

import pytest

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_export import (
    REGISTRY_EXPORT_PACKAGE_EXTENSION,
    REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION,
)
from app.services.compliance_registry_portal_artifacts import (
    PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED,
    REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE,
    REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD,
    RegistryPortalArtifactContractError,
    RegistryPortalArtifactContractUnavailable,
    get_registry_portal_artifact_contract,
    require_registry_portal_artifact_contract,
)


def test_internal_export_and_portal_upload_are_distinct_artifact_kinds():
    assert (
        REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE
        == "internal-export-package"
    )
    assert (
        REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD
        == "portal-upload-artifact"
    )
    assert (
        REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE
        != REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD
    )


def test_existing_export_remains_internal_json_contract():
    assert (
        REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION
        == "obrportal-registry-export-v1"
    )
    assert (
        REGISTRY_EXPORT_PACKAGE_EXTENSION
        == ".json"
    )


@pytest.mark.parametrize(
    "registry",
    [
        REGISTRY_FRDO,
        REGISTRY_MINTRUD,
    ],
)
def test_portal_contract_is_unconfirmed_without_official_source(
    registry,
):
    contract = (
        get_registry_portal_artifact_contract(
            registry
        )
    )

    assert contract.registry == registry
    assert (
        contract.status
        == PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED
    )
    assert contract.is_confirmed is False

    assert contract.source_reference is None
    assert contract.source_sha256 is None
    assert contract.contract_version is None
    assert contract.file_format is None
    assert contract.mime_type is None
    assert contract.extension is None


@pytest.mark.parametrize(
    "registry",
    [
        REGISTRY_FRDO,
        REGISTRY_MINTRUD,
    ],
)
def test_portal_contract_requirement_fails_closed(
    registry,
):
    with pytest.raises(
        RegistryPortalArtifactContractUnavailable,
        match=(
            "Official portal upload artifact "
            "contract is not confirmed"
        ),
    ):
        require_registry_portal_artifact_contract(
            registry
        )


def test_unknown_registry_is_rejected():
    with pytest.raises(
        RegistryPortalArtifactContractError,
        match="Unsupported registry",
    ):
        get_registry_portal_artifact_contract(
            "unknown"
        )
