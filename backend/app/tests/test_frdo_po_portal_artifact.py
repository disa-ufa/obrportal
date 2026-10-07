from __future__ import annotations

from copy import deepcopy

import pytest

from app.services.compliance_registry_approval import (
    FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
)
from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_DPO_ADVANCED_TRAINING,
)
from app.services.frdo_po_portal_artifact import (
    FrdoPoPortalArtifactError,
    FrdoPoPortalArtifactUnavailable,
    prepare_frdo_po_portal_artifact,
    require_frdo_po_approval_snapshot,
)


def make_snapshot() -> dict:
    return {
        "schema_version": (
            FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION
        ),
        "registry": "frdo",
        "enrollment": {
            "status": "completed",
            "started_at": "2026-09-01T00:00:00+00:00",
            "completed_at": "2026-09-30T00:00:00+00:00",
        },
        "course": {
            "title": "Worker training",
            "hours": 40,
            "regulatory_program_type": (
                "vocational_training"
            ),
        },
        "learner_profile": {
            "last_name": "Ivanov",
            "first_name": "Ivan",
            "middle_name": "Ivanovich",
            "birth_date": "2000-01-01",
            "sex": "male",
            "snils": "123-456-789 00",
            "citizenship_country_code": "643",
        },
        "document": {
            "enrollment_id": "enrollment-1",
            "document_series": "PO",
            "document_number": "1",
            "document_type": "certificate",
            "issued_at": "2026-09-30",
            "registration_number": "REG-1",
            "revoked_at": None,
        },
        "frdo_context": {
            "document_status": "original",
            "loss_confirmation": None,
            "exchange_confirmation": None,
            "destruction_confirmation": None,
            "study_form": "full_time",
            "funding_source": "budget",
            "education_delivery_form": "onsite",
            "po_program_type": "initial_training",
            "po_profession": "Worker",
            "po_qualification": None,
            "original_document_snapshot_json": None,
        },
    }


def test_snapshot_guard_accepts_frdo_po_v2_snapshot() -> None:
    snapshot = make_snapshot()

    result = require_frdo_po_approval_snapshot(
        snapshot
    )

    assert result is snapshot


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("schema_version", "registry-approval-v1"),
        ("registry", "mintrud"),
    ],
)
def test_snapshot_guard_rejects_wrong_top_level_contract(
    field: str,
    value: str,
) -> None:
    snapshot = make_snapshot()
    snapshot[field] = value

    with pytest.raises(
        FrdoPoPortalArtifactError
    ):
        require_frdo_po_approval_snapshot(
            snapshot
        )


@pytest.mark.parametrize(
    "section_name",
    [
        "enrollment",
        "course",
        "learner_profile",
        "document",
        "frdo_context",
    ],
)
def test_snapshot_guard_requires_all_frozen_sections(
    section_name: str,
) -> None:
    snapshot = make_snapshot()
    snapshot[section_name] = None

    with pytest.raises(
        FrdoPoPortalArtifactError,
        match=section_name,
    ):
        require_frdo_po_approval_snapshot(
            snapshot
        )


def test_snapshot_guard_rejects_dpo_program() -> None:
    snapshot = make_snapshot()
    snapshot["course"][
        "regulatory_program_type"
    ] = PROGRAM_TYPE_DPO_ADVANCED_TRAINING

    with pytest.raises(
        FrdoPoPortalArtifactError,
        match="supports only vocational_training",
    ):
        require_frdo_po_approval_snapshot(
            snapshot
        )


def test_portal_artifact_still_fails_closed_without_contract() -> None:
    snapshot = make_snapshot()

    with pytest.raises(
        FrdoPoPortalArtifactUnavailable,
        match=(
            "Official FRDO PO portal upload contract "
            "is not confirmed"
        ),
    ):
        prepare_frdo_po_portal_artifact(
            approval_snapshot=snapshot,
        )


def test_snapshot_validation_does_not_mutate_snapshot() -> None:
    snapshot = make_snapshot()
    before = deepcopy(snapshot)

    require_frdo_po_approval_snapshot(
        snapshot
    )

    assert snapshot == before
