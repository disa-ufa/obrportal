from __future__ import annotations

from collections.abc import Mapping
from copy import deepcopy
import json
import re
from typing import Any

from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION = (
    "obrportal-registry-export-v1"
)

REGISTRY_EXPORT_PACKAGE_EXTENSION = ".json"

_SUPPORTED_REGISTRIES = frozenset(
    {
        REGISTRY_FRDO,
        REGISTRY_MINTRUD,
    }
)


class RegistryExportPackageError(
    ValueError
):
    pass


def _required_text(
    value: object,
    *,
    field_name: str,
) -> str:
    normalized = str(
        value
        or ""
    ).strip()

    if not normalized:
        raise RegistryExportPackageError(
            field_name
            + " is required"
        )

    return normalized


def _optional_text(
    value: object,
) -> str | None:
    if value is None:
        return None

    normalized = str(
        value
    ).strip()

    return normalized or None


def _validate_fingerprint(
    value: object,
) -> str:
    fingerprint = _required_text(
        value,
        field_name=(
            "Registry approval fingerprint"
        ),
    ).lower()

    if not re.fullmatch(
        r"[0-9a-f]{64}",
        fingerprint,
    ):
        raise RegistryExportPackageError(
            "Registry approval fingerprint "
            "must be a SHA256 hex digest"
        )

    return fingerprint


def build_registry_export_package(
    obligation: object,
) -> dict[str, Any]:
    registry = _required_text(
        getattr(
            obligation,
            "registry",
            None,
        ),
        field_name="Registry",
    )

    if registry not in _SUPPORTED_REGISTRIES:
        raise RegistryExportPackageError(
            "Unsupported registry export type"
        )

    if (
        getattr(
            obligation,
            "status",
            None,
        )
        != OBLIGATION_STATUS_APPROVED
    ):
        raise RegistryExportPackageError(
            "Registry obligation must be "
            "approved before export package "
            "preparation"
        )

    if getattr(
        obligation,
        "approval_invalidated_at",
        None,
    ) is not None:
        raise RegistryExportPackageError(
            "Registry approval is invalidated"
        )

    approval_snapshot = getattr(
        obligation,
        "approval_snapshot_json",
        None,
    )

    if (
        not isinstance(
            approval_snapshot,
            Mapping,
        )
        or not approval_snapshot
    ):
        raise RegistryExportPackageError(
            "Registry approval snapshot "
            "is missing"
        )

    approval_fingerprint = (
        _validate_fingerprint(
            getattr(
                obligation,
                "approval_fingerprint",
                None,
            )
        )
    )

    package = {
        "schema_version": (
            REGISTRY_EXPORT_PACKAGE_SCHEMA_VERSION
        ),
        "purpose": (
            "internal-export-package"
        ),
        "registry": registry,
        "obligation": {
            "id": _required_text(
                getattr(
                    obligation,
                    "id",
                    None,
                ),
                field_name=(
                    "Registry obligation id"
                ),
            ),
            "enrollment_id": _required_text(
                getattr(
                    obligation,
                    "enrollment_id",
                    None,
                ),
                field_name=(
                    "Registry enrollment id"
                ),
            ),
            "document_id": _optional_text(
                getattr(
                    obligation,
                    "document_id",
                    None,
                )
            ),
            "rule_code": _optional_text(
                getattr(
                    obligation,
                    "rule_code",
                    None,
                )
            ),
            "rule_version": _optional_text(
                getattr(
                    obligation,
                    "rule_version",
                    None,
                )
            ),
        },
        "approval": {
            "fingerprint": (
                approval_fingerprint
            ),
            "snapshot": deepcopy(
                dict(
                    approval_snapshot
                )
            ),
        },
    }

    return package


def serialize_registry_export_package(
    package: Mapping[str, Any],
) -> bytes:
    if not isinstance(
        package,
        Mapping,
    ):
        raise RegistryExportPackageError(
            "Registry export package "
            "must be a mapping"
        )

    try:
        payload = json.dumps(
            package,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
    except (
        TypeError,
        ValueError,
    ) as exc:
        raise RegistryExportPackageError(
            "Registry export package "
            "is not JSON serializable"
        ) from exc

    return (
        payload
        + "\n"
    ).encode(
        "utf-8"
    )
