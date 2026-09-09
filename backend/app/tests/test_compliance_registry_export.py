from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.services.compliance_registry_export import (
    REGISTRY_EXPORT_PACKAGE_EXTENSION,
    REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION,
    RegistryExportPackageError,
    build_registry_export_package,
    serialize_registry_export_package,
)


FINGERPRINT = "a" * 64


def make_obligation(
    *,
    registry: str = "frdo",
    status: str = "approved",
    invalidated_at=None,
    approval_snapshot_json=None,
    approval_fingerprint: str | None = (
        FINGERPRINT
    ),
):
    snapshot = (
        approval_snapshot_json
        if approval_snapshot_json
        is not None
        else {
            "schema_version": (
                "registry-approval-v1"
            ),
            "registry": registry,
            "learner_profile": {
                "first_name": "????",
                "last_name": "??????",
            },
        }
    )

    return SimpleNamespace(
        id="obligation-1",
        registry=registry,
        enrollment_id="enrollment-1",
        document_id=(
            "document-1"
            if registry == "frdo"
            else None
        ),
        rule_code="rule.test",
        rule_version="v1",
        status=status,
        approval_snapshot_json=snapshot,
        approval_fingerprint=(
            approval_fingerprint
        ),
        approval_invalidated_at=(
            invalidated_at
        ),
    )


def test_build_registry_export_package_frdo():
    obligation = make_obligation()

    package = (
        build_registry_export_package(
            obligation
        )
    )

    assert (
        package["schema_version"]
        == "obrportal-registry-export-v1"
    )

    assert (
        package["purpose"]
        == "internal-export-package"
    )

    assert package["registry"] == "frdo"

    assert (
        package["obligation"]["id"]
        == "obligation-1"
    )

    assert (
        package["obligation"][
            "document_id"
        ]
        == "document-1"
    )

    assert (
        package["approval"][
            "fingerprint"
        ]
        == FINGERPRINT
    )

    assert (
        package["approval"]["snapshot"]
        == obligation.approval_snapshot_json
    )

    assert (
        package["approval"]["snapshot"]
        is not obligation.approval_snapshot_json
    )


def test_build_registry_export_package_mintrud():
    obligation = make_obligation(
        registry="mintrud"
    )

    package = (
        build_registry_export_package(
            obligation
        )
    )

    assert package["registry"] == "mintrud"

    assert (
        package["obligation"][
            "document_id"
        ]
        is None
    )


@pytest.mark.parametrize(
    "kwargs",
    [
        {
            "status": (
                "needs_approval"
            )
        },
        {
            "invalidated_at": (
                "2026-09-09T00:00:00Z"
            )
        },
        {
            "approval_snapshot_json": {},
        },
        {
            "approval_fingerprint": None,
        },
        {
            "approval_fingerprint": (
                "invalid"
            ),
        },
        {
            "registry": "unknown",
        },
    ],
)
def test_build_registry_export_package_rejects_invalid_state(
    kwargs,
):
    obligation = make_obligation(
        **kwargs
    )

    with pytest.raises(
        RegistryExportPackageError
    ):
        build_registry_export_package(
            obligation
        )


def test_registry_export_package_is_detached():
    obligation = make_obligation()

    package = (
        build_registry_export_package(
            obligation
        )
    )

    obligation.approval_snapshot_json[
        "learner_profile"
    ][
        "first_name"
    ] = "Changed"

    assert (
        package["approval"]["snapshot"][
            "learner_profile"
        ][
            "first_name"
        ]
        == "????"
    )


def test_serialize_registry_export_package_is_deterministic_utf8_json():
    obligation = make_obligation()

    package = (
        build_registry_export_package(
            obligation
        )
    )

    first = (
        serialize_registry_export_package(
            package
        )
    )

    second = (
        serialize_registry_export_package(
            package
        )
    )

    assert first == second
    assert first.endswith(b"\n")

    decoded = first.decode("utf-8")

    assert "????" in decoded
    assert "\\u0418" not in decoded

    restored = json.loads(decoded)

    assert restored == package


def test_internal_export_contract_constants():
    assert (
        REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION
        == "obrportal-registry-export-v1"
    )

    assert (
        REGISTRY_EXPORT_PACKAGE_EXTENSION
        == ".json"
    )
