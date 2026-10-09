from __future__ import annotations

from copy import copy, deepcopy
from io import BytesIO

import pytest
from openpyxl import load_workbook

from app.services.compliance_registry_approval import (
    FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
)
from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
)
from app.services.frdo_po_portal_contract import (
    read_verified_frdo_po_template_bytes,
)
from app.services.frdo_po_xlsx_formatter import (
    FRDO_PO_CHECKS_SHEET,
    FRDO_PO_TEMPLATE_SHEET,
    format_frdo_po_xlsx,
    format_frdo_po_batch_xlsx,
)
from app.services.frdo_po_xlsx_validator import (
    FrdoPoXlsxValidatorError,
    validate_frdo_po_xlsx,
    validate_frdo_po_batch_xlsx,
)


DOCUMENT_TYPE = (
    "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
    "\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
    "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
    "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
    "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
)
PROFESSION = (
    "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
    "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
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
                PROGRAM_TYPE_VOCATIONAL_TRAINING
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
            "po_document_type": DOCUMENT_TYPE,
            "po_program_type": "initial_training",
            "po_profession": PROFESSION,
            "po_qualification": "1",
            "original_document_snapshot_json": None,
        },
    }


def template_bytes() -> bytes:
    return read_verified_frdo_po_template_bytes(
        program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
    )


def artifact_bytes(
    snapshot: dict | None = None,
) -> bytes:
    current = (
        snapshot
        if snapshot is not None
        else make_snapshot()
    )

    return format_frdo_po_xlsx(
        approval_snapshot=current,
        template_bytes=template_bytes(),
    )


def mutate_artifact(
    content: bytes,
    mutation,
) -> bytes:
    workbook = load_workbook(
        BytesIO(content),
        read_only=False,
        data_only=False,
    )

    mutation(
        workbook
    )

    buffer = BytesIO()
    workbook.save(
        buffer
    )

    return buffer.getvalue()


def test_validator_accepts_formatter_output() -> None:
    snapshot = make_snapshot()

    validate_frdo_po_xlsx(
        content=artifact_bytes(
            snapshot
        ),
        approval_snapshot=snapshot,
        template_bytes=template_bytes(),
    )


def test_validator_rejects_malformed_xlsx() -> None:
    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="XLSX",
    ):
        validate_frdo_po_xlsx(
            content=b"not-xlsx",
            approval_snapshot=make_snapshot(),
            template_bytes=template_bytes(),
        )


def test_validator_rejects_row_value_tampering() -> None:
    snapshot = make_snapshot()

    content = mutate_artifact(
        artifact_bytes(
            snapshot
        ),
        lambda workbook: setattr(
            workbook[
                FRDO_PO_TEMPLATE_SHEET
            ][
                "K2"
            ],
            "value",
            "tampered",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="K2",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_rejects_snapshot_artifact_mismatch() -> None:
    snapshot = make_snapshot()

    content = artifact_bytes(
        snapshot
    )

    changed_snapshot = deepcopy(
        snapshot
    )
    changed_snapshot[
        "course"
    ][
        "title"
    ] = "Changed course"

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="K2",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=changed_snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_rejects_extra_data_row() -> None:
    snapshot = make_snapshot()

    content = mutate_artifact(
        artifact_bytes(
            snapshot
        ),
        lambda workbook: setattr(
            workbook[
                FRDO_PO_TEMPLATE_SHEET
            ][
                "A3"
            ],
            "value",
            "unexpected",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="A3",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_rejects_checks_sheet_tampering() -> None:
    snapshot = make_snapshot()

    content = mutate_artifact(
        artifact_bytes(
            snapshot
        ),
        lambda workbook: setattr(
            workbook[
                FRDO_PO_CHECKS_SHEET
            ][
                "A1"
            ],
            "value",
            "tampered",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="checks",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_rejects_validation_metadata_change() -> None:
    snapshot = make_snapshot()

    def mutate(
        workbook,
    ) -> None:
        worksheet = workbook[
            FRDO_PO_TEMPLATE_SHEET
        ]

        worksheet.data_validations.dataValidation.pop()

    content = mutate_artifact(
        artifact_bytes(
            snapshot
        ),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="validation metadata",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_rejects_date_format_change() -> None:
    snapshot = make_snapshot()

    def mutate(
        workbook,
    ) -> None:
        workbook[
            FRDO_PO_TEMPLATE_SHEET
        ][
            "H2"
        ].number_format = "General"

    content = mutate_artifact(
        artifact_bytes(
            snapshot
        ),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="date format mismatch",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_rejects_style_change() -> None:
    snapshot = make_snapshot()

    def mutate(
        workbook,
    ) -> None:
        cell = workbook[
            FRDO_PO_TEMPLATE_SHEET
        ][
            "A2"
        ]

        font = copy(
            cell.font
        )
        font.bold = not bool(
            font.bold
        )
        cell.font = font

    content = mutate_artifact(
        artifact_bytes(
            snapshot
        ),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="style changed",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=snapshot,
            template_bytes=template_bytes(),
        )



def test_validator_fails_closed_for_training_reference_gap() -> None:
    base_snapshot = make_snapshot()
    content = artifact_bytes(
        base_snapshot
    )

    changed_snapshot = deepcopy(
        base_snapshot
    )
    changed_snapshot[
        "frdo_context"
    ][
        "po_document_type"
    ] = (
        "\u0421\u043f\u0440\u0430\u0432\u043a\u0430 "
        "\u043e\u0431 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438"
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match=(
            "training_reference_"
            "art_preprofessional_profession"
        ),
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=changed_snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_fails_closed_for_generic_budget_gap() -> None:
    base_snapshot = make_snapshot()
    content = artifact_bytes(
        base_snapshot
    )

    changed_snapshot = deepcopy(
        base_snapshot
    )
    changed_snapshot[
        "frdo_context"
    ][
        "funding_source"
    ] = "budget"

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="funding_source_budget",
    ):
        validate_frdo_po_xlsx(
            content=content,
            approval_snapshot=changed_snapshot,
            template_bytes=template_bytes(),
        )


def test_validator_does_not_mutate_snapshot() -> None:
    snapshot = make_snapshot()
    before = deepcopy(
        snapshot
    )

    validate_frdo_po_xlsx(
        content=artifact_bytes(
            snapshot
        ),
        approval_snapshot=snapshot,
        template_bytes=template_bytes(),
    )

    assert snapshot == before


def batch_snapshots(count: int) -> list[dict]:
    result = []

    for index in range(count):
        snapshot = make_snapshot()
        snapshot["document"]["document_number"] = str(index + 1)
        snapshot["document"]["registration_number"] = (
            "REG-" + str(index + 1)
        )
        result.append(snapshot)

    return result


def batch_artifact(snapshots: list[dict]) -> bytes:
    return format_frdo_po_batch_xlsx(
        approval_snapshots=snapshots,
        template_bytes=template_bytes(),
    )


def validate_batch(content: bytes, snapshots: list[dict]) -> None:
    validate_frdo_po_batch_xlsx(
        content=content,
        approval_snapshots=snapshots,
        template_bytes=template_bytes(),
    )


def test_batch_validator_accepts_one_record():
    snapshots = batch_snapshots(1)
    validate_batch(batch_artifact(snapshots), snapshots)


def test_batch_validator_accepts_two_records():
    snapshots = batch_snapshots(2)
    before = deepcopy(snapshots)

    validate_batch(batch_artifact(snapshots), snapshots)

    assert snapshots == before


def test_batch_validator_accepts_1001_records():
    snapshots = batch_snapshots(1001)
    validate_batch(batch_artifact(snapshots), snapshots)


@pytest.mark.parametrize("count", [0, 1002])
def test_batch_validator_rejects_invalid_record_count(count):
    snapshots = batch_snapshots(count)

    with pytest.raises(FrdoPoXlsxValidatorError):
        validate_frdo_po_batch_xlsx(
            content=b"invalid",
            approval_snapshots=snapshots,
            template_bytes=template_bytes(),
        )


def test_batch_validator_rejects_non_sequence():
    with pytest.raises(FrdoPoXlsxValidatorError):
        validate_frdo_po_batch_xlsx(
            content=b"invalid",
            approval_snapshots="invalid",
            template_bytes=template_bytes(),
        )


def test_batch_validator_rejects_invalid_second_snapshot():
    snapshots = batch_snapshots(2)
    snapshots[1] = None

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="position 1",
    ):
        validate_frdo_po_batch_xlsx(
            content=b"invalid",
            approval_snapshots=snapshots,
            template_bytes=template_bytes(),
        )


def test_batch_validator_rejects_middle_row_tampering():
    snapshots = batch_snapshots(3)

    content = mutate_artifact(
        batch_artifact(snapshots),
        lambda book: setattr(
            book[FRDO_PO_TEMPLATE_SHEET]["K3"],
            "value",
            "tampered",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="K3",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_swapped_snapshots():
    snapshots = batch_snapshots(2)
    content = batch_artifact(snapshots)

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="value mismatch",
    ):
        validate_batch(content, list(reversed(snapshots)))


def test_batch_validator_rejects_extra_row_after_batch():
    snapshots = batch_snapshots(2)

    content = mutate_artifact(
        batch_artifact(snapshots),
        lambda book: setattr(
            book[FRDO_PO_TEMPLATE_SHEET]["A4"],
            "value",
            "unexpected",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="A4",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_middle_date_format_change():
    snapshots = batch_snapshots(3)

    content = mutate_artifact(
        batch_artifact(snapshots),
        lambda book: setattr(
            book[FRDO_PO_TEMPLATE_SHEET]["H3"],
            "number_format",
            "General",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="H3",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_middle_row_style_change():
    snapshots = batch_snapshots(3)

    def mutate(book):
        cell = book[FRDO_PO_TEMPLATE_SHEET]["A3"]
        font = copy(cell.font)
        font.bold = not bool(font.bold)
        cell.font = font

    content = mutate_artifact(
        batch_artifact(snapshots),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="A3",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_unused_row_style_change():
    snapshots = batch_snapshots(2)

    def mutate(book):
        cell = book[FRDO_PO_TEMPLATE_SHEET]["A4"]
        font = copy(cell.font)
        font.bold = not bool(font.bold)
        cell.font = font

    content = mutate_artifact(
        batch_artifact(snapshots),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="A4",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_hidden_checks_change():
    snapshots = batch_snapshots(2)

    content = mutate_artifact(
        batch_artifact(snapshots),
        lambda book: setattr(
            book[FRDO_PO_CHECKS_SHEET]["A1"],
            "value",
            "tampered",
        ),
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="checks",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_hidden_checks_style_change():
    snapshots = batch_snapshots(2)

    def mutate(book):
        cell = book[FRDO_PO_CHECKS_SHEET]["A1"]
        font = copy(cell.font)
        font.bold = not bool(font.bold)
        cell.font = font

    content = mutate_artifact(
        batch_artifact(snapshots),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="checks style",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_rejects_metadata_change():
    snapshots = batch_snapshots(2)

    def mutate(book):
        book[
            FRDO_PO_TEMPLATE_SHEET
        ].data_validations.dataValidation.pop()

    content = mutate_artifact(
        batch_artifact(snapshots),
        mutate,
    )

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="validation metadata",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_fails_closed_on_second_gap():
    snapshots = batch_snapshots(2)
    content = batch_artifact(snapshots)

    snapshots[1]["frdo_context"]["funding_source"] = "budget"

    with pytest.raises(
        FrdoPoXlsxValidatorError,
        match="funding_source_budget",
    ):
        validate_batch(content, snapshots)


def test_batch_validator_preserves_frozen_snapshots():
    snapshots = batch_snapshots(2)
    original = deepcopy(snapshots)

    validate_batch(batch_artifact(snapshots), snapshots)

    assert snapshots == original
