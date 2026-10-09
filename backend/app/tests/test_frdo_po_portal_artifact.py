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
            "title": (
                "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 "
                "\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u0435\u0439"
            ),
            "hours": 40,
            "regulatory_program_type": (
                "vocational_training"
            ),
        },
        "learner_profile": {
            "last_name": "\u0418\u0432\u0430\u043d\u043e\u0432",
            "first_name": "\u0418\u0432\u0430\u043d",
            "middle_name": "\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
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
            "loss_confirmation": "No",
            "exchange_confirmation": "No",
            "destruction_confirmation": "No",
            "study_form": "full_time",
            "funding_source": "paid",
            "education_delivery_form": "onsite",
            "po_document_type": (
                "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
                "\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
                "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
                "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
                "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
            ),
            "po_program_type": "initial_training",
            "po_profession": (
                "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
                "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
            ),
            "po_qualification": "1",
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


def test_portal_artifact_returns_xlsx_with_working_reference() -> None:
    snapshot = make_snapshot()

    content = prepare_frdo_po_portal_artifact(
        approval_snapshot=snapshot,
    )

    assert isinstance(
        content,
        bytes,
    )
    assert content.startswith(
        b"PK"
    )
    assert len(content) > 1000


def test_snapshot_validation_does_not_mutate_snapshot() -> None:
    snapshot = make_snapshot()
    before = deepcopy(snapshot)

    require_frdo_po_approval_snapshot(
        snapshot
    )

    assert snapshot == before
