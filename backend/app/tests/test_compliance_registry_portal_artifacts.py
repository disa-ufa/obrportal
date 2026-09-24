from __future__ import annotations

import pytest

from app.services.compliance_registry_contract import (
    REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE,
    REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_export import (
    REGISTRY_EXPORT_PACKAGE_EXTENSION,
    REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION,
)
from app.services.compliance_registry_portal_artifacts import (
    MINTRUD_EISOT_XSD_SOURCE_REFERENCE,
    PORTAL_ARTIFACT_CONTRACT_STATUS_CONFIRMED,
    PORTAL_ARTIFACT_CONTRACT_STATUS_UNCONFIRMED,
    RegistryPortalArtifactContractError,
    RegistryPortalArtifactContractUnavailable,
    get_registry_portal_artifact_contract,
    require_registry_portal_artifact_contract,
)
from app.services.mintrud_eisot_xml import (
    MINTRUD_EISOT_XML_CONTRACT_VERSION,
    MINTRUD_EISOT_XML_EXTENSION,
    MINTRUD_EISOT_XML_MIME_TYPE,
    MINTRUD_EISOT_XML_XSD_SHA256,
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


def test_frdo_portal_contract_remains_unconfirmed():
    contract = (
        get_registry_portal_artifact_contract(
            REGISTRY_FRDO
        )
    )

    assert contract.registry == REGISTRY_FRDO
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


def test_frdo_portal_contract_requirement_fails_closed():
    with pytest.raises(
        RegistryPortalArtifactContractUnavailable,
        match=(
            "Official portal upload artifact "
            "contract is not confirmed for frdo"
        ),
    ):
        require_registry_portal_artifact_contract(
            REGISTRY_FRDO
        )


def test_mintrud_portal_contract_matches_official_xsd_v109():
    contract = (
        get_registry_portal_artifact_contract(
            REGISTRY_MINTRUD
        )
    )

    assert contract.registry == REGISTRY_MINTRUD
    assert (
        contract.status
        == PORTAL_ARTIFACT_CONTRACT_STATUS_CONFIRMED
    )
    assert contract.is_confirmed is True
    assert (
        contract.source_reference
        == MINTRUD_EISOT_XSD_SOURCE_REFERENCE
    )
    assert (
        contract.source_reference
        == "educated_person_import_v1.0.9.xsd"
    )
    assert (
        contract.source_sha256
        == MINTRUD_EISOT_XML_XSD_SHA256
    )
    assert (
        contract.contract_version
        == MINTRUD_EISOT_XML_CONTRACT_VERSION
    )
    assert contract.contract_version == "1.0.9"
    assert contract.file_format == "xml"
    assert (
        contract.mime_type
        == MINTRUD_EISOT_XML_MIME_TYPE
    )
    assert contract.mime_type == "application/xml"
    assert (
        contract.extension
        == MINTRUD_EISOT_XML_EXTENSION
    )
    assert contract.extension == ".xml"


def test_mintrud_portal_contract_requirement_succeeds():
    contract = (
        require_registry_portal_artifact_contract(
            REGISTRY_MINTRUD
        )
    )

    assert contract.is_confirmed is True
    assert contract.contract_version == "1.0.9"
    assert contract.extension == ".xml"


def test_unknown_registry_is_rejected():
    with pytest.raises(
        RegistryPortalArtifactContractError,
        match="Unsupported registry",
    ):
        get_registry_portal_artifact_contract(
            "unknown"
        )
