from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.services.compliance_registry_approval import (
    FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
)
from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
    REGISTRY_FRDO,
)
from app.services.frdo_po_portal_contract import (
    FrdoPoPortalContractUnavailable,
    read_verified_frdo_po_template_bytes,
)
from app.services.frdo_po_xlsx_formatter import (
    FrdoPoXlsxFormatterError,
    format_frdo_po_xlsx,
)
from app.services.frdo_po_xlsx_validator import (
    FrdoPoXlsxValidatorError,
    validate_frdo_po_xlsx,
)


class FrdoPoPortalArtifactError(ValueError):
    pass


class FrdoPoPortalArtifactUnavailable(
    FrdoPoPortalArtifactError
):
    pass


_REQUIRED_SNAPSHOT_SECTIONS = (
    "enrollment",
    "course",
    "learner_profile",
    "document",
    "frdo_context",
)


def require_frdo_po_approval_snapshot(
    snapshot: object,
) -> Mapping[str, Any]:
    if not isinstance(snapshot, Mapping):
        raise FrdoPoPortalArtifactError(
            "FRDO PO approval snapshot must be a mapping"
        )

    if (
        snapshot.get("schema_version")
        != FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION
    ):
        raise FrdoPoPortalArtifactError(
            "FRDO PO approval snapshot schema is unsupported"
        )

    if snapshot.get("registry") != REGISTRY_FRDO:
        raise FrdoPoPortalArtifactError(
            "FRDO PO approval snapshot registry is invalid"
        )

    for section_name in _REQUIRED_SNAPSHOT_SECTIONS:
        section = snapshot.get(section_name)

        if not isinstance(section, Mapping):
            raise FrdoPoPortalArtifactError(
                "FRDO PO approval snapshot section "
                + section_name
                + " is missing or invalid"
            )

    course = snapshot["course"]

    if (
        course.get("regulatory_program_type")
        != PROGRAM_TYPE_VOCATIONAL_TRAINING
    ):
        raise FrdoPoPortalArtifactError(
            "FRDO PO approval snapshot supports only "
            "vocational_training"
        )

    return snapshot


def prepare_frdo_po_portal_artifact(
    *,
    approval_snapshot: object,
) -> bytes:
    snapshot = require_frdo_po_approval_snapshot(
        approval_snapshot
    )

    course = snapshot["course"]

    try:
        template_bytes = (
            read_verified_frdo_po_template_bytes(
                program_type=course[
                    "regulatory_program_type"
                ],
            )
        )
    except FrdoPoPortalContractUnavailable as exc:
        raise FrdoPoPortalArtifactUnavailable(
            str(exc)
        ) from exc

    try:
        content = format_frdo_po_xlsx(
            approval_snapshot=snapshot,
            template_bytes=template_bytes,
        )

        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes,
        )

        return content
    except (
        FrdoPoXlsxFormatterError,
        FrdoPoXlsxValidatorError,
    ) as exc:
        raise FrdoPoPortalArtifactError(
            str(exc)
        ) from exc
